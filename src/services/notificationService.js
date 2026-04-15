import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { db, auth } from '@/firebase'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'

async function saveTokenToFirestore(tokenValue) {
  const uid = auth.currentUser?.uid
  if (!uid) return

  const q = query(collection(db, 'users'), where('uid', '==', uid))
  const snap = await getDocs(q)
  if (snap.size > 0) {
    await updateDoc(doc(db, 'users', snap.docs[0].id), { token: tokenValue })
  }
}

export async function registerPushNotifications() {
  if (!Capacitor.isNativePlatform()) return

  const permResult = await PushNotifications.requestPermissions()
  if (permResult.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', async (token) => {
    try {
      await saveTokenToFirestore(token.value)
    } catch (e) {
      console.error('[Push] Error saving token:', e)
    }
  })

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] Registration error:', error)
  })
}
