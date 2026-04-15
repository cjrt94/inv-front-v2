<template>
  <div class="sales-chart">
    <p class="section-title">Ventas en el período</p>
    <div class="sales-chart__wrapper">
      <apexchart
        v-if="chartData.dates.length"
        type="area"
        :height="200"
        :options="chartOptions"
        :series="series"
      />
      <div v-else class="empty-state">
        <ion-icon :icon="barChartOutline" />
        <p>Sin datos para el período</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import { barChartOutline } from 'ionicons/icons'

const props = defineProps({
  chartData: {
    type: Object,
    default: () => ({ dates: [], totals: [] })
  }
})

const series = computed(() => [
  {
    name: 'Ventas',
    data: props.chartData.totals
  }
])

const chartOptions = computed(() => ({
  chart: {
    toolbar: { show: false },
    sparkline: { enabled: false },
    zoom: { enabled: false }
  },
  colors: ['#b51a3e'],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.5,
      opacityTo: 0.1
    }
  },
  stroke: { curve: 'smooth', width: 2 },
  xaxis: {
    categories: props.chartData.dates,
    labels: {
      style: { fontSize: '10px', fontFamily: 'Poppins, sans-serif' },
      rotate: -45,
      rotateAlways: props.chartData.dates.length > 10
    },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: {
      style: { fontSize: '10px', fontFamily: 'Poppins, sans-serif' },
      formatter: (v) => `S/ ${v.toFixed(0)}`
    }
  },
  tooltip: {
    y: { formatter: (v) => `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` }
  },
  grid: {
    borderColor: '#ebebeb',
    strokeDashArray: 4
  },
  dataLabels: { enabled: false }
}))
</script>

<style lang="scss" scoped>
.sales-chart {
  &__wrapper {
    background: #ffffff;
    border-radius: $border-radius;
    box-shadow: $shadow-sm;
    margin: 0 $space-16 $space-16;
    padding: $space-12 $space-8;
    overflow: hidden;
  }
}
</style>
