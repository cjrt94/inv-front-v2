<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Stock por tienda</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="inspector-product">
        <h2 class="inspector-product__name">{{ product.name }}</h2>
        <span class="inspector-product__sku">{{ product.sku }}</span>
        <div class="inspector-product__price">
          Total: <strong>{{ totalStock }} u.</strong>
        </div>
      </div>

      <div v-if="loading" class="empty-state">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="!stocks.length" class="empty-state">
        <ion-icon :icon="storefrontOutline" />
        <p>Sin stock registrado en ninguna tienda</p>
      </div>

      <template v-else>
        <p class="section-title">Detalle</p>
        <div class="stock-list">
          <div
            v-for="s in sortedStocks"
            :key="s.id"
            class="stock-item"
          >
            <div class="stock-item__name">
              <ion-icon :icon="storefrontOutline" />
              <span>{{ s.warehouse || s.id }}</span>
            </div>
            <span class="stock-item__qty" :class="qtyClass(s.stock)">
              {{ s.stock ?? 0 }} u.
            </span>
          </div>
        </div>
      </template>

      <div style="height: 24px" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner
} from '@ionic/vue'
import { storefrontOutline } from 'ionicons/icons'

import { fetchProductStocks } from '@/services/productService'

const props = defineProps({
  product: { type: Object, required: true }
})

const emit = defineEmits(['close'])

const loading = ref(false)
const stocks = ref([])

const sortedStocks = computed(() =>
  [...stocks.value].sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0))
)

const totalStock = computed(() =>
  stocks.value.reduce((acc, s) => acc + (Number(s.stock) || 0), 0)
)

function qtyClass(qty) {
  const n = Number(qty) || 0
  if (n <= 0) return 'qty--empty'
  if (n < 5) return 'qty--low'
  return 'qty--ok'
}

onMounted(async () => {
  loading.value = true
  try {
    stocks.value = await fetchProductStocks(props.product.id)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.inspector-product {
  padding: $space-16;
  background: #ffffff;
  border-bottom: 1px solid $lighter-grey;

  &__name {
    font-size: 16px;
    font-weight: 700;
    color: $black;
    margin-bottom: $space-4;
  }

  &__sku {
    display: inline-block;
    font-size: 11px;
    color: $dark-grey;
    background: $lighter-grey;
    padding: 2px 8px;
    border-radius: 20px;
    margin-bottom: $space-8;
  }

  &__price {
    font-size: 14px;
    color: $darker-grey;

    strong {
      color: $primary;
      font-weight: 700;
    }
  }
}

.stock-list {
  padding: 0 $space-16 $space-16;
  @include flex(column, flex-start, stretch);
  gap: $space-8;
}

.stock-item {
  @include flex(row, space-between, center);
  background: #ffffff;
  border-radius: $border-radius-sm;
  padding: $space-12;
  box-shadow: $shadow-sm;

  &__name {
    @include flex(row, flex-start, center);
    gap: $space-8;
    font-size: 14px;
    font-weight: 600;
    color: $black;

    ion-icon {
      font-size: 18px;
      color: $dark-grey;
    }
  }

  &__qty {
    font-size: 13px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 20px;

    &.qty--ok {
      color: $primary;
      background: rgba(88, 180, 174, 0.12);
    }

    &.qty--low {
      color: $warning;
      background: rgba(240, 165, 0, 0.1);
    }

    &.qty--empty {
      color: $dark-grey;
      background: $lighter-grey;
    }
  }
}
</style>
