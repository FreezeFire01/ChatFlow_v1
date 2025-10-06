import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/chat'
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('pages/AuthPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/chat',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'chat',
        component: () => import('pages/ChatPage.vue')
      },
      {
        path: 'channel/:id',
        name: 'channel',
        component: () => import('pages/ChatPage.vue')
      }
    ]
  },
  // 404 - Not found
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes