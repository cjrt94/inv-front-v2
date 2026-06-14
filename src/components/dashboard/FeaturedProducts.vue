<template>
  <div v-if="table.length" class="featured">
    <p class="section-title">Productos destacados</p>

    <div class="featured__rows">
      <div v-for="row in table" :key="row.sku" class="featured-row">
        <div class="featured-row__info">
          <span class="featured-row__name">{{ row.name }}</span>
          <span class="featured-row__sku">{{ row.sku }}</span>
        </div>
        <span class="featured-row__units">{{ row.units.toLocaleString('es-PE') }} u.</span>
        <span class="featured-row__revenue">S/ {{ formatMoney(row.revenue) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  table: { type: Array, default: () => [] }
})

function formatMoney(val) {
  return (val || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style lang="scss" scoped>
.featured {
  margin: 0 $space-16 $space-16;

  .section-title {
    margin-bottom: $space-8;
  }

  &__rows {
    @include flex(column, flex-start, stretch);
    gap: $space-8;
  }
}

.featured-row {
  @include flex(row, flex-start, center);
  background: #ffffff;
  border-radius: $border-radius-sm;
  box-shadow: $shadow-sm;
  padding: $space-12;
  gap: $space-12;

  &__info {
    flex: 1;
    min-width: 0;
    @include flex(column, flex-start, flex-start);
    gap: 2px;
  }

  &__name {
    font-size: 13px;
    font-weight: 600;
    color: $black;
    @include truncate;
    width: 100%;
  }

  &__sku {
    font-size: 11px;
    color: $dark-grey;
  }

  &__units {
    font-size: 11px;
    color: $darker-grey;
    background: $lighter-grey;
    padding: 2px 8px;
    border-radius: 20px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  &__revenue {
    font-size: 14px;
    font-weight: 700;
    color: $primary;
    flex-shrink: 0;
    white-space: nowrap;
  }
}
</style>
