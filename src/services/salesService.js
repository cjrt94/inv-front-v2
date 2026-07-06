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
  // toDateStr (componentes locales) en vez de toISOString: en Lima (UTC−5) el ISO
  // empujaba el "Hasta" al día siguiente. Consistente con getDateRangeShortcut.
  return {
    start: toDateStr(todayStart()),
    end: toDateStr(todayEnd())
  }
}

// YYYY-MM-DD a partir de los componentes LOCALES (evita el corrimiento de día
// que produce toISOString al pasar a UTC en husos negativos como America/Lima).
function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Atajos de rango de fecha del dashboard (réplica de imv-back setDateShortcut).
// La semana arranca el lunes; `end = hoy` donde aplica (no hay ventas futuras).
export const DATE_SHORTCUTS = [
  { type: 'today', label: 'Hoy' },
  { type: 'yesterday', label: 'Ayer' },
  { type: 'thisWeek', label: 'Esta semana' },
  { type: 'thisMonth', label: 'Este mes' },
  { type: 'lastMonth', label: 'Mes pasado' },
  { type: 'thisYear', label: 'Este año' }
]

export function getDateRangeShortcut(type) {
  const now = new Date()
  const y = now.getFullYear()
  const mo = now.getMonth()
  let start
  let end

  switch (type) {
    case 'today':
      start = new Date()
      end = new Date()
      break
    case 'yesterday': {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      start = d
      end = new Date(d)
      break
    }
    case 'thisWeek': {
      // getDay(): 0=domingo … 6=sábado. La semana inicia el lunes.
      const day = now.getDay()
      const sinceMonday = day === 0 ? 6 : day - 1
      start = new Date(y, mo, now.getDate() - sinceMonday)
      end = new Date()
      break
    }
    case 'thisMonth':
      start = new Date(y, mo, 1)
      end = new Date()
      break
    case 'lastMonth':
      start = new Date(y, mo - 1, 1)
      end = new Date(y, mo, 0) // día 0 del mes actual = último día del mes anterior
      break
    case 'thisYear':
      start = new Date(y, 0, 1)
      end = new Date()
      break
    default:
      return null
  }

  return { start: toDateStr(start), end: toDateStr(end) }
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
      // Agrupar por día local (no UTC): Lima es UTC−5, así que toISOString empuja
      // las ventas de la noche (>19:00) al día siguiente y aparecían barras fantasma.
      const key = toDateStr(date)
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

// ── Productos destacados ─────────────────────────────────────────────
// Réplica de la sección "Productos destacados" del dashboard de imv-back.
// Se nutre de los productos con `featured === true` y de las ventas ya
// cargadas por el filtro de fecha (no hace queries nuevas). Las NC (07) no
// entran, igual que el resto de vistas por producto. Ingreso = precio con
// IGV menos descuento, por cantidad (mismo cálculo que computeTopProducts).
const IGV = 1.18

function featuredLines(sales, featuredSkus) {
  const lines = []
  sales
    .filter((s) => s.sunatDocumentType !== '07')
    .forEach((sale) => {
      const date = sale.issueDate?.toDate ? sale.issueDate.toDate() : new Date(sale.issueDate)
      ;(sale.detail || []).forEach((item) => {
        if (!item.sku || !featuredSkus.has(item.sku.toLowerCase())) return
        const qty = item.quantity || 0
        const revenue = (item.price * IGV - (item.discount?.value || 0) * IGV) * qty
        lines.push({ sku: item.sku, name: item.name, quantity: qty, revenue, date })
      })
    })
  return lines
}

export function computeFeaturedTable(sales, products) {
  const featured = products.filter((p) => p.featured && p.sku)
  if (!featured.length) return []

  const featuredSkus = new Set(featured.map((p) => p.sku.toLowerCase()))
  const agg = {}
  featuredLines(sales, featuredSkus).forEach((l) => {
    const key = l.sku.toLowerCase()
    if (!agg[key]) agg[key] = { units: 0, revenue: 0 }
    agg[key].units += l.quantity
    agg[key].revenue += l.revenue
  })

  // Incluye destacados sin ventas en el período (en 0), tomándolos de `featured`.
  return featured
    .map((fp) => {
      const a = agg[fp.sku.toLowerCase()] || { units: 0, revenue: 0 }
      return {
        sku: fp.sku,
        name: fp.name || fp.sku,
        units: a.units,
        revenue: parseFloat(a.revenue.toFixed(2))
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}
