import { Storage } from './storage'
import type { Channel, Message, User } from '../types'
import staticData from './staticData.json'

type StaticMessage = Omit<Message, 'timestamp' | 'editedAt'> & {
  timestamp: string
  editedAt?: string
}

type StaticChannel = Omit<Channel, 'createdAt' | 'lastActivityAt'> & {
  createdAt: string
  lastActivityAt: string
  members: User[]
  messages: StaticMessage[]
}

interface StaticData {
  user: User
  channels: StaticChannel[]
}

function parseChannel(channel: StaticChannel): Channel {
  return {
    ...channel,
    unreadCount: channel.unreadCount ?? 0,
    createdAt: new Date(channel.createdAt),
    lastActivityAt: new Date(channel.lastActivityAt)
  }
}

function parseMessages(messages: StaticMessage[]): Message[] {
  return messages.map(({ timestamp, editedAt, ...rest }) => {
    const base: Message = {
      ...rest,
      timestamp: new Date(timestamp)
    }
    if (editedAt) {
      base.editedAt = new Date(editedAt)
    }
    return base
  })
}

export function initializeStaticData(): void {
  const data = staticData as StaticData
  if (!Storage.getCurrentUser()) {
    Storage.setCurrentUser(data.user)
  }

  const existingChannels = Storage.getChannels()
  if (existingChannels.length === 0) {
    const channels = data.channels.map(parseChannel)
    Storage.setChannels(channels)
  } else {
    const existingIds = new Set(existingChannels.map(channel => channel.id))
    const newChannels = data.channels
      .filter(channel => !existingIds.has(channel.id))
      .map(parseChannel)
    if (newChannels.length > 0) {
      Storage.setChannels([...existingChannels, ...newChannels])
    }
  }

  data.channels.forEach(channel => {
    if (Storage.getMembers(channel.id).length === 0) {
      Storage.setMembers(channel.id, channel.members)
    }
    const parsedMessages = parseMessages(channel.messages)
    if (Storage.getMessages(channel.id).length === 0 && parsedMessages.length > 0) {
      Storage.setMessages(channel.id, parsedMessages)
    }
  })
}
