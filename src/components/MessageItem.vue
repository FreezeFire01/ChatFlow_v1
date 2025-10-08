<template>
  <div 
    :class="messageClasses"
    @mouseenter="showActions = true"
    @mouseleave="showActions = false"
  >
    <!-- Message Header -->
    <div class="row items-center no-wrap q-mb-xs">
      <q-avatar 
        :color="avatarColor" 
        text-color="white" 
        size="36px"
      >
        {{ message.author.charAt(0).toUpperCase() }}
      </q-avatar>
      
      <div class="q-ml-sm">
        <span class="text-weight-bold">{{ message.author }}</span>
        <q-badge 
          v-if="isOwn" 
          color="blue-grey-5" 
          label="ty" 
          class="q-ml-xs"
        />
        <span class="text-caption text-grey-7 q-ml-sm">
          {{ formatTime(message.timestamp) }}
        </span>
        <span 
          v-if="message.editedAt" 
          class="text-caption text-grey-6 q-ml-xs"
        >
          (upravené)
        </span>
      </div>

      <q-space />

      <!-- Message Actions -->
      <transition name="q-transition--fade">
        <div v-show="showActions" class="message-actions">
          <q-btn
            flat
            dense
            round
            size="sm"
            icon="reply"
            @click="$emit('reply', message)"
          >
            <q-tooltip>Odpovedať</q-tooltip>
          </q-btn>
          
          <q-btn
            flat
            dense
            round
            size="sm"
            icon="content_copy"
            @click="$emit('copy', message)"
          >
            <q-tooltip>Kopírovať</q-tooltip>
          </q-btn>
          
          <q-btn
            v-if="isOwn"
            flat
            dense
            round
            size="sm"
            icon="edit"
            @click="$emit('edit', message)"
          >
            <q-tooltip>Upraviť</q-tooltip>
          </q-btn>
          
          <q-btn
            v-if="isOwn"
            flat
            dense
            round
            size="sm"
            icon="delete"
            color="negative"
            @click="$emit('delete', message)"
          >
            <q-tooltip>Zmazať</q-tooltip>
          </q-btn>
        </div>
      </transition>
    </div>

    <!-- Message Content -->
    <div class="message-content q-ml-lg q-pl-md">
      <div v-html="formattedContent"></div>
      
      <!-- Attachments -->
      <div v-if="message.attachments && message.attachments.length > 0" class="q-mt-sm">
        <q-chip 
          v-for="attachment in message.attachments" 
          :key="attachment.id"
          clickable
          color="grey-3"
          icon="attachment"
        >
          {{ attachment.name }}
        </q-chip>
      </div>
      
      <!-- Reactions -->
      <div v-if="message.reactions && message.reactions.length > 0" class="q-mt-sm">
        <q-chip 
          v-for="reaction in groupedReactions" 
          :key="reaction.emoji"
          clickable
          :color="reaction.hasMyReaction ? 'primary' : 'grey-3'"
          :text-color="reaction.hasMyReaction ? 'white' : 'black'"
          @click="toggleReaction(reaction.emoji)"
        >
          {{ reaction.emoji }} {{ reaction.count }}
        </q-chip>
        
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="add_reaction"
          @click="showReactionPicker = true"
        />
      </div>
    </div>

    <!-- Mention Badge -->
    <q-badge 
      v-if="message.mentionsMe" 
      color="amber" 
      text-color="amber-10" 
      label="Bol si spomenutý" 
      class="q-ml-lg q-mt-xs"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { ChatMessage, MessageReaction } from '../types'

interface GroupedReaction {
  emoji: string
  count: number
  users: number[]
  hasMyReaction: boolean
}

export default defineComponent({
  name: 'MessageItem',
  props: {
    message: {
      type: Object as PropType<ChatMessage>,
      required: true
    },
    isOwn: {
      type: Boolean,
      default: false
    },
    currentUserId: {
      type: Number,
      required: true
    }
  },
  emits: ['reply', 'edit', 'delete', 'copy', 'react'],
  data() {
    return {
      showActions: false,
      showReactionPicker: false
    }
  },
  computed: {
    messageClasses(): Array<string | Record<string, boolean>> {
      return [
        'message-wrapper',
        'q-mb-md',
        'rounded-borders',
        'q-pa-sm',
        'transition',
        {
          'bg-amber-1': !!this.message.mentionsMe,
          'bg-blue-grey-1': this.isOwn,
          'hover-effect': true
        }
      ]
    },
    avatarColor(): string {
      const colors = ['purple', 'blue', 'green', 'orange', 'red', 'teal', 'pink', 'indigo']
      const hash = this.message.author.split('').reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0)
      return colors[hash % colors.length] || 'primary'
    },
    formattedContent(): string {
      let content = this.escapeHtml(this.message.content)
      content = content.replace(/@(\w+)/g, '<span class="text-primary text-weight-bold">@$1</span>')
      content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary">$1</a>')
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      content = content.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
      content = content.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      content = content.replace(/\n/g, '<br>')
      return content
    },
    groupedReactions(): GroupedReaction[] {
      if (!this.message.reactions) {
        return []
      }
      const grouped: Record<string, GroupedReaction> = {}
      this.message.reactions.forEach((reaction: MessageReaction) => {
        if (!grouped[reaction.emoji]) {
          grouped[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            users: [],
            hasMyReaction: false
          }
        }
        const aggregated = grouped[reaction.emoji]!
        aggregated.count += 1
        aggregated.users.push(reaction.userId)
        if (reaction.userId === this.currentUserId) {
          aggregated.hasMyReaction = true
        }
      })
      return Object.values(grouped)
    }
  },
  methods: {
    formatTime(timestamp: Date | string): string {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('sk-SK', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    escapeHtml(text: string): string {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }
      return text.replace(/[&<>"']/g, match => map[match] ?? match)
    },
    toggleReaction(emoji: string): void {
      this.$emit('react', {
        messageId: this.message.id,
        emoji
      })
    }
  }
})
</script>

<style scoped>
.message-wrapper {
  transition: all 0.2s;
  position: relative;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.1);
  color: #1f2933;
}

.hover-effect:hover {
  background: rgba(0, 0, 0, 0.02) !important;
  transform: translateX(2px);
}

.message-actions {
  display: flex;
  gap: 4px;
}

.message-content {
  font-size: 15px;
  line-height: 1.6;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.message-content :deep(.inline-code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 13px;
}
</style>