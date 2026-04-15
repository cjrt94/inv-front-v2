import { db } from '@/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore'

export async function fetchProducts() {
  const q = query(collection(db, 'products'), orderBy('name'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export async function fetchProductsBySkus(skus) {
  if (!skus.length) return []

  const batches = []
  for (let i = 0; i < skus.length; i += 30) {
    const batch = skus.slice(i, i + 30)
    const q = query(collection(db, 'products'), where('sku', 'in', batch))
    batches.push(getDocs(q))
  }

  const results = await Promise.all(batches)
  return results.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
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
