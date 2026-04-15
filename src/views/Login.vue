<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="login">
        <div class="login__header">
          <h1 class="login__logo">imv.</h1>
          <p class="login__subtitle">Panel de administración</p>
        </div>

        <form class="login__form" @submit.prevent="handleLogin">
          <ion-list lines="full" class="login__list">
            <ion-item>
              <ion-label position="stacked">Correo electrónico</ion-label>
              <ion-input
                v-model="email"
                type="email"
                autocomplete="email"
                required
                placeholder="correo@empresa.com"
              />
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Contraseña</ion-label>
              <ion-input
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                placeholder="••••••••"
              />
            </ion-item>
          </ion-list>

          <p v-if="error" class="login__error">{{ error }}</p>

          <ion-button
            expand="block"
            type="submit"
            :disabled="loading"
            class="login__btn"
          >
            <ion-spinner v-if="loading" name="crescent" />
            <span v-else>Ingresar</span>
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonContent, IonList, IonItem, IonLabel,
  IonInput, IonButton, IonSpinner
} from '@ionic/vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.login(email.value, password.value)
    router.replace('/tabs/dashboard')
  } catch (e) {
    error.value = e.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login {
  @include flex(column, center, center);
  min-height: 100%;
  padding: $space-32 $space-24;

  &__header {
    text-align: center;
    margin-bottom: $space-48;
  }

  &__logo {
    font-size: 52px;
    font-weight: 700;
    color: $primary;
    line-height: 1;
    letter-spacing: -2px;
  }

  &__subtitle {
    font-size: 13px;
    color: $dark-grey;
    margin-top: $space-8;
  }

  &__form {
    width: 100%;
    max-width: 380px;
  }

  &__list {
    border-radius: $border-radius;
    overflow: hidden;
    margin-bottom: $space-16;
  }

  &__error {
    color: $error;
    font-size: 13px;
    text-align: center;
    margin-bottom: $space-12;
  }

  &__btn {
    margin-top: $space-8;
  }
}
</style>
