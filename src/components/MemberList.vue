<template>
  <q-list>
    <q-item-label header>Členovia</q-item-label>
    <q-item v-for="user in users" :key="user.id">
      <q-item-section>{{ user.name }}</q-item-section>
    </q-item>
  </q-list>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const users = ref([
  { id: 1, name: 'Ján' },
  { id: 2, name: 'Eva' }
])
</script>

