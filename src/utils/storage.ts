import type { Channel, Message, User, UserSettings } from '../types'

type ChannelWithMeta = Channel & { lastMessage?: string }

interface StoredUser extends Omit<User, 'createdAt' | 'updatedAt'> {
  createdAt?: string
  updatedAt?: string
}

interface StoredChannel extends Omit<ChannelWithMeta, 'createdAt' | 'lastActivityAt'> {
  createdAt: string
  lastActivityAt: string
}

interface StoredMessage extends Omit<Message, 'timestamp' | 'editedAt'> {
  timestamp: string
  editedAt?: string
}

interface StoredSettings {
  mentionOnlyNotifications: boolean
  theme?: 'light' | 'dark'
}

function toStoredUser(user: User): StoredUser {
  const { createdAt, updatedAt, ...rest } = user
  const payload = { ...rest } as StoredUser
  if (createdAt) {
    payload.createdAt = createdAt.toISOString()
  }
  if (updatedAt) {
    payload.updatedAt = updatedAt.toISOString()
  }
  return payload
}

function fromStoredUser(user: StoredUser): User {
  const { createdAt, updatedAt, ...rest } = user
  const payload = { ...rest } as User
  if (createdAt) {
    payload.createdAt = new Date(createdAt)
  }
  if (updatedAt) {
    payload.updatedAt = new Date(updatedAt)
  }
  return payload
}

function toStoredChannel(channel: ChannelWithMeta): StoredChannel {
  const { createdAt, lastActivityAt, ...rest } = channel
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt)
  const lastActivity = lastActivityAt instanceof Date ? lastActivityAt : new Date(lastActivityAt)
  return {
    ...rest,
    createdAt: created.toISOString(),
    lastActivityAt: lastActivity.toISOString()
  } as StoredChannel
}

function fromStoredChannel(channel: StoredChannel): ChannelWithMeta {
  const { createdAt, lastActivityAt, ...rest } = channel
  return {
    ...rest,
    createdAt: new Date(createdAt),
    lastActivityAt: new Date(lastActivityAt)
  } as ChannelWithMeta
}

function toStoredMessage(message: Message): StoredMessage {
  const { timestamp, editedAt, ...rest } = message
  const stored = {
    ...rest,
    timestamp: (timestamp instanceof Date ? timestamp : new Date(timestamp)).toISOString()
  } as StoredMessage
  if (editedAt) {
    stored.editedAt = (editedAt instanceof Date ? editedAt : new Date(editedAt)).toISOString()
  }
  return stored
}

function fromStoredMessage(message: StoredMessage): Message {
  const { timestamp, editedAt, ...rest } = message
  const payload = {
    ...rest,
    timestamp: new Date(timestamp)
  } as Message
  if (editedAt) {
    payload.editedAt = new Date(editedAt)
  }
  return payload
}

function toStoredSettings(settings: UserSettings): StoredSettings {
  return {
    mentionOnlyNotifications: settings.mentionOnlyNotifications,
    theme: settings.theme ?? 'light'
  }
}

function fromStoredSettings(settings: StoredSettings | null): UserSettings {
  if (!settings) {
    return {
      mentionOnlyNotifications: false,
      theme: 'light'
    }
  }
  return {
    mentionOnlyNotifications: settings.mentionOnlyNotifications,
    theme: settings.theme ?? 'light'
  }
}

export const Storage = {
  getCurrentUser(): User | null {
    const user = localStorage.getItem('currentUser')
    return user ? fromStoredUser(JSON.parse(user) as StoredUser) : null
  },

  setCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(toStoredUser(user)))
  },

  clearCurrentUser(): void {
    localStorage.removeItem('currentUser')
  },

  getChannels(): ChannelWithMeta[] {
    const channels = localStorage.getItem('channels')
    if (!channels) {
      return []
    }
    const parsed = JSON.parse(channels) as StoredChannel[]
    return parsed.map(fromStoredChannel)
  },

  setChannels(channels: ChannelWithMeta[]): void {
    const payload = channels.map(toStoredChannel)
    localStorage.setItem('channels', JSON.stringify(payload))
  },

  addChannel(channel: ChannelWithMeta): ChannelWithMeta[] {
    const channels = this.getChannels()
    channels.push(channel)
    this.setChannels(channels)
    return channels
  },

  updateChannel(channelId: number, updates: Partial<ChannelWithMeta>): ChannelWithMeta[] {
    const channels = this.getChannels().map(channel => {
      if (channel.id !== channelId) {
        return channel
      }
      const updated = { ...channel, ...updates } as ChannelWithMeta
      if (updated.createdAt && !(updated.createdAt instanceof Date)) {
        updated.createdAt = new Date(updated.createdAt)
      }
      if (updated.lastActivityAt && !(updated.lastActivityAt instanceof Date)) {
        updated.lastActivityAt = new Date(updated.lastActivityAt)
      }
      return updated
    })
    this.setChannels(channels)
    return channels
  },

  removeChannel(channelId: number): ChannelWithMeta[] {
    const channels = this.getChannels()
    const filtered = channels.filter(ch => ch.id !== channelId)
    this.setChannels(filtered)
    return filtered
  },

  getMessages(channelId: number): Message[] {
    const key = `messages_${channelId}`
    const messages = localStorage.getItem(key)
    if (!messages) {
      return []
    }
    const parsed = JSON.parse(messages) as StoredMessage[]
    return parsed.map(fromStoredMessage)
  },

  setMessages(channelId: number, messages: Message[]): void {
    const key = `messages_${channelId}`
    const toSave = messages.slice(-100).map(toStoredMessage)
    localStorage.setItem(key, JSON.stringify(toSave))
  },

  addMessage(channelId: number, message: Message): Message[] {
    const messages = this.getMessages(channelId)
    messages.push(message)
    this.setMessages(channelId, messages)
    return messages
  },

  getMembers(channelId: number): User[] {
    const key = `members_${channelId}`
    const members = localStorage.getItem(key)
    if (!members) {
      return []
    }
    const parsed = JSON.parse(members) as StoredUser[]
    return parsed.map(fromStoredUser)
  },

  setMembers(channelId: number, members: User[]): void {
    const key = `members_${channelId}`
    const payload = members.map(toStoredUser)
    localStorage.setItem(key, JSON.stringify(payload))
  },

  getSettings(): UserSettings {
    const settings = localStorage.getItem('userSettings')
    return fromStoredSettings(settings ? (JSON.parse(settings) as StoredSettings) : null)
  },

  setSettings(settings: UserSettings): void {
    localStorage.setItem('userSettings', JSON.stringify(toStoredSettings(settings)))
  },

  clearAll(): void {
    localStorage.clear()
  }
}
