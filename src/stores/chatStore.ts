import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Channel, Message, User, TypingIndicator } from '../types'
import { useAuthStore } from './authStore'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()

  // State
  const channels = ref<Channel[]>([])
  const currentChannelId = ref<number | null>(null)
  const messages = ref<Record<number, Message[]>>({})
  const channelMembers = ref<Record<number, User[]>>({})
  const typingIndicators = ref<Record<number, TypingIndicator[]>>({})
  const mentionOnlyNotifications = ref(false)

  // Getters
  const currentChannel = computed(() => 
    channels.value.find(c => c.id === currentChannelId.value) || null
  )

  const currentMessages = computed(() => 
    currentChannelId.value ? messages.value[currentChannelId.value] || [] : []
  )

  const currentMembers = computed(() => 
    currentChannelId.value ? channelMembers.value[currentChannelId.value] || [] : []
  )

  const currentTypingUsers = computed(() => {
    if (!currentChannelId.value) return []
    return typingIndicators.value[currentChannelId.value] || []
  })

  const unreadChannels = computed(() => 
    channels.value.filter(c => (c.unreadCount || 0) > 0)
  )

  // Actions
  async function loadChannels() {
    try {
      // TODO: Fetch from backend
      // const response = await api.get('/channels')
      
      // Mock data
      channels.value = [
        {
          id: 1,
          name: 'všeobecné',
          isPrivate: false,
          adminId: 1,
          createdAt: new Date(),
          lastActivityAt: new Date(),
          unreadCount: 0
        },
        {
          id: 2,
          name: 'random',
          isPrivate: false,
          adminId: 1,
          createdAt: new Date(),
          lastActivityAt: new Date(),
          unreadCount: 3
        }
      ]
    } catch (error) {
      console.error('Failed to load channels:', error)
    }
  }

  async function selectChannel(channelId: number) {
    currentChannelId.value = channelId
    
    // Mark as read
    const channel = channels.value.find(c => c.id === channelId)
    if (channel) {
      channel.unreadCount = 0
      channel.isNewInvite = false
    }
    
    // Load messages if not already loaded
    if (!messages.value[channelId]) {
      await loadMessages(channelId)
    }
    
    // Load members if not already loaded
    if (!channelMembers.value[channelId]) {
      await loadChannelMembers(channelId)
    }
  }

  async function loadMessages(channelId: number, before?: number) {
    try {
      // TODO: Fetch from backend with pagination
      // const response = await api.get(`/channels/${channelId}/messages`, { params: { before } })
      
      // Mock data
      if (!messages.value[channelId]) {
        messages.value[channelId] = []
      }
      
      const mockMessages: Message[] = [
        {
          id: 1,
          channelId,
          authorId: 2,
          author: 'Eva',
          content: 'Ahoj všetci!',
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          id: 2,
          channelId,
          authorId: 3,
          author: 'Peter',
          content: `@${authStore.userNickName} potrebujem tvoju pomoc`,
          timestamp: new Date(Date.now() - 1800000),
          mentionedUserIds: [authStore.user?.id || 0],
          mentionsMe: true
        }
      ]
      
      if (before) {
        // Prepend older messages
        messages.value[channelId] = [...mockMessages, ...messages.value[channelId]]
      } else {
        messages.value[channelId] = mockMessages
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  async function loadChannelMembers(channelId: number) {
    try {
      // TODO: Fetch from backend
      // const response = await api.get(`/channels/${channelId}/members`)
      
      // Mock data
      channelMembers.value[channelId] = [
        {
          id: 1,
          firstName: 'Ján',
          lastName: 'Novák',
          nickName: 'JanNovak',
          email: 'jan@example.com',
          status: 'online'
        },
        {
          id: 2,
          firstName: 'Eva',
          lastName: 'Hrušková',
          nickName: 'Eva',
          email: 'eva@example.com',
          status: 'dnd'
        },
        {
          id: 3,
          firstName: 'Peter',
          lastName: 'Kovač',
          nickName: 'Peter',
          email: 'peter@example.com',
          status: 'offline'
        }
      ]
    } catch (error) {
      console.error('Failed to load channel members:', error)
    }
  }

  async function sendMessage(content: string) {
    if (!currentChannelId.value || !authStore.user) return

    // Check for mentions
    const mentionMatches = content.match(/@(\w+)/g) || []
    const _mentionedNickNames = mentionMatches.map(m => m.substring(1))
    
    const newMessage: Message = {
      id: Date.now(),
      channelId: currentChannelId.value,
      authorId: authStore.user.id,
      author: authStore.user.nickName,
      content,
      timestamp: new Date(),
      mentionedUserIds: [] // TODO: Map nicknames to user IDs
    }

    // Add to local state
    if (!messages.value[currentChannelId.value]) {
      messages.value[currentChannelId.value] = []
    }
    messages.value[currentChannelId.value]?.push(newMessage)

    try {
      // TODO: Send to backend
      // await api.post(`/channels/${currentChannelId.value}/messages`, { content })
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove message from local state if failed
      const messagesArray = messages.value[currentChannelId.value!]
      if (messagesArray) {
        const index = messagesArray.findIndex(m => m.id === newMessage.id)
        if (index > -1) {
          messagesArray.splice(index, 1)
        }
      }
    }
  }

  async function createChannel(name: string, isPrivate: boolean) {
    try {
      // TODO: Send command to backend: /join channelName [private]
      // const response = await api.post('/channels', { name, isPrivate })
      
      const newChannel: Channel = {
        id: Date.now(),
        name,
        isPrivate,
        adminId: authStore.user?.id || 0,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        unreadCount: 0
      }
      
      channels.value.push(newChannel)
      return { success: true, channel: newChannel }
    } catch (error) {
      console.error('Failed to create channel:', error)
      return { success: false, error: 'Nepodarilo sa vytvoriť kanál' }
    }
  }

  async function leaveChannel(channelId: number) {
    try {
      // TODO: Send command to backend: /cancel
      // await api.delete(`/channels/${channelId}/members/me`)
      
      // Remove from local state
      const index = channels.value.findIndex(c => c.id === channelId)
      if (index > -1) {
        channels.value.splice(index, 1)
      }
      
      // Clear messages and members
      delete messages.value[channelId]
      delete channelMembers.value[channelId]
      
      // Switch to another channel if this was current
      if (currentChannelId.value === channelId) {
        currentChannelId.value = channels.value[0]?.id || null
      }
      
      return { success: true }
    } catch (error) {
      console.error('Failed to leave channel:', error)
      return { success: false, error: 'Nepodarilo sa opustiť kanál' }
    }
  }

  async function inviteUser(_channelId: number, nickName: string) {
    try {
      // TODO: Send command to backend: /invite @nickName
      // await api.post(`/channels/${channelId}/members`, { nickName })
      
      return { success: true, message: `Používateľ @${nickName} bol pozvaný` }
    } catch (error) {
      console.error('Failed to invite user:', error)
      return { success: false, error: 'Nepodarilo sa pozvať používateľa' }
    }
  }

  async function kickUser(_channelId: number, nickName: string) {
    try {
      // TODO: Send command to backend: /kick @nickName
      // await api.post(`/channels/${channelId}/kick`, { nickName })
      
      return { success: true, message: `Používateľ @${nickName} bol vyhodený` }
    } catch (error) {
      console.error('Failed to kick user:', error)
      return { success: false, error: 'Nepodarilo sa vyhodiť používateľa' }
    }
  }

  function setTyping(_channelId: number, _isTyping: boolean) {
    // TODO: Emit to WebSocket
    // socket.emit('typing', { channelId, isTyping })
  }

  function handleIncomingMessage(message: Message) {
    if (!messages.value[message.channelId]) {
      messages.value[message.channelId] = []
    }
    // Ensure the array exists before pushing
    const messagesArray = messages.value[message.channelId]
    if (messagesArray) {
      messagesArray.push(message)
    }
    
    // Update channel last activity
    const channel = channels.value.find(c => c.id === message.channelId)
    if (channel) {
      channel.lastActivityAt = message.timestamp
      
      // Increment unread count if not current channel
      if (message.channelId !== currentChannelId.value) {
        channel.unreadCount = (channel.unreadCount || 0) + 1
      }
    }
    
    // Check if should notify
    const shouldNotify = !mentionOnlyNotifications.value || message.mentionsMe
    if (shouldNotify && message.authorId !== authStore.user?.id) {
      // TODO: Show browser notification if app not visible
      showNotification(message)
    }
  }

  function handleTypingIndicator(indicator: TypingIndicator) {
    if (!typingIndicators.value[indicator.channelId]) {
      typingIndicators.value[indicator.channelId] = []
    }
    
    const existing = typingIndicators.value[indicator.channelId]?.findIndex(
      t => t.userId === indicator.userId
    ) ?? -1
    
    if (indicator.isTyping) {
      if (existing === -1) {
        if (!typingIndicators.value[indicator.channelId]) {
          typingIndicators.value[indicator.channelId] = []
        }
        // Ensure array exists before pushing
        const indicatorsArray = typingIndicators.value[indicator.channelId]
        if (indicatorsArray) {
          indicatorsArray.push(indicator)
        }
      }
    } else {
      if (existing > -1 && typingIndicators.value[indicator.channelId]) {
        const indicatorsArray = typingIndicators.value[indicator.channelId]
        if (indicatorsArray) {
          indicatorsArray.splice(existing, 1)
        }
      }
    }
  }

  function showNotification(message: Message) {
    // Check if app is visible
    if (document.visibilityState === 'visible') return
    
    // Check browser notification permission
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`${message.author} v #${currentChannel.value?.name}`, {
        body: message.content.substring(0, 100),
        icon: '/favicon.ico',
        tag: `message-${message.id}`
      })
      
      notification.onclick = () => {
        window.focus()
        selectChannel(message.channelId)
        notification.close()
      }
    }
  }

  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  return {
    // State
    channels,
    currentChannelId,
    messages,
    channelMembers,
    typingIndicators,
    mentionOnlyNotifications,
    // Getters
    currentChannel,
    currentMessages,
    currentMembers,
    currentTypingUsers,
    unreadChannels,
    // Actions
    loadChannels,
    selectChannel,
    loadMessages,
    loadChannelMembers,
    sendMessage,
    createChannel,
    leaveChannel,
    inviteUser,
    kickUser,
    setTyping,
    handleIncomingMessage,
    handleTypingIndicator,
    requestNotificationPermission
  }
})