import { Server as SocketServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

// Enhanced Socket.IO event types
export enum WebSocketEvents {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  ROOM_UPDATE = 'room_update',

  // Authentication events
  AUTHENTICATE = 'authenticate',
  AUTH_SUCCESS = 'auth_success',
  AUTH_ERROR = 'auth_error',
  RECONNECT = 'reconnect',
  RECONNECT_SUCCESS = 'reconnect_success',

  // Real-time data events
  PORTFOLIO_UPDATE = 'portfolio_update',
  INVESTMENT_UPDATE = 'investment_update',
  PITCH_UPDATE = 'pitch_update',
  STARTUP_UPDATE = 'startup_update',
  USER_ACTIVITY = 'user_activity',
  MARKET_DATA = 'market_data',
  NOTIFICATION = 'notification',
  LIVE_METRICS = 'live_metrics',

  // Interactive events
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  PRESENCE_UPDATE = 'presence_update',

  // System events
  SYSTEM_STATUS = 'system_status',
  MAINTENANCE_MODE = 'maintenance_mode',
  FEATURE_FLAG_UPDATE = 'feature_flag_update',

  // Error events
  ERROR = 'error',
  CONNECTION_ERROR = 'connection_error',
  RATE_LIMITED = 'rate_limited',
}

// Enhanced room types
export enum RoomTypes {
  // User-specific rooms
  USER = 'user',
  USER_PORTFOLIO = 'user_portfolio',
  USER_INVESTMENTS = 'user_investments',
  USER_NOTIFICATIONS = 'user_notifications',

  // Entity-specific rooms
  STARTUP = 'startup',
  PITCH = 'pitch',
  INVESTMENT = 'investment',
  SYNDICATE = 'syndicate',

  // Interest-based rooms
  INDUSTRY = 'industry',
  STAGE = 'stage',
  GEOGRAPHIC = 'geographic',
  INVESTOR_TYPE = 'investor_type',

  // System rooms
  ADMIN = 'admin',
  SYSTEM = 'system',
  GLOBAL = 'global',
  ANNOUNCEMENTS = 'announcements',

  // Dynamic rooms
  CUSTOM = 'custom',
}

// Enhanced socket user interface
export interface WebSocketUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  socketId: string;
  connectedAt: Date;
  lastSeen: Date;
  rooms: Map<string, RoomMembership>;
  presence: UserPresence;
  deviceInfo?: DeviceInfo;
  metadata?: Record<string, any>;
}

// Room membership interface
export interface RoomMembership {
  roomId: string;
  roomType: RoomTypes;
  joinedAt: Date;
  permissions: string[];
  isActive: boolean;
  lastActivity: Date;
}

// User presence interface
export interface UserPresence {
  status: 'online' | 'away' | 'busy' | 'offline';
  activity?: string;
  customStatus?: string;
  showActivity: boolean;
}

// Device information interface
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  userAgent: string;
  ip: string;
  location?: {
    country: string;
    city: string;
    timezone: string;
  };
}

// Room information interface
export interface RoomInfo {
  id: string;
  type: RoomTypes;
  name: string;
  description?: string;
  userCount: number;
  maxUsers?: number;
  isPrivate: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Real-time update payload interface
export interface RealTimeUpdate {
  type: string;
  data: any;
  timestamp: string;
  source: string;
  targetRooms?: string[];
  targetUsers?: string[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  ttl?: number; // Time to live in seconds
}

// Connection state interface
export interface ConnectionState {
  userId: string;
  socketId: string;
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  lastPing: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

// Enhanced WebSocket service class
export class EnhancedWebSocketService {
  private io: SocketServer;
  private redisClient: any;
  private connectedUsers: Map<string, WebSocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();
  private rooms: Map<string, RoomInfo> = new Map();
  private connectionStates: Map<string, ConnectionState> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor(io: SocketServer, redisUrl?: string) {
    this.io = io;
    this.setupRedisAdapter(redisUrl);
    this.setupEventHandlers();
    this.initializeSystemRooms();
  }

  private async setupRedisAdapter(redisUrl?: string): Promise<void> {
    try {
      if (redisUrl) {
        this.redisClient = createClient({ url: redisUrl });
        await this.redisClient.connect();

        // Create Redis adapter for horizontal scaling
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        this.io.adapter(createAdapter(pubClient, subClient));

        logger.info('Redis adapter configured for WebSocket scaling');
      }
    } catch (error) {
      logger.error('Failed to setup Redis adapter', { error });
    }
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('Enhanced WebSocket connection established', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });

      // Enhanced authentication with reconnection support
      socket.on(WebSocketEvents.AUTHENTICATE, async (data: {
        token: string;
        deviceInfo?: DeviceInfo;
        reconnect?: boolean;
      }) => {
        await this.handleEnhancedAuthentication(socket, data);
      });

      // Enhanced room management
      socket.on(WebSocketEvents.JOIN_ROOM, async (data: {
        roomId: string;
        roomType: RoomTypes;
        permissions?: string[];
        metadata?: Record<string, any>;
      }) => {
        await this.handleJoinRoom(socket, data);
      });

      socket.on(WebSocketEvents.LEAVE_ROOM, (data: { roomId: string }) => {
        this.handleLeaveRoom(socket, data.roomId);
      });

      // Presence management
      socket.on(WebSocketEvents.PRESENCE_UPDATE, (data: {
        status: UserPresence['status'];
        activity?: string;
        showActivity?: boolean;
      }) => {
        this.handlePresenceUpdate(socket, data);
      });

      // Real-time data subscriptions
      socket.on('subscribe_portfolio', (data: { userId: string }) => {
        this.handlePortfolioSubscription(socket, data.userId);
      });

      socket.on('subscribe_investment', (data: { investmentId: string }) => {
        this.handleInvestmentSubscription(socket, data.investmentId);
      });

      socket.on('subscribe_pitch', (data: { pitchId: string }) => {
        this.handlePitchSubscription(socket, data.pitchId);
      });

      // Typing indicators
      socket.on(WebSocketEvents.TYPING_START, (data: { roomId: string; conversationId?: string }) => {
        this.handleTypingStart(socket, data);
      });

      socket.on(WebSocketEvents.TYPING_STOP, (data: { roomId: string; conversationId?: string }) => {
        this.handleTypingStop(socket, data);
      });

      // Heartbeat for connection monitoring
      socket.on('heartbeat', () => {
        this.handleHeartbeat(socket);
      });

      // Handle disconnect with cleanup
      socket.on(WebSocketEvents.DISCONNECT, (reason) => {
        this.handleEnhancedDisconnect(socket, reason);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        this.handleConnectionError(socket, error);
      });

      // Rate limiting check
      socket.onAny((event, ..._args) => {
        this.checkRateLimit(socket, event);
      });
    });
  }

  private async handleEnhancedAuthentication(
    socket: Socket,
    data: { token: string; deviceInfo?: DeviceInfo; reconnect?: boolean }
  ): Promise<void> {
    try {
      if (!data.token) {
        socket.emit(WebSocketEvents.AUTH_ERROR, 'Authentication token required');
        return;
      }

      // Verify session token
      const session = await prisma.session.findUnique({
        where: { sessionToken: data.token },
        include: { user: true },
      });

      if (!session || session.expires < new Date()) {
        socket.emit(WebSocketEvents.AUTH_ERROR, 'Invalid or expired session');
        return;
      }

      const user = session.user;

      // Create enhanced socket user
      const socketUser: WebSocketUser = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
        socketId: socket.id,
        connectedAt: new Date(),
        lastSeen: new Date(),
        rooms: new Map(),
        presence: {
          status: 'online',
          activity: 'connected',
          showActivity: true
        },
        deviceInfo: data.deviceInfo,
        metadata: {
          sessionId: session.id,
          reconnect: data.reconnect || false
        }
      };

      // Store user connection
      this.connectedUsers.set(socket.id, socketUser);

      // Track user sockets
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(socket.id);

      // Initialize connection state
      this.connectionStates.set(socket.id, {
        userId: user.id,
        socketId: socket.id,
        status: 'connected',
        lastPing: new Date(),
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000
      });

      // Join user's personal rooms
      await this.joinUserRooms(socket, socketUser);

      logger.info('Enhanced WebSocket user authenticated', {
        socketId: socket.id,
        userId: user.id,
        email: user.email,
        deviceInfo: data.deviceInfo
      });

      // Send authentication success with user state
      socket.emit(WebSocketEvents.AUTH_SUCCESS, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        presence: socketUser.presence,
        rooms: Array.from(socketUser.rooms.keys()),
        timestamp: new Date().toISOString(),
      });

      // Notify other user sockets about new connection
      socket.to(`${RoomTypes.USER}:${user.id}`).emit(WebSocketEvents.USER_JOINED, {
        userId: user.id,
        socketId: socket.id,
        deviceInfo: data.deviceInfo,
        timestamp: new Date().toISOString(),
      });

      // Send current room states
      await this.sendRoomStates(socket, socketUser);

    } catch (error) {
      logger.error('Enhanced WebSocket authentication failed', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error)
      });
      socket.emit(WebSocketEvents.AUTH_ERROR, 'Authentication failed');
    }
  }

  private async joinUserRooms(socket: Socket, user: WebSocketUser): Promise<void> {
    const userRooms = [
      `${RoomTypes.USER}:${user.id}`,
      `${RoomTypes.USER_PORTFOLIO}:${user.id}`,
      `${RoomTypes.USER_INVESTMENTS}:${user.id}`,
      `${RoomTypes.USER_NOTIFICATIONS}:${user.id}`,
    ];

    for (const roomId of userRooms) {
      await socket.join(roomId);
      user.rooms.set(roomId, {
        roomId,
        roomType: roomId.split(':')[0] as RoomTypes,
        joinedAt: new Date(),
        permissions: this.getDefaultPermissions(roomId, user.role),
        isActive: true,
        lastActivity: new Date()
      });
    }
  }

  private async handleJoinRoom(
    socket: Socket,
    data: { roomId: string; roomType: RoomTypes; permissions?: string[]; metadata?: Record<string, any> }
  ): Promise<void> {
    try {
      const socketUser = this.connectedUsers.get(socket.id);
      if (!socketUser) {
        socket.emit(WebSocketEvents.AUTH_ERROR, 'Authentication required');
        return;
      }

      const fullRoomId = `${data.roomType}:${data.roomId}`;

      // Check permissions
      if (!this.canJoinRoom(socketUser, fullRoomId, data.permissions)) {
        socket.emit(WebSocketEvents.ERROR, 'Insufficient permissions to join room');
        return;
      }

      // Join room
      await socket.join(fullRoomId);

      // Update user room membership
      socketUser.rooms.set(fullRoomId, {
        roomId: fullRoomId,
        roomType: data.roomType,
        joinedAt: new Date(),
        permissions: data.permissions || this.getDefaultPermissions(fullRoomId, socketUser.role),
        isActive: true,
        lastActivity: new Date()
      });

      // Update or create room info
      await this.updateRoomInfo(fullRoomId, data.roomType, data.metadata);

      logger.info('User joined enhanced room', {
        socketId: socket.id,
        userId: socketUser.id,
        roomId: fullRoomId,
      });

      // Notify room about user joining
      socket.to(fullRoomId).emit(WebSocketEvents.USER_JOINED, {
        userId: socketUser.id,
        userName: socketUser.name,
        userEmail: socketUser.email,
        roomId: fullRoomId,
        timestamp: new Date().toISOString(),
      });

      // Send room info and current state to joining user
      await this.sendRoomInfo(socket, fullRoomId);

    } catch (error) {
      logger.error('Failed to join enhanced room', {
        socketId: socket.id,
        roomId: data.roomId,
        error: error instanceof Error ? error.message : String(error)
      });
      socket.emit(WebSocketEvents.ERROR, 'Failed to join room');
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

      // Update user room membership
      const membership = socketUser.rooms.get(roomId);
      if (membership) {
        membership.isActive = false;
        membership.lastActivity = new Date();
      }

      logger.info('User left enhanced room', {
        socketId: socket.id,
        userId: socketUser.id,
        roomId,
      });

      // Notify room about user leaving
      socket.to(roomId).emit(WebSocketEvents.USER_LEFT, {
        userId: socketUser.id,
        userName: socketUser.name,
        roomId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Failed to leave enhanced room', {
        socketId: socket.id,
        roomId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private handlePresenceUpdate(
    socket: Socket,
    data: { status: UserPresence['status']; activity?: string; showActivity?: boolean }
  ): void {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser) return;

    // Update user presence
    socketUser.presence = {
      status: data.status,
      activity: data.activity,
      showActivity: data.showActivity ?? socketUser.presence.showActivity
    };
    socketUser.lastSeen = new Date();

    // Broadcast presence update to user's rooms
    const presenceUpdate = {
      userId: socketUser.id,
      userName: socketUser.name,
      presence: socketUser.presence,
      timestamp: new Date().toISOString(),
    };

    socketUser.rooms.forEach((_, roomId) => {
      socket.to(roomId).emit(WebSocketEvents.PRESENCE_UPDATE, presenceUpdate);
    });
  }

  private async handlePortfolioSubscription(socket: Socket, userId: string): Promise<void> {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser || socketUser.id !== userId) {
      socket.emit(WebSocketEvents.ERROR, 'Unauthorized portfolio subscription');
      return;
    }

    const portfolioRoom = `${RoomTypes.USER_PORTFOLIO}:${userId}`;
    await socket.join(portfolioRoom);

    logger.info('User subscribed to portfolio updates', {
      socketId: socket.id,
      userId
    });
  }

  private async handleInvestmentSubscription(socket: Socket, investmentId: string): Promise<void> {
    const investmentRoom = `${RoomTypes.INVESTMENT}:${investmentId}`;
    await socket.join(investmentRoom);

    logger.info('User subscribed to investment updates', {
      socketId: socket.id,
      investmentId
    });
  }

  private async handlePitchSubscription(socket: Socket, pitchId: string): Promise<void> {
    const pitchRoom = `${RoomTypes.PITCH}:${pitchId}`;
    await socket.join(pitchRoom);

    logger.info('User subscribed to pitch updates', {
      socketId: socket.id,
      pitchId
    });
  }

  private handleTypingStart(socket: Socket, data: { roomId: string; conversationId?: string }): void {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser) return;

    const typingData = {
      userId: socketUser.id,
      userName: socketUser.name,
      roomId: data.roomId,
      conversationId: data.conversationId,
      timestamp: new Date().toISOString(),
    };

    socket.to(data.roomId).emit(WebSocketEvents.TYPING_START, typingData);
  }

  private handleTypingStop(socket: Socket, data: { roomId: string; conversationId?: string }): void {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser) return;

    const typingData = {
      userId: socketUser.id,
      userName: socketUser.name,
      roomId: data.roomId,
      conversationId: data.conversationId,
      timestamp: new Date().toISOString(),
    };

    socket.to(data.roomId).emit(WebSocketEvents.TYPING_STOP, typingData);
  }

  private handleHeartbeat(socket: Socket): void {
    const connectionState = this.connectionStates.get(socket.id);
    if (connectionState) {
      connectionState.lastPing = new Date();
    }
  }

  private handleEnhancedDisconnect(socket: Socket, reason: string): void {
    try {
      const socketUser = this.connectedUsers.get(socket.id);
      if (!socketUser) {
        logger.info('Enhanced WebSocket disconnected (unauthenticated)', {
          socketId: socket.id,
          reason
        });
        return;
      }

      logger.info('Enhanced WebSocket user disconnected', {
        socketId: socket.id,
        userId: socketUser.id,
        email: socketUser.email,
        reason
      });

      // Update user presence to offline
      socketUser.presence.status = 'offline';
      socketUser.lastSeen = new Date();

      // Notify all rooms about user leaving
      socketUser.rooms.forEach((membership, roomId) => {
        if (membership.isActive) {
          socket.to(roomId).emit(WebSocketEvents.USER_LEFT, {
            userId: socketUser.id,
            userName: socketUser.name,
            roomId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Remove from user sockets
      const userSocketIds = this.userSockets.get(socketUser.id);
      if (userSocketIds) {
        userSocketIds.delete(socket.id);
        if (userSocketIds.size === 0) {
          this.userSockets.delete(socketUser.id);
        }
      }

      // Clean up connection state
      this.connectionStates.delete(socket.id);

      // Remove user connection after a delay to allow for reconnection
      setTimeout(() => {
        if (!this.userSockets.has(socketUser.id)) {
          this.connectedUsers.delete(socket.id);
        }
      }, 30000); // 30 seconds grace period for reconnection

    } catch (error) {
      logger.error('Error handling enhanced WebSocket disconnect', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private handleConnectionError(socket: Socket, error: Error): void {
    logger.error('Enhanced WebSocket connection error', {
      socketId: socket.id,
      error: error.message
    });

    socket.emit(WebSocketEvents.CONNECTION_ERROR, {
      message: 'Connection error occurred',
      timestamp: new Date().toISOString(),
    });
  }

  private checkRateLimit(socket: Socket, event: string): void {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser) return;

    const rateLimiter = this.rateLimiters.get(socketUser.id) || new RateLimiter();
    this.rateLimiters.set(socketUser.id, rateLimiter);

    if (!rateLimiter.checkLimit(event)) {
      socket.emit(WebSocketEvents.RATE_LIMITED, {
        event,
        retryAfter: rateLimiter.getRetryAfter(event),
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  private async sendRoomStates(socket: Socket, user: WebSocketUser): Promise<void> {
    // Send current state of all rooms the user is in
    for (const [roomId, membership] of user.rooms) {
      if (membership.isActive) {
        await this.sendRoomInfo(socket, roomId);
      }
    }
  }

  private async sendRoomInfo(socket: Socket, roomId: string): Promise<void> {
    const roomInfo = this.rooms.get(roomId);
    const room = this.io.sockets.adapter.rooms.get(roomId);

    socket.emit(WebSocketEvents.ROOM_UPDATE, {
      roomId,
      roomInfo,
      userCount: room ? room.size : 0,
      timestamp: new Date().toISOString(),
    });
  }

  private async updateRoomInfo(roomId: string, roomType: RoomTypes, metadata?: Record<string, any>): Promise<void> {
    const existingRoom = this.rooms.get(roomId);

    if (existingRoom) {
      existingRoom.updatedAt = new Date();
      if (metadata) {
        existingRoom.metadata = { ...existingRoom.metadata, ...metadata };
      }
    } else {
      // Create new room info
      const roomInfo: RoomInfo = {
        id: roomId,
        type: roomType,
        name: this.generateRoomName(roomId, roomType),
        description: this.generateRoomDescription(roomId, roomType),
        userCount: 0,
        isPrivate: this.isPrivateRoom(roomId, roomType),
        metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.rooms.set(roomId, roomInfo);
    }
  }

  private initializeSystemRooms(): void {
    const systemRooms = [
      { id: 'global', type: RoomTypes.GLOBAL, name: 'Global Updates' },
      { id: 'announcements', type: RoomTypes.ANNOUNCEMENTS, name: 'System Announcements' },
      { id: 'admin', type: RoomTypes.ADMIN, name: 'Admin Channel' },
    ];

    for (const room of systemRooms) {
      const roomInfo: RoomInfo = {
        id: `${room.type}:${room.id}`,
        type: room.type,
        name: room.name,
        userCount: 0,
        isPrivate: room.type === RoomTypes.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.rooms.set(roomInfo.id, roomInfo);
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

  public async sendSelectiveUpdate(update: RealTimeUpdate): Promise<void> {
    try {
      const { type, data, targetRooms, targetUsers, priority } = update;

      // Send to specific rooms
      if (targetRooms && targetRooms.length > 0) {
        for (const roomId of targetRooms) {
          this.io.to(roomId).emit(type, {
            ...data,
            priority,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Send to specific users
      if (targetUsers && targetUsers.length > 0) {
        for (const userId of targetUsers) {
          await this.sendToUser(userId, type, {
            ...data,
            priority,
          });
        }
      }

      logger.debug('Selective update sent', {
        type,
        targetRooms: targetRooms?.length || 0,
        targetUsers: targetUsers?.length || 0,
        priority
      });
    } catch (error) {
      logger.error('Failed to send selective update', { update, error });
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

  public getConnectedUsers(): Map<string, WebSocketUser> {
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

  public getRoomInfo(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  public getAllRooms(): Map<string, RoomInfo> {
    return this.rooms;
  }

  // Helper methods
  private getDefaultPermissions(roomId: string, userRole: string): string[] {
    const basePermissions = ['read'];

    if (userRole === 'ADMIN') {
      return [...basePermissions, 'write', 'moderate', 'admin'];
    }

    if (roomId.startsWith(`${RoomTypes.USER}:`)) {
      return [...basePermissions, 'write'];
    }

    return basePermissions;
  }

  private canJoinRoom(user: WebSocketUser, roomId: string, _requestedPermissions?: string[]): boolean {
    // Implement room access control logic
    if (roomId.startsWith(`${RoomTypes.USER}:${user.id}`)) {
      return true; // Users can always join their own rooms
    }

    if (roomId.startsWith(`${RoomTypes.ADMIN}:`) && user.role !== 'ADMIN') {
      return false; // Only admins can join admin rooms
    }

    return true;
  }

  private generateRoomName(roomId: string, roomType: RoomTypes): string {
    const [, identifier] = roomId.split(':');

    switch (roomType) {
      case RoomTypes.STARTUP:
        return `Startup: ${identifier}`;
      case RoomTypes.PITCH:
        return `Pitch: ${identifier}`;
      case RoomTypes.INVESTMENT:
        return `Investment: ${identifier}`;
      case RoomTypes.INDUSTRY:
        return `Industry: ${identifier}`;
      case RoomTypes.USER:
        return `User: ${identifier}`;
      default:
        return `${roomType}: ${identifier}`;
    }
  }

  private generateRoomDescription(_roomId: string, roomType: RoomTypes): string {
    switch (roomType) {
      case RoomTypes.USER_PORTFOLIO:
        return 'Real-time portfolio updates and notifications';
      case RoomTypes.USER_INVESTMENTS:
        return 'Live investment status and milestone updates';
      case RoomTypes.USER_NOTIFICATIONS:
        return 'Personal notifications and alerts';
      case RoomTypes.STARTUP:
        return 'Startup-specific updates and investor communications';
      case RoomTypes.PITCH:
        return 'Pitch engagement metrics and investor interactions';
      case RoomTypes.INVESTMENT:
        return 'Investment progress and return updates';
      case RoomTypes.GLOBAL:
        return 'Platform-wide announcements and updates';
      default:
        return `Real-time updates for ${roomType}`;
    }
  }

  private isPrivateRoom(roomId: string, roomType: RoomTypes): boolean {
    return roomType === RoomTypes.ADMIN ||
           roomId.startsWith(`${RoomTypes.USER}:`);
  }
}

// Rate limiter class for WebSocket connections
class RateLimiter {
  private events: Map<string, { count: number; resetTime: number }> = new Map();

  checkLimit(event: string): boolean {
    const now = Date.now();
    const eventData = this.events.get(event);

    if (!eventData || now > eventData.resetTime) {
      // Reset or initialize counter
      this.events.set(event, {
        count: 1,
        resetTime: now + 60000 // 1 minute window
      });
      return true;
    }

    if (eventData.count >= this.getLimitForEvent(event)) {
      return false;
    }

    eventData.count++;
    return true;
  }

  getRetryAfter(event: string): number {
    const eventData = this.events.get(event);
    if (!eventData) return 0;

    return Math.max(0, eventData.resetTime - Date.now());
  }

  private getLimitForEvent(event: string): number {
    const limits: Record<string, number> = {
      'typing_start': 10,
      'typing_stop': 10,
      'send_message': 30,
      'presence_update': 20,
      'heartbeat': 60,
    };

    return limits[event] || 100; // Default limit
  }
}

// Create and export enhanced WebSocket service instance
let enhancedWebSocketService: EnhancedWebSocketService | null = null;

export const initializeEnhancedWebSocketService = (
  io: SocketServer,
  redisUrl?: string
): EnhancedWebSocketService => {
  enhancedWebSocketService = new EnhancedWebSocketService(io, redisUrl);
  return enhancedWebSocketService;
};

export const getEnhancedWebSocketService = (): EnhancedWebSocketService | null => {
  return enhancedWebSocketService;
};

export default EnhancedWebSocketService;