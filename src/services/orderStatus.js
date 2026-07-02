// Centro de Pedidos Digitales — etiquetas, colores (Ionic) y máquina de estados.
// Espejo de imv-back/src/views/digitalOrders/status.js, con colores de Ionic.

export const BUSINESS_LABELS = {
  pending: 'Nuevo',
  reviewed: 'Revisado',
  delivered: 'Entregado',
  issue: 'Con problemas',
  cancelled: 'Cancelado'
}

export const BUSINESS_COLORS = {
  pending: 'primary',
  reviewed: 'warning',
  delivered: 'success',
  issue: 'danger',
  cancelled: 'medium'
}

export const KONTENTO_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado'
}

export const KONTENTO_COLORS = {
  pending: 'warning',
  paid: 'success',
  cancelled: 'danger',
  refunded: 'danger'
}

export const INVOICE_LABELS = {
  not_invoiced: 'Sin facturar',
  invoicing: 'Facturando…',
  invoiced: 'Facturado',
  invoice_failed: 'Falló facturación',
  void: 'Anulado'
}

export const INVOICE_COLORS = {
  not_invoiced: 'primary',
  invoicing: 'warning',
  invoiced: 'success',
  invoice_failed: 'danger',
  void: 'medium'
}

// Transiciones permitidas de businessStatus (ver plan §4.1).
export const TRANSITIONS = {
  pending: ['reviewed', 'issue', 'cancelled'],
  reviewed: ['delivered', 'issue', 'cancelled'],
  delivered: ['issue'],
  issue: ['reviewed', 'delivered', 'cancelled'],
  cancelled: ['reviewed']
}

export const businessLabel = (s) => BUSINESS_LABELS[s] || s || '—'
export const businessColor = (s) => BUSINESS_COLORS[s] || 'medium'
export const kontentoLabel = (s) => KONTENTO_LABELS[s] || s || '—'
export const kontentoColor = (s) => KONTENTO_COLORS[s] || 'medium'
export const invoiceLabel = (s) => INVOICE_LABELS[s] || s || '—'
export const invoiceColor = (s) => INVOICE_COLORS[s] || 'medium'
