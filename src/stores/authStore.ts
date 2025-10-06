import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserStatus, LoginRequest, RegisterRequest } from '../types'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const status = ref<UserStatus>('online')

  // Getters
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const currentUser = computed(() => user.value)
  const userNickName = computed(() => user.value?.nickName || '')

  // Actions
  async function login(credentials: LoginRequest) {
    try {
      // TODO: Replace with actual API call to AdonisJS backend
      // const response = await api.post('/auth/login', credentials)
      
      // Simulated API response
      const mockUser: User = {
        id: 1,
        firstName: 'Ján',
        lastName: 'Novák',
        nickName: 'JanNovak',
        email: credentials.email,
        status: 'online'
      }
      
      const mockToken = 'mock-jwt-token-' + Date.now()
      
      // Set state
      user.value = mockUser
      token.value = mockToken
      status.value = 'online'
      
      // Persist to localStorage
      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('user', JSON.stringify(mockUser))
      
      return { success: true, user: mockUser }
    } catch (error: any) {
      console.error('Login failed:', error)
      return { success: false, error: error.message || 'Prihlásenie zlyhalo' }
    }
  }

  async function register(data: RegisterRequest) {
    try {
      // TODO: Replace with actual API call to AdonisJS backend
      // const response = await api.post('/auth/register', data)
      
      // Simulated API response
      const mockUser: User = {
        id: Date.now(),
        firstName: data.firstName,
        lastName: data.lastName,
        nickName: data.nickName,
        email: data.email,
        status: 'online'
      }
      
      return { success: true, user: mockUser }
    } catch (error: any) {
      console.error('Registration failed:', error)
      return { success: false, error: error.message || 'Registrácia zlyhala' }
    }
  }

  function logout() {
    user.value = null
    token.value = null
    status.value = 'offline'
    
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }

  async function setUserStatus(newStatus: UserStatus) {
    if (!user.value) return
    
    status.value = newStatus
    user.value.status = newStatus
    
    // TODO: Update status on backend
    // await api.patch('/users/status', { status: newStatus })
    
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  function initializeFromStorage() {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      try {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
        status.value = user.value?.status || 'online'
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        logout()
      }
    }
  }

  // Initialize on store creation
  initializeFromStorage()

  return {
    // State
    user,
    token,
    status,
    // Getters
    isAuthenticated,
    currentUser,
    userNickName,
    // Actions
    login,
    register,
    logout,
    setUserStatus,
    initializeFromStorage
  }
})