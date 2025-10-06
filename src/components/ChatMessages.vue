<template>
  <div class="chat-messages-wrapper">
    <q-scroll-area ref="scrollAreaRef" class="fit" @scroll="onScroll">
      <!-- Load More Section -->
      <div v-if="hasMore" class="text-center q-pa-md">
        <q-btn
          flat
          dense
          color="primary"
          icon="expand_less"
          label="Načítať staršie"
          :loading="loading"
          @click="$emit('load-more')"
        />
      </div>

      <!-- Date Separators & Messages -->
      <div class="messages-container q-pa-md">
        <template v-for="(item, index) in messagesWithDates" :key="item.type + '-' + index">
          <!-- Date Separator -->
          <div v-if="item.type === 'date'" class="date-separator q-my-md">
            <q-separator />
            <div class="date-badge">{{ item.label }}</div>
            <q-separator />
          </div>

          <!-- Message -->
          <div
            v-else-if="item.message"
            :class="[
              'message-wrapper q-mb-md',
              { 'message-highlighted': item.message.mentionsMe },
              { 'message-own': item.message.authorId === currentUserId }
            ]"
          >
            <div class="message-header row items-center no-wrap q-mb-xs">
              <q-avatar
                :color="getUserColor(item.message.author)"
                text-color="white"
                size="36px"
                class="q-mr-sm"
              >
                {{ item.message.author.charAt(0).toUpperCase() }}
              </q-avatar>

              <div class="message-author-info">
                <span class="text-weight-bold message-author">
                  {{ item.message.author }}
                </span>
                <q-badge
                  v-if="item.message.authorId === currentUserId"
                  color="blue-grey-5"
                  label="ty"
                  class="q-ml-xs"
                />
                <span class="text-caption text-grey-7 q-ml-sm message-time">
                  {{ formatTime(item.message.timestamp) }}
                </span>
                <span
                  v-if="item.message.editedAt"
                  class="text-caption text-grey-6 q-ml-xs"
                >
                  (upravené)
                </span>
              </div>
            </div>

            <div class="message-content q-ml-lg q-pl-md">
              <div v-html="formatMessageContent(item.message.content)"></div>
            </div>
          </div>
        </template>

        <!-- Empty State -->
        <div v-if="messages.length === 0 && !loading" class="empty-state text-center q-pa-xl">
          <q-icon name="forum" size="80px" color="grey-5" class="q-mb-md" />
          <div class="text-h6 text-grey-7">Žiadne správy</div>
          <div class="text-caption text-grey-6">Začnite konverzáciu!</div>
        </div>

        <!-- Scroll to bottom button -->
        <q-page-sticky position="bottom-right" :offset="[18, 80]">
          <q-btn
            v-show="showScrollButton"
            fab
            icon="keyboard_arrow_down"
            color="primary"
            size="sm"
            @click="() => scrollToBottom()"
          >
            <q-badge
              v-if="unreadCount > 0"
              color="red"
              :label="unreadCount"
              floating
            />
          </q-btn>
        </q-page-sticky>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { Message } from '../types'
import type { QScrollArea } from 'quasar'

interface Props {
  messages: Message[]
  currentUserId: number
  loading?: boolean
  hasMore?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasMore: true
})

// Type definition for message with date items
interface MessageWithDate {
  type: 'date'
  label: string
  message?: never
}

interface MessageItem {
  type: 'message'
  label?: never
  message: Message
}

type DisplayItem = MessageWithDate | MessageItem

const scrollAreaRef = ref<QScrollArea | null>(null)
const showScrollButton = ref(false)
const unreadCount = ref(0)
const lastScrollPosition = ref(0)

// Colors for user avatars
const userColors = ['purple', 'blue', 'green', 'orange', 'red', 'teal', 'pink', 'indigo']

// Group messages by date
const messagesWithDates = computed((): DisplayItem[] => {
  const result: DisplayItem[] = []
  let lastDate = ''

  props.messages.forEach(msg => {
    const msgDate = formatDate(msg.timestamp)
    
    if (msgDate !== lastDate) {
      result.push({ type: 'date', label: msgDate })
      lastDate = msgDate
    }
    
    result.push({ type: 'message', message: msg })
  })

  return result
})

// Watch for new messages
watch(() => props.messages.length, async (newLength, oldLength) => {
  if (newLength > oldLength) {
    await nextTick()
    
    // Auto scroll if user was at bottom
    if (isScrolledToBottom()) {
      scrollToBottom()
      unreadCount.value = 0
    } else {
      unreadCount.value++
      showScrollButton.value = true
    }
  }
})

function onScroll(info: { verticalPosition: number }) {
  const scrollPosition = info.verticalPosition
  lastScrollPosition.value = scrollPosition
  
  // Show/hide scroll button
  const scrollArea = scrollAreaRef.value
  if (scrollArea) {
    const scrollTarget = scrollArea.getScrollTarget()
    if (scrollTarget) {
      const isAtBottom = scrollTarget.scrollHeight - scrollPosition - scrollTarget.clientHeight < 100
      showScrollButton.value = !isAtBottom && props.messages.length > 10
      
      if (isAtBottom) {
        unreadCount.value = 0
      }
    }
  }
}

function isScrolledToBottom(): boolean {
  const scrollArea = scrollAreaRef.value
  if (!scrollArea) return false
  
  const scrollTarget = scrollArea.getScrollTarget()
  if (!scrollTarget) return false
  
  return scrollTarget.scrollHeight - lastScrollPosition.value - scrollTarget.clientHeight < 100
}

function scrollToBottom(animated = true) {
  nextTick(() => {
    const scrollArea = scrollAreaRef.value
    if (scrollArea) {
      const scrollTarget = scrollArea.getScrollTarget()
      if (scrollTarget) {
        scrollArea.setScrollPosition('vertical', scrollTarget.scrollHeight, animated ? 300 : 0)
        showScrollButton.value = false
        unreadCount.value = 0
      }
    }
  })
}

function formatDate(date: Date): string {
  const today = new Date()
  const msgDate = new Date(date)
  
  // Reset time for comparison
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate())
  
  const diffTime = todayDate.getTime() - msgDateOnly.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Dnes'
  if (diffDays === 1) return 'Včera'
  if (diffDays < 7) {
    return msgDate.toLocaleDateString('sk-SK', { weekday: 'long' })
  }
  
  return msgDate.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'long',
    year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  })
}

function formatTime(timestamp: Date): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('sk-SK', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatMessageContent(content: string): string {
  let formatted = content
  
  // Escape HTML
  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // Format @mentions
  formatted = formatted.replace(
    /@(\w+)/g,
    '<span class="text-mention">@$1</span>'
  )
  
  // Format URLs
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-link">$1</a>'
  )
  
  // Format **bold**
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // Format *italic*
  formatted = formatted.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
  
  // Format `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  
  // Convert newlines to <br>
  formatted = formatted.replace(/\n/g, '<br>')
  
  return formatted
}

function getUserColor(nickname: string): string {
  const hash = nickname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colorIndex = hash % userColors.length
  return userColors[colorIndex] || 'grey'  // Fallback to 'grey' if undefined
}

onMounted(() => {
  scrollToBottom(false)
})

defineExpose({
  scrollToBottom
})
</script>

<style scoped>
.chat-messages-wrapper {
  height: 100%;
  position: relative;
}

.messages-container {
  min-height: 100%;
}

.date-separator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0;
}

.date-badge {
  background: rgba(0, 0, 0, 0.05);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  white-space: nowrap;
}

.message-wrapper {
  transition: all 0.2s;
  border-radius: 8px;
  padding: 8px;
  margin-left: -8px;
  margin-right: -8px;
}

.message-wrapper:hover {
  background: rgba(0, 0, 0, 0.02);
}

.message-highlighted {
  background: rgba(255, 193, 7, 0.08) !important;
  border-left: 3px solid #ffc107;
  padding-left: 5px;
}

.message-own {
  background: rgba(33, 150, 243, 0.03);
}

.message-author {
  font-size: 15px;
}

.message-time {
  font-size: 11px;
}

.message-content {
  font-size: 15px;
  line-height: 1.6;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.message-content :deep(.text-mention) {
  background: rgba(33, 150, 243, 0.12);
  color: #1976d2;
  padding: 2px 5px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.message-content :deep(.text-mention:hover) {
  background: rgba(33, 150, 243, 0.2);
}

.message-content :deep(.text-link) {
  color: #1976d2;
  text-decoration: none;
  word-break: break-all;
}

.message-content :deep(.text-link:hover) {
  text-decoration: underline;
}

.message-content :deep(.inline-code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.empty-state {
  padding-top: 20vh !important;
}
</style>