import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import router from '@/router'
import { db, auth } from '@/firebase'
import {
  collection, query, where, getDocs, doc, updateDoc,
  arrayUnion, arrayRemove
} from 'firebase/firestore'

let initialized = false
let currentToken = null

async function findUserDocId(uid) {
  const q = query(collection(db, 'users'), where('uid', '==', uid))
  const snap = await getDocs(q)
  return snap.size > 0 ? snap.docs[0].id : null
}

async function saveTokenToFirestore(tokenValue) {
  const uid = auth.currentUser?.uid
  if (!uid) return

  const docId = await findUserDocId(uid)
  if (!docId) return

  await updateDoc(doc(db, 'users', docId), {
    tokens: arrayUnion(tokenValue)
  })
  currentToken = tokenValue
}

export async function unregisterCurrentDeviceToken() {
  if (!currentToken) return

  const uid = auth.currentUser?.uid
  if (!uid) {
    currentToken = null
    return
  }

  try {
    const docId = await findUserDocId(uid)
    if (docId) {
      await updateDoc(doc(db, 'users', docId), {
        tokens: arrayRemove(currentToken)
      })
    }
  } catch (e) {
    console.error('[Push] Error removing token on logout:', e)
  } finally {
    currentToken = null
  }
}

export async function registerPushNotifications() {
  if (!Capacitor.isNativePlatform()) return

  if (!initialized) {
    initialized = true

    await PushNotifications.addListener('registration', async (token) => {
      try {
        await saveTokenToFirestore(token.value)
      } catch (e) {
        console.error('[Push] Error saving token:', e)
      }
    })

    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error)
    })

    // Navegar al tocar la notificación. El backend aún no envía `data` de ruteo;
    // cuando lo haga (route/type/orderId) se usa. Hoy: los pedidos digitales van
    // al tab de pedidos; el resto solo trae la app a foreground.
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action?.notification?.data || {}
      const target = data.route || (data.type === 'digitalOrder' ? '/tabs/pedidos' : null)
      if (target) router.push(target).catch(() => {})
    })
  }

  const permResult = await PushNotifications.requestPermissions()
  if (permResult.receive !== 'granted') return

  await PushNotifications.register()
}
