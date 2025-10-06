<template>
  <q-list>
    <q-item-label header>Kanály</q-item-label>
    <q-item v-for="channel in channels" :key="channel.id" clickable @click="selectChannel(channel)">
      <q-item-section># {{ channel.name }}</q-item-section>
    </q-item>
  </q-list>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const channels = ref([
  { id: 1, name: 'všeobecné' },
  { id: 2, name: 'random' }
])

function selectChannel(_channel: { id: number; name: string }) {
  // prepni channel v store
}
</script>
