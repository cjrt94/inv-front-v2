# Imv. — Panel de Administración

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

### Soporte para iPad (v4.1.0)

**Shell de navegación adaptativo.** `App.vue` envuelve `<ion-router-outlet>` en `<ion-split-pane content-id="main-content" when="md">` con un `<ion-menu>` lateral. En iPad (≥768px) el menú aparece fijo a la izquierda con items Dashboard / Productos y un footer de usuario con avatar, email, rol y botón de logout. En iPhone, el menú está deshabilitado por `:disabled="!isLargeScreen"` (no se abre como drawer) y `Tabs.vue` mantiene su `<ion-tab-bar>` clasificada con `ion-hide-md-up` para que aparezca solo bajo el breakpoint.

> **Importante:** el `<ion-split-pane>` debe ir en `App.vue` a nivel de `<ion-app>`, no envuelto en un `<ion-page>`. La primera implementación lo puso dentro de `Tabs.vue/<ion-page>` y el menú nunca renderizaba.

**Estado de auth para el menú.** Por la decisión documentada en memoria (router guard usa `onAuthStateChanged` directo, no inicializa Pinia), `authStore.user` queda `null` en cold start aunque haya sesión Firebase persistida. `App.vue` se suscribe a `onAuthStateChanged` y mantiene un `firebaseUser` reactivo local — el `menuDisabled` depende de eso, no del store.

**Composable `useBreakpoint`.** En `src/composables/useBreakpoint.js`. Wrapper sobre `window.matchMedia` con listener reactivo. Usado en `App.vue`, `dashboard/Index.vue` y `products/Index.vue` para condicionar comportamiento (props de modal, etc.).

**Mixin SCSS `respond-to($bp)`.** En `_mixins.scss` con map de breakpoints `sm/md/lg/xl` (576/768/992/1200). Reemplazó las media queries inline.

**Layouts responsive:**

- *Dashboard:* contenido envuelto en `.page-container` (max-width 1280px en xl). Filtros pasan de lista vertical a fila horizontal flex en md+. KPIs `size="6" size-sm="4" size-lg="3"` (2/3/4 cols). Top products + rankings van en `.dashboard-bottom-grid` con `grid-template-columns: 1fr 1fr` en md (TopProducts ocupa fila completa) y `1fr 1fr 1fr` en lg.
- *Products:* `.products-list` pasó de flow vertical a CSS grid `repeat(N, minmax(0, 1fr))` con N = 1/2/3/4 según breakpoint. **Nota:** el `minmax(0, 1fr)` en vez de `1fr` es esencial — sin el `min-width: 0` implícito, los nombres largos con `white-space: nowrap` expanden la columna y los cards exceden el viewport.
- *Modales en iPad:* en lugar del default centered (~600×500) que dejaba huecos, cada modal recibe dimensiones explícitas via clase global en `styles.scss`:
  - `.competitor-modal`: 90vw × 85vh, max 1000×800. Layout 2 cols (chart 3fr + lista 2fr) dentro del inspector.
  - `.stock-modal`: 80vw × 80vh, max 600×700.
  - `.date-picker-modal`: 350×408 (tamaño natural del `ion-datetime`).
  Las clases se aplican via `v-bind` con `useBreakpoint` — en iPhone se mantiene el comportamiento sheet con breakpoints.

**`TARGETED_DEVICE_FAMILY = "1,2"`** ya estaba seteado en `project.pbxproj`, así que el target nativo no requirió cambios — todo el trabajo fue en la capa web.

### Multi-device push notifications

**Antes:** `notificationService.js` escribía `{ token: tokenValue }` (string). Si un usuario abría sesión en iPhone + iPad, el segundo dispositivo pisaba al primero y solo el último recibía pushes. Las Cloud Functions ya iteraban `tokens` (array), así que la incompatibilidad real estaba en el frontend.

**Frontend:**
- `saveTokenToFirestore` usa `arrayUnion(tokenValue)` sobre el campo `tokens`. Acumula sin duplicar.
- Variable `currentToken` en module scope guarda el token registrado en este dispositivo.
- `unregisterCurrentDeviceToken()` exportado, hace `arrayRemove(currentToken)` y se llama antes de `signOut(auth)`. Está conectado en dos puntos: el `logout()` de `App.vue` (botón del menú lateral) y la action `logout()` del Pinia store (botón del header en Dashboard, iPhone).

**Backend (`imv-functions/functions/notifications.js`):**
- Helper `getUserTokens(data)` lee `tokens[]` y cae a `token` (string) si el doc aún no migró.
- `sendToUser(userId, notification)` usa `admin.messaging().sendMulticast()` (un batch en lugar del loop secuencial de antes) y limpia tokens inválidos con `arrayRemove` cuando el error es `messaging/registration-token-not-registered`, `messaging/invalid-registration-token` o `messaging/invalid-argument`.
- `Promise.allSettled` orquesta los 3 destinatarios en paralelo. Cada `sendToUser` tiene try/catch en cada paso (fetch de doc, sendMulticast, cleanup) para que un fallo aislado no rompa el envío a los demás usuarios.

### Brand: "Imv." en lugar de "Inv."

El nombre del producto es **Imv.** (con M). El path del repo `inv-front-v2` es legado. Corregido en `App.vue` (header del sidebar), `index.html` (title) y este archivo.

### Versión 4.1.0 / build 15

- `MARKETING_VERSION` 4.0.3 → 4.1.0 (en `ios/App/App.xcodeproj/project.pbxproj`)
- `CURRENT_PROJECT_VERSION` 14 → 15
- `package.json` 4.0.3 → 4.1.0

Para release: `npm run build && npx cap sync ios`, luego Xcode → Any iOS Device → Product → Archive → Distribute App → App Store Connect → Upload.
