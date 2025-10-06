<template>
  <q-page class="column no-wrap bg-grey-1">
    <!-- Messages Area -->
    <div class="col scroll">
      <q-scroll-area ref="scrollAreaRef" class="fit">
        <!-- Load More Button -->
        <div v-if="hasMoreMessages" class="text-center q-pa-md">
          <q-btn
            flat
            dense
            rounded
            label="Načítať staršie správy"
            icon="expand_less"
            color="primary"
            @click="void loadMoreMessages()"
            :loading="loadingMore"
            size="sm"
          />
        </div>

        <!-- Messages List -->
        <div class="q-pa-md">
          <transition-group name="message">
            <div
              v-for="message in messages"
              :key="message.id"
              :class="[
                'q-mb-md rounded-borders q-pa-sm transition',
                { 'bg-amber-1': message.mentionsMe },
                { 'hover-effect': true }
              ]"
            >
              <!-- Message Header -->
              <div class="row items-center no-wrap q-mb-xs">
                <q-avatar :color="getUserColor(message.author)" text-color="white" size="36px">
                  {{ message.author.charAt(0).toUpperCase() }}
                </q-avatar>
                
                <div class="q-ml-sm">
                  <span class="text-weight-bold text-body1">{{ message.author }}</span>
                  <span class="text-caption text-grey-7 q-ml-sm">
                    {{ formatTime(message.timestamp) }}
                  </span>
                </div>

                <q-space />

                <!-- Message Actions -->
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="more_vert"
                  class="message-actions"
                >
                  <q-menu>
                    <q-list dense style="min-width: 120px">
                      <q-item clickable v-close-popup>
                        <q-item-section avatar><q-icon name="reply" size="xs" /></q-item-section>
                        <q-item-section>Odpovedať</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup>
                        <q-item-section avatar><q-icon name="content_copy" size="xs" /></q-item-section>
                        <q-item-section>Kopírovať</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </div>

              <!-- Message Content -->
              <div class="q-ml-lg q-pl-md text-body2" v-html="formatMessage(message.content)"></div>

              <!-- Mention Badge -->
              <q-badge
                v-if="message.mentionsMe"
                color="amber"
                text-color="amber-10"
                label="Bol si spomenutý"
                class="q-ml-lg q-mt-xs"
              />
            </div>
          </transition-group>

          <!-- Empty State -->
          <div v-if="messages.length === 0" class="text-center q-pa-xl">
            <q-icon name="forum" size="80px" color="grey-5" />
            <div class="text-h6 text-grey-7 q-mt-md">Žiadne správy</div>
            <div class="text-caption text-grey-6">Buď prvý, kto napíše správu!</div>
          </div>
        </div>
      </q-scroll-area>
    </div>

    <!-- Message Input (Sticky Bottom) -->
    <div class="bg-white q-pa-md" style="border-top: 1px solid #e0e0e0">
      <q-input
        ref="messageInputRef"
        v-model="newMessage"
        placeholder="Napíš správu alebo príkaz (/join, /invite, /kick, /list...)"
        outlined
        autogrow
        dense
        bg-color="grey-1"
        :maxlength="2000"
        @keyup.enter.exact="void sendMessage()"
        @input="onTyping"
        class="message-input"
      >
        <template v-slot:prepend>
          <q-icon name="terminal" color="primary" />
        </template>

        <template v-slot:append>
          <!-- Emoji Picker -->
          <q-btn flat dense round icon="emoji_emotions" size="sm" color="grey-7">
            <q-menu>
              <div class="q-pa-md" style="max-width: 320px">
                <div class="text-caption text-weight-bold q-mb-sm">Rýchle emoji</div>
                <div class="row q-col-gutter-xs">
                  <div v-for="emoji in quickEmojis" :key="emoji" class="col-3">
                    <q-btn
                      flat
                      dense
                      :label="emoji"
                      @click="insertEmoji(emoji)"
                      class="full-width"
                      size="md"
                    />
                  </div>
                </div>
              </div>
            </q-menu>
          </q-btn>

          <!-- Send Button -->
          <q-btn
            flat
            dense
            round
            icon="send"
            size="sm"
            color="primary"
            @click="void sendMessage()"
            :disable="!newMessage.trim()"
          >
            <q-tooltip>Enter na odoslanie</q-tooltip>
          </q-btn>
        </template>
      </q-input>

      <!-- Command Hints -->
      <q-slide-transition>
        <div v-show="showCommandHints" class="q-mt-sm">
          <div class="row q-gutter-xs">
            <q-chip
              v-for="hint in filteredCommandHints"
              :key="hint.command"
              clickable
              @click="insertCommand(hint.command)"
              color="primary"
              text-color="white"
              size="sm"
              dense
            >
              <q-icon name="terminal" size="xs" class="q-mr-xs" />
              <strong>{{ hint.command }}</strong>
              <q-tooltip>{{ hint.description }}</q-tooltip>
            </q-chip>
          </div>
        </div>
      </q-slide-transition>

      <!-- Character Counter -->
      <div class="text-right text-caption text-grey-6 q-mt-xs">
        {{ newMessage.length }} / 2000
      </div>
    </div>

    <!-- Scroll to Bottom FAB -->
    <q-page-sticky position="bottom-right" :offset="[18, 90]">
      <q-fab
        v-show="showScrollButton"
        icon="keyboard_arrow_down"
        direction="up"
        color="primary"
        @click="scrollToBottom"
      >
        <q-badge v-if="unreadCount > 0" color="red" :label="unreadCount" floating />
      </q-fab>
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useQuasar, type QScrollArea, type QInput } from 'quasar'

const $q = useQuasar()

// Refs
const scrollAreaRef = ref<QScrollArea>()
const messageInputRef = ref<QInput>()
const newMessage = ref('')
const messages = ref<Array<{
  id: number
  author: string
  content: string
  timestamp: Date
  mentionsMe: boolean
}>>([])
const loadingMore = ref(false)
const hasMoreMessages = ref(true)
const showScrollButton = ref(false)
const unreadCount = ref(0)
let typingTimeout: NodeJS.Timeout | null = null

const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🚀', '✨', '🔥', '💯', '🤔']

// Mock Messages
const mockMessages = [
  {
    id: 1,
    author: 'Eva',
    content: 'Ahoj všetci! Ako sa máte?',
    timestamp: new Date(Date.now() - 3600000),
    mentionsMe: false
  },
  {
    id: 2,
    author: 'Peter',
    content: 'Skvelé, práve pracujem na projekte!',
    timestamp: new Date(Date.now() - 1800000),
    mentionsMe: false
  },
  {
    id: 3,
    author: 'JanNovak',
    content: '@Eva potrebujem sa ťa niečo spýtať',
    timestamp: new Date(Date.now() - 900000),
    mentionsMe: false
  },
  {
    id: 4,
    author: 'Eva',
    content: '@JanNovak samozrejme, povedz!',
    timestamp: new Date(Date.now() - 300000),
    mentionsMe: true
  }
]

// Command hints
const commandHints = [
  { command: '/join channelName', description: 'Vytvor/pripoj sa do kanála' },
  { command: '/join channelName private', description: 'Vytvor súkromný kanál' },
  { command: '/invite @nickName', description: 'Pozvi používateľa' },
  { command: '/kick @nickName', description: 'Vyhoď používateľa' },
  { command: '/revoke @nickName', description: 'Odoberte prístup (admin)' },
  { command: '/cancel', description: 'Opusť kanál' },
  { command: '/quit', description: 'Zruš kanál (admin)' },
  { command: '/list', description: 'Zobraz členov kanála' }
]

const showCommandHints = computed(() => {
  return newMessage.value.startsWith('/') && newMessage.value.length > 1
})

const filteredCommandHints = computed(() => {
  if (!showCommandHints.value) return []
  const search = newMessage.value.toLowerCase()
  return commandHints.filter(hint => hint.command.toLowerCase().includes(search)).slice(0, 5)
})

onMounted(() => {
  messages.value = [...mockMessages]
  scrollToBottom(false)
})

async function loadMoreMessages() {
  loadingMore.value = true
  
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const olderMessages = [
    {
      id: Date.now(),
      author: 'Admin',
      content: 'Vitajte v kanáli!',
      timestamp: new Date(Date.now() - 7200000),
      mentionsMe: false
    }
  ]
  
  messages.value = [...olderMessages, ...messages.value]
  loadingMore.value = false
  
  if (messages.value.length > 20) {
    hasMoreMessages.value = false
  }
}

function formatMessage(content: string): string {
  let formatted = content
  
  // Format @mentions
  formatted = formatted.replace(/@(\w+)/g, '<span class="text-primary text-weight-bold bg-primary-1 q-px-xs rounded-borders">@$1</span>')
  
  // Format URLs
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" class="text-primary">$1</a>'
  )
  
  // Format **bold**
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // Format *italic*
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
  
  return formatted
}

function formatTime(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  
  if (minutes < 1) return 'Teraz'
  if (minutes < 60) return `Pred ${minutes} min`
  if (hours < 24) return `Pred ${hours} h`
  
  return timestamp.toLocaleDateString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getUserColor(nickname: string): string {
  const colors = ['purple', 'blue', 'green', 'orange', 'red', 'teal', 'pink', 'indigo']
  const hash = nickname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length] || 'blue'
}

async function sendMessage() {
  if (!newMessage.value.trim()) return
  
  const message = newMessage.value.trim()
  
  if (message.startsWith('/')) {
    handleCommand(message)
  } else {
    const newMsg = {
      id: Date.now(),
      author: 'JanNovak',
      content: message,
      timestamp: new Date(),
      mentionsMe: false
    }
    
    messages.value.push(newMsg)
  }
  
  newMessage.value = ''
  await nextTick()
  scrollToBottom()
}

function handleCommand(command: string) {
  const parts = command.split(' ')
  const cmd = parts[0]?.toLowerCase() || ''
  const args = parts.slice(1)
  
  let message = ''
  let type: 'positive' | 'negative' | 'warning' | 'info' = 'info'
  
  switch (cmd) {
    case '/join':
      if (args.length === 0) {
        message = 'Použitie: /join channelName [private]'
        type = 'warning'
      } else {
        message = `Pripájaš sa do kanála #${args[0]}`
        type = 'positive'
      }
      break
    case '/invite':
    case '/kick':
    case '/revoke':
      if (args.length === 0 || !args[0]?.startsWith('@')) {
        message = `Použitie: ${cmd} @nickName`
        type = 'warning'
      } else {
        message = `Vykonáva sa: ${cmd} ${args[0]}`
        type = 'positive'
      }
      break
    case '/cancel':
      message = 'Opúšťaš kanál'
      type = 'info'
      break
    case '/quit':
      message = 'Rušíš kanál'
      type = 'negative'
      break
    case '/list':
      message = 'Zobrazujem členov (otvor pravý panel)'
      type = 'info'
      break
    default:
      message = `Neznámy príkaz: ${cmd}`
      type = 'negative'
  }
  
  $q.notify({ type, message, position: 'top', timeout: 2000 })
}

function onTyping() {
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
  
  typingTimeout = setTimeout(() => {
    // TODO: Stop typing indicator
  }, 2000)
}

function insertEmoji(emoji: string) {
  newMessage.value += emoji
  messageInputRef.value?.focus()
}

function insertCommand(command: string) {
  newMessage.value = command + ' '
  messageInputRef.value?.focus()
}

function scrollToBottom(animated = true) {
  void nextTick(() => {
    const scrollArea = scrollAreaRef.value
    if (scrollArea) {
      const scrollTarget = scrollArea.getScrollTarget()
      if (scrollTarget) {
        scrollArea.setScrollPosition('vertical', scrollTarget.scrollHeight, animated ? 300 : 0)
      }
    }
  })
}
</script>

<style scoped>
.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.hover-effect {
  transition: all 0.2s;
}

.hover-effect:hover {
  background: rgba(0, 0, 0, 0.02) !important;
  transform: translateX(2px);
}

.message-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.hover-effect:hover .message-actions {
  opacity: 1;
}

.message-input :deep(.q-field__control) {
  border-radius: 24px;
}
</style>