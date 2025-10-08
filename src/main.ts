import { createApp } from 'vue'
import { Quasar } from 'quasar'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Import Quasar css
import 'quasar/dist/quasar.css'
import { initializeStaticData } from './utils/seedData'

initializeStaticData()

const app = createApp(App)

app.use(Quasar, {
  // Quasar config
})
app.use(createPinia())
app.use(router)
app.mount('#app')
