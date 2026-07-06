import { defineStore } from 'pinia'
import { auth } from '@/firebase'
import {
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { unregisterCurrentDeviceToken } from '@/services/notificationService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null
  }),

  actions: {
    async login(email, password) {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      const token = await user.getIdTokenResult()

      // La app es admin-only: todas las reglas de Firestore exigen claim `admin`.
      // (El rol `editor` no es asignable en el sistema; ver imv-back.)
      if (!token.claims.admin) {
        await signOut(auth)
        throw new Error('Permisos insuficientes')
      }

      this.user = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: 'admin'
      }
    },

    async logout() {
      await unregisterCurrentDeviceToken()
      await signOut(auth)
      this.user = null
    }
  }
})
