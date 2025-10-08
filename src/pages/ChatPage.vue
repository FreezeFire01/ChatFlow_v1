<template>
  <q-page class="column no-wrap">
    <!-- Messages Area -->
    <q-scroll-area 
      ref="scrollArea"
      class="col"
      @scroll="onScroll"
    >
      <!-- Load More Button -->
      <div 
        v-if="hasMoreMessages" 
        class="text-center q-pa-md"
      >
        <q-btn
          flat
          dense
          label="Načítať staršie správy"
          icon="expand_less"
          color="primary"
          :loading="loadingMore"
          @click="loadMoreMessages"
        />
      </div>

      <!-- Messages Container -->
      <div class="q-pa-md">
        <!-- Date Separators and Messages -->
        <template v-for="(item, index) in messagesWithDates" :key="`item-${index}`">
          <!-- Date Separator -->
          <div 
            v-if="item.type === 'date'" 
            class="date-separator q-my-md"
          >
            <q-chip 
              color="grey-4" 
              text-color="grey-8" 
              icon="event" 
              square
            >
              {{ item.label }}
            </q-chip>
          </div>

          <!-- Message Item -->
          <message-item
            v-else-if="item.type === 'message'"
            :message="item.data"
            :is-own="item.data.authorId === currentUserId"
            :current-user-id="currentUserId"
            @reply="handleReply"
            @edit="handleEdit"
            @delete="handleDelete"
            @copy="handleCopy"
          />
        </template>

        <!-- Empty State -->
        <div 
          v-if="messages.length === 0 && !loading" 
          class="text-center q-pa-xl"
        >
          <q-icon name="forum" size="80px" color="grey-5" />
          <div class="text-h6 text-grey-7 q-mt-md">Žiadne správy</div>
          <div class="text-caption text-grey-6">Buď prvý, kto napíše správu!</div>
        </div>
      </div>
    </q-scroll-area>

    <!-- Typing Indicator -->
    <q-slide-transition>
      <div 
        v-if="typingUsers.length > 0" 
        class="q-pa-sm bg-grey-2"
      >
        <div class="text-caption">
          <q-icon name="edit" size="xs" class="q-mr-xs" />
          {{ typingText }}
        </div>
      </div>
    </q-slide-transition>

    <!-- Message Input -->
    <message-input
      :channel-id="channelId"
      :members="members"
      @message-sent="handleMessageSent"
      @command-executed="handleCommand"
      @typing="handleTyping"
    />

    <!-- Scroll to Bottom FAB -->
    <q-page-sticky 
      position="bottom-right" 
      :offset="[18, 90]"
    >
      <transition name="q-transition--scale">
        <q-btn
          v-if="showScrollButton"
          fab
          icon="keyboard_arrow_down"
          color="primary"
          size="md"
          @click="() => scrollToBottom()"
        >
          <q-badge 
            v-if="unreadCount > 0" 
            color="red" 
            floating
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </q-badge>
        </q-btn>
      </transition>
    </q-page-sticky>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, type PropType, nextTick } from 'vue'
import type { QScrollArea } from 'quasar'
import MessageInput from '../components/MessageInput.vue'
import MessageItem from '../components/MessageItem.vue'
import { Storage } from '../utils/storage'
import type { ChatMessage, Message, User } from '../types'

interface TypingPayload {
  isTyping: boolean
  userId: number
}

type MessageWithDate = { type: 'date'; label: string }
type MessageEntry = { type: 'message'; data: ChatMessage }
type MessageListItem = MessageWithDate | MessageEntry

function toChatMessage(message: Message): ChatMessage {
  const base: ChatMessage = {
    id: message.id,
    channelId: message.channelId,
    content: message.content,
    author: message.author,
    authorId: message.authorId,
    timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
  }
  if (message.mentionsMe !== undefined) {
    base.mentionsMe = message.mentionsMe
  }
  if (message.mentionedUserIds) {
    base.mentionedUserIds = message.mentionedUserIds
  }
  if (message.editedAt) {
    base.editedAt = message.editedAt instanceof Date ? message.editedAt : new Date(message.editedAt)
  }
  return base
}

function toDomainMessage(message: ChatMessage): Message {
  const base: Message = {
    id: message.id,
    channelId: message.channelId,
    content: message.content,
    author: message.author,
    authorId: message.authorId,
    timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
  }
  if (message.mentionsMe !== undefined) {
    base.mentionsMe = message.mentionsMe
  }
  if (message.mentionedUserIds) {
    base.mentionedUserIds = message.mentionedUserIds
  }
  if (message.editedAt) {
    base.editedAt = message.editedAt instanceof Date ? message.editedAt : new Date(message.editedAt)
  }
  return base
}

export default defineComponent({
  name: 'ChatPage',
  components: {
    MessageInput,
    MessageItem
  },
  props: {
    channelId: {
      type: Number,
      required: true
    },
    currentUser: {
      type: Object as PropType<User>,
      required: true
    },
    members: {
      type: Array as PropType<User[]>,
      default: () => []
    }
  },
  emits: ['message-sent', 'command-executed'],
  data() {
    return {
      messages: [] as ChatMessage[],
      storageEventHandler: null as ((event: StorageEvent) => void) | null,
      loading: false,
      loadingMore: false,
      hasMoreMessages: true,
      showScrollButton: false,
      unreadCount: 0,
      typingUsers: [] as User[],
      typingTimers: {} as Record<number, number>,
      lastScrollPosition: 0
    }
  },
  computed: {
    currentUserId(): number {
      return this.currentUser?.id ?? 0
    },
    messagesWithDates(): MessageListItem[] {
      const result: MessageListItem[] = []
      let lastDate = ''
      this.messages.forEach(message => {
        const messageDate = this.formatDate(new Date(message.timestamp))
        if (messageDate !== lastDate) {
          result.push({ type: 'date', label: messageDate })
          lastDate = messageDate
        }
        result.push({ type: 'message', data: message })
      })
      return result
    },
    typingText(): string {
      if (this.typingUsers.length === 0) {
        return ''
      }
      const [first, second] = this.typingUsers
      if (!first) {
        return ''
      }
      if (this.typingUsers.length === 1) {
        return `${first.nickName} píše...`
      }
      if (this.typingUsers.length === 2 && second) {
        return `${first.nickName} a ${second.nickName} píšu...`
      }
      return `${this.typingUsers.length} ľudí píše...`
    }
  },
  watch: {
    channelId: {
      immediate: true,
      handler(newId: number) {
        if (newId) {
          this.loadMessages()
        }
      }
    },
    messages: {
      deep: true,
      handler() {
        nextTick(() => {
          if (!this.showScrollButton) {
            this.scrollToBottom()
          } else {
            this.unreadCount += 1
          }
        })
      }
    }
  },
  mounted() {
    this.setupEventListeners()
    this.loadMessages()
  },
  beforeUnmount() {
    this.cleanupEventListeners()
    this.cleanupTypingTimers()
  },
  methods: {
    loadMessages(): void {
      console.log('Loading messages for channel:', this.channelId)
      this.loading = true
      const storedMessages = Storage.getMessages(this.channelId)
      console.log('Stored messages:', storedMessages)
      if (storedMessages.length > 0) {
        this.messages = storedMessages.map(toChatMessage)
      } else {
        const welcomeMessage: ChatMessage = {
          id: Date.now(),
          channelId: this.channelId,
          content: 'Vitajte v kanáli! Použite /help pre zoznam príkazov.',
          author: 'System',
          authorId: 0,
          timestamp: new Date()
        }
        this.messages = [welcomeMessage]
        this.saveMessages()
      }
      this.loading = false
      nextTick(() => {
        this.scrollToBottom(false)
      })
    },
    loadMoreMessages(): void {
      if (this.loadingMore || !this.hasMoreMessages) {
        return
      }
      this.loadingMore = true
      window.setTimeout(() => {
        const oldestTimestamp = this.messages[0]?.timestamp || new Date()
        const baseTime = new Date(oldestTimestamp).getTime()
        const olderMessages: ChatMessage[] = []
        for (let index = 1; index <= 10; index += 1) {
          olderMessages.push({
            id: -index,
            channelId: this.channelId,
            content: `Staršia správa ${index}`,
            author: 'HistoryBot',
            authorId: -1,
            timestamp: new Date(baseTime - index * 3600000)
          })
        }
        this.messages = [...olderMessages.reverse(), ...this.messages]
        this.loadingMore = false
        if (this.messages.length > 50) {
          this.hasMoreMessages = false
        }
      }, 500)
    },
    saveMessages(): void {
      const payload = this.messages.map(toDomainMessage)
      Storage.setMessages(this.channelId, payload)
    },
    handleMessageSent(message: ChatMessage): void {
      this.messages.push(message)
      this.saveMessages()
      this.$emit('message-sent', message)
      nextTick(() => {
        this.scrollToBottom()
      })
    },
    handleCommand(commandData: { command: string; args: string[] }): void {
      const { command } = commandData
      switch (command) {
        case '/clear':
          this.clearMessages()
          break
        case '/help':
          this.showHelp()
          break
        default:
          this.$emit('command-executed', commandData)
      }
    },
    handleReply(message: ChatMessage): void {
      this.$q.notify({
        type: 'info',
        message: `Odpovedáš na: ${message.content.substring(0, 50)}...`,
        position: 'top'
      })
    },
    handleEdit(): void {
      this.$q.dialog({
        title: 'Upraviť správu',
        message: 'Funkcia úpravy správ bude čoskoro dostupná',
        ok: true
      })
    },
    handleDelete(message: ChatMessage): void {
      this.$q
        .dialog({
          title: 'Zmazať správu',
          message: 'Naozaj chceš zmazať túto správu?',
          cancel: true,
          ok: {
            label: 'Zmazať',
            color: 'negative'
          }
        })
        .onOk(() => {
          const index = this.messages.findIndex(entry => entry.id === message.id)
          if (index > -1) {
            this.messages.splice(index, 1)
            this.saveMessages()
          }
        })
    },
    handleCopy(message: ChatMessage): void {
      if (!navigator.clipboard) {
        this.$q.notify({
          type: 'warning',
          message: 'Kopírovanie nie je na tomto zariadení podporované',
          position: 'top'
        })
        return
      }
      navigator.clipboard.writeText(message.content).then(() => {
        this.$q.notify({
          type: 'positive',
          message: 'Správa skopírovaná',
          position: 'top',
          timeout: 1000
        })
      })
    },
    handleTyping(payload: TypingPayload): void {
      const { isTyping, userId } = payload
      if (userId === this.currentUserId) {
        return
      }
      if (isTyping) {
        this.addTypingUser(userId)
      } else {
        this.removeTypingUser(userId)
      }
    },
    addTypingUser(userId: number): void {
      const user = this.members.find(member => member.id === userId)
      if (!user) {
        return
      }
      const existing = this.typingUsers.find(typingUser => typingUser.id === userId)
      if (!existing) {
        this.typingUsers.push(user)
      }
      if (this.typingTimers[userId]) {
        window.clearTimeout(this.typingTimers[userId])
      }
      this.typingTimers[userId] = window.setTimeout(() => {
        this.removeTypingUser(userId)
      }, 3000)
    },
    removeTypingUser(userId: number): void {
      const index = this.typingUsers.findIndex(user => user.id === userId)
      if (index > -1) {
        this.typingUsers.splice(index, 1)
      }
      if (this.typingTimers[userId]) {
        window.clearTimeout(this.typingTimers[userId])
        delete this.typingTimers[userId]
      }
    },
    cleanupTypingTimers(): void {
      Object.values(this.typingTimers).forEach(timerId => {
        window.clearTimeout(timerId)
      })
      this.typingTimers = {}
    },
    onScroll(info: { verticalPosition: number }): void {
      this.lastScrollPosition = info.verticalPosition
      const scrollArea = this.$refs.scrollArea as QScrollArea | undefined
      if (!scrollArea) {
        return
      }
      const scrollTarget = scrollArea.getScrollTarget()
      const isAtBottom =
        scrollTarget.scrollHeight - info.verticalPosition - scrollTarget.clientHeight < 100
      this.showScrollButton = !isAtBottom && this.messages.length > 10
      if (isAtBottom) {
        this.unreadCount = 0
      }
    },
    scrollToBottom(animated = true): void {
      const scrollArea = this.$refs.scrollArea as QScrollArea | undefined
      if (!scrollArea) {
        return
      }
      const scrollTarget = scrollArea.getScrollTarget()
      scrollArea.setScrollPosition('vertical', scrollTarget.scrollHeight, animated ? 300 : 0)
      this.showScrollButton = false
      this.unreadCount = 0
    },
    formatDate(date: Date): string {
      const today = new Date()
      const messageDate = new Date(date)
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const messageDateOnly = new Date(
        messageDate.getFullYear(),
        messageDate.getMonth(),
        messageDate.getDate()
      )
      const diffTime = todayDate.getTime() - messageDateOnly.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays === 0) {
        return 'Dnes'
      }
      if (diffDays === 1) {
        return 'Včera'
      }
      if (diffDays < 7) {
        return messageDate.toLocaleDateString('sk-SK', { weekday: 'long' })
      }
      return messageDate.toLocaleDateString('sk-SK', {
        day: 'numeric',
        month: 'long',
        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    },
    clearMessages(): void {
      this.$q
        .dialog({
          title: 'Vymazať históriu',
          message: 'Naozaj chceš vymazať všetky správy?',
          cancel: true,
          ok: {
            label: 'Vymazať',
            color: 'negative'
          }
        })
        .onOk(() => {
          this.messages = []
          this.saveMessages()
        })
    },
    showHelp(): void {
      const helpMessage: ChatMessage = {
        id: Date.now(),
        channelId: this.channelId,
        content: `📋 **Dostupné príkazy:**
/join channelName [private] - Vytvor/pripoj sa do kanála
/invite @nickName - Pozvi používateľa
/kick @nickName - Vyhoď používateľa  
/cancel - Opusť kanál
/quit - Zruš kanál (admin)
/list - Zobraz členov
/clear - Vymaž históriu
/help - Zobraz túto nápovedu`,
        author: 'System',
        authorId: 0,
        timestamp: new Date()
      }
      this.messages.push(helpMessage)
      this.saveMessages()
    },
    setupEventListeners(): void {
      this.storageEventHandler = this.handleStorageChange.bind(this)
      window.addEventListener('storage', this.storageEventHandler)
    },
    cleanupEventListeners(): void {
      if (this.storageEventHandler) {
        window.removeEventListener('storage', this.storageEventHandler)
        this.storageEventHandler = null
      }
    },
    handleStorageChange(event: StorageEvent): void {
      if (event.key === `messages_${this.channelId}`) {
        const stored = Storage.getMessages(this.channelId)
        this.messages = stored.map(toChatMessage)
      }
    }
  }
})

</script>

<style scoped>
.date-separator {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 24px 0;
}
</style>