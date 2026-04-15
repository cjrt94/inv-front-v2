import { defineStore } from 'pinia'
import { auth } from '@/firebase'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { registerPushNotifications } from '@/services/notificationService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: true
  }),

  getters: {
    isLoggedIn: (state) => !!state.user
  },

  actions: {
    async login(email, password) {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      const token = await user.getIdTokenResult()

      if (!token.claims.admin && !token.claims.editor) {
        await signOut(auth)
        throw new Error('Permisos insuficientes')
      }

      this.user = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: token.claims.admin ? 'admin' : 'editor'
      }

      registerPushNotifications().catch(console.error)
    },

    async logout() {
      await signOut(auth)
      this.user = null
    },

    init() {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          unsubscribe()
          if (firebaseUser) {
            try {
              const token = await firebaseUser.getIdTokenResult()
              if (token.claims.admin || token.claims.editor) {
                this.user = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  role: token.claims.admin ? 'admin' : 'editor'
                }
              } else {
                this.user = null
              }
            } catch {
              this.user = null
            }
          } else {
            this.user = null
          }
          this.loading = false
          resolve()
        })
      })
    }
  }
})
