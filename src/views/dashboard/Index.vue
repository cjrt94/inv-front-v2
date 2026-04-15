<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleLogout">
            <ion-icon slot="icon-only" :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Filters -->
      <div class="filters">
        <ion-list lines="none" class="filters__list">
          <ion-item>
            <ion-label>Establecimiento</ion-label>
            <ion-select v-model="selectedEstablishment" interface="action-sheet">
              <ion-select-option
                v-for="est in establishments"
                :key="est"
                :value="est"
              >
                {{ est }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item button @click="openDatePicker('start')">
            <ion-label>Desde</ion-label>
            <ion-text slot="end">{{ formatDate(startDate) }}</ion-text>
          </ion-item>

          <ion-item button @click="openDatePicker('end')">
            <ion-label>Hasta</ion-label>
            <ion-text slot="end">{{ formatDate(endDate) }}</ion-text>
          </ion-item>

          <ion-modal :is-open="showDatePicker" @didDismiss="showDatePicker = false" :initial-breakpoint="0.4" :breakpoints="[0, 0.4]">
            <ion-datetime
              presentation="date"
              :value="activeDateField === 'start' ? startDate : endDate"
              @ionChange="onDateChange"
              locale="es-ES"
              :first-day-of-week="1"
            />
          </ion-modal>
        </ion-list>

        <div class="filters__action">
          <ion-button expand="block" @click="loadData" :disabled="loading">
            <ion-spinner v-if="loading" name="crescent" />
            <span v-else>
              <ion-icon :icon="searchOutline" /> Buscar
            </span>
          </ion-button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <template v-if="loading">
        <ion-grid class="kpi-grid">
          <ion-row>
            <ion-col v-for="n in 7" :key="n" size="6" size-sm="4">
              <div class="kpi-card">
                <ion-skeleton-text :animated="true" style="width: 60%; height: 12px" />
                <ion-skeleton-text :animated="true" style="width: 80%; height: 22px; margin-top: 6px" />
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </template>

      <!-- KPI Cards -->
      <template v-else>
        <ion-grid class="kpi-grid">
          <ion-row>
            <ion-col v-for="kpi in kpis" :key="kpi.label" size="6" size-sm="4">
              <KpiCard
                :label="kpi.label"
                :value="kpi.value"
                :format="kpi.format"
                :variant="kpi.variant"
              />
            </ion-col>
          </ion-row>
        </ion-grid>

        <!-- Sales chart -->
        <SalesChart :chart-data="salesByDay" />

        <!-- Top products -->
        <TopProductsList :items="topProducts" />

        <!-- Sellers -->
        <RankingList
          title="Vendedores"
          :items="sellers"
          format="currency"
        />

        <!-- Brands -->
        <RankingList
          title="Marcas"
          :items="brands"
          format="currency"
        />

        <div v-if="!sales.length && !loading" class="empty-state">
          <ion-icon :icon="receiptOutline" />
          <p>Sin ventas para el período seleccionado</p>
        </div>
      </template>

      <div style="height: 24px" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonRefresher, IonRefresherContent,
  IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonText,
  IonGrid, IonRow, IonCol, IonSpinner, IonSkeletonText,
  IonModal, IonDatetime,
  toastController
} from '@ionic/vue'
import { logOutOutline, searchOutline, receiptOutline } from 'ionicons/icons'

import KpiCard from '@/components/dashboard/KpiCard.vue'
import SalesChart from '@/components/dashboard/SalesChart.vue'
import RankingList from '@/components/dashboard/RankingList.vue'
import TopProductsList from '@/components/dashboard/TopProductsList.vue'

import {
  ESTABLISHMENTS,
  fetchSales,
  getDefaultDates,
  computeKpis,
  computeSalesByDay,
  computeTopProducts,
  computeSellers,
  computeBrands
} from '@/services/salesService'
import { fetchProducts } from '@/services/productService'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const establishments = ESTABLISHMENTS
const selectedEstablishment = ref('Todos')
const { start, end } = getDefaultDates()
const startDate = ref(start)
const endDate = ref(end)

const showDatePicker = ref(false)
const activeDateField = ref('start')

function openDatePicker(field) {
  activeDateField.value = field
  showDatePicker.value = true
}

function onDateChange(ev) {
  const value = ev.detail.value?.split('T')[0]
  if (!value) return
  if (activeDateField.value === 'start') {
    startDate.value = value
  } else {
    endDate.value = value
  }
  showDatePicker.value = false
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const loading = ref(false)
const sales = ref([])
const products = ref([])

const kpis = computed(() => {
  const k = computeKpis(sales.value)
  return [
    { label: 'Subtotal ventas', value: k.subtotal, format: 'currency', variant: 'primary' },
    { label: 'Total ventas', value: k.total, format: 'currency', variant: 'primary' },
    { label: 'Comprobantes', value: k.comprobantes, format: 'integer', variant: 'default' },
    { label: 'Unidades', value: k.unidades, format: 'integer', variant: 'default' },
    { label: 'Ticket promedio', value: k.ticketPromedio, format: 'currency', variant: 'default' },
    { label: 'Total anulaciones', value: k.totalAnulaciones, format: 'currency', variant: 'error' },
    { label: 'N° anulaciones', value: k.numAnulaciones, format: 'integer', variant: 'error' }
  ]
})

const salesByDay = computed(() => computeSalesByDay(sales.value))
const topProducts = computed(() => computeTopProducts(sales.value, products.value))
const sellers = computed(() => computeSellers(sales.value))
const brands = computed(() => computeBrands(sales.value, products.value))

async function loadData() {
  loading.value = true
  try {
    const [salesData, productsData] = await Promise.all([
      fetchSales(startDate.value, endDate.value, selectedEstablishment.value),
      products.value.length ? Promise.resolve(products.value) : fetchProducts()
    ])
    sales.value = salesData
    if (!products.value.length) products.value = productsData
  } catch (e) {
    const toast = await toastController.create({
      message: e?.message || 'Error al cargar datos',
      duration: 3500,
      color: 'danger',
      position: 'bottom'
    })
    await toast.present()
  } finally {
    loading.value = false
  }
}

async function onRefresh(event) {
  await loadData()
  event.target.complete()
}

async function handleLogout() {
  await authStore.logout()
  router.replace('/login')
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.filters {
  background: #ffffff;
  margin-bottom: $space-16;
  box-shadow: $shadow-sm;

  &__list {
    padding: 0;
  }

  &__action {
    padding: $space-8 $space-16 $space-12;
  }
}

.kpi-grid {
  padding: 0 $space-8 $space-8;

  ion-col {
    padding: $space-4;
  }
}
</style>
