import { createRouter, createWebHistory } from '@ionic/vue-router'
import { auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const routes = [
  {
    path: '/',
    redirect: '/tabs/dashboard'
  },
  {
    path: '/login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/tabs',
    component: () => import('@/views/Tabs.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/tabs/dashboard'
      },
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard/Index.vue')
      },
      {
        path: 'products',
        component: () => import('@/views/products/Index.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

router.beforeEach(async (to) => {
  const user = await waitForAuth()

  if (to.meta.requiresAuth && !user) {
    return '/login'
  }

  if (to.path === '/login' && user) {
    return '/tabs/dashboard'
  }
})

export default router
