<template>
  <div class="message-input-wrapper">
    <!-- Command Hints -->
    <q-slide-transition>
      <div v-if="showCommandHints" class="q-pa-sm bg-grey-2">
        <div class="text-caption text-grey-7 q-mb-xs">Dostupné príkazy:</div>
        <div class="row q-gutter-xs">
          <q-chip
            v-for="hint in filteredCommands"
            :key="hint.command"
            clickable
            @click="selectCommand(hint)"
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

    <!-- @Mention Suggestions -->
    <q-slide-transition>
      <q-list 
        v-if="showMentions" 
        dense 
        bordered 
        class="bg-white q-ma-sm"
        style="max-height: 200px; overflow-y: auto"
      >
        <q-item
          v-for="user in filteredUsers"
          :key="user.id"
          clickable
          v-ripple
          @click="selectMention(user)"
        >
          <q-item-section avatar>
            <q-avatar size="24px" color="primary" text-color="white">
              {{ user.nickName.charAt(0).toUpperCase() }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>@{{ user.nickName }}</q-item-label>
            <q-item-label caption>{{ user.firstName }} {{ user.lastName }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-slide-transition>

    <!-- Input Field -->
    <div class="q-pa-md bg-white">
      <q-input
        ref="messageInput"
        v-model="message"
        filled
        dense
        placeholder="Napíš správu alebo príkaz (/ pre nápovedu)"
        :maxlength="2000"
        @keydown.enter.exact.prevent="sendMessage"
        @keydown.tab.prevent="handleTabComplete"
        @input="handleInput"
      >
        <template v-slot:prepend>
          <q-btn 
            flat 
            dense 
            round 
            icon="attachment" 
            size="sm"
            @click="attachFile"
          >
            <q-tooltip>Priložiť súbor</q-tooltip>
          </q-btn>
        </template>

        <template v-slot:append>
          <!-- Emoji Picker -->
          <q-btn flat dense round icon="mood" size="sm">
            <q-popup-proxy>
              <div class="q-pa-md" style="width: 320px">
                <div class="text-subtitle2 q-mb-sm">Emoji</div>
                <div class="row q-gutter-xs">
                  <q-btn
                    v-for="emoji in quickEmojis"
                    :key="emoji"
                    flat
                    dense
                    :label="emoji"
                    @click="insertEmoji(emoji)"
                    size="md"
                  />
                </div>
              </div>
            </q-popup-proxy>
          </q-btn>

          <!-- Send Button -->
          <q-btn
            flat
            dense
            round
            icon="send"
            color="primary"
            size="sm"
            :disable="!canSend"
            @click="sendMessage"
          >
            <q-tooltip>Odoslať (Enter)</q-tooltip>
          </q-btn>
        </template>
      </q-input>

      <!-- Character Counter -->
      <div class="text-right text-caption text-grey-6 q-mt-xs">
        <span :class="{ 'text-warning': message.length > 1800 }">
          {{ message.length }} / 2000
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { ChatMessage, User } from '../types'
import { Storage } from '../utils/storage'

interface CommandHint {
  command: string
  usage: string
  description: string
}

interface TypingPayload {
  isTyping: boolean
  userId: number
}

export default defineComponent({
  name: 'MessageInput',
  props: {
    channelId: {
      type: Number,
      required: true
    },
    members: {
      type: Array as PropType<User[]>,
      default: () => []
    }
  },
  emits: ['message-sent', 'command-executed', 'typing'],
  data() {
    return {
      message: '',
      typingTimer: null as number | null,
      isTyping: false,
      commands: [
        { command: '/join', usage: 'channelName [private]', description: 'Vytvor alebo sa pripoj do kanála' },
        { command: '/invite', usage: '@nickName', description: 'Pozvi používateľa do kanála' },
        { command: '/kick', usage: '@nickName', description: 'Vyhoď používateľa z kanála' },
        { command: '/revoke', usage: '@nickName', description: 'Odoberte prístup (iba admin)' },
        { command: '/cancel', usage: '', description: 'Opusť kanál' },
        { command: '/quit', usage: '', description: 'Zruš kanál (iba admin)' },
        { command: '/list', usage: '', description: 'Zobraz členov kanála' }
      ] as CommandHint[],
      quickEmojis: ['👍', '❤️', '😂', '😎', '🤔', '👏', '🔥', '🎉', '💯', '✅', '🚀', '💪'] as string[]
    }
  },
  computed: {
    canSend(): boolean {
      return this.message.trim().length > 0
    },
    showCommandHints(): boolean {
      return this.message.startsWith('/') && this.message.length >= 1
    },
    showMentions(): boolean {
      const lastAtIndex = this.message.lastIndexOf('@')
      if (lastAtIndex === -1) {
        return false
      }
      const afterAt = this.message.slice(lastAtIndex + 1)
      const beforeAt = this.message.slice(0, lastAtIndex)
      const validPosition = lastAtIndex === 0 || beforeAt.endsWith(' ')
      const noSpaceAfter = !afterAt.includes(' ')
      return validPosition && noSpaceAfter && this.members.length > 0
    },
    filteredCommands(): CommandHint[] {
      if (!this.showCommandHints) {
        return []
      }
      const search = this.message.toLowerCase()
      return this.commands.filter(command => command.command.toLowerCase().startsWith(search)).slice(0, 5)
    },
    filteredUsers(): User[] {
      if (!this.showMentions) {
        return []
      }
      const lastAtIndex = this.message.lastIndexOf('@')
      const search = this.message.slice(lastAtIndex + 1).toLowerCase()
      return this.members.filter(member => member.nickName.toLowerCase().includes(search)).slice(0, 5)
    }
  },
  watch: {
    message(newValue: string, oldValue: string) {
      if (newValue && !oldValue) {
        this.startTyping()
      } else if (!newValue && oldValue) {
        this.stopTyping()
      }
    }
  },
  methods: {
    sendMessage(): void {
      if (!this.canSend) {
        return
      }
      const content = this.message.trim()
      if (content.startsWith('/')) {
        this.executeCommand(content)
      } else {
        this.sendRegularMessage(content)
      }
      this.message = ''
      this.stopTyping()
    },
    sendRegularMessage(content: string): void {
      const currentUser = this.getCurrentUser()
      const message: ChatMessage = {
        id: Date.now(),
        channelId: this.channelId,
        content,
        author: currentUser.nickName,
        authorId: currentUser.id,
        timestamp: new Date(),
        mentionsMe: false
      }
      const mentions = content.match(/@(\w+)/g)
      if (mentions) {
        message.mentions = mentions.map(mention => mention.substring(1))
      }
      this.$emit('message-sent', message)
      this.saveMessage(message)
    },
    executeCommand(command: string): void {
      const parts = command.split(' ')
      const cmd = parts[0] ? parts[0].toLowerCase() : ''
      const args = parts.slice(1)
      this.$emit('command-executed', { command: cmd, args })
    },
    handleInput(): void {
      if (this.typingTimer) {
        window.clearTimeout(this.typingTimer)
      }
      this.typingTimer = window.setTimeout(() => {
        this.stopTyping()
      }, 2000)
    },
    handleTabComplete(): void {
      if (this.showCommandHints && this.filteredCommands.length > 0) {
        const firstCommand = this.filteredCommands[0]
        if (firstCommand) {
          this.selectCommand(firstCommand)
        }
      } else if (this.showMentions && this.filteredUsers.length > 0) {
        const firstUser = this.filteredUsers[0]
        if (firstUser) {
          this.selectMention(firstUser)
        }
      }
    },
    selectCommand(command: CommandHint): void {
      this.message = command.command
      if (command.usage) {
        this.message += ` ${command.usage}`
      }
      const input = this.$refs.messageInput as { focus: () => void } | undefined
      input?.focus()
    },
    selectMention(user: User): void {
      const lastAtIndex = this.message.lastIndexOf('@')
      this.message = `${this.message.substring(0, lastAtIndex)}@${user.nickName} `
      const input = this.$refs.messageInput as { focus: () => void } | undefined
      input?.focus()
    },
    insertEmoji(emoji: string): void {
      this.message += emoji
      const input = this.$refs.messageInput as { focus: () => void } | undefined
      input?.focus()
    },
    attachFile(): void {
      this.$q.notify({
        type: 'info',
        message: 'Prílohy budú čoskoro dostupné',
        position: 'top'
      })
    },
    startTyping(): void {
      if (!this.isTyping) {
        this.isTyping = true
        const currentUser = this.getCurrentUser()
        this.$emit('typing', { isTyping: true, userId: currentUser.id } as TypingPayload)
      }
    },
    stopTyping(): void {
      if (this.isTyping) {
        this.isTyping = false
        const currentUser = this.getCurrentUser()
        this.$emit('typing', { isTyping: false, userId: currentUser.id } as TypingPayload)
      }
    },
    getCurrentUser(): { id: number; nickName: string } {
      const storedUser = Storage.getCurrentUser()
      if (storedUser) {
        return { id: storedUser.id, nickName: storedUser.nickName }
      }
      return { id: 1, nickName: 'Guest' }
    },
    saveMessage(message: ChatMessage): void {
      Storage.addMessage(this.channelId, message)
    }
  },
  beforeUnmount() {
    if (this.typingTimer) {
      window.clearTimeout(this.typingTimer)
    }
    this.stopTyping()
  }
})
</script>

<style scoped>
.message-input-wrapper {
  border-top: 1px solid #e0e0e0;
}
</style>