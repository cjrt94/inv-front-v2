<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Productos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="page-container">
        <div class="search-wrapper">
          <ion-searchbar
            v-model="searchTerm"
            placeholder="Buscar por nombre o SKU..."
            :debounce="300"
            @ionInput="onSearch"
          />
        </div>

        <!-- Loading -->
        <template v-if="loading">
          <div class="products-list">
            <div v-for="n in 8" :key="n" class="product-card" style="opacity: 0.4">
              <ion-skeleton-text :animated="true" style="height: 16px; width: 70%; margin-bottom: 8px" />
              <ion-skeleton-text :animated="true" style="height: 14px; width: 40%" />
            </div>
          </div>
        </template>

        <!-- Product list -->
        <template v-else>
          <div v-if="filteredProducts.length" class="products-list">
            <ProductCard
              v-for="product in filteredProducts"
              :key="product.id"
              :product="product"
              @open-competitors="openCompetitors(product)"
              @open-stocks="openStocks(product)"
            />
          </div>

          <div v-else class="empty-state">
            <ion-icon :icon="cubeOutline" />
            <p>{{ searchTerm ? 'Sin resultados para tu búsqueda' : 'Sin productos' }}</p>
          </div>
        </template>
      </div>
    </ion-content>

    <!-- Competitor Inspector Modal -->
    <ion-modal
      :is-open="showInspector"
      v-bind="competitorModalProps"
      @didDismiss="showInspector = false"
    >
      <CompetitorInspector
        v-if="selectedProduct"
        :product="selectedProduct"
        @close="showInspector = false"
      />
    </ion-modal>

    <!-- Stock Inspector Modal -->
    <ion-modal
      :is-open="showStocks"
      v-bind="stockModalProps"
      @didDismiss="showStocks = false"
    >
      <StockInspector
        v-if="selectedProduct"
        :product="selectedProduct"
        @close="showStocks = false"
      />
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonIcon, IonSearchbar,
  IonRefresher, IonRefresherContent, IonModal, IonSkeletonText,
  toastController
} from '@ionic/vue'
import { cubeOutline } from 'ionicons/icons'

import ProductCard from '@/components/products/ProductCard.vue'
import CompetitorInspector from './CompetitorInspector.vue'
import StockInspector from './StockInspector.vue'
import { fetchProducts } from '@/services/productService'
import { useBreakpoint } from '@/composables/useBreakpoint'

const isLargeScreen = useBreakpoint('(min-width: 768px)')

const competitorModalProps = computed(() =>
  isLargeScreen.value
    ? { class: 'competitor-modal' }
    : { initialBreakpoint: 0.92, breakpoints: [0, 0.5, 0.92] }
)

const stockModalProps = computed(() =>
  isLargeScreen.value
    ? { class: 'stock-modal' }
    : { initialBreakpoint: 0.75, breakpoints: [0, 0.5, 0.92] }
)

const loading = ref(false)
const products = ref([])
const searchTerm = ref('')
const showInspector = ref(false)
const showStocks = ref(false)
const selectedProduct = ref(null)

const filteredProducts = computed(() => {
  if (!searchTerm.value.trim()) return products.value
  const term = searchTerm.value.toLowerCase()
  return products.value.filter(
    (p) =>
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term)
  )
})

function onSearch(event) {
  searchTerm.value = event.target.value || ''
}

function openCompetitors(product) {
  selectedProduct.value = product
  showInspector.value = true
}

function openStocks(product) {
  selectedProduct.value = product
  showStocks.value = true
}

async function loadProducts() {
  loading.value = true
  try {
    products.value = await fetchProducts()
  } catch {
    const toast = await toastController.create({
      message: 'Error al cargar productos',
      duration: 2500,
      color: 'danger',
      position: 'bottom'
    })
    await toast.present()
  } finally {
    loading.value = false
  }
}

async function onRefresh(event) {
  await loadProducts()
  event.target.complete()
}

onMounted(loadProducts)
</script>

<style lang="scss" scoped>
.search-wrapper {
  padding: 12px 8px 4px;
  background: #ffffff;

  @include respond-to(md) {
    background: transparent;
    max-width: 480px;
    padding: $space-12 $space-16 $space-8;
  }
}

.products-list {
  padding: $space-8 $space-12;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: $space-8;

  :deep(.product-card),
  > .product-card {
    margin-bottom: 0;
    min-width: 0;
  }

  @include respond-to(md) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $space-12;
    padding: $space-8 $space-16 $space-16;
  }

  @include respond-to(lg) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @include respond-to(xl) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
