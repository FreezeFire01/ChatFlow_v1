<template>
  <q-layout view="hHh LpR fFf" class="bg-grey-10">
    <!-- Modern Header with Glass Effect -->
    <q-header elevated class="bg-dark q-py-xs" style="backdrop-filter: blur(10px);">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          @click="leftDrawerOpen = !leftDrawerOpen"
          class="lt-md"
        />
        
        <q-toolbar-title class="text-weight-bold row items-center">
          <q-icon name="tag" size="sm" class="q-mr-sm" />
          <div class="ellipsis">{{ currentChannel?.name || 'Vyber kanál' }}</div>
        </q-toolbar-title>

        <!-- Typing Indicator -->
        <q-slide-transition>
          <div v-show="typingUsers.length > 0" class="text-caption text-grey-5 q-mr-md">
            <q-icon name="edit" size="xs" class="q-mr-xs" />
            {{ typingIndicatorText }}
          </div>
        </q-slide-transition>

        <!-- Dark Mode Toggle -->
        <q-btn
          flat
          dense
          round
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          @click="toggleDarkMode"
        >
          <q-tooltip>{{ $q.dark.isActive ? 'Svetlý režim' : 'Tmavý režim' }}</q-tooltip>
        </q-btn>

        <!-- User Menu -->
        <q-btn-dropdown flat round dense icon="person" class="q-ml-sm">
          <q-list style="min-width: 220px">
            <q-item-label header class="text-weight-bold">
              {{ currentUser?.nickName }}
            </q-item-label>
            
            <q-separator />

            <q-item-label header class="text-caption text-grey-7">Status</q-item-label>
            
            <q-item
              clickable
              v-close-popup
              @click="setStatus('online')"
              :active="userStatus === 'online'"
              active-class="bg-positive text-white"
            >
              <q-item-section avatar>
                <q-icon name="circle" color="positive" size="xs" />
              </q-item-section>
              <q-item-section>Online</q-item-section>
            </q-item>
            
            <q-item
              clickable
              v-close-popup
              @click="setStatus('dnd')"
              :active="userStatus === 'dnd'"
              active-class="bg-warning text-white"
            >
              <q-item-section avatar>
                <q-icon name="do_not_disturb_on" color="warning" size="xs" />
              </q-item-section>
              <q-item-section>DND</q-item-section>
            </q-item>
            
            <q-item
              clickable
              v-close-popup
              @click="setStatus('offline')"
              :active="userStatus === 'offline'"
              active-class="bg-grey text-white"
            >
              <q-item-section avatar>
                <q-icon name="circle" color="grey" size="xs" />
              </q-item-section>
              <q-item-section>Offline</q-item-section>
            </q-item>

            <q-separator />

            <q-item tag="label" v-ripple>
              <q-item-section>
                <q-item-label>Len @mention notifikácie</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle v-model="mentionOnlyNotifications" color="primary" />
              </q-item-section>
            </q-item>

            <q-separator />

            <q-item clickable v-close-popup @click="handleLogout" v-ripple>
              <q-item-section avatar>
                <q-icon name="logout" color="negative" />
              </q-item-section>
              <q-item-section>Odhlásiť sa</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-btn
          flat
          dense
          round
          icon="group"
          @click="rightDrawerOpen = !rightDrawerOpen"
          class="q-ml-xs"
        >
          <q-badge v-if="members.length > 0" color="primary" floating>
            {{ members.length }}
          </q-badge>
          <q-tooltip>Členovia</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Left Drawer - Channels (Responsive) -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="280"
      :breakpoint="1024"
      bordered
      class="column no-wrap"
    >
      <!-- Drawer Header -->
      <div class="q-pa-md bg-primary text-white column">
        <div class="text-h5 text-weight-bold row items-center">
          <q-icon name="forum" size="sm" class="q-mr-sm" />
          ChatFlow
        </div>
        <div class="text-caption">{{ channels.length }} kanálov</div>
      </div>

      <q-scroll-area class="col">
        <div class="q-pa-md">
          <!-- Create Channel Button with Animation -->
          <q-btn
            outline
            color="primary"
            icon="add"
            label="Nový kanál"
            class="full-width q-mb-md"
            @click="showCreateChannelDialog = true"
            unelevated
          >
            <q-tooltip>Vytvor alebo sa pripoj do kanála</q-tooltip>
          </q-btn>

          <q-separator class="q-my-md" />

          <!-- Channels List with Animations -->
          <q-list>
            <q-item-label header class="text-uppercase text-weight-bold text-caption">
              <q-icon name="tag" size="xs" class="q-mr-xs" />
              Kanály
            </q-item-label>

            <transition-group name="list">
              <q-item
                v-for="channel in channels"
                :key="channel.id"
                clickable
                v-ripple
                :active="currentChannel?.id === channel.id"
                active-class="bg-primary text-white"
                @click="selectChannel(channel)"
                class="rounded-borders q-mb-xs transition"
              >
                <q-item-section avatar>
                  <q-avatar size="32px" :color="channel.isPrivate ? 'orange' : 'primary'" text-color="white">
                    <q-icon :name="channel.isPrivate ? 'lock' : 'tag'" size="xs" />
                  </q-avatar>
                </q-item-section>
                
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ channel.name }}
                  </q-item-label>
                  <q-item-label caption v-if="channel.unreadCount && channel.unreadCount > 0">
                    <q-badge color="warning" :label="channel.unreadCount" />
                    {{ channel.unreadCount === 1 ? 'nová správa' : 'nových správ' }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side v-if="channel.isNewInvite">
                  <q-badge color="warning" label="Nový!" />
                </q-item-section>

                <!-- Channel Actions -->
                <q-item-section side v-if="currentChannel?.id === channel.id">
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    icon="more_vert"
                    @click.stop
                  >
                    <q-menu>
                      <q-list dense style="min-width: 150px">
                        <q-item clickable v-close-popup>
                          <q-item-section avatar>
                            <q-icon name="exit_to_app" size="xs" />
                          </q-item-section>
                          <q-item-section>Opustiť</q-item-section>
                        </q-item>
                        <q-item
                          v-if="channel.isAdmin"
                          clickable
                          v-close-popup
                          class="text-negative"
                        >
                          <q-item-section avatar>
                            <q-icon name="delete" size="xs" />
                          </q-item-section>
                          <q-item-section>Zmazať</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </q-item-section>
              </q-item>
            </transition-group>
          </q-list>
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- Right Drawer - Members (Responsive) -->
    <q-drawer
      v-model="rightDrawerOpen"
      side="right"
      :width="280"
      :breakpoint="768"
      bordered
      class="column no-wrap"
    >
      <!-- Members Header -->
      <div class="q-pa-md bg-dark text-white column">
        <div class="text-h6 text-weight-bold row items-center">
          <q-icon name="group" size="sm" class="q-mr-sm" />
          Členovia
        </div>
        <div class="text-caption">{{ members.length }} online</div>
      </div>

      <q-scroll-area class="col">
        <div class="q-pa-md">
          <q-list>
            <transition-group name="list">
              <q-item
                v-for="member in members"
                :key="member.id"
                class="rounded-borders q-mb-xs"
                v-ripple
                clickable
              >
                <q-item-section avatar>
                  <q-avatar :color="getStatusColor(member.status)" size="40px" text-color="white">
                    <div class="text-weight-bold">
                      {{ member.nickName.charAt(0).toUpperCase() }}
                    </div>
                    <q-badge
                      v-if="member.status === 'online'"
                      color="positive"
                      floating
                      rounded
                    />
                    <q-badge
                      v-else-if="member.status === 'dnd'"
                      color="warning"
                      floating
                      rounded
                    />
                  </q-avatar>
                </q-item-section>
                
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ member.nickName }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ member.firstName }} {{ member.lastName }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-icon
                    :name="getStatusIcon(member.status)"
                    :color="getStatusColor(member.status)"
                    size="xs"
                  />
                </q-item-section>
              </q-item>
            </transition-group>
          </q-list>
        </div>
      </q-scroll-area>
    </q-drawer>

    <!-- Page Content -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Create Channel Dialog with Animation -->
    <q-dialog v-model="showCreateChannelDialog" transition-show="scale" transition-hide="scale">
      <q-card style="min-width: 400px; max-width: 500px" class="q-pa-md">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Vytvoriť nový kanál</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newChannelName"
            label="Názov kanála"
            outlined
            dense
            hint="Použitie: /join channelName [private]"
            :rules="[
              val => !!val || 'Názov je povinný',
              val => val.length >= 3 || 'Minimálne 3 znaky',
              val => /^[a-zA-Z0-9_-]+$/.test(val) || 'Len písmená, čísla, _ a -'
            ]"
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="tag" />
            </template>
          </q-input>

          <q-toggle
            v-model="newChannelIsPrivate"
            label="Súkromný kanál (len na pozvanie)"
            color="primary"
            left-label
            class="full-width"
          />

          <q-banner v-if="newChannelIsPrivate" dense rounded class="bg-orange-1 text-orange-9 q-mt-md">
            <template v-slot:avatar>
              <q-icon name="info" color="orange" />
            </template>
            Len ty môžeš pozývať členov do súkromného kanála
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Zrušiť" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            label="Vytvoriť kanál"
            color="primary"
            @click="createChannel"
            icon-right="add"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

// State
const leftDrawerOpen = ref(true)
const rightDrawerOpen = ref(false)
const showCreateChannelDialog = ref(false)
const newChannelName = ref('')
const newChannelIsPrivate = ref(false)
const userStatus = ref<'online' | 'dnd' | 'offline'>('online')
const mentionOnlyNotifications = ref(false)

// Enable dark mode by default
if ($q.dark) {
  $q.dark.set(true)
}

const currentUser = ref({
  id: 1,
  nickName: 'JanNovak',
  firstName: 'Ján',
  lastName: 'Novák',
  email: 'jan@example.com'
})

const channels = ref([
  { id: 1, name: 'všeobecné', isPrivate: false, unreadCount: 0, isNewInvite: false, isAdmin: true },
  { id: 2, name: 'random', isPrivate: false, unreadCount: 3, isNewInvite: false, isAdmin: false },
  { id: 3, name: 'projekt-a', isPrivate: true, unreadCount: 0, isNewInvite: true, isAdmin: false }
])

const currentChannel = ref(channels.value[0])

const members = ref([
  { id: 1, nickName: 'JanNovak', firstName: 'Ján', lastName: 'Novák', status: 'online' },
  { id: 2, nickName: 'Eva', firstName: 'Eva', lastName: 'Hrušková', status: 'dnd' },
  { id: 3, nickName: 'Peter', firstName: 'Peter', lastName: 'Kovač', status: 'offline' }
])

const typingUsers = ref<string[]>([])

const typingIndicatorText = computed(() => {
  if (typingUsers.value.length === 0) return ''
  if (typingUsers.value.length === 1) return `${typingUsers.value[0]} píše...`
  if (typingUsers.value.length === 2) return `${typingUsers.value[0]} a ${typingUsers.value[1]} píšu...`
  return `${typingUsers.value.length} ľudí píše...`
})

function selectChannel(channel: typeof channels.value[0]) {
  currentChannel.value = channel
  channel.unreadCount = 0
  channel.isNewInvite = false
}

function setStatus(status: 'online' | 'dnd' | 'offline') {
  userStatus.value = status
  $q.notify({
    type: 'info',
    message: `Stav zmenený na ${status}`,
    position: 'top',
    timeout: 1500,
    icon: status === 'online' ? 'circle' : status === 'dnd' ? 'do_not_disturb_on' : 'circle'
  })
}

function getStatusColor(status: string) {
  switch (status) {
    case 'online': return 'positive'
    case 'dnd': return 'warning'
    case 'offline': return 'grey-5'
    default: return 'grey'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'online': return 'circle'
    case 'dnd': return 'do_not_disturb_on'
    case 'offline': return 'circle'
    default: return 'circle'
  }
}

function createChannel() {
  if (!newChannelName.value || newChannelName.value.length < 3) {
    $q.notify({
      type: 'warning',
      message: 'Názov musí mať aspoň 3 znaky',
      position: 'top'
    })
    return
  }
  
  const newChannel = {
    id: Date.now(),
    name: newChannelName.value,
    isPrivate: newChannelIsPrivate.value,
    unreadCount: 0,
    isNewInvite: false,
    isAdmin: true
  }
  
  channels.value.push(newChannel)
  showCreateChannelDialog.value = false
  newChannelName.value = ''
  newChannelIsPrivate.value = false
  
  $q.notify({
    type: 'positive',
    message: `Kanál #${newChannel.name} bol vytvorený`,
    position: 'top',
    icon: 'check_circle',
    actions: [
      { label: 'Otvoriť', color: 'white', handler: () => selectChannel(newChannel) }
    ]
  })
}

function handleLogout() {
  localStorage.removeItem('user')
  void router.push('/auth')
  $q.notify({
    type: 'info',
    message: 'Odhlásený',
    position: 'top',
    icon: 'logout'
  })
}

function toggleDarkMode() {
  $q.dark.toggle()
  localStorage.setItem('darkMode', String($q.dark.isActive))
}

</script>

<style scoped>
/* Transition animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.transition {
  transition: all 0.2s ease;
}
</style>