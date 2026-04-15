# Inv. — Panel de Administración

Aplicación móvil iOS para administración de inventario y ventas, construida con Vue 3 + Ionic + Capacitor + Firebase.

## Stack

- **Vue 3** + Composition API
- **Ionic Vue 8** (modo iOS)
- **Capacitor 6** (iOS nativo)
- **Firebase 12** (Auth + Firestore)
- **Pinia** (estado global)
- **ApexCharts** (gráficas)
- **Vite 5** (bundler)

## Estructura

```
src/
├── assets/scss/         # Estilos globales y variables
├── components/
│   ├── dashboard/       # KpiCard, SalesChart, RankingList, TopProductsList
│   └── products/        # ProductCard
├── firebase/            # Inicialización de Firebase
├── router/              # Vue Router con guards de autenticación
├── services/            # productService, salesService
├── stores/              # Pinia store (auth)
└── views/
    ├── dashboard/       # Vista principal con KPIs y gráficas
    ├── products/        # Lista de productos + CompetitorInspector
    └── Login.vue
```

## Desarrollo

```bash
npm install
npm run dev
```

## Build y deploy iOS

```bash
npm run build
npx cap sync ios
# Abrir Xcode y compilar desde ios/App/App.xcworkspace
```

---

## Cambios realizados

### Eliminación de `@capacitor-mlkit/barcode-scanning`

- Removido el pod comentado `CapacitorMlkitBarcodeScanning` del `ios/App/Podfile`
- Eliminado el directorio vacío `node_modules/@capacitor-mlkit/`
- Eliminados los archivos de cache de Vite: `@capacitor-mlkit_barcode-scanning.js(.map)` y `web-BAGPOMKT.js(.map)`
- Limpiada la entrada del paquete en `node_modules/.vite/deps/_metadata.json`
- El botón de escáner en Products muestra un toast informativo en su lugar

### Fix: pantalla en blanco al iniciar en iOS (`script :0`)

**Causa:** Todo el bundle JS (Vue + Ionic + Firebase + ApexCharts) compilaba en un único archivo de **2.1 MB**. iOS WKWebView bloqueaba o tardaba demasiado en parsearlo, causando un error de ejecución capturado por `window.onerror`.

**Fix:** Code splitting en `vite.config.js` con `build.rollupOptions.output.manualChunks`:

```js
manualChunks: {
  'vendor-vue':      ['vue', 'vue-router', 'pinia'],
  'vendor-ionic':    ['@ionic/vue', '@ionic/vue-router'],
  'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
  'vendor-charts':   ['apexcharts', 'vue3-apexcharts'],
}
```

El entry point bajó de **2.1 MB → 3.5 KB**. Los vendors se cargan en paralelo.

### Fix: app no montaba / login no aparecía

**Causa:** `main.js` esperaba `router.isReady()` antes de montar Vue. El router guard llamaba `authStore.init()`, que a su vez esperaba la respuesta de Firebase Auth (`onAuthStateChanged`). En iOS, Firebase tarda en resolver → deadlock → Vue nunca montaba.

**Fix en `src/main.js`:** Inicializar auth *antes* del router:

```js
const authStore = useAuthStore()
authStore.init().then(() => {
  router.isReady().then(() => {
    app.mount('#app')
  })
})
```

**Fix en `src/router/index.js`:** Simplificado el guard — ya no llama `init()` porque el estado de auth está listo al llegar la primera navegación.

**Fix en `src/stores/auth.js`:** Agregado timeout de seguridad de 5 segundos en `init()` para evitar que la app quede colgada si Firebase no responde (sin red, cold start).

### Fix: login se quedaba cargando indefinidamente

**Causa:** `getAuth()` usa `browserLocalPersistence` (cookies/localStorage) por defecto, lo cual WKWebView bloquea en iOS. `signInWithEmailAndPassword` nunca resolvía ni rechazaba.

**Fix en `src/firebase/index.js`:** Reemplazado `getAuth()` por `initializeAuth()` con `indexedDBLocalPersistence`:

```js
import { initializeAuth, indexedDBLocalPersistence } from 'firebase/auth'

export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
})
```

### Fix: Products no cargaba (Firestore bloqueado)

**Causa:** Firestore usa WebSockets por defecto, que WKWebView interrumpe en iOS.

**Fix en `src/firebase/index.js`:** Reemplazado `getFirestore()` por `initializeFirestore()` con `persistentLocalCache()`:

```js
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
})
```

Esto usa IndexedDB como cache local y long-polling como transporte, ambos compatibles con WKWebView.

### Fix: contenido detrás del status bar

**Causa:** El patrón `ion-header translucent + ion-content fullscreen` requiere un segundo header colapsable *dentro* del content. Sin él, el contenido queda literalmente detrás de la status bar.

**Fix en `dashboard/Index.vue` y `products/Index.vue`:** Removidos los atributos `translucent` y `fullscreen`. Ionic aplica automáticamente `padding-top: env(safe-area-inset-top)` al header normal.

### Fix: zoom al tocar inputs en iOS

**Causa:** iOS hace auto-zoom cuando el `font-size` de un input es menor a 16px. El meta viewport no lo prevenía.

**Fix en `index.html`:** Agregado `maximum-scale=1.0`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />
```

### Fix: StatusBar

Configurado en `src/App.vue` al montar la app (solo en plataforma nativa):

```js
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

onMounted(async () => {
  if (Capacitor.isNativePlatform()) {
    await StatusBar.setStyle({ style: Style.Light })
  }
})
```

### UI: alineación de fechas en Dashboard

Reemplazado el patrón `<ion-label> + <ion-input>` por `label` y `label-placement="start"` directamente en `<ion-input>` para que el label y la fecha queden alineados en la misma línea.

### UI: padding del searchbar en Products

Aumentado el padding vertical del toolbar del searchbar (`--padding-top` / `--padding-bottom`) de 8px a 12px para separarlo mejor del título.
