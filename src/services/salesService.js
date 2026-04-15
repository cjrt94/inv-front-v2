import { db } from '@/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore'

export const ESTABLISHMENTS = [
  'Todos',
  'Local 447',
  'Local 461',
  'Local Leticia',
  'Local Revelados'
]

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function todayEnd() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export function getDefaultDates() {
  return {
    start: todayStart().toISOString().split('T')[0],
    end: todayEnd().toISOString().split('T')[0]
  }
}

function withTimeout(promise, ms, label = 'operación') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tiempo de espera agotado: ${label}`)), ms)
    )
  ])
}

export async function fetchSales(startStr, endStr, establishment = 'Todos') {
  const startDate = new Date(startStr + 'T00:00:00')
  const endDate = new Date(endStr + 'T23:59:59')

  const startTs = Timestamp.fromDate(startDate)
  const endTs = Timestamp.fromDate(endDate)

  const salesRef = collection(db, 'sales')
  const constraints = [
    where('issueDate', '>=', startTs),
    where('issueDate', '<=', endTs)
  ]

  if (establishment !== 'Todos') {
    constraints.push(where('establishment.name', '==', establishment))
  }

  const snapshot = await withTimeout(
    getDocs(query(salesRef, ...constraints)),
    30000,
    'cargando ventas'
  )
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export function computeKpis(sales) {
  const regular = sales.filter((s) => s.sunatDocumentType !== '07')
  const cancellations = sales.filter((s) => s.sunatDocumentType === '07')

  const subtotal = regular.reduce((sum, s) => sum + (s.footer?.total || 0), 0)
  const totalAnulaciones = cancellations.reduce((sum, s) => sum + (s.footer?.total || 0), 0)
  const unidades = regular.reduce(
    (sum, s) => sum + (s.detail || []).reduce((ds, d) => ds + (d.quantity || 0), 0),
    0
  )

  return {
    subtotal,
    total: subtotal - totalAnulaciones,
    comprobantes: regular.length,
    unidades,
    ticketPromedio: regular.length ? subtotal / regular.length : 0,
    totalAnulaciones,
    numAnulaciones: cancellations.length
  }
}

export function computeSalesByDay(sales) {
  const dayMap = {}

  sales
    .filter((s) => s.sunatDocumentType !== '07')
    .forEach((sale) => {
      const date = sale.issueDate?.toDate ? sale.issueDate.toDate() : new Date(sale.issueDate)
      const key = date.toISOString().split('T')[0]
      if (!dayMap[key]) dayMap[key] = 0
      dayMap[key] += sale.footer?.total || 0
    })

  const sorted = Object.keys(dayMap).sort()
  return {
    dates: sorted,
    totals: sorted.map((k) => parseFloat(dayMap[k].toFixed(2)))
  }
}

export function computeTopProducts(sales, products = [], limit = 10) {
  const excludedSkus = new Set(
    products
      .filter((p) => p.category?.name === 'Revelados' && p.sku)
      .map((p) => p.sku)
  )

  const map = {}

  sales
    .filter((s) => s.sunatDocumentType !== '07')
    .forEach((sale) => {
      ;(sale.detail || []).forEach((item) => {
        if (item.category?.name === 'Revelados') return
        if (item.sku && excludedSkus.has(item.sku)) return
        const key = item.sku || item.name
        if (!map[key]) {
          map[key] = { name: item.name, sku: item.sku, quantity: 0, total: 0 }
        }
        map[key].quantity += item.quantity || 0
        const igv = 1.18
        const price = item.price * igv - (item.discount?.value || 0) * igv
        map[key].total += price * (item.quantity || 0)
      })
    })

  return Object.values(map)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit)
}

export function computeSellers(sales) {
  const map = {}

  sales
    .filter((s) => s.sunatDocumentType !== '07')
    .forEach((sale) => {
      const user = sale.user
      if (!user) return
      const key = user._id || user.email || 'unknown'
      const name = `${user.firstname || ''} ${user.lastname || ''}`.trim() || key
      if (!map[key]) map[key] = { name, total: 0, count: 0 }
      map[key].total += sale.footer?.total || 0
      map[key].count += 1
    })

  return Object.values(map).sort((a, b) => b.total - a.total)
}

export function computeBrands(sales, products) {
  const skuToBrand = {}
  products.forEach((p) => {
    if (p.sku && p.brand?.name && p.category?.name !== 'Revelados') {
      skuToBrand[p.sku] = p.brand.name
    }
  })

  const map = {}
  sales
    .filter((s) => s.sunatDocumentType !== '07')
    .forEach((sale) => {
      ;(sale.detail || []).forEach((item) => {
        const brand = skuToBrand[item.sku]
        if (!brand) return
        if (!map[brand]) map[brand] = { name: brand, total: 0 }
        const igv = 1.18
        const price = item.price * igv - (item.discount?.value || 0) * igv
        map[brand].total += price * (item.quantity || 0)
      })
    })

  return Object.values(map)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}
