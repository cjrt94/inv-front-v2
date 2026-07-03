<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Pedidos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="page-container">
        <!-- Filtro por estado — misma clase global que los atajos de fecha del dashboard -->
        <div class="chip-filter">
          <ion-button
            size="small"
            :fill="statusFilter === 'all' ? 'solid' : 'outline'"
            class="chip-filter__btn"
            @click="statusFilter = 'all'"
          >
            Todos
          </ion-button>
          <ion-button
            v-for="s in statuses"
            :key="s"
            size="small"
            :fill="statusFilter === s ? 'solid' : 'outline'"
            class="chip-filter__btn"
            @click="statusFilter = s"
          >
            {{ businessLabel(s) }}
          </ion-button>
        </div>

        <template v-if="loading">
          <div class="orders-list">
            <div v-for="n in 6" :key="n" class="order-card" style="opacity: 0.4">
              <ion-skeleton-text :animated="true" style="height: 16px; width: 60%; margin-bottom: 8px" />
              <ion-skeleton-text :animated="true" style="height: 14px; width: 35%" />
            </div>
          </div>
        </template>

        <template v-else>
          <div v-if="filteredOrders.length" class="orders-list">
            <div
              v-for="order in filteredOrders"
              :key="order.id"
              class="order-card"
              @click="openOrder(order)"
            >
              <div class="order-head">
                <span class="order-customer">{{ (order.customer && order.customer.name) || 'Cliente' }}</span>
                <span class="status-pill" :class="'status-pill--' + businessColor(order.businessStatus)">
                  {{ businessLabel(order.businessStatus) }}
                </span>
              </div>
              <div class="order-meta">
                <span>{{ formatDate(order.createdAt) }}</span>
                <span>{{ (order.items && order.items.length) || 0 }} item(s)</span>
                <span class="order-total">{{ money(order.footer && order.footer.total, order.currency) }}</span>
              </div>
              <div class="order-flags">
                <span v-if="order.unresolvedSkus && order.unresolvedSkus.length" class="status-pill status-pill--danger">
                  {{ order.unresolvedSkus.length }} sin resolver
                </span>
                <span v-if="order.divergence" class="status-pill status-pill--danger">Divergencia</span>
                <span class="status-pill" :class="'status-pill--' + invoiceColor(order.invoiceStatus)">
                  {{ invoiceLabel(order.invoiceStatus) }}
                </span>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <ion-icon :icon="receiptOutline" />
            <p>Sin pedidos digitales</p>
          </div>
        </template>
      </div>
    </ion-content>

    <ion-modal
      :is-open="showDetail"
      v-bind="modalProps"
      @didDismiss="showDetail = false"
    >
      <PedidoInspector
        v-if="selected"
        :order="selected"
        @updated="onOrderUpdated"
        @close="showDetail = false"
      />
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonRefresher, IonRefresherContent, IonModal, IonSkeletonText,
  IonButton, IonIcon,
  toastController
} from '@ionic/vue'
import { receiptOutline } from 'ionicons/icons'
import PedidoInspector from './PedidoInspector.vue'
import { fetchDigitalOrders } from '@/services/digitalOrdersService'
import {
  businessLabel, businessColor, invoiceLabel, invoiceColor, BUSINESS_LABELS
} from '@/services/orderStatus'
import { useBreakpoint } from '@/composables/useBreakpoint'

const isLargeScreen = useBreakpoint('(min-width: 768px)')
// iPad: modal centrado; iPhone: full-screen (evita que se vean el header/segment
// del listado por detrás del sheet → doble-header confuso).
const modalProps = computed(() =>
  isLargeScreen.value ? { class: 'stock-modal' } : {}
)

const statuses = Object.keys(BUSINESS_LABELS)
const loading = ref(false)
const orders = ref([])
const statusFilter = ref('all')
const showDetail = ref(false)
const selected = ref(null)

const filteredOrders = computed(() =>
  statusFilter.value === 'all'
    ? orders.value
    : orders.value.filter((o) => o.businessStatus === statusFilter.value)
)

function money (v, currency) {
  const n = typeof v === 'number' ? v : 0
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: currency || 'PEN' }).format(n)
}

function formatDate (ts) {
  const d = ts && typeof ts.toDate === 'function' ? ts.toDate() : (ts ? new Date(ts) : null)
  if (!d || isNaN(d)) return ''
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function openOrder (order) {
  selected.value = order
  showDetail.value = true
}

function onOrderUpdated ({ id, businessStatus }) {
  const i = orders.value.findIndex((o) => o.id === id)
  if (i !== -1) orders.value[i] = { ...orders.value[i], businessStatus }
}

async function loadOrders () {
  loading.value = true
  try {
    orders.value = await fetchDigitalOrders()
  } catch (e) {
    const t = await toastController.create({ message: 'Error al cargar pedidos', duration: 2500, color: 'danger', position: 'bottom' })
    await t.present()
  } finally {
    loading.value = false
  }
}

async function onRefresh (event) {
  await loadOrders()
  event.target.complete()
}

onMounted(loadOrders)
</script>

<style lang="scss" scoped>
// `.chip-filter` es global (styles.scss) — compartido con el dashboard.

.orders-list {
  padding: $space-8 $space-12;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: $space-8;

  @include respond-to(md) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @include respond-to(lg) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.order-card {
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  min-width: 0;
}

.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.order-customer {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-head .status-pill { flex-shrink: 0; }

.order-meta {
  display: flex;
  gap: 12px;
  font-size: 0.82rem;
  color: var(--ion-color-medium);
  margin-top: 6px;
}

.order-total { margin-left: auto; font-weight: 600; color: var(--ion-text-color); }

.order-flags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }

.empty-state {
  text-align: center;
  color: var(--ion-color-medium);
  padding: 48px 16px;

  ion-icon { font-size: 42px; margin-bottom: 8px; }
}
</style>
