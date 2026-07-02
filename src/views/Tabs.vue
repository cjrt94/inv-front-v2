<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar slot="bottom" class="ion-hide-md-up">
        <ion-tab-button tab="dashboard" href="/tabs/dashboard">
          <ion-icon :icon="homeOutline" />
          <ion-label>Dashboard</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="products" href="/tabs/products">
          <ion-icon :icon="cubeOutline" />
          <ion-label>Productos</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="pedidos" href="/tabs/pedidos">
          <ion-icon :icon="receiptOutline" />
          <ion-label>Pedidos</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup>
import {
  IonPage, IonTabs, IonRouterOutlet,
  IonTabBar, IonTabButton, IonIcon, IonLabel
} from '@ionic/vue'
import { homeOutline, cubeOutline, receiptOutline } from 'ionicons/icons'
</script>
