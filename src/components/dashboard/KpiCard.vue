<template>
  <div class="kpi-card">
    <span class="kpi-card__label">{{ label }}</span>
    <span class="kpi-card__value" :class="valueClass">{{ formattedValue }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: 0 },
  format: { type: String, default: 'currency' }, // 'currency' | 'number' | 'integer'
  variant: { type: String, default: 'default' }  // 'default' | 'primary' | 'error'
})

const formattedValue = computed(() => {
  if (props.format === 'currency') {
    return `S/ ${props.value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (props.format === 'number') {
    return props.value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return props.value.toLocaleString('es-PE')
})

const valueClass = computed(() => ({
  'kpi-card__value--primary': props.variant === 'primary',
  'kpi-card__value--error': props.variant === 'error'
}))
</script>
