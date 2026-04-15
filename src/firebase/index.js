import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { initializeAuth, indexedDBLocalPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyALKDjgHBtd4YWVM984rBcYuqv2Hdn_MlQ',
  authDomain: 'imvialex.firebaseapp.com',
  databaseURL: 'https://imvialex.firebaseio.com',
  projectId: 'imvialex',
  storageBucket: 'imvialex.appspot.com',
  messagingSenderId: '452948049149',
  appId: '1:452948049149:web:bff3874059a18696265294',
  measurementId: 'G-91S57L9223'
}

const app = initializeApp(firebaseConfig)

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
})
export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
})
