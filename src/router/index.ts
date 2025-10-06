import { route } from 'quasar/wrappers'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router'
import routes from './routes'
// import { useAuthStore } from 'src/stores/authStore'  // ← zakomentuj

export default route(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  /*
  Router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)

    if (requiresAuth && !authStore.isAuthenticated) {
      next({ name: 'auth', query: { redirect: to.fullPath } })
    } else if (to.name === 'auth' && authStore.isAuthenticated) {
      next({ name: 'chat' })
    } else {
      next()
    }
  })
  */

  return Router
})