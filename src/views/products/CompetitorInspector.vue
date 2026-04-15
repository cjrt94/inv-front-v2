<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Competidores</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Product info -->
      <div class="inspector-product">
        <h2 class="inspector-product__name">{{ product.name }}</h2>
        <span class="inspector-product__sku">{{ product.sku }}</span>
        <div class="inspector-product__price">
          Nuestro precio: <strong>{{ formatCurrency(product.price) }}</strong>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="empty-state">
        <ion-spinner name="crescent" />
      </div>

      <!-- No competitors -->
      <div v-else-if="!competitors.length" class="empty-state">
        <ion-icon :icon="peopleOutline" />
        <p>Sin competidores registrados para este producto</p>
      </div>

      <!-- Competitor content -->
      <template v-else>
        <!-- Position badge -->
        <div class="inspector-position" :class="`inspector-position--${position.class}`">
          <ion-icon :icon="position.icon" />
          <span>{{ position.label }}</span>
        </div>

        <!-- Price comparison chart -->
        <p class="section-title">Comparativa de precios</p>
        <div class="inspector-chart">
          <apexchart
            type="bar"
            :height="chartHeight"
            :options="chartOptions"
            :series="series"
          />
          <div v-if="selectedName" class="inspector-chart__label">
            {{ selectedName }}
          </div>
        </div>

        <!-- Competitor list -->
        <p class="section-title">Detalle</p>
        <div class="inspector-list">
          <div
            v-for="comp in sortedCompetitors"
            :key="comp.id"
            class="inspector-item"
          >
            <div class="inspector-item__header">
              <span class="inspector-item__name">{{ comp.name }}</span>
              <span class="inspector-item__diff" :class="diffClass(comp.price)">
                {{ diffLabel(comp.price) }}
              </span>
            </div>
            <div class="inspector-item__footer">
              <strong>{{ formatCurrency(comp.price) }}</strong>
              <span v-if="comp.url" class="inspector-item__url">{{ comp.domain || comp.url }}</span>
            </div>
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
import { peopleOutline, trophyOutline, trendingDownOutline, trendingUpOutline } from 'ionicons/icons'

import { fetchCompetitors } from '@/services/productService'

const props = defineProps({
  product: { type: Object, required: true }
})

const emit = defineEmits(['close'])

const loading = ref(false)
const competitors = ref([])
const selectedName = ref(null)

const sortedCompetitors = computed(() =>
  [...competitors.value].sort((a, b) => a.price - b.price)
)

const chartHeight = computed(() => Math.max(180, (competitors.value.length + 1) * 44))

const position = computed(() => {
  if (!competitors.value.length) return { label: '', class: '', icon: '' }
  const minPrice = Math.min(...competitors.value.map((c) => c.price))
  const maxPrice = Math.max(...competitors.value.map((c) => c.price))
  const ours = props.product.price

  if (ours <= minPrice) {
    return { label: 'Líder de precio', class: 'leader', icon: trophyOutline }
  }
  if (ours >= maxPrice) {
    return { label: 'Más caro del mercado', class: 'expensive', icon: trendingUpOutline }
  }
  return { label: 'Precio intermedio', class: 'middle', icon: trendingDownOutline }
})

const series = computed(() => [
  {
    name: 'Precio',
    data: [
      props.product.price,
      ...sortedCompetitors.value.map((c) => c.price)
    ]
  }
])

const fullNames = computed(() => [
  'Nosotros',
  ...sortedCompetitors.value.map((c) => c.name)
])

const chartOptions = computed(() => ({
  chart: {
    toolbar: { show: false },
    type: 'bar',
    events: {
      dataPointSelection: (_e, _ctx, config) => {
        selectedName.value = fullNames.value[config.dataPointIndex]
      }
    }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      distributed: true
    }
  },
  colors: [
    '#b51a3e',
    ...sortedCompetitors.value.map((c) =>
      c.price < props.product.price ? '#d8000c' : '#adadad'
    )
  ],
  xaxis: {
    categories: fullNames.value.map((n) => n.charAt(0).toUpperCase()),
    labels: {
      style: { fontSize: '11px', fontFamily: 'Poppins, sans-serif' },
      formatter: (v) => `S/ ${Number(v).toFixed(2)}`
    }
  },
  yaxis: {
    labels: { style: { fontSize: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 } }
  },
  tooltip: {
    custom: ({ dataPointIndex }) => {
      const name = fullNames.value[dataPointIndex]
      const val = series.value[0].data[dataPointIndex]
      return `<div style="padding:8px 12px;font-family:Poppins,sans-serif;font-size:12px;line-height:1.6"><b>${name}</b><br/>S/ ${Number(val).toFixed(2)}</div>`
    }
  },
  legend: { show: false },
  dataLabels: {
    enabled: true,
    formatter: (v) => `S/ ${Number(v).toFixed(2)}`,
    style: { fontSize: '11px', fontFamily: 'Poppins, sans-serif' }
  },
  grid: { borderColor: '#ebebeb' }
}))

function formatCurrency(val) {
  if (val == null) return 'S/ —'
  return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function diffLabel(competitorPrice) {
  const diff = ((competitorPrice - props.product.price) / props.product.price) * 100
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)}%`
}

function diffClass(competitorPrice) {
  if (competitorPrice > props.product.price) return 'diff--above'
  if (competitorPrice < props.product.price) return 'diff--below'
  return ''
}

onMounted(async () => {
  loading.value = true
  try {
    competitors.value = await fetchCompetitors(props.product.id)
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

.inspector-position {
  @include flex(row, center, center);
  gap: $space-8;
  margin: $space-16;
  padding: $space-12;
  border-radius: $border-radius-sm;
  font-weight: 600;
  font-size: 14px;

  ion-icon {
    font-size: 20px;
  }

  &--leader {
    background: rgba(88, 180, 174, 0.12);
    color: $primary;
  }

  &--expensive {
    background: rgba(216, 0, 12, 0.08);
    color: $error;
  }

  &--middle {
    background: rgba(240, 165, 0, 0.1);
    color: $warning;
  }
}

.inspector-chart {
  background: #ffffff;
  margin: 0 $space-16 $space-16;
  border-radius: $border-radius;
  box-shadow: $shadow-sm;
  padding: $space-8;
  overflow: hidden;

  &__label {
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: $primary;
    padding: $space-4 0 $space-8;
  }
}

.inspector-list {
  padding: 0 $space-16 $space-16;
  @include flex(column, flex-start, stretch);
  gap: $space-8;
}

.inspector-item {
  background: #ffffff;
  border-radius: $border-radius-sm;
  padding: $space-12;
  box-shadow: $shadow-sm;

  &__header {
    @include flex(row, space-between, center);
    margin-bottom: $space-4;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: $black;
  }

  &__diff {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 20px;

    &--above {
      color: $dark-grey;
      background: $lighter-grey;
    }

    &--below {
      color: $error;
      background: rgba(216, 0, 12, 0.08);
    }
  }

  &__footer {
    @include flex(row, space-between, center);

    strong {
      font-size: 16px;
      color: $black;
    }
  }

  &__url {
    font-size: 11px;
    color: $grey;
    @include truncate;
    max-width: 55%;
  }
}
</style>
