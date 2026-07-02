<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>Pedido</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="$emit('close')">Cerrar</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <!-- Estados -->
    <div class="chips">
      <ion-chip :color="kontentoColor(o.kontentoStatus)">Kontento: {{ kontentoLabel(o.kontentoStatus) }}</ion-chip>
      <ion-chip :color="businessColor(o.businessStatus)">{{ businessLabel(o.businessStatus) }}</ion-chip>
      <ion-chip :color="invoiceColor(o.invoiceStatus)">{{ invoiceLabel(o.invoiceStatus) }}</ion-chip>
      <ion-chip v-if="o.divergence" color="danger">Divergencia</ion-chip>
    </div>

    <!-- Cliente -->
    <ion-list>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          <h2>{{ (o.customer && o.customer.name) || 'Cliente' }}</h2>
          <p v-if="o.customer && o.customer.phone">{{ o.customer.phone }}</p>
          <p v-if="address">{{ address }}</p>
          <p v-if="o.paymentMethod">Pago: {{ o.paymentMethod }}</p>
          <p v-if="o.notes">Nota: {{ o.notes }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <!-- Items -->
    <ion-list>
      <ion-list-header>Productos</ion-list-header>
      <ion-item v-for="(it, i) in (o.items || [])" :key="i" lines="full">
        <ion-label class="ion-text-wrap">
          <h3>{{ it.name }}</h3>
          <p>{{ it.sku }} · x{{ it.quantity }} · {{ money(it.total) }}</p>
        </ion-label>
        <ion-badge v-if="!it.resolved" color="danger" slot="end">sin resolver</ion-badge>
      </ion-item>
      <ion-item lines="none">
        <ion-label slot="end" class="ion-text-right">
          <p>Subtotal: {{ money(footer.subtotal) }}</p>
          <p v-if="footer.shippingCost">Envío: {{ money(footer.shippingCost) }}</p>
          <h2>Total: {{ money(footer.total) }}</h2>
        </ion-label>
      </ion-item>
    </ion-list>

    <!-- Voucher de envío -->
    <ion-list>
      <ion-list-header>Voucher de envío</ion-list-header>
      <div class="vouchers">
        <a v-for="(v, i) in vouchers" :key="'u' + i" :href="v.url" target="_blank" rel="noopener">
          <img :src="v.url" alt="Voucher de envío" />
        </a>
        <div v-if="pending > 0" class="pending-badge">{{ pending }} pendiente(s) de subir</div>
      </div>
      <ion-button expand="block" fill="outline" :disabled="capturing" @click="onCapture">
        <ion-icon :icon="cameraOutline" slot="start" />
        {{ capturing ? 'Procesando…' : 'Adjuntar voucher de envío' }}
      </ion-button>
      <p v-if="!vouchers.length && pending === 0" class="hint">
        Todavía no hay voucher. Es obligatorio adjuntar al menos uno para marcar "Entregado".
      </p>
    </ion-list>

    <!-- Cambiar estado -->
    <ion-list>
      <ion-list-header>Cambiar estado</ion-list-header>
      <div class="actions">
        <ion-button
          v-for="s in allowedTransitions"
          :key="s"
          size="small"
          :color="businessColor(s)"
          :disabled="saving"
          @click="onChangeStatus(s)"
        >
          {{ businessLabel(s) }}
        </ion-button>
        <p v-if="!allowedTransitions.length" class="hint">Sin transiciones disponibles.</p>
      </div>
      <p v-if="needsVoucherHint" class="hint danger">
        Para marcar "Entregado" necesitás adjuntar al menos una foto del voucher.
      </p>
    </ion-list>
  </ion-content>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonListHeader, IonItem, IonLabel, IonChip, IonBadge, IonIcon,
  toastController
} from '@ionic/vue'
import { cameraOutline } from 'ionicons/icons'
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
const allowedTransitions = computed(() => TRANSITIONS[o.value.businessStatus] || [])
const hasAnyVoucher = computed(() => vouchers.value.length + pending.value > 0)
const needsVoucherHint = computed(() => allowedTransitions.value.includes('delivered') && !hasAnyVoucher.value)

const address = computed(() => {
  const a = o.value.customer && o.value.customer.address
  if (!a) return ''
  return [a.line1, a.districtName, a.provinceName, a.departmentName].filter(Boolean).join(', ')
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
  } catch (e) { /* noop */ }
}

async function onCapture () {
  capturing.value = true
  try {
    const res = await captureVoucher(o.value.id)
    await refresh()
    await toast(res.uploadedNow ? 'Voucher subido.' : 'Voucher guardado, se subirá al reconectar.', 'success')
  } catch (e) {
    if (!/cancel/i.test(e && e.message || '')) await toast('No se pudo capturar el voucher.', 'danger')
  } finally {
    capturing.value = false
  }
}

async function onChangeStatus (to) {
  const from = o.value.businessStatus
  if (to === from) return
  if (to === 'delivered' && !hasAnyVoucher.value) {
    await toast('Falta el voucher de envío para marcar Entregado.', 'warning')
    return
  }
  saving.value = true
  try {
    await updateBusinessStatus(o.value.id, from, to)
    o.value.businessStatus = to
    emit('updated', { id: o.value.id, businessStatus: to })
    await toast('Estado actualizado.', 'success')
  } catch (e) {
    await toast('No se pudo actualizar el estado.', 'danger')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 8px 8px; }
.vouchers { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 8px 8px; align-items: center; }
.vouchers img { width: 84px; height: 84px; object-fit: cover; border-radius: 8px; }
.pending-badge {
  font-size: 0.8rem; color: var(--ion-color-warning-shade);
  background: var(--ion-color-warning-tint); padding: 4px 8px; border-radius: 8px;
}
.hint { font-size: 0.82rem; color: var(--ion-color-medium); padding: 0 8px; }
.hint.danger { color: var(--ion-color-danger); }
</style>
