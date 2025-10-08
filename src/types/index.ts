// User Types
export interface User {
  id: number
  firstName: string
  lastName: string
  nickName: string
  email: string
  status: UserStatus
  createdAt?: Date
  updatedAt?: Date
  avatarUrl?: string
}

export type UserStatus = 'online' | 'dnd' | 'offline'

export interface UserSettings {
  mentionOnlyNotifications: boolean
  theme?: 'light' | 'dark'
}

// Channel Types
export interface Channel {
  id: number
  name: string
  isPrivate: boolean
  adminId: number
  createdAt: Date
  lastActivityAt: Date
  unreadCount?: number
  isNewInvite?: boolean
}

export interface ChannelMember {
  channelId: number
  userId: number
  joinedAt: Date
  kickVotes?: number // For tracking kick votes in public channels
  isBanned?: boolean
}

// Message Types
export interface Message {
  id: number
  channelId: number
  authorId: number
  author: string
  content: string
  timestamp: Date
  mentionedUserIds?: number[]
  mentionsMe?: boolean
  editedAt?: Date
}

export interface MessageReaction {
  emoji: string
  userId: number
}

export interface MessageAttachment {
  id: number | string
  name: string
}

export type ChatMessage = Message & {
  reactions?: MessageReaction[]
  attachments?: MessageAttachment[]
  mentions?: string[]
}

// Command Types
export interface Command {
  type: CommandType
  args: string[]
  rawCommand: string
}

export type CommandType =
  | 'join'
  | 'invite'
  | 'kick'
  | 'revoke'
  | 'cancel'
  | 'quit'
  | 'list'
  | 'unknown'

export interface CommandResult {
  success: boolean
  message: string
  data?: any
}

// WebSocket/Real-time Types
export interface TypingIndicator {
  channelId: number
  userId: number
  nickName: string
  isTyping: boolean
  messagePreview?: string
}

export interface Notification {
  id: number
  userId: number
  channelId: number
  messageId: number
  type: NotificationType
  content: string
  read: boolean
  createdAt: Date
}

export type NotificationType = 'message' | 'mention' | 'invite' | 'kick'

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  nickName: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

// Store State Types
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface ChatState {
  channels: Channel[]
  currentChannelId: number | null
  messages: Record<number, Message[]> // channelId -> messages
  members: Record<number, User[]> // channelId -> users
  typingUsers: Record<number, TypingIndicator[]> // channelId -> typing users
}

export interface AppState {
  auth: AuthState
  chat: ChatState
  settings: UserSettings
}