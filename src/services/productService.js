import { db } from '@/firebase'
import {
  collection,
  query,
  getDocs,
  orderBy
} from 'firebase/firestore'

export async function fetchProducts() {
  const q = query(collection(db, 'products'), orderBy('name'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export async function fetchCompetitors(productId) {
  const ref = collection(db, 'products', productId, 'competitors')
  const snapshot = await getDocs(ref)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export async function fetchProductStocks(productId) {
  const ref = collection(db, 'products', productId, 'stocks')
  const snapshot = await getDocs(ref)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}
