<template>
  <router-view />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { onMounted } from 'vue'

const $q = useQuasar()

onMounted(() => {
  // VYPNI dark mode na začiatku
  $q.dark.set(false)  // ← zmeň z true na false
  
  // Alebo úplne zakomentuj:
  // const darkMode = localStorage.getItem('darkMode')
  // $q.dark.set(darkMode !== 'false')
})
</script>

<!-- Zakomentuj celý dark mode CSS -->
<!--
<style>
body.body--dark {
  background: #1e1e1e;
  color: #e0e0e0;
}
...
</style>
-->