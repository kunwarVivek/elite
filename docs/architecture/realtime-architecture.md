# Real-time Features Architecture with BullMQ

## Overview

The angel investing platform requires real-time features for live updates, background processing, and asynchronous task management. BullMQ will handle background jobs while Socket.IO will manage real-time WebSocket connections.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  React      │  │  Socket.IO  │  │  Zustand    │              │
│  │  Components │  │  Client     │  │  Real-time  │              │
│  │             │  │             │  │  Store      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ WebSocket
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Express    │  │  Socket.IO  │  │  BullMQ     │              │
│  │  Routes     │  │  Server     │  │  Queue      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Redis Pub/Sub
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKGROUND                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Job         │  │  Email      │  │  Payment    │              │
│  │  Processors  │  │  Service    │  │  Processor  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## BullMQ Configuration

### Core Setup (`lib/queue.ts`)

```typescript
import { Queue, Worker, QueueScheduler, Job } from 'bullmq'
import Redis from 'ioredis'

// Redis connection for BullMQ
const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
})

// Queue configurations
export const QUEUES = {
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  PAYMENTS: 'payments',
  DOCUMENTS: 'documents',
  ANALYTICS: 'analytics',
  CLEANUP: 'cleanup'
} as const

// Create queues
export const emailQueue = new Queue(QUEUES.EMAIL, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

export const notificationQueue = new Queue(QUEUES.NOTIFICATIONS, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
})

export const paymentQueue = new Queue(QUEUES.PAYMENTS, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 200,
    removeOnFail: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})

// Queue scheduler for delayed jobs
export const queueScheduler = new QueueScheduler(QUEUES.EMAIL, { connection: redis })
export const notificationScheduler = new QueueScheduler(QUEUES.NOTIFICATIONS, { connection: redis })
```

## Job Types and Processors

### 1. Email Jobs

```typescript
// types/email.types.ts
export interface EmailJobData {
  to: string
  subject: string
  template: string
  variables?: Record<string, any>
  attachments?: Array<{
    filename: string
    content: Buffer | string
  }>
}

export interface EmailJobResult {
  messageId: string
  status: 'sent' | 'delivered' | 'failed'
  timestamp: string
}

// processors/email.processor.ts
import { Job } from 'bullmq'
import { emailService } from '@/lib/email-service'
import { EmailJobData, EmailJobResult } from '@/types/email.types'

export const emailProcessor = async (job: Job<EmailJobData>): Promise<EmailJobResult> => {
  const { to, subject, template, variables, attachments } = job.data

  try {
    const result = await emailService.sendEmail({
      to,
      subject,
      template,
      variables,
      attachments
    })

    return {
      messageId: result.messageId,
      status: 'sent',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Email job failed:', error)
    throw error
  }
}
```

### 2. Notification Jobs

```typescript
// types/notification.types.ts
export interface NotificationJobData {
  userId: string
  type: 'INVESTMENT_UPDATE' | 'MESSAGE' | 'PITCH_UPDATE' | 'SYSTEM'
  title: string
  content: string
  data?: Record<string, any>
  channels: Array<'DATABASE' | 'EMAIL' | 'PUSH' | 'SMS'>
}

export interface NotificationJobResult {
  notificationId: string
  channels: Array<{
    channel: string
    status: 'sent' | 'failed'
    timestamp: string
  }>
}

// processors/notification.processor.ts
import { Job } from 'bullmq'
import { notificationService } from '@/lib/notification-service'
import { NotificationJobData, NotificationJobResult } from '@/types/notification.types'

export const notificationProcessor = async (job: Job<NotificationJobData>): Promise<NotificationJobResult> => {
  const { userId, type, title, content, data, channels } = job.data

  try {
    const result = await notificationService.sendNotification({
      userId,
      type,
      title,
      content,
      data,
      channels
    })

    return {
      notificationId: result.id,
      channels: result.channels.map(channel => ({
        channel: channel.type,
        status: channel.status,
        timestamp: channel.timestamp
      }))
    }
  } catch (error) {
    console.error('Notification job failed:', error)
    throw error
  }
}
```

### 3. Payment Jobs

```typescript
// types/payment.types.ts
export interface PaymentJobData {
  investmentId: string
  amount: number
  currency: string
  paymentMethod: 'BANK_TRANSFER' | 'CARD' | 'CRYPTO'
  metadata?: Record<string, any>
}

export interface PaymentJobResult {
  transactionId: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  providerResponse?: any
}

// processors/payment.processor.ts
import { Job } from 'bullmq'
import { paymentService } from '@/lib/payment-service'
import { PaymentJobData, PaymentJobResult } from '@/types/payment.types'

export const paymentProcessor = async (job: Job<PaymentJobData>): Promise<PaymentJobResult> => {
  const { investmentId, amount, currency, paymentMethod, metadata } = job.data

  try {
    const result = await paymentService.processPayment({
      investmentId,
      amount,
      currency,
      paymentMethod,
      metadata
    })

    return {
      transactionId: result.transactionId,
      status: result.status,
      providerResponse: result.providerResponse
    }
  } catch (error) {
    console.error('Payment job failed:', error)
    throw error
  }
}
```

## Worker Setup

### Worker Registration (`workers/index.ts`)

```typescript
import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { emailProcessor } from '@/processors/email.processor'
import { notificationProcessor } from '@/processors/notification.processor'
import { paymentProcessor } from '@/processors/payment.processor'
import { QUEUES } from '@/lib/queue'

const redis = new Redis(process.env.REDIS_URL!)

// Email worker
new Worker(QUEUES.EMAIL, emailProcessor, {
  connection: redis,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
})

// Notification worker
new Worker(QUEUES.NOTIFICATIONS, notificationProcessor, {
  connection: redis,
  concurrency: 10,
  limiter: {
    max: 20,
    duration: 1000,
  },
})

// Payment worker
new Worker(QUEUES.PAYMENTS, paymentProcessor, {
  connection: redis,
  concurrency: 3,
  limiter: {
    max: 5,
    duration: 1000,
  },
})
```

## Real-time WebSocket Implementation

### Socket.IO Server Setup (`lib/socket.ts`)

```typescript
import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { auth } from '@/auth'
import { rateLimitSocket } from '@/lib/rate-limiter'

export class SocketManager {
  private io: SocketIOServer
  private userSockets = new Map<string, string>() // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    })

    this.setupMiddleware()
    this.setupEventHandlers()
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

        if (!token) {
          return next(new Error('Authentication token required'))
        }

        const session = await auth.api.getSession({
          headers: { authorization: `Bearer ${token}` }
        })

        if (!session?.user) {
          return next(new Error('Invalid token'))
        }

        socket.data.user = session.user
        next()
      } catch (error) {
        next(new Error('Authentication failed'))
      }
    })

    // Rate limiting middleware
    this.io.use(rateLimitSocket)
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.user.id

      // Track user socket
      this.userSockets.set(userId, socket.id)

      console.log(`User ${userId} connected with socket ${socket.id}`)

      // Join user-specific room
      socket.join(`user:${userId}`)

      // Handle real-time events
      socket.on('subscribe_to_pitch', (pitchId: string) => {
        socket.join(`pitch:${pitchId}`)
        socket.emit('subscribed_to_pitch', { pitchId })
      })

      socket.on('unsubscribe_from_pitch', (pitchId: string) => {
        socket.leave(`pitch:${pitchId}`)
        socket.emit('unsubscribed_from_pitch', { pitchId })
      })

      socket.on('join_investment_room', (investmentId: string) => {
        socket.join(`investment:${investmentId}`)
      })

      socket.on('send_message', async (data: {
        pitchId?: string
        investmentId?: string
        content: string
        type: string
      }) => {
        // Process message and emit to relevant rooms
        await this.handleMessage(socket, data)
      })

      socket.on('disconnect', () => {
        this.userSockets.delete(userId)
        console.log(`User ${userId} disconnected`)
      })
    })
  }

  // Emit real-time updates
  async emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data)
  }

  async emitToPitch(pitchId: string, event: string, data: any) {
    this.io.to(`pitch:${pitchId}`).emit(event, data)
  }

  async emitToInvestment(investmentId: string, event: string, data: any) {
    this.io.to(`investment:${investmentId}`).emit(event, data)
  }

  private async handleMessage(socket: any, data: any) {
    const { pitchId, investmentId, content, type } = data
    const senderId = socket.data.user.id

    // Save message to database
    const message = await prisma.message.create({
      data: {
        sender_id: senderId,
        receiver_id: data.receiverId,
        pitch_id: pitchId,
        investment_id: investmentId,
        content,
        message_type: type
      }
    })

    // Emit to relevant rooms
    if (pitchId) {
      this.emitToPitch(pitchId, 'new_message', {
        message: {
          id: message.id,
          content: message.content,
          sender_id: senderId,
          created_at: message.created_at
        }
      })
    }

    if (investmentId) {
      this.emitToInvestment(investmentId, 'investment_message', {
        message: {
          id: message.id,
          content: message.content,
          sender_id: senderId,
          created_at: message.created_at
        }
      })
    }
  }
}
```

## Background Job Workflows

### Investment Processing Workflow

```typescript
// workflows/investment.workflow.ts
import { emailQueue, notificationQueue, paymentQueue } from '@/lib/queue'

export class InvestmentWorkflow {
  static async processInvestment(investmentId: string) {
    // Step 1: Process payment
    await paymentQueue.add('process_payment', {
      investmentId,
      amount: 25000,
      currency: 'USD',
      paymentMethod: 'BANK_TRANSFER'
    })

    // Step 2: Send confirmation email (delayed)
    await emailQueue.add(
      'investment_confirmation',
      {
        to: 'investor@example.com',
        template: 'investment-confirmation',
        variables: { investmentId }
      },
      { delay: 5000 } // Wait 5 seconds
    )

    // Step 3: Notify startup founder
    await notificationQueue.add('investment_notification', {
      userId: 'founder_user_id',
      type: 'INVESTMENT_UPDATE',
      title: 'New Investment Received',
      content: 'Congratulations! You have received a new investment.',
      channels: ['DATABASE', 'EMAIL']
    })
  }

  static async completeInvestment(investmentId: string) {
    // Update investment status
    await prisma.investment.update({
      where: { id: investmentId },
      data: { status: 'COMPLETED' }
    })

    // Send completion notifications
    await notificationQueue.add('investment_completed', {
      userId: 'investor_user_id',
      type: 'INVESTMENT_UPDATE',
      title: 'Investment Completed',
      content: 'Your investment has been successfully processed.',
      channels: ['DATABASE', 'EMAIL']
    })
  }
}
```

### Document Processing Workflow

```typescript
// workflows/document.workflow.ts
import { notificationQueue } from '@/lib/queue'

export class DocumentWorkflow {
  static async processDocumentUpload(documentId: string) {
    // Extract document metadata
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (!document) return

    // Index document for search (if PDF)
    if (document.file_type === 'PITCH_DECK') {
      await documentQueue.add('index_document', {
        documentId,
        filePath: document.file_path
      })
    }

    // Send upload notification
    await notificationQueue.add('document_uploaded', {
      userId: document.uploaded_by,
      type: 'SYSTEM',
      title: 'Document Uploaded',
      content: `${document.name} has been successfully uploaded.`,
      channels: ['DATABASE']
    })

    // Schedule cleanup job for old document versions
    await cleanupQueue.add(
      'cleanup_old_documents',
      { startupId: document.startup_id },
      { delay: 24 * 60 * 60 * 1000 } // 24 hours
    )
  }
}
```

## Queue Management and Monitoring

### Queue Dashboard API

```typescript
// routes/api/admin/queues.ts
import { emailQueue, notificationQueue, paymentQueue } from '@/lib/queue'

export async function GET(request: Request) {
  const queues = {
    email: {
      waiting: await emailQueue.getWaiting(),
      active: await emailQueue.getActive(),
      completed: await emailQueue.getCompleted(),
      failed: await emailQueue.getFailed(),
      paused: await emailQueue.getPaused()
    },
    notifications: {
      waiting: await notificationQueue.getWaiting(),
      active: await notificationQueue.getActive(),
      completed: await notificationQueue.getCompleted(),
      failed: await notificationQueue.getFailed()
    },
    payments: {
      waiting: await paymentQueue.getWaiting(),
      active: await paymentQueue.getActive(),
      completed: await paymentQueue.getCompleted(),
      failed: await paymentQueue.getFailed()
    }
  }

  return Response.json({ queues })
}
```

### Health Check Endpoint

```typescript
// routes/api/health.ts
export async function GET() {
  const health = {
    queues: {
      email: await emailQueue.getWaiting().then(jobs => jobs.length),
      notifications: await notificationQueue.getWaiting().then(jobs => jobs.length),
      payments: await paymentQueue.getWaiting().then(jobs => jobs.length)
    },
    redis: await redis.ping().then(() => 'connected').catch(() => 'disconnected'),
    timestamp: new Date().toISOString()
  }

  return Response.json({ health })
}
```

## Error Handling and Retry Strategies

### Retry Configuration

```typescript
// lib/retry-config.ts
export const RETRY_CONFIG = {
  EMAIL: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  NOTIFICATIONS: {
    attempts: 2,
    backoff: {
      type: 'fixed' as const,
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
  PAYMENTS: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
    removeOnComplete: 200,
    removeOnFail: 10,
  }
}
```

### Dead Letter Queue

```typescript
// processors/dead-letter.processor.ts
import { Job } from 'bullmq'

export const deadLetterProcessor = async (job: Job) => {
  const { queueName, jobId, failedReason } = job.data

  // Log failed job
  console.error(`Job ${jobId} from ${queueName} failed permanently:`, failedReason)

  // Send alert to admin
  await notificationQueue.add('admin_alert', {
    userId: 'admin_user_id',
    type: 'SYSTEM',
    title: 'Job Failed Permanently',
    content: `Job ${jobId} from ${queueName} has failed after all retries.`,
    channels: ['DATABASE', 'EMAIL']
  })

  // Store in database for analysis
  await prisma.failed_job.create({
    data: {
      queue_name: queueName,
      job_id: jobId,
      failed_reason: failedReason,
      payload: job.data,
      failed_at: new Date()
    }
  })
}
```

## Real-time Event Types

### Investment Events

```typescript
// events/investment.events.ts
export const INVESTMENT_EVENTS = {
  INVESTMENT_CREATED: 'investment:created',
  INVESTMENT_UPDATED: 'investment:updated',
  INVESTMENT_COMPLETED: 'investment:completed',
  PAYMENT_PROCESSED: 'payment:processed',
  ESCROW_RELEASED: 'escrow:released'
}

export class InvestmentEventEmitter {
  static async emitInvestmentCreated(investment: any) {
    // Emit to WebSocket
    socketManager.emitToInvestment(investment.id, INVESTMENT_EVENTS.INVESTMENT_CREATED, {
      investment: {
        id: investment.id,
        amount: investment.amount,
        status: investment.status
      }
    })

    // Add background jobs
    await notificationQueue.add('investment_notifications', {
      userId: investment.investor_id,
      type: 'INVESTMENT_UPDATE',
      title: 'Investment Created',
      content: `Your investment of $${investment.amount} has been created.`,
      channels: ['DATABASE']
    })
  }
}
```

### Pitch Events

```typescript
// events/pitch.events.ts
export const PITCH_EVENTS = {
  PITCH_CREATED: 'pitch:created',
  PITCH_UPDATED: 'pitch:updated',
  PITCH_FUNDED: 'pitch:funded',
  COMMENT_ADDED: 'comment:added',
  DOCUMENT_UPLOADED: 'document:uploaded'
}

export class PitchEventEmitter {
  static async emitCommentAdded(comment: any) {
    socketManager.emitToPitch(comment.pitch_id, PITCH_EVENTS.COMMENT_ADDED, {
      comment: {
        id: comment.id,
        content: comment.content,
        user_id: comment.user_id,
        created_at: comment.created_at
      }
    })
  }
}
```

## Zustand Real-time Store

### Real-time Store Integration

```typescript
// stores/realtime-store.ts
import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

interface RealTimeState {
  socket: Socket | null
  isConnected: boolean
  subscriptions: Set<string>

  // Actions
  connect: (token: string) => void
  disconnect: () => void
  subscribeToPitch: (pitchId: string) => void
  unsubscribeFromPitch: (pitchId: string) => void
  emit: (event: string, data: any) => void
}

export const useRealTimeStore = create<RealTimeState>((set, get) => ({
  socket: null,
  isConnected: false,
  subscriptions: new Set(),

  connect: (token: string) => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token }
    })

    socket.on('connect', () => {
      set({ isConnected: true, socket })
    })

    socket.on('disconnect', () => {
      set({ isConnected: false, socket: null })
    })

    // Handle real-time events
    socket.on('new_message', (data) => {
      // Update messages store
      useMessageStore.getState().addMessage(data.message)
    })

    socket.on('investment_update', (data) => {
      // Update investments store
      useInvestmentStore.getState().updateInvestment(data.investment)
    })

    socket.on('notification', (data) => {
      // Update notifications store
      useNotificationStore.getState().addNotification(data.notification)
    })
  },

  disconnect: () => {
    const { socket } = get()
    socket?.disconnect()
    set({ socket: null, isConnected: false, subscriptions: new Set() })
  },

  subscribeToPitch: (pitchId: string) => {
    const { socket, subscriptions } = get()
    if (socket && !subscriptions.has(pitchId)) {
      socket.emit('subscribe_to_pitch', pitchId)
      subscriptions.add(pitchId)
      set({ subscriptions: new Set(subscriptions) })
    }
  },

  unsubscribeFromPitch: (pitchId: string) => {
    const { socket, subscriptions } = get()
    if (socket && subscriptions.has(pitchId)) {
      socket.emit('unsubscribe_from_pitch', pitchId)
      subscriptions.delete(pitchId)
      set({ subscriptions: new Set(subscriptions) })
    }
  },

  emit: (event: string, data: any) => {
    const { socket } = get()
    socket?.emit(event, data)
  }
}))
```

This real-time architecture provides a robust foundation for handling background jobs, real-time updates, and asynchronous processing in the angel investing platform, ensuring scalability and responsive user experience.