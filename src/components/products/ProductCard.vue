<template>
  <div class="product-card" @click="emit('click')">
    <div class="product-card__header">
      <span class="product-card__name">{{ product.name }}</span>
      <span class="product-card__sku">{{ product.sku }}</span>
    </div>

    <div class="product-card__prices">
      <div class="product-card__price product-card__price--sale">
        <span>Venta</span>
        <strong>{{ formatCurrency(product.price) }}</strong>
      </div>
      <div class="product-card__price product-card__price--purchase">
        <span>Compra</span>
        <strong>{{ formatCurrency(product.purchasePrice) }}</strong>
      </div>
    </div>

    <div class="product-card__footer">
      <span class="product-card__stock">
        Stock: <strong>{{ product.stock ?? 0 }}</strong>
      </span>
      <span class="product-card__competitors-btn" @click.stop="emit('open-competitors')">
        <ion-icon :icon="statsChartOutline" /> Competidores
      </span>
    </div>
  </div>
</template>

<script setup>
import { IonIcon } from '@ionic/vue'
import { statsChartOutline } from 'ionicons/icons'

defineProps({
  product: { type: Object, required: true }
})

const emit = defineEmits(['click', 'open-competitors'])

function formatCurrency(val) {
  if (val == null) return 'S/ —'
  return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>
