import { Server as SocketServer, Socket } from 'socket.io';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

// Socket.IO event types
export enum SocketEvents {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',

  // Authentication events
  AUTHENTICATE = 'authenticate',
  AUTH_SUCCESS = 'auth_success',
  AUTH_ERROR = 'auth_error',

  // Message events
  SEND_MESSAGE = 'send_message',
  RECEIVE_MESSAGE = 'receive_message',
  MESSAGE_SENT = 'message_sent',
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',

  // Investment events
  INVESTMENT_UPDATE = 'investment_update',
  PORTFOLIO_UPDATE = 'portfolio_update',
  STARTUP_UPDATE = 'startup_update',

  // Notification events
  NOTIFICATION = 'notification',
  NOTIFICATION_READ = 'notification_read',

  // Room events
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  ROOM_USERS = 'room_users',

  // Error events
  ERROR = 'error',
}

// Socket room types
export enum RoomTypes {
  USER = 'user',
  STARTUP = 'startup',
  INVESTMENT = 'investment',
  NOTIFICATION = 'notification',
  GLOBAL = 'global',
}

// Socket user interface
export interface SocketUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  socketId: string;
  connectedAt: Date;
  rooms: Set<string>;
}

// Socket service class
export class SocketService {
  private io: SocketServer;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(io: SocketServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('Socket connection established', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });

      // Handle authentication
      socket.on(SocketEvents.AUTHENTICATE, async (data: { token: string }) => {
        await this.handleAuthentication(socket, data.token);
      });

      // Handle room joining
      socket.on(SocketEvents.JOIN_ROOM, (data: { roomId: string; roomType: RoomTypes }) => {
        this.handleJoinRoom(socket, data.roomId, data.roomType);
      });

      // Handle room leaving
      socket.on(SocketEvents.LEAVE_ROOM, (data: { roomId: string }) => {
        this.handleLeaveRoom(socket, data.roomId);
      });

      // Handle messages
      socket.on(SocketEvents.SEND_MESSAGE, (data: {
        roomId: string;
        message: string;
        type?: string;
      }) => {
        this.handleSendMessage(socket, data.roomId, data.message, data.type);
      });

      // Handle typing indicators
      socket.on(SocketEvents.TYPING_START, (data: { roomId: string }) => {
        this.handleTypingStart(socket, data.roomId);
      });

      socket.on(SocketEvents.TYPING_STOP, (data: { roomId: string }) => {
        this.handleTypingStop(socket, data.roomId);
      });

      // Handle disconnect
      socket.on(SocketEvents.DISCONNECT, () => {
        this.handleDisconnect(socket);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error });
      });
    });
  }

  private async handleAuthentication(socket: Socket, token: string): Promise<void> {
    try {
      if (!token) {
        socket.emit(SocketEvents.AUTH_ERROR, 'Authentication token required');
        return;
      }

      // Verify session token
      const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: { user: true },
      });

      if (!session || session.expires < new Date()) {
        socket.emit(SocketEvents.AUTH_ERROR, 'Invalid or expired session');
        return;
      }

      const user = session.user;

      // Create socket user
      const socketUser: SocketUser = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
        socketId: socket.id,
        connectedAt: new Date(),
        rooms: new Set(),
      };

      // Store user connection
      this.connectedUsers.set(socket.id, socketUser);

      // Track user sockets
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(socket.id);

      // Join user's personal room
      await socket.join(`${RoomTypes.USER}:${user.id}`);

      // Update socket user with personal room
      socketUser.rooms.add(`${RoomTypes.USER}:${user.id}`);

      logger.info('Socket user authenticated', {
        socketId: socket.id,
        userId: user.id,
        email: user.email,
      });

      // Send authentication success
      socket.emit(SocketEvents.AUTH_SUCCESS, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        timestamp: new Date().toISOString(),
      });

      // Notify other user sockets about new connection
      socket.to(`${RoomTypes.USER}:${user.id}`).emit(SocketEvents.USER_JOINED, {
        userId: user.id,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Socket authentication failed', { socketId: socket.id, error });
      socket.emit(SocketEvents.AUTH_ERROR, 'Authentication failed');
    }
  }

  private handleJoinRoom(socket: Socket, roomId: string, roomType: RoomTypes): void {
    try {
      const socketUser = this.connectedUsers.get(socket.id);
      if (!socketUser) {
        socket.emit(SocketEvents.AUTH_ERROR, 'Authentication required');
        return;
      }

      // Create full room identifier
      const fullRoomId = `${roomType}:${roomId}`;

      // Join room
      socket.join(fullRoomId);
      socketUser.rooms.add(fullRoomId);

      logger.info('User joined room', {
        socketId: socket.id,
        userId: socketUser.id,
        roomId: fullRoomId,
      });

      // Notify room about user joining
      socket.to(fullRoomId).emit(SocketEvents.USER_JOINED, {
        userId: socketUser.id,
        userName: socketUser.name,
        userEmail: socketUser.email,
        roomId: fullRoomId,
        timestamp: new Date().toISOString(),
      });

      // Send room users list to joining user
      this.sendRoomUsers(socket, fullRoomId);

    } catch (error) {
      logger.error('Failed to join room', { socketId: socket.id, roomId, error });
      socket.emit(SocketEvents.ERROR, 'Failed to join room');
    }
  }

  private handleLeaveRoom(socket: Socket, roomId: string): void {
    try {
      const socketUser = this.connectedUsers.get(socket.id);
      if (!socketUser) {
        return;
      }

      // Leave room
      socket.leave(roomId);
      socketUser.rooms.delete(roomId);

      logger.info('User left room', {
        socketId: socket.id,
        userId: socketUser.id,
        roomId,
      });

      // Notify room about user leaving
      socket.to(roomId).emit(SocketEvents.USER_LEFT, {
        userId: socketUser.id,
        userName: socketUser.name,
        roomId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Failed to leave room', { socketId: socket.id, roomId, error });
    }
  }

  private handleSendMessage(socket: Socket, roomId: string, message: string, type: string = 'text'): void {
    try {
      const socketUser = this.connectedUsers.get(socket.id);
      if (!socketUser) {
        socket.emit(SocketEvents.AUTH_ERROR, 'Authentication required');
        return;
      }

      if (!message.trim()) {
        return;
      }

      const messageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        roomId,
        userId: socketUser.id,
        userName: socketUser.name,
        userEmail: socketUser.email,
        message: message.trim(),
        type,
        timestamp: new Date().toISOString(),
      };

      logger.info('Message sent', {
        socketId: socket.id,
        roomId,
        userId: socketUser.id,
        messageLength: message.length,
      });

      // Broadcast message to room
      this.io.to(roomId).emit(SocketEvents.RECEIVE_MESSAGE, messageData);

      // Confirm message sent to sender
      socket.emit(SocketEvents.MESSAGE_SENT, {
        ...messageData,
        status: 'sent',
      });

    } catch (error) {
      logger.error('Failed to send message', { socketId: socket.id, roomId, error });
      socket.emit(SocketEvents.ERROR, 'Failed to send message');
    }
  }

  private handleTypingStart(socket: Socket, roomId: string): void {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser) return;

    socket.to(roomId).emit(SocketEvents.TYPING_START, {
      userId: socketUser.id,
      userName: socketUser.name,
      roomId,
      timestamp: new Date().toISOString(),
    });
  }

  private handleTypingStop(socket: Socket, roomId: string): void {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser) return;

    socket.to(roomId).emit(SocketEvents.TYPING_STOP, {
      userId: socketUser.id,
      userName: socketUser.name,
      roomId,
      timestamp: new Date().toISOString(),
    });
  }

  private handleDisconnect(socket: Socket): void {
    try {
      const socketUser = this.connectedUsers.get(socket.id);
      if (!socketUser) {
        logger.info('Socket disconnected (unauthenticated)', { socketId: socket.id });
        return;
      }

      logger.info('Socket user disconnected', {
        socketId: socket.id,
        userId: socketUser.id,
        email: socketUser.email,
      });

      // Remove from user sockets
      const userSocketIds = this.userSockets.get(socketUser.id);
      if (userSocketIds) {
        userSocketIds.delete(socket.id);
        if (userSocketIds.size === 0) {
          this.userSockets.delete(socketUser.id);
        }
      }

      // Notify all rooms about user leaving
      socketUser.rooms.forEach(roomId => {
        socket.to(roomId).emit(SocketEvents.USER_LEFT, {
          userId: socketUser.id,
          userName: socketUser.name,
          roomId,
          timestamp: new Date().toISOString(),
        });
      });

      // Remove user connection
      this.connectedUsers.delete(socket.id);

    } catch (error) {
      logger.error('Error handling socket disconnect', { socketId: socket.id, error });
    }
  }

  private sendRoomUsers(socket: Socket, roomId: string): void {
    try {
      const room = this.io.sockets.adapter.rooms.get(roomId);
      if (!room) return;

      const users: Array<{
        id: string;
        name?: string;
        email: string;
        role: string;
        connectedAt: Date;
      }> = [];

      // Get user info for each socket in the room
      for (const socketId of room) {
        const socketUser = this.connectedUsers.get(socketId);
        if (socketUser && socketUser.id !== socket.id) { // Don't include the requesting socket
          users.push({
            id: socketUser.id,
            name: socketUser.name,
            email: socketUser.email,
            role: socketUser.role,
            connectedAt: socketUser.connectedAt,
          });
        }
      }

      socket.emit(SocketEvents.ROOM_USERS, {
        roomId,
        users,
        count: users.length,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Failed to send room users', { socketId: socket.id, roomId, error });
    }
  }

  // Public methods for external use
  public async sendToUser(userId: string, event: string, data: any): Promise<void> {
    try {
      const userSocketIds = this.userSockets.get(userId);
      if (!userSocketIds || userSocketIds.size === 0) {
        logger.debug('No active sockets for user', { userId, event });
        return;
      }

      const roomId = `${RoomTypes.USER}:${userId}`;
      this.io.to(roomId).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Event sent to user', { userId, event, socketCount: userSocketIds.size });
    } catch (error) {
      logger.error('Failed to send event to user', { userId, event, error });
    }
  }

  public async sendToRoom(roomId: string, event: string, data: any): Promise<void> {
    try {
      this.io.to(roomId).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Event sent to room', { roomId, event });
    } catch (error) {
      logger.error('Failed to send event to room', { roomId, event, error });
    }
  }

  public async sendGlobal(event: string, data: any): Promise<void> {
    try {
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Global event sent', { event });
    } catch (error) {
      logger.error('Failed to send global event', { event, error });
    }
  }

  public getConnectedUsers(): Map<string, SocketUser> {
    return this.connectedUsers;
  }

  public getUserSockets(userId: string): Set<string> | undefined {
    return this.userSockets.get(userId);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public getRoomUsersCount(roomId: string): number {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    return room ? room.size : 0;
  }
}

// Create and export socket service instance
let socketService: SocketService | null = null;

export const initializeSocketService = (io: SocketServer): SocketService => {
  socketService = new SocketService(io);
  return socketService;
};

export const getSocketService = (): SocketService | null => {
  return socketService;
};

export default SocketService;