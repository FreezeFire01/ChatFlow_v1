<template>
  <q-layout view="hHh LpR fFf">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title class="row items-center no-wrap">
          <q-icon name="tag" size="24px" class="q-mr-sm" />
          <span class="ellipsis">{{ currentChannelName }}</span>
          <q-badge 
            v-if="isCurrentChannelPrivate" 
            color="amber" 
            label="Súkromný" 
            class="q-ml-sm"
          />
        </q-toolbar-title>

        <!-- Typing Indicator Component will go here -->
        <typing-indicator 
          v-if="typingUsers.length > 0"
          :users="typingUsers" 
        />

        <q-space />

        <!-- User Status Menu Component -->
        <user-status-menu 
          v-if="currentUser"
          :current-user="currentUser"
          :user-status="userStatus"
          @status-changed="handleStatusChange"
          @logout="handleLogout"
        />

        <!-- Members Toggle -->
        <q-btn
          flat
          dense
          round
          icon="group"
          @click="toggleRightDrawer"
        >
          <q-badge v-if="onlineMembers > 0" color="positive" floating>
            {{ onlineMembers }}
          </q-badge>
          <q-tooltip>Členovia ({{ onlineMembers }}/{{ totalMembers }})</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Left Drawer - Channels -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :width="drawerWidth"
      :breakpoint="1024"
    >
      <channel-list
        :channels="channels"
        :current-channel-id="currentChannelId"
        @channel-selected="selectChannel"
        @channel-created="createChannel"
        @channel-left="leaveChannel"
        @channel-deleted="deleteChannel"
      />
    </q-drawer>

    <!-- Right Drawer - Members -->
    <q-drawer
      v-model="rightDrawerOpen"
      side="right"
      bordered
      :width="drawerWidth"
      :breakpoint="1024"
    >
      <member-list
        :members="members"
        :is-admin="isChannelAdmin"
        @member-kicked="kickMember"
        @member-mentioned="mentionUser"
      />
    </q-drawer>

    <!-- Page Container -->
    <!-- Page Container -->
    <q-page-container>
      <router-view 
        v-if="currentChannelId !== null"
        :channel-id="currentChannelId"
        :current-user="currentUser"
        :members="members"
        @message-sent="handleMessageSent"
        @command-executed="handleCommand"
      />
      
      <!-- Loading state -->
      <q-page v-else class="flex flex-center">
        <q-spinner color="primary" size="3em" />
        <div class="q-mt-md text-grey-7">Načítavam kanály...</div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import TypingIndicatorChip from '../components/TypingIndicator.vue'
import UserStatusMenu from '../components/UserStatus.vue'
import ChannelList from '../components/ChannelList.vue'
import MemberList from '../components/MemberList.vue'
import { Storage } from '../utils/storage'
import type { Channel, User, UserStatus, TypingIndicator as TypingIndicatorType } from '../types'
type ChannelWithMeta = Channel & {
  lastMessage?: string
}

export default defineComponent({
  name: 'MainLayout',
  components: {
  TypingIndicator: TypingIndicatorChip,
    UserStatusMenu,
    ChannelList,
    MemberList
  },
  data() {
    return {
      leftDrawerOpen: true,
      rightDrawerOpen: false,
      currentUser: null as User | null,
      userStatus: 'online' as UserStatus,
      channels: [] as ChannelWithMeta[],
      currentChannelId: null as number | null,
    members: [] as User[],
    typingUsers: [] as TypingIndicatorType[],
    mentionOnlyNotifications: false,
    storageEventHandler: null as ((event: StorageEvent) => void) | null,
    visibilityChangeHandler: null as (() => void) | null
    }
  },
  computed: {
    currentChannel(): ChannelWithMeta | null {
      return this.channels.find(channel => channel.id === this.currentChannelId) || null
    },
    currentChannelName(): string {
      return this.currentChannel?.name || 'Vyber kanál'
    },
    isCurrentChannelPrivate(): boolean {
      return this.currentChannel?.isPrivate || false
    },
    isChannelAdmin(): boolean {
      if (!this.currentUser) {
        return false
      }
      return this.currentChannel?.adminId === this.currentUser.id
    },
    onlineMembers(): number {
      return this.members.filter(member => member.status === 'online').length
    },
    totalMembers(): number {
      return this.members.length
    },
    drawerWidth(): number {
      // Responsive drawer width based on window size
      if (typeof window === 'undefined') return 300
      const width = window.innerWidth
      if (width >= 1920) return 320
      if (width >= 1440) return 300
      if (width >= 1024) return 280
      if (width >= 768) return 260
      return 240
    },
    breakpoint(): string {
      if (typeof window === 'undefined') return 'desktop'
      const width = window.innerWidth
      if (width >= 1920) return 'xl'
      if (width >= 1440) return 'lg'
      if (width >= 1024) return 'md'
      if (width >= 768) return 'sm'
      return 'xs'
    }
  },
  watch: {
    currentChannelId(newId: number | null) {
      if (newId) {
        this.loadChannelData(newId)
      }
    }
  },
  created() {
    this.initializeApp()
  },
  mounted() {
    this.setupEventListeners()
    this.loadInitialData()
  },
  beforeUnmount() {
    this.cleanupEventListeners()
  },
  methods: {
    initializeApp(): void {
      const existingUser = Storage.getCurrentUser()
      if (existingUser) {
        this.currentUser = existingUser
        this.userStatus = existingUser.status
      } else {
        const defaultUser: User = {
          id: 1,
          nickName: 'TestUser',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          status: 'online'
        }
        Storage.setCurrentUser(defaultUser)
        this.currentUser = defaultUser
      }
  const settings = Storage.getSettings()
  this.mentionOnlyNotifications = settings.mentionOnlyNotifications
    },
    loadInitialData(): void {
      this.channels = Storage.getChannels() as ChannelWithMeta[]
      if (this.channels.length === 0) {
        const defaultChannels: ChannelWithMeta[] = [
          {
            id: 1,
            name: 'general',
            isPrivate: false,
            adminId: this.currentUser?.id || 1,
            createdAt: new Date(),
            lastActivityAt: new Date(),
            unreadCount: 0
          },
          {
            id: 2,
            name: 'random',
            isPrivate: false,
            adminId: this.currentUser?.id || 1,
            createdAt: new Date(),
            lastActivityAt: new Date(),
            unreadCount: 0
          }
        ]
        Storage.setChannels(defaultChannels)
        this.channels = defaultChannels
      }
      if (this.channels.length > 0 && !this.currentChannelId) {
        const firstChannel = this.channels[0]
        if (firstChannel) {
          this.selectChannel(firstChannel)
        }
      }
      this.loadChannelMembers()
    },
    loadChannelData(channelId: number): void {
      this.$emit('channel-changed', channelId)
      this.loadChannelMembers(channelId)
    },
    loadChannelMembers(channelId?: number | null): void {
      const id = channelId ?? this.currentChannelId
      if (!id) {
        return
      }
      const storedMembers = Storage.getMembers(id)
      if (storedMembers.length > 0) {
        this.members = storedMembers
      } else {
        const defaultMembers: User[] = [
          {
            id: this.currentUser?.id || 1,
            nickName: this.currentUser?.nickName || 'TestUser',
            firstName: this.currentUser?.firstName || 'Test',
            lastName: this.currentUser?.lastName || 'User',
            email: this.currentUser?.email || 'test@example.com',
            status: this.currentUser?.status || 'online'
          },
          {
            id: 2,
            nickName: 'Eva',
            firstName: 'Eva',
            lastName: 'Nováková',
            email: 'eva@example.com',
            status: 'online'
          },
          {
            id: 3,
            nickName: 'Peter',
            firstName: 'Peter',
            lastName: 'Horváth',
            email: 'peter@example.com',
            status: 'dnd'
          }
        ]
        Storage.setMembers(id, defaultMembers)
        this.members = defaultMembers
      }
    },
    setupEventListeners(): void {
      this.storageEventHandler = this.handleStorageChange.bind(this)
      this.visibilityChangeHandler = this.handleVisibilityChange.bind(this)
      window.addEventListener('storage', this.storageEventHandler)
      document.addEventListener('visibilitychange', this.visibilityChangeHandler)
    },
    cleanupEventListeners(): void {
      if (this.storageEventHandler) {
        window.removeEventListener('storage', this.storageEventHandler)
        this.storageEventHandler = null
      }
      if (this.visibilityChangeHandler) {
        document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
        this.visibilityChangeHandler = null
      }
    },
    handleStorageChange(event: StorageEvent): void {
      if (event.key === 'channels') {
        this.channels = JSON.parse(event.newValue || '[]')
      }
      if (event.key === 'currentUser') {
        this.currentUser = JSON.parse(event.newValue || 'null')
      }
    },
    handleVisibilityChange(): void {
      if (!document.hidden) {
        this.markChannelAsRead(this.currentChannelId)
      }
    },
    toggleLeftDrawer(): void {
      this.leftDrawerOpen = !this.leftDrawerOpen
    },
    toggleRightDrawer(): void {
      this.rightDrawerOpen = !this.rightDrawerOpen
    },
    selectChannel(channel: ChannelWithMeta): void {
      this.currentChannelId = channel.id
      this.markChannelAsRead(channel.id)
      if (this.$q.screen.lt.md) {
        this.leftDrawerOpen = false
      }
      localStorage.setItem('currentChannelId', String(channel.id))
    },
    markChannelAsRead(channelId: number | null): void {
      if (!channelId) {
        return
      }
      const selected = this.channels.find(channel => channel.id === channelId)
      if (selected) {
        selected.unreadCount = 0
        selected.isNewInvite = false
        Storage.setChannels(this.channels)
      }
    },
    createChannel(channelData: { name: string; isPrivate: boolean }): void {
      if (!this.currentUser) {
        return
      }
      const newChannel: ChannelWithMeta = {
        id: Date.now(),
        name: channelData.name,
        isPrivate: channelData.isPrivate,
        adminId: this.currentUser.id,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        unreadCount: 0
      }
      this.channels.push(newChannel)
      Storage.setChannels(this.channels)
      this.$q.notify({
        type: 'positive',
        message: `Kanál #${newChannel.name} bol vytvorený`,
        position: 'top'
      })
      this.selectChannel(newChannel)
    },
    leaveChannel(channel: ChannelWithMeta): void {
      const index = this.channels.findIndex(entry => entry.id === channel.id)
      if (index > -1) {
        this.channels.splice(index, 1)
        Storage.setChannels(this.channels)
        if (this.currentChannelId === channel.id) {
          this.currentChannelId = this.channels[0]?.id || null
        }
        this.$q.notify({
          type: 'info',
          message: `Opustil si kanál #${channel.name}`,
          position: 'top'
        })
      }
    },
    deleteChannel(channel: ChannelWithMeta | null): void {
      if (!channel || !this.currentUser) {
        return
      }
      if (channel.adminId !== this.currentUser.id) {
        this.$q.notify({
          type: 'negative',
          message: 'Nemáš oprávnenie zmazať tento kanál',
          position: 'top'
        })
        return
      }
      this.leaveChannel(channel)
    },
    kickMember(member: User): void {
      const index = this.members.findIndex(entry => entry.id === member.id)
      if (index > -1) {
        this.members.splice(index, 1)
        if (this.currentChannelId) {
          Storage.setMembers(this.currentChannelId, this.members)
        }
        this.$q.notify({
          type: 'info',
          message: `${member.nickName} bol vyhodený z kanála`,
          position: 'top'
        })
      }
    },
    mentionUser(member: User): void {
      this.$emit('mention-user', member.nickName)
      this.rightDrawerOpen = false
    },
    handleStatusChange(newStatus: UserStatus): void {
      if (!this.currentUser) {
        return
      }
      this.userStatus = newStatus
      this.currentUser.status = newStatus
      Storage.setCurrentUser(this.currentUser)
      this.$q.notify({
        type: 'info',
        message: `Status zmenený na ${newStatus}`,
        position: 'top'
      })
    },
    handleLogout(): void {
      Storage.clearAll()
      this.$router.push('/auth')
    },
    handleMessageSent(message: { channelId: number }): void {
      const channel = this.channels.find(entry => entry.id === message.channelId)
      if (channel) {
        channel.lastActivityAt = new Date()
        Storage.setChannels(this.channels)
      }
    },
    handleCommand(command: string): void {
      const [cmd, ...args] = command.split(' ')
      switch (cmd) {
        case '/join':
          this.handleJoinCommand(args)
          break
        case '/invite':
          this.handleInviteCommand(args)
          break
        case '/kick':
          this.handleKickCommand(args)
          break
        case '/cancel':
          if (this.currentChannel) {
            this.leaveChannel(this.currentChannel)
          }
          break
        case '/quit':
          this.deleteChannel(this.currentChannel)
          break
        case '/list':
          this.rightDrawerOpen = true
          break
        default:
          this.$q.notify({
            type: 'negative',
            message: `Neznámy príkaz: ${cmd}`,
            position: 'top'
          })
      }
    },
    handleJoinCommand(args: string[]): void {
      const [channelName, privacyFlag] = args
      if (!channelName) {
        this.$q.notify({
          type: 'warning',
          message: 'Použitie: /join channelName [private]',
          position: 'top'
        })
        return
      }
      const existing = this.channels.find(channel => channel.name === channelName)
      if (existing) {
        this.selectChannel(existing)
      } else {
        this.createChannel({
          name: channelName,
          isPrivate: privacyFlag === 'private'
        })
      }
    },
    handleInviteCommand(args: string[]): void {
      const [nickName] = args
      if (!nickName || !nickName.startsWith('@')) {
        this.$q.notify({
          type: 'warning',
          message: 'Použitie: /invite @nickName',
          position: 'top'
        })
        return
      }
      this.$q.notify({
        type: 'positive',
        message: `Používateľ ${nickName} bol pozvaný`,
        position: 'top'
      })
    },
    handleKickCommand(args: string[]): void {
      const [nickName] = args
      if (!nickName || !nickName.startsWith('@')) {
        this.$q.notify({
          type: 'warning',
          message: 'Použitie: /kick @nickName',
          position: 'top'
        })
        return
      }
      const member = this.members.find(entry => `@${entry.nickName}` === nickName)
      if (member) {
        this.kickMember(member)
      }
    }
  }
})
</script>

<style scoped>
.bg-gradient {
  background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-secondary) 100%);
}

/* Responsive header adjustments */
@media (max-width: 767px) {
  :deep(.q-toolbar) {
    padding: 0 8px;
    min-height: 48px;
  }
  
  :deep(.q-toolbar__title) {
    font-size: 16px;
  }
  
  :deep(.q-btn) {
    min-width: 36px;
    min-height: 36px;
  }
  
  :deep(.q-icon) {
    font-size: 20px;
  }
  
  :deep(.q-badge) {
    font-size: 10px;
    padding: 2px 4px;
  }
}

@media (max-width: 599px) {
  :deep(.q-toolbar) {
    min-height: 44px;
  }
  
  :deep(.q-toolbar__title) {
    font-size: 14px;
  }
  
  :deep(.q-toolbar__title .q-badge) {
    display: none;
  }
  
  :deep(.q-btn) {
    min-width: 32px;
    min-height: 32px;
  }
}

/* Responsive drawer content */
:deep(.q-drawer) {
  transition: width 0.3s ease;
}

@media (max-width: 1023px) {
  :deep(.q-drawer__content) {
    padding: 8px;
  }
}
</style>