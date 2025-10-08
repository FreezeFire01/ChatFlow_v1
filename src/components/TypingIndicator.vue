<template>
  <transition
    enter-active-class="animated fadeIn"
    leave-active-class="animated fadeOut"
  >
    <q-chip
      v-if="users.length > 0"
      color="white"
      text-color="primary"
      icon="edit"
      size="sm"
    >
      {{ typingText }}
    </q-chip>
  </transition>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { TypingIndicator } from '../types'

export default defineComponent({
  name: 'TypingIndicator',
  props: {
    users: {
      type: Array as PropType<TypingIndicator[]>,
      default: () => []
    }
  },
  computed: {
    typingText(): string {
      if (this.users.length === 0) {
        return ''
      }
      const [first, second] = this.users
      if (!first) {
        return ''
      }
      if (this.users.length === 1) {
        return `${first.nickName} píše...`
      }
      if (this.users.length === 2 && second) {
        return `${first.nickName} a ${second.nickName} píšu...`
      }
      return `${first.nickName} a ${this.users.length - 1} ďalší píšu...`
    }
  }
})
</script>