<template>
  <ion-app>
    <ion-split-pane content-id="main-content" when="md">
      <ion-menu
        content-id="main-content"
        type="overlay"
        :disabled="menuDisabled"
      >
        <ion-header>
          <ion-toolbar>
            <ion-title>Imv.</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list lines="none" class="menu-list">
            <ion-item
              button
              router-link="/tabs/dashboard"
              router-direction="root"
              detail="false"
              :class="{ 'item-active': isActive('/tabs/dashboard') }"
            >
              <ion-icon :icon="homeOutline" slot="start" />
              <ion-label>Dashboard</ion-label>
            </ion-item>

            <ion-item
              button
              router-link="/tabs/products"
              router-direction="root"
              detail="false"
              :class="{ 'item-active': isActive('/tabs/products') }"
            >
              <ion-icon :icon="cubeOutline" slot="start" />
              <ion-label>Productos</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>

        <ion-footer class="ion-no-border" v-if="firebaseUser">
          <ion-toolbar>
            <ion-item lines="none" class="user-info">
              <div class="user-avatar" slot="start">{{ initial }}</div>
              <ion-label>
                <p class="user-email">{{ firebaseUser.email }}</p>
                <p v-if="userRole" class="user-role">{{ userRole }}</p>
              </ion-label>
              <ion-button
                slot="end"
                fill="clear"
                size="small"
                color="medium"
                @click="logout"
              >
                <ion-icon :icon="logOutOutline" slot="icon-only" />
              </ion-button>
            </ion-item>
          </ion-toolbar>
        </ion-footer>
      </ion-menu>

      <ion-router-outlet id="main-content" />
    </ion-split-pane>
  </ion-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonApp, IonRouterOutlet,
  IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle,
  IonContent, IonList, IonItem, IonIcon, IonLabel,
  IonFooter, IonButton
} from '@ionic/vue'
import { homeOutline, cubeOutline, logOutOutline } from 'ionicons/icons'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/firebase'
import { registerPushNotifications, unregisterCurrentDeviceToken } from '@/services/notificationService'
import { useBreakpoint } from '@/composables/useBreakpoint'

const route = useRoute()
const router = useRouter()
const isLargeScreen = useBreakpoint('(min-width: 768px)')

const firebaseUser = ref(auth.currentUser)
const userRole = ref(null)

const menuDisabled = computed(
  () => !isLargeScreen.value || !firebaseUser.value
)

const isActive = (path) => route.path.startsWith(path)

const initial = computed(
  () => (firebaseUser.value?.email?.[0] || '?').toUpperCase()
)

async function logout() {
  await unregisterCurrentDeviceToken()
  await signOut(auth)
  router.replace('/login')
}

onMounted(async () => {
  if (Capacitor.isNativePlatform()) {
    await StatusBar.setStyle({ style: Style.Light })
  }

  onAuthStateChanged(auth, async (user) => {
    firebaseUser.value = user
    if (user) {
      try {
        const token = await user.getIdTokenResult()
        userRole.value = token.claims.admin
          ? 'admin'
          : token.claims.editor
            ? 'editor'
            : null
      } catch {
        userRole.value = null
      }
      registerPushNotifications().catch(console.error)
    } else {
      userRole.value = null
    }
  })
})
</script>

<style scoped>
ion-split-pane {
  --side-width: 260px;
  --side-min-width: 240px;
  --side-max-width: 280px;
}

ion-menu ion-content {
  --background: var(--ion-color-step-50, #f7f7f7);
}

ion-menu ion-footer {
  border-top: 1px solid #ebebeb;
}

ion-menu ion-footer ion-toolbar {
  --background: #ffffff;
  --color: var(--ion-text-color);
  --border-color: transparent;
  --min-height: 60px;
}

.menu-list {
  padding: 8px;
  background: transparent;
}

.menu-list ion-item {
  --background: transparent;
  --background-hover: rgba(0, 0, 0, 0.04);
  --border-radius: 10px;
  --padding-start: 14px;
  --inner-padding-end: 14px;
  --min-height: 44px;
  margin-bottom: 4px;
  font-size: 0.95rem;
}

.menu-list ion-item.item-active {
  --background: var(--ion-color-primary);
  --color: #fff;
  font-weight: 600;
}

.menu-list ion-item.item-active ion-icon {
  color: #fff;
}

.menu-list ion-icon {
  margin-inline-end: 14px;
  font-size: 1.15rem;
}

.user-info {
  --background: transparent;
  --padding-start: 8px;
  --inner-padding-end: 4px;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-inline-end: 12px;
}

.user-email {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ion-text-color);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.7rem;
  color: var(--ion-color-medium);
  margin: 2px 0 0;
  text-transform: capitalize;
}
</style>
