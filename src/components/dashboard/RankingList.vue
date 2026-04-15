<template>
  <div v-if="items.length" class="ranking-list">
    <p class="ranking-list__title">{{ title }}</p>
    <div
      v-for="(item, index) in items"
      :key="item.name"
      class="ranking-list__item"
    >
      <span class="ranking-list__rank">{{ index + 1 }}</span>
      <span class="ranking-list__name">{{ item.name }}</span>
      <span class="ranking-list__value">{{ formatValue(item) }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  format: { type: String, default: 'currency' } // 'currency' | 'quantity'
})

function formatValue(item) {
  if (props.format === 'quantity') {
    return `${item.quantity?.toLocaleString('es-PE')} u.`
  }
  const val = item.total ?? item.value ?? 0
  return `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>
