// Cola offline de vouchers de envío pendientes de subir.
//
// Respaldada en IndexedDB (no localStorage: WKWebView lo bloquea en iOS — por eso
// esta app usa indexedDBLocalPersistence/persistentLocalCache). Cada entrada guarda
// la foto en base64 + el pedido al que pertenece; se sube cuando hay conexión.

const DB_NAME = 'imv-vouchers'
const STORE = 'queue'

function openDb () {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx (db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE)
}

function genId () {
  try {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID()
  } catch (e) { /* noop */ }
  return 'v_' + Date.now() + '_' + Math.floor(Math.random() * 1e9)
}

// entry: { orderId, base64, format, capturedBy, capturedAt }
export async function enqueue (entry) {
  const db = await openDb()
  const record = { id: genId(), ...entry }
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').add(record)
    req.onsuccess = () => resolve(record)
    req.onerror = () => reject(req.error)
  })
}

export async function allPending () {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

export async function pendingCount (orderId) {
  const items = await allPending()
  return items.filter((i) => i.orderId === orderId).length
}

export async function remove (id) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
