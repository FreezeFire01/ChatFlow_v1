<template>
  <div class="column no-wrap full-height">
    <!-- Header -->
    <q-toolbar class="bg-grey-2">
      <q-icon name="group" class="q-mr-sm" />
      <q-toolbar-title>
        Členovia ({{ totalMembers }})
      </q-toolbar-title>
    </q-toolbar>

    <!-- Search -->
    <div class="q-pa-sm">
      <q-input
        v-model="search"
        filled
        dense
        placeholder="Hľadať členov..."
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
        <template v-slot:append v-if="search">
          <q-icon 
            name="close" 
            @click="search = ''" 
            class="cursor-pointer" 
          />
        </template>
      </q-input>
    </div>

    <q-separator />

    <!-- Members List -->
    <q-scroll-area class="col">
      <q-list padding>
        <!-- Online Members -->
        <template v-if="onlineMembers.length > 0">
          <q-item-label header class="text-weight-bold">
            <q-icon name="circle" color="positive" size="xs" class="q-mr-xs" />
            Online ({{ onlineMembers.length }})
          </q-item-label>
          
          <member-item
            v-for="member in onlineMembers"
            :key="`online-${member.id}`"
            :member="member"
            :is-admin="isAdmin"
            :is-current-user="member.id === currentUserId"
            @kick="handleKick"
            @mention="handleMention"
            @message="handleDirectMessage"
            @view-profile="handleViewProfile"
          />
        </template>

        <!-- DND Members -->
        <template v-if="dndMembers.length > 0">
          <q-item-label header class="text-weight-bold q-mt-md">
            <q-icon name="do_not_disturb_on" color="warning" size="xs" class="q-mr-xs" />
            Nerušiť ({{ dndMembers.length }})
          </q-item-label>
          
          <member-item
            v-for="member in dndMembers"
            :key="`dnd-${member.id}`"
            :member="member"
            :is-admin="isAdmin"
            :is-current-user="member.id === currentUserId"
            @kick="handleKick"
            @mention="handleMention"
            @message="handleDirectMessage"
            @view-profile="handleViewProfile"
          />
        </template>

        <!-- Offline Members -->
        <template v-if="offlineMembers.length > 0">
          <q-item-label header class="text-weight-bold q-mt-md">
            <q-icon name="radio_button_unchecked" color="grey" size="xs" class="q-mr-xs" />
            Offline ({{ offlineMembers.length }})
          </q-item-label>
          
          <member-item
            v-for="member in offlineMembers"
            :key="`offline-${member.id}`"
            :member="member"
            :is-admin="isAdmin"
            :is-current-user="member.id === currentUserId"
            :show-actions="false"
            @view-profile="handleViewProfile"
          />
        </template>

        <!-- Empty State -->
        <div v-if="filteredMembers.length === 0" class="text-center q-pa-xl">
          <q-icon name="group_off" size="60px" color="grey-5" />
          <div class="text-subtitle1 text-grey-7 q-mt-md">
            {{ search ? 'Žiadni členovia nenájdení' : 'Žiadni členovia v kanáli' }}
          </div>
        </div>
      </q-list>
    </q-scroll-area>

    <!-- Kick Vote Status (for public channels) -->
    <q-card v-if="kickVotes.length > 0" class="q-ma-sm">
      <q-card-section class="q-pa-sm">
        <div class="text-caption text-weight-bold q-mb-xs">Hlasovanie o vyhodení:</div>
        <div v-for="vote in kickVotes" :key="vote.targetId" class="row items-center q-mb-xs">
          <span class="text-caption">{{ vote.targetName }}</span>
          <q-space />
          <q-chip dense color="warning" text-color="white">
            {{ vote.count }}/3
          </q-chip>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import MemberItem from './MemberItem.vue'
import type { User, UserStatus } from '../types'

interface KickVote {
  targetId: number
  targetName: string
  voters: number[]
  count: number
}

export default defineComponent({
  name: 'MemberList',
  components: {
    MemberItem
  },
  props: {
    members: {
      type: Array as PropType<User[]>,
      default: () => []
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    isPrivateChannel: {
      type: Boolean,
      default: false
    }
  },
  emits: ['member-kicked', 'member-mentioned', 'member-invited'],
  data() {
    return {
      search: '',
      kickVotes: [] as KickVote[]
    }
  },
  computed: {
    currentUserId(): number | null {
      const userRaw = localStorage.getItem('currentUser')
      if (!userRaw) {
        return null
      }
      try {
        const parsed = JSON.parse(userRaw) as { id?: number }
        return typeof parsed.id === 'number' ? parsed.id : null
      } catch (error) {
        console.error('Failed to parse currentUser', error)
        return null
      }
    },
    filteredMembers(): User[] {
      if (!this.search) {
        return this.members
      }
      const searchLower = this.search.toLowerCase()
      return this.members.filter(member => {
        const nick = member.nickName.toLowerCase()
        const first = member.firstName.toLowerCase()
        const last = member.lastName.toLowerCase()
        return nick.includes(searchLower) || first.includes(searchLower) || last.includes(searchLower)
      })
    },
    onlineMembers(): User[] {
      return this.filteredMembers.filter(member => member.status === 'online')
    },
    dndMembers(): User[] {
      return this.filteredMembers.filter(member => member.status === 'dnd')
    },
    offlineMembers(): User[] {
      return this.filteredMembers.filter(member => member.status === 'offline')
    },
    totalMembers(): number {
      return this.members.length
    }
  },
  mounted() {
    this.loadKickVotes()
  },
  methods: {
    loadKickVotes(): void {
      if (!this.isPrivateChannel) {
        const stored = localStorage.getItem('kickVotes')
        if (stored) {
          try {
            this.kickVotes = JSON.parse(stored) as KickVote[]
          } catch (error) {
            console.error('Failed to parse kickVotes', error)
            this.kickVotes = []
          }
        }
      }
    },
    handleKick(member: User): void {
      if (this.isPrivateChannel && this.isAdmin) {
        this.$q
          .dialog({
            title: 'Vyhodiť člena',
            message: `Naozaj chceš vyhodiť ${member.nickName} z kanála?`,
            cancel: true,
            persistent: false,
            ok: {
              label: 'Vyhodiť',
              color: 'negative'
            }
          })
          .onOk(() => {
            this.$emit('member-kicked', member)
          })
      } else if (!this.isPrivateChannel) {
        this.voteKick(member)
      }
    },
    voteKick(member: User): void {
      let votes = this.kickVotes.find(entry => entry.targetId === member.id)
      if (!votes) {
        votes = {
          targetId: member.id,
          targetName: member.nickName,
          voters: [],
          count: 0
        }
        this.kickVotes.push(votes)
      }
      const currentUserId = this.currentUserId
      if (currentUserId == null) {
        this.$q.notify({
          type: 'warning',
          message: 'Nie je dostupný aktuálny používateľ',
          position: 'top'
        })
        return
      }
      if (votes.voters.includes(currentUserId)) {
        this.$q.notify({
          type: 'warning',
          message: 'Už si hlasoval za vyhodenie tohto člena',
          position: 'top'
        })
        return
      }
      votes.voters.push(currentUserId)
      votes.count += 1
      localStorage.setItem('kickVotes', JSON.stringify(this.kickVotes))
      if (votes.count >= 3) {
        this.$emit('member-kicked', member)
        this.kickVotes = this.kickVotes.filter(entry => entry.targetId !== member.id)
        localStorage.setItem('kickVotes', JSON.stringify(this.kickVotes))
        this.$q.notify({
          type: 'info',
          message: `${member.nickName} bol vyhodený (3 hlasy)`,
          position: 'top'
        })
      } else {
        this.$q.notify({
          type: 'info',
          message: `Hlasoval si za vyhodenie ${member.nickName} (${votes.count}/3)`,
          position: 'top'
        })
      }
    },
    handleMention(member: User): void {
      this.$emit('member-mentioned', member)
    },
    handleDirectMessage(_member: User): void {
      this.$q.notify({
        type: 'info',
        message: 'Súkromné správy budú čoskoro dostupné',
        position: 'top'
      })
    },
    handleViewProfile(member: User): void {
      this.$q.dialog({
        title: member.nickName,
        message: `
          <div class="column q-gutter-sm">
            <div><strong>Meno:</strong> ${member.firstName} ${member.lastName}</div>
            <div><strong>Email:</strong> ${member.email || 'Nezadaný'}</div>
            <div><strong>Status:</strong> ${this.getStatusText(member.status)}</div>
            <div><strong>ID:</strong> ${member.id}</div>
          </div>
        `,
        html: true,
        ok: true
      })
    },
    getStatusText(status: UserStatus): string {
      switch (status) {
        case 'online':
          return 'Online'
        case 'dnd':
          return 'Nerušiť'
        case 'offline':
          return 'Offline'
        default:
          return 'Neznámy'
      }
    }
  }
})
</script>