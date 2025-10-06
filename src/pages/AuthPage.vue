<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center auth-background">
        <q-card class="auth-card q-pa-lg" flat bordered>
          <!-- Logo/Brand Section -->
          <q-card-section class="text-center q-pb-none">
            <div class="text-h3 text-weight-bold text-primary q-mb-sm">
              💬 ChatFlow
            </div>
            <div class="text-subtitle1 text-grey-7">
              {{ isLogin ? 'Vitaj späť!' : 'Vytvor si účet' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-md">
            <!-- Toggle between Login/Register -->
            <q-tabs
              v-model="tab"
              dense
              class="text-grey-7 q-mb-md"
              active-color="primary"
              indicator-color="primary"
              align="justify"
            >
              <q-tab name="login" label="Prihlásenie" />
              <q-tab name="register" label="Registrácia" />
            </q-tabs>

            <q-tab-panels v-model="tab" animated>
              <!-- Login Panel -->
              <q-tab-panel name="login" class="q-pa-none">
                <q-form @submit="handleLogin" class="q-gutter-md">
                  <q-input
                    v-model="loginForm.email"
                    type="email"
                    label="Email"
                    outlined
                    :rules="[val => !!val || 'Email je povinný', val => /.+@.+\..+/.test(val) || 'Neplatný email']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="mail" />
                    </template>
                  </q-input>

                  <q-input
                    v-model="loginForm.password"
                    :type="showPassword ? 'text' : 'password'"
                    label="Heslo"
                    outlined
                    :rules="[val => !!val || 'Heslo je povinné']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock" />
                    </template>
                    <template v-slot:append>
                      <q-icon
                        :name="showPassword ? 'visibility' : 'visibility_off'"
                        class="cursor-pointer"
                        @click="showPassword = !showPassword"
                      />
                    </template>
                  </q-input>

                  <q-btn
                    type="submit"
                    label="Prihlásiť sa"
                    color="primary"
                    class="full-width"
                    size="lg"
                    :loading="loading"
                    unelevated
                  />
                </q-form>
              </q-tab-panel>

              <!-- Register Panel -->
              <q-tab-panel name="register" class="q-pa-none">
                <q-form @submit="handleRegister" class="q-gutter-md">
                  <div class="row q-col-gutter-sm">
                    <div class="col-6">
                      <q-input
                        v-model="registerForm.firstName"
                        label="Meno"
                        outlined
                        :rules="[val => !!val || 'Meno je povinné']"
                      />
                    </div>
                    <div class="col-6">
                      <q-input
                        v-model="registerForm.lastName"
                        label="Priezvisko"
                        outlined
                        :rules="[val => !!val || 'Priezvisko je povinné']"
                      />
                    </div>
                  </div>

                  <q-input
                    v-model="registerForm.nickName"
                    label="Prezývka (nickName)"
                    outlined
                    :rules="[
                      val => !!val || 'Prezývka je povinná',
                      val => val.length >= 3 || 'Minimálne 3 znaky',
                      val => /^[a-zA-Z0-9_]+$/.test(val) || 'Len písmená, čísla a _'
                    ]"
                  >
                    <template v-slot:prepend>
                      <q-icon name="person" />
                    </template>
                  </q-input>

                  <q-input
                    v-model="registerForm.email"
                    type="email"
                    label="Email"
                    outlined
                    :rules="[val => !!val || 'Email je povinný', val => /.+@.+\..+/.test(val) || 'Neplatný email']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="mail" />
                    </template>
                  </q-input>

                  <q-input
                    v-model="registerForm.password"
                    :type="showPassword ? 'text' : 'password'"
                    label="Heslo"
                    outlined
                    :rules="[
                      val => !!val || 'Heslo je povinné',
                      val => val.length >= 6 || 'Minimálne 6 znakov'
                    ]"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock" />
                    </template>
                    <template v-slot:append>
                      <q-icon
                        :name="showPassword ? 'visibility' : 'visibility_off'"
                        class="cursor-pointer"
                        @click="showPassword = !showPassword"
                      />
                    </template>
                  </q-input>

                  <q-btn
                    type="submit"
                    label="Registrovať"
                    color="primary"
                    class="full-width"
                    size="lg"
                    :loading="loading"
                    unelevated
                  />
                </q-form>
              </q-tab-panel>
            </q-tab-panels>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

const tab = ref('login')
const showPassword = ref(false)
const loading = ref(false)

const isLogin = computed(() => tab.value === 'login')

const loginForm = ref({
  email: '',
  password: ''
})

const registerForm = ref({
  firstName: '',
  lastName: '',
  nickName: '',
  email: '',
  password: ''
})

async function handleLogin() {
  loading.value = true
  try {
    // TODO: Connect to your AdonisJS backend
    // const response = await api.post('/login', loginForm.value)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Store user data in localStorage (temporary until you implement proper auth)
    const userData = {
      email: loginForm.value.email,
      nickName: 'User123', // Will come from backend
      firstName: 'Jan',
      lastName: 'Novak'
    }
    localStorage.setItem('user', JSON.stringify(userData))
    
    $q.notify({
      type: 'positive',
      message: 'Prihlásenie úspešné!',
      position: 'top'
    })
    
    router.push('/chat')
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Nesprávne prihlasovacie údaje',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  loading.value = true
  try {
    // TODO: Connect to your AdonisJS backend
    // const response = await api.post('/register', registerForm.value)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    $q.notify({
      type: 'positive',
      message: 'Registrácia úspešná! Môžete sa prihlásiť.',
      position: 'top'
    })
    
    tab.value = 'login'
    loginForm.value.email = registerForm.value.email
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Registrácia zlyhala. Skúste iný email alebo prezývku.',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-background {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.auth-card {
  width: 100%;
  max-width: 450px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
}
</style>