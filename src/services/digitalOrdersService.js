// Centro de Pedidos Digitales — servicio de la app (inv-front-v2).
// Carga de pedidos, cambio de estado (con historial) y captura/subida del voucher
// de envío del courier con cola offline (ver voucherQueue.js).

import { db, storage, auth } from '@/firebase'
import {
  collection, query, orderBy, limit, getDocs, getDoc,
  doc, updateDoc, addDoc, arrayUnion, serverTimestamp
} from 'firebase/firestore'
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Network } from '@capacitor/network'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { enqueue, allPending, remove, pendingCount } from './voucherQueue'

const COLLECTION = 'digitalOrders'

function currentUser () {
  const u = auth.currentUser
  return u ? { uid: u.uid, email: u.email } : null
}

export async function fetchDigitalOrders (max = 100) {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function fetchOrder (orderId) {
  const s = await getDoc(doc(db, COLLECTION, orderId))
  return s.exists() ? { id: s.id, ...s.data() } : null
}

// Cambio de estado de negocio + entrada de historial (batch lógico: update + add).
export async function updateBusinessStatus (orderId, from, to) {
  const by = currentUser()
  const ref = doc(db, COLLECTION, orderId)
  await updateDoc(ref, { businessStatus: to, updatedAt: serverTimestamp(), lastUser: by })
  await addDoc(collection(db, COLLECTION, orderId, 'history'), {
    from, to, at: serverTimestamp(), by, note: ''
  })
}

// Sube una entrada de la cola a Storage y la enlaza al pedido; luego la remueve.
async function uploadEntry (entry) {
  const path = `digitalOrders/${entry.orderId}/deliveryVouchers/${entry.id}.${entry.format || 'jpeg'}`
  const r = storageRef(storage, path)
  await uploadString(r, entry.base64, 'base64', { contentType: `image/${entry.format || 'jpeg'}` })
  const url = await getDownloadURL(r)
  await updateDoc(doc(db, COLLECTION, entry.orderId), {
    deliveryVouchers: arrayUnion({
      url,
      storagePath: path,
      uploadedAt: new Date().toISOString(),
      uploadedBy: entry.capturedBy || null,
      source: entry.source || 'camera'
    }),
    updatedAt: serverTimestamp()
  })
  await remove(entry.id)
  return { url, storagePath: path }
}

// Intenta subir todo lo pendiente. Devuelve cuántos subió. Silencioso ante fallos
// (se reintenta en el próximo flush: reconexión / app en foreground).
export async function flushVoucherQueue () {
  let uploaded = 0
  let items = []
  try { items = await allPending() } catch (e) { return 0 }
  for (const entry of items) {
    try {
      await uploadEntry(entry)
      uploaded++
    } catch (e) {
      // dejar en cola para el próximo intento
    }
  }
  return uploaded
}

// Captura una foto (cámara o galería) y la encola; intenta subir de una.
// Devuelve { queued:true, uploadedNow:boolean }.
export async function captureVoucher (orderId) {
  const photo = await Camera.getPhoto({
    quality: 60,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt // deja elegir Cámara o Fotos
  })
  if (!photo || !photo.base64String) throw new Error('Sin imagen')
  const before = await pendingCount(orderId)
  await enqueue({
    orderId,
    base64: photo.base64String,
    format: photo.format || 'jpeg',
    source: 'camera',
    capturedBy: currentUser(),
    capturedAt: new Date().toISOString()
  })
  const uploaded = await flushVoucherQueue()
  const after = await pendingCount(orderId)
  return { queued: true, uploadedNow: uploaded > 0 && after <= before }
}

export async function orderPendingVouchers (orderId) {
  try { return await pendingCount(orderId) } catch (e) { return 0 }
}

// Registra el flush automático al reconectar y al volver la app a primer plano.
// Idempotente: se instala una sola vez.
let syncInstalled = false
export function initVoucherSync () {
  if (syncInstalled) return
  syncInstalled = true
  // flush inicial (por si quedó algo de una sesión anterior)
  flushVoucherQueue().catch(() => {})
  try {
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) flushVoucherQueue().catch(() => {})
    })
  } catch (e) { /* plugin no disponible en web */ }
  if (Capacitor.isNativePlatform()) {
    try {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) flushVoucherQueue().catch(() => {})
      })
    } catch (e) { /* noop */ }
  }
}
