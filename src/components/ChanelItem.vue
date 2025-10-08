<template>
  <q-item
    clickable
    v-ripple
    :active="isActive"
    active-class="bg-primary text-white"
    @click="$emit('select', channel)"
    class="rounded-borders q-mb-xs"
  >
    <q-item-section avatar>
      <q-avatar 
        size="32px" 
        :color="channel.isPrivate ? 'orange' : 'primary'" 
        text-color="white"
      >
        <q-icon 
          :name="channel.isPrivate ? 'lock' : 'tag'" 
          size="16px" 
        />
      </q-avatar>
    </q-item-section>
    
    <q-item-section>
      <q-item-label lines="1">
        {{ channel.name }}
      </q-item-label>
      <q-item-label 
        v-if="channel.lastMessage" 
        caption
        lines="1"
      >
        {{ channel.lastMessage }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <!-- Unread Badge -->
      <q-badge 
        v-if="channel.unreadCount > 0" 
        color="red" 
        :label="channel.unreadCount"
        class="q-mb-xs"
      />
      
      <!-- New Invite Badge -->
      <q-icon 
        v-if="channel.isNewInvite" 
        name="fiber_new" 
        color="warning"
        size="sm"
      />

      <!-- Actions Menu -->
      <q-btn
        v-if="isActive"
        flat
        dense
        round
        icon="more_vert"
        size="sm"
        @click.stop
      >
        <q-menu auto-close>
          <q-list dense>
            <q-item 
              clickable 
              @click="$emit('leave', channel)"
            >
              <q-item-section avatar>
                <q-icon name="exit_to_app" />
              </q-item-section>
              <q-item-section>Opustiť</q-item-section>
            </q-item>
            
            <template v-if="isAdmin">
              <q-separator />
              <q-item 
                clickable 
                @click="$emit('delete', channel)"
                class="text-negative"
              >
                <q-item-section avatar>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section>Zmazať</q-item-section>
              </q-item>
            </template>
          </q-list>
        </q-menu>
      </q-btn>
    </q-item-section>
  </q-item>
</template>

<script lang="ts">
export default {
  name: 'ChannelItem',

  props: {
    channel: {
      type: Object,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
  },

  emits: ['select', 'leave', 'delete']
}
</script>