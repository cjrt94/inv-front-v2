<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>Pedido</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="$emit('close')">Cerrar</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div class="do-body">
      <!-- Estados (3 ejes etiquetados) -->
      <section class="do-card do-status">
        <div class="do-status__row">
          <span class="do-status__key">Pago (Kontento)</span>
          <span class="status-pill" :class="'status-pill--' + kontentoColor(o.kontentoStatus)">
            {{ kontentoLabel(o.kontentoStatus) }}
          </span>
        </div>
        <div class="do-status__row">
          <span class="do-status__key">Gestión</span>
          <span class="status-pill" :class="'status-pill--' + businessColor(o.businessStatus)">
            {{ businessLabel(o.businessStatus) }}
          </span>
        </div>
        <div class="do-status__row">
          <span class="do-status__key">Facturación</span>
          <span class="status-pill" :class="'status-pill--' + invoiceColor(o.invoiceStatus)">
            {{ invoiceLabel(o.invoiceStatus) }}
          </span>
        </div>
        <div v-if="o.divergence" class="do-divergence">⚠ Hay divergencia con la venta facturada</div>
      </section>

      <!-- Cliente -->
      <section class="do-card do-client">
        <div class="do-client__id">
          <h2 class="do-client__name">{{ customerName }}</h2>
          <span v-if="docLabel" class="do-client__doc">{{ docLabel }}</span>
          <span v-else class="do-client__doc do-client__doc--none">Sin documento</span>
        </div>

        <dl class="do-fields">
          <div v-if="o.customer && o.customer.phone" class="do-field">
            <dt>Teléfono</dt>
            <dd>{{ o.customer.phone }}</dd>
          </div>
          <div v-if="o.customer && o.customer.email" class="do-field">
            <dt>Email</dt>
            <dd>{{ o.customer.email }}</dd>
          </div>
          <div v-if="address" class="do-field">
            <dt>Dirección</dt>
            <dd>{{ address }}</dd>
          </div>
          <div v-if="paymentLabel" class="do-field">
            <dt>Método de pago</dt>
            <dd>{{ paymentLabel }}</dd>
          </div>
        </dl>

        <div v-if="o.notes" class="do-note">
          <span class="do-note__label">Nota del pedido</span>
          <p>{{ o.notes }}</p>
        </div>
      </section>

      <!-- Items -->
      <section class="do-card">
        <h3 class="do-section-title">Productos</h3>
        <div v-for="(it, i) in (o.items || [])" :key="i" class="do-item">
          <div class="do-item__info">
            <span class="do-item__name">{{ it.name }}</span>
            <span class="do-item__meta">{{ it.sku }} · x{{ it.quantity }} · {{ money(it.total) }}</span>
          </div>
          <span v-if="!it.resolved" class="status-pill status-pill--danger">sin resolver</span>
        </div>
        <div class="do-totals">
          <div class="do-totals__row"><span>Subtotal</span><span>{{ money(footer.subtotal) }}</span></div>
          <div v-if="footer.shippingCost" class="do-totals__row"><span>Envío</span><span>{{ money(footer.shippingCost) }}</span></div>
          <div class="do-totals__row do-totals__row--total"><span>Total</span><span>{{ money(footer.total) }}</span></div>
        </div>
      </section>

      <!-- Voucher de envío -->
      <section class="do-card">
        <h3 class="do-section-title">Voucher de envío</h3>
        <div v-if="vouchers.length || pending > 0" class="do-vouchers">
          <a v-for="(v, i) in vouchers" :key="'u' + i" :href="v.url" target="_blank" rel="noopener">
            <img :src="v.url" alt="Voucher de envío" />
          </a>
          <div v-if="pending > 0" class="do-pending">{{ pending }} pendiente(s) de subir</div>
        </div>
        <ion-button expand="block" fill="outline" :disabled="capturing" @click="onCapture">
          <ion-icon :icon="cameraOutline" slot="start" />
          {{ capturing ? 'Procesando…' : 'Adjuntar voucher de envío' }}
        </ion-button>
        <p v-if="!vouchers.length && pending === 0" class="do-hint">
          Todavía no hay voucher de envío.
        </p>
      </section>

      <!-- Cambiar estado -->
      <section class="do-card">
        <h3 class="do-section-title">Cambiar estado</h3>
        <div class="do-actions">
          <ion-button
            v-for="s in allowedTransitions"
            :key="s"
            expand="block"
            :color="businessColor(s)"
            :disabled="saving"
            class="do-action-btn"
            @click="onChangeStatus(s)"
          >
            <ion-icon :icon="actionIcon(s)" slot="start" />
            {{ actionLabel(s) }}
          </ion-button>
          <p v-if="!allowedTransitions.length" class="do-hint">No hay acciones disponibles para este estado.</p>
        </div>
      </section>
    </div>
  </ion-content>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon,
  toastController
} from '@ionic/vue'
import {
  cameraOutline, checkmarkDoneOutline, checkmarkCircleOutline,
  alertCircleOutline, closeCircleOutline
} from 'ionicons/icons'
import {
  businessLabel, businessColor, kontentoLabel, kontentoColor,
  invoiceLabel, invoiceColor, TRANSITIONS
} from '@/services/orderStatus'
import {
  updateBusinessStatus, captureVoucher, fetchOrder, orderPendingVouchers
} from '@/services/digitalOrdersService'

const props = defineProps({ order: { type: Object, required: true } })
const emit = defineEmits(['close', 'updated'])

const o = ref({ ...props.order })
const pending = ref(0)
const saving = ref(false)
const capturing = ref(false)

watch(() => props.order, async (val) => {
  o.value = { ...val }
  pending.value = await orderPendingVouchers(val.id)
}, { immediate: true })

const footer = computed(() => o.value.footer || {})
const vouchers = computed(() => Array.isArray(o.value.deliveryVouchers) ? o.value.deliveryVouchers : [])
const allowedTransitions = computed(() =>
  [...(TRANSITIONS[o.value.businessStatus] || [])]
    .sort((a, b) => (ACTION_ORDER[a] || 99) - (ACTION_ORDER[b] || 99))
)

// Botones de acción: verbo + ícono para que se lean como acción, no como estado.
const ACTION_LABELS = {
  reviewed: 'Marcar como revisado',
  delivered: 'Marcar como entregado',
  issue: 'Marcar con problemas',
  cancelled: 'Cancelar pedido'
}
const ACTION_ICONS = {
  reviewed: checkmarkDoneOutline,
  delivered: checkmarkCircleOutline,
  issue: alertCircleOutline,
  cancelled: closeCircleOutline
}
const actionLabel = (s) => ACTION_LABELS[s] || businessLabel(s)
const actionIcon = (s) => ACTION_ICONS[s] || checkmarkCircleOutline
// Orden de los botones: avance primero, destructivo (cancelar) siempre al final.
const ACTION_ORDER = { reviewed: 1, delivered: 2, issue: 3, cancelled: 4 }

const DOC_TYPE_LABELS = { dni: 'DNI', ruc: 'RUC', ce: 'C.E.', passport: 'Pasaporte' }

const customerName = computed(() => (o.value.customer && o.value.customer.name) || 'Cliente')

const docLabel = computed(() => {
  const c = o.value.customer || {}
  if (!c.docNumber) return ''
  const t = DOC_TYPE_LABELS[(c.docType || '').toLowerCase()] || (c.docType || 'Doc')
  return `${t} · ${c.docNumber}`
})

const paymentLabel = computed(() => {
  const p = o.value.paymentMethod
  if (!p) return ''
  return p.charAt(0).toUpperCase() + p.slice(1) // "yape" → "Yape"
})

const address = computed(() => {
  const a = o.value.customer && o.value.customer.address
  if (!a) return ''
  const parts = [a.line1, a.districtName, a.provinceName, a.departmentName].filter(Boolean)
  // Dedup de segmentos consecutivos iguales: Kontento manda "Lima, Lima" cuando
  // provincia y departamento coinciden.
  return parts
    .filter((p, i) => i === 0 || p.toLowerCase() !== parts[i - 1].toLowerCase())
    .join(', ')
})

function money (v) {
  const n = typeof v === 'number' ? v : 0
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: o.value.currency || 'PEN' }).format(n)
}

async function toast (message, color = 'primary') {
  const t = await toastController.create({ message, duration: 2200, color, position: 'bottom' })
  await t.present()
}

async function refresh () {
  try {
    const fresh = await fetchOrder(o.value.id)
    if (fresh) o.value = fresh
    pending.value = await orderPendingVouchers(o.value.id)
  } catch (e) {
    console.warn('[PedidoInspector] refresh falló:', e)
  }
}

async function onCapture () {
  capturing.value = true
  try {
    const res = await captureVoucher(o.value.id)
    await refresh()
    await toast(res.uploadedNow ? 'Voucher subido.' : 'Voucher guardado, se subirá al reconectar.', 'success')
  } catch (e) {
    const msg = (e && e.message) || ''
    if (/cancel/i.test(msg)) return // el usuario canceló el picker
    await toast(
      /not implemented|unimplemented|unavailable/i.test(msg)
        ? 'Cámara no disponible en este build (falta el plugin nativo).'
        : 'No se pudo capturar el voucher.',
      'danger'
    )
  } finally {
    capturing.value = false
  }
}

async function onChangeStatus (to) {
  const from = o.value.businessStatus
  if (to === from) return
  saving.value = true
  try {
    await updateBusinessStatus(o.value.id, from, to)
    o.value.businessStatus = to
    emit('updated', { id: o.value.id, businessStatus: to })
    await toast('Estado actualizado.', 'success')
  } catch (e) {
    await toast((e && e.message) || 'No se pudo actualizar el estado.', 'danger')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
ion-content {
  --background: #f5f7f9;
  /* respeta el home indicator: el bloque de acciones ya no queda pegado al borde */
  --padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.do-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.do-card {
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 12px;
  padding: 14px;
}

/* Estados */
.do-status { display: flex; flex-direction: column; gap: 8px; }
.do-status__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.do-status__key { font-size: 0.82rem; color: #707070; }
.do-divergence { margin-top: 4px; font-size: 0.8rem; color: #d8000c; font-weight: 600; }

/* Cliente — identidad (nombre + documento) */
.do-client__id { padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
.do-client__name { font-size: 1.1rem; font-weight: 700; color: #191919; line-height: 1.3; }
.do-client__doc {
  display: inline-block; margin-top: 6px;
  font-size: 0.76rem; font-weight: 600; color: #444;
  background: #f0f1f3; padding: 2px 10px; border-radius: 999px;
}
.do-client__doc--none { color: #8a6d00; background: #fff3d6; } /* falta doc → facturar manual */

/* Cliente — datos como pares etiqueta/valor */
.do-fields { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.do-field dt {
  font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.4px; color: #9a9a9a; margin-bottom: 2px;
}
.do-field dd { font-size: 0.9rem; color: #222222; line-height: 1.4; }

/* Nota del pedido — callout diferenciado */
.do-note {
  margin-top: 14px; padding: 10px 12px;
  background: #f6f7f9; border-left: 3px solid #d9dbe0; border-radius: 0 8px 8px 0;
}
.do-note__label {
  display: block; font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.4px; color: #9a9a9a; margin-bottom: 3px;
}
.do-note p { font-size: 0.85rem; color: #555555; line-height: 1.45; }

/* Título de sección */
.do-section-title {
  font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.3px; color: #707070; margin-bottom: 10px;
}

/* Items */
.do-item {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;
}
.do-item:last-of-type { border-bottom: none; }
.do-item__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.do-item__name { font-size: 0.9rem; font-weight: 600; color: #191919; }
.do-item__meta { font-size: 0.8rem; color: #8f8f8f; }

/* Totales */
.do-totals {
  margin-top: 10px; padding-top: 10px; border-top: 1px solid #ececec;
  display: flex; flex-direction: column; gap: 6px;
}
.do-totals__row { display: flex; justify-content: space-between; font-size: 0.88rem; color: #707070; }
.do-totals__row--total {
  margin-top: 4px; padding-top: 8px; border-top: 1px solid #ececec;
  font-size: 1.05rem; font-weight: 700; color: #b51a3e;
}

/* Voucher */
.do-vouchers { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.do-vouchers img { width: 84px; height: 84px; object-fit: cover; border-radius: 8px; border: 1px solid #ececec; }
.do-pending {
  font-size: 0.8rem; color: #3d2a00; background: #ffedcc;
  padding: 4px 10px; border-radius: 8px;
}

/* Acciones — botones de ancho completo, claramente accionables */
.do-actions { display: flex; flex-direction: column; gap: 10px; }
.do-action-btn { margin: 0; --border-radius: 10px; height: 46px; }
.do-action-btn ion-icon { margin-inline-end: 8px; font-size: 18px; }

/* Hints */
.do-hint { font-size: 0.82rem; color: #8f8f8f; margin-top: 8px; }
.do-hint--danger { color: #d8000c; }
</style>
