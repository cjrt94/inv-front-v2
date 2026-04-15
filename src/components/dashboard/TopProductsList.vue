<template>
  <div v-if="items.length" class="top-products">
    <p class="section-title">Top Productos</p>
    <div class="top-products__list">
      <div
        v-for="(item, index) in items"
        :key="item.sku || item.name"
        class="top-product-card"
      >
        <div class="top-product-card__rank">{{ index + 1 }}</div>
        <div class="top-product-card__info">
          <span class="top-product-card__name">{{ item.name }}</span>
          <div class="top-product-card__meta">
            <span class="top-product-card__qty">{{ item.quantity.toLocaleString('es-PE') }} u.</span>
            <span class="top-product-card__price">P. venta: S/ {{ unitPrice(item) }}</span>
          </div>
        </div>
        <div class="top-product-card__total">S/ {{ formatTotal(item.total) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] }
})

function unitPrice(item) {
  if (!item.quantity) return '—'
  const avg = item.total / item.quantity
  return avg.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatTotal(val) {
  return (val || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style lang="scss" scoped>
.top-products {
  margin: 0 $space-16 $space-16;
}

.top-products__list {
  @include flex(column, flex-start, stretch);
  gap: $space-8;
}

.top-product-card {
  @include flex(row, flex-start, center);
  background: #ffffff;
  border-radius: $border-radius-sm;
  box-shadow: $shadow-sm;
  padding: $space-12;
  gap: $space-12;

  &__rank {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: $primary;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    @include flex(row, center, center);
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
    @include flex(column, flex-start, flex-start);
    gap: $space-4;
  }

  &__name {
    font-size: 13px;
    font-weight: 600;
    color: $black;
    @include truncate;
    width: 100%;
  }

  &__meta {
    @include flex(row, flex-start, center);
    gap: $space-8;
    flex-wrap: wrap;
  }

  &__qty {
    font-size: 11px;
    color: $dark-grey;
    background: $lighter-grey;
    padding: 2px 8px;
    border-radius: 20px;
  }

  &__price {
    font-size: 11px;
    color: $darker-grey;
    font-weight: 500;
  }

  &__total {
    font-size: 14px;
    font-weight: 700;
    color: $primary;
    flex-shrink: 0;
    white-space: nowrap;
  }
}
</style>
