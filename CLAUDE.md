# Imv. — Panel de Administración

Aplicación móvil iOS para administración de inventario, ventas y pedidos digitales (tres tabs: Dashboard, Productos, Pedidos), construida con Vue 3 + Ionic + Capacitor + Firebase.

## Stack

- **Vue 3** + Composition API
- **Ionic Vue 8** (modo iOS)
- **Capacitor 6** (iOS nativo)
- **Firebase 12** (Auth + Firestore + Storage — vouchers, `src/firebase/index.js`)
- **Push FCM** vía `@capacitor/push-notifications` (registro de tokens en `users`)
- **Pinia** (estado global)
- **ApexCharts** (gráficas)
- **Vite 5** (bundler)

## Estructura

```
src/
├── assets/scss/         # Estilos globales y variables
├── components/
│   ├── dashboard/       # KpiCard, SalesChart, RankingList, TopProductsList, FeaturedProducts
│   └── products/        # ProductCard
├── composables/         # useBreakpoint (media queries reactivas)
├── firebase/            # Inicialización de Firebase (Auth + Firestore + Storage)
├── router/              # Vue Router con guards de autenticación
├── services/            # productService, salesService, digitalOrdersService,
│                        # orderStatus, voucherQueue, notificationService
├── stores/              # Pinia store (auth)
└── views/
    ├── dashboard/       # Vista principal con KPIs y gráficas
    ├── products/        # Lista de productos + CompetitorInspector + StockInspector
    ├── pedidos/         # Centro de Pedidos Digitales (Index + PedidoInspector)
    ├── Login.vue
    └── Tabs.vue         # Tab bar iPhone: Dashboard / Productos / Pedidos
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

### Revelados en los rankings del dashboard (v4.5.0)

Los rankings **Top productos** y **Marcas** del dashboard dejan de excluir los productos de la categoría Revelados (`salesService.js`: `computeTopProducts` perdió el set `excludedSkus` y el check por `item.category` — y con ellos el parámetro `products`, su único uso, caller actualizado —; `computeBrands` perdió el check de categoría al armar `skuToBrand`). Los KPIs/totales nunca excluyeron nada (ni al Local Revelados), así que con esto Revelados aparece completo en el dashboard de la app.

- **Divergencia deliberada con imv-back**: el panel mantiene su check `isRevelados` en las tablas de productos/marcas de `Home.vue` (decisión del release v2.28.0). Si se quiere paridad allí, es un cambio aparte.
- Ojo: Top productos ordena por **unidades**, así que los ítems de revelado (alto volumen, ticket chico) pueden dominar los primeros puestos del ranking.

> **Versiones:** `package.json` 4.4.1 → **4.5.0**; nativas `MARKETING_VERSION` → **4.5.0** y `CURRENT_PROJECT_VERSION` 21 → **22** (Debug + Release). Build + `cap sync ios` corridos el 2026-08-13. **Reemplaza al 4.4.1/build 21, que nunca llegó a subirse** — este release acumula ambos cambios (voucher opcional + Revelados en rankings); la tienda sigue en 4.4.0. Falta solo archive/upload desde Xcode.

### Voucher de envío opcional (v4.4.1)

Se eliminó el gate que exigía ≥1 foto del voucher de envío para marcar un pedido como **Entregado** (`PedidoInspector.vue`: check en `onChangeStatus`, computed `hasAnyVoucher`/`needsVoucherHint` y hints de obligatoriedad). La captura/subida del voucher sigue funcionando igual, ahora como paso opcional. Cambio espejo en imv-back v2.13.1 (mismo release del gate web).

> **Versiones:** `package.json` 4.4.0 → **4.4.1**; nativas `MARKETING_VERSION` → **4.4.1** y `CURRENT_PROJECT_VERSION` 19 → **21** (Debug + Release; el build 20 se descartó tras el rechazo de App Store — el reintento sale como **build 21**, decisión del usuario 2026-08-09). **Nunca se publicó**: antes del archive/upload llegó la v4.5.0 (build 22), que la absorbe. La tienda tiene 4.4.0 desde el 2026-07-07 (verificado contra el lookup público de App Store el 2026-08-09). El build lleva además `ITSAppUsesNonExemptEncryption=false` en `Info.plist` (solo HTTPS estándar = cifrado exento): App Store Connect deja de pedir el formulario de export compliance en cada envío. **Deployment target iOS 14.0 → 15.0** (2026-08-09): App Store rechazó el upload del build 20 exigiendo `MinimumOSVersion` ≥ 15; se subió `IPHONEOS_DEPLOYMENT_TARGET` (4 ocurrencias del pbxproj) y `platform :ios` del Podfile + `pod install`. Sin impacto de hardware (iOS 15 corre en los mismos equipos que iOS 14, iPhone 6s+). Los pods quedan en 13.0 por sus podspecs — normal, la validación solo mira el target App.

### Endurecimiento de seguridad + correcciones de auditoría (v4.4.0)

Batch derivado de la auditoría 2026-07-06. Un solo release iOS. Antes de planear se verificó cada hallazgo contra el código (varios de la auditoría estaban desactualizados: el cleanup de tokens FCM ya existía; `init()` sí era código muerto pese a lo que decía este archivo).

- **Seguridad**: escape del nombre de competidor en el tooltip de ApexCharts (`CompetitorInspector.vue`) — el dato viene de `products/{id}/competitors` (datos externos scrapeados); **CSP acotada** a Firebase/Firestore/Storage/FCM en `index.html` (antes `default-src *`). Compañera en `imv-back/firestore.rules` (deployada): `competitors`/`price_history` con `write: if false` (solo el scraper escribe vía Admin SDK; lectura sigue pública para splotter), y collection-group `movements`/`stocks` `list` solo `admin`.
- **App admin-only**: `stores/auth.js` requiere claim `admin` (se quitó `editor`, que no es asignable en el sistema); `App.vue` alineado (`userRole`). Ver memoria `users_role_shape`.
- **Pedidos digitales**: `updateBusinessStatus` usa `runTransaction` — relee el estado (el listado es `getDocs` one-shot y `from` puede venir stale), valida la transición contra `TRANSITIONS` y escribe estado + `history` atómicamente. La cola de vouchers (`voucherQueue.js` → `bumpAttempts`) descarta entradas tras 5 intentos fallidos (evita el reintento infinito que re-subía la foto completa en cada flush).
- **Fechas**: `getDefaultDates` usa `toDateStr` (fix del "Hasta" que arrancaba en mañana por `toISOString` en UTC−5).
- **Errores**: `catch` real en los `onMounted` de `CompetitorInspector`/`StockInspector` (estado de error distinguible del vacío legítimo); `refresh()` de `PedidoInspector` loguea en vez de tragar. `notificationService` registra `pushNotificationActionPerformed` para navegar al tocar la push (lee `data.route`/`data.type`; **falta que el backend `createNotification` envíe un `data` payload** para rutear a destinos específicos — hoy solo `type:'digitalOrder'` → tab pedidos).
- **Limpieza**: eliminados `authStore.init()`/`isLoggedIn`/`loading` (código muerto — `main.js` no los usa), `fetchProductsBySkus`, el `@click` sin listener de `ProductCard`, y el `<link rel="manifest">` inexistente. Logout unificado vía `authStore.logout()`. `@capacitor/haptics`/`keyboard` se **dejaron** (Ionic los usa en runtime, no son código muerto pese a no importarse).

> **Versiones:** `package.json` 4.3.1 → **4.4.0**; nativas `MARKETING_VERSION` 4.3.1 → **4.4.0** y `CURRENT_PROJECT_VERSION` 18 → **19** (Debug + Release). **Publicada el 2026-07-07** en App Store (binario 4.4.0, verificado por lookup público el 2026-08-09).

### Pulido de UX de Pedidos digitales + colores semánticos (v4.3.1)

Iteración de UX sobre el módulo Pedidos (mismo release, aún sin publicar). No cambia comportamiento ni datos; el grueso es presentación.

- **Filtro por estado**: se dejó el `ion-segment` por una fila de chips `ion-button` con la **clase global compartida `.chip-filter`** (`styles.scss`), idéntica a los atajos de fecha del dashboard (que ahora también la usan). El dashboard marca "Hoy" activo por defecto (`activeShortcut`) y lo desmarca al elegir fecha manual.
- **`.status-pill`** (utilidad global): reemplaza `ion-badge`/`ion-chip` para los estados. El reset global `* { padding: 0 }` pisaba el padding del host de esos componentes shadow-DOM en WKWebView y el texto se derramaba; con spans propios se controla padding y contraste.
- **Detalle** (`PedidoInspector.vue`): modal **full-screen en iPhone** (antes sheet que dejaba ver el header del listado); cliente reestructurado en identidad (nombre + documento `docType·docNumber`) + pares etiqueta/valor + nota como callout; total destacado; **botones de acción** de ancho completo con verbo + ícono ("Marcar como…", "Cancelar pedido"), ordenados por `ACTION_ORDER` (destructivo al final); padding-bottom con safe-area.
- **Colores semánticos** (`_config.scss`): se definieron `success`/`warning`/`danger` (con -rgb/-contrast/-shade/-tint) para que botones, pills y toasts usen la paleta de marca y no el neón por defecto de Ionic.
- **Nativo**: `pod install` (CocoaPods 1.16.2) integró los pods `CapacitorCamera`/`CapacitorNetwork` que faltaban — el botón de voucher fallaba con *"not implemented"* hasta esto.

> **Versiones:** `package.json` 4.3.0 → **4.3.1**; nativas iOS `MARKETING_VERSION` 4.3.0 → **4.3.1** y `CURRENT_PROJECT_VERSION` 17 → **18** (Debug + Release). **Publicada** — salió dentro del binario 4.4.0 del 2026-07-07.

### Pedidos digitales + voucher de envío (v4.3.0)

Vista **Pedidos** (Centro de Pedidos Digitales) — gestor de estados de los pedidos que entran de la tienda Kontento (colección `digitalOrders`, ver `DB.md` e `imv-functions`). La app **no factura** (eso es web-only en imv-pos); acá se ven y se gestionan.

- **Ruta/nav**: `/tabs/pedidos` (`views/pedidos/Index.vue`), tab en iPhone (`Tabs.vue`) e ítem de menú en iPad (`App.vue`), icono `receiptOutline`.
- **Listado**: `fetchDigitalOrders()` (getDocs `digitalOrders` orderBy `createdAt` desc, límite 100) + `ion-refresher` (mismo patrón que Products, sin `onSnapshot`). Filtro por `businessStatus` con `ion-segment`. Cards con cliente, fecha (agrupada local, no UTC), total, items y badges (sin resolver / divergencia / facturación).
- **Detalle** (`PedidoInspector.vue`, `ion-modal`): cliente, items, totales, galería del voucher, y **cambio de estado** (Nuevo/Revisado/Entregado/Con problemas/Cancelado) validado contra `TRANSITIONS` + escribe `digitalOrders/{id}/history`. Colores/labels/transiciones en `services/orderStatus.js`.
- **Voucher de envío del courier** (`@capacitor/camera`, `CameraSource.Prompt` = cámara o galería): captura en base64 → **cola offline en IndexedDB** (`services/voucherQueue.js`; no localStorage, que WKWebView bloquea) → sube a Firebase **Storage** (`digitalOrders/{id}/deliveryVouchers/{uuid}.{format}`, con `format` el de la foto, default `jpeg`) y hace `arrayUnion` en el doc. `initVoucherSync()` (en `App.vue`) reintenta el flush al reconectar (`@capacitor/network`) y al volver a foreground (`@capacitor/app`).
- **Gate**: para marcar **Entregado** se exige ≥1 voucher (subido o pendiente en cola) — permite marcar sin señal, la subida se completa después.
- **Deps nuevas**: `@capacitor/camera`, `@capacitor/network` → requieren `npm install` + `npx cap sync ios`. Info.plist: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`. Storage init en `firebase/index.js`; reglas en `imv-back/storage.rules` (`digitalOrders/*/deliveryVouchers`).

> **Versiones:** `package.json` 4.2.0 → **4.3.0**; nativas iOS `MARKETING_VERSION` 4.2.0 → **4.3.0** y `CURRENT_PROJECT_VERSION` 16 → **17** (Debug + Release). **Publicada** — salió dentro del binario 4.4.0 del 2026-07-07.

### Dashboard: productos destacados, atajos de fecha y fix de huso horario (v4.2.0)

Paridad parcial con el dashboard de imv-back. Toda la lógica de cómputo vive en `services/salesService.js` (funciones puras sobre las ventas ya cargadas — no hace queries nuevas); los componentes solo presentan.

- **Productos destacados** (`components/dashboard/FeaturedProducts.vue`): lista los productos con `featured === true` (flag global en Firestore) con unidades + ingreso en el período. Se nutre de `computeFeaturedTable(sales, products)`; incluye destacados sin ventas en 0 y ordena por ingreso. Las NC (07) no entran; ingreso = precio con IGV − descuento × cantidad (mismo cálculo que `computeTopProducts`). Solo se renderiza si hay al menos un producto destacado. **A diferencia de imv-back, no lleva gráfico** — el chart multi-serie quedaba ilegible en pantalla de teléfono, así que se dejó solo el listado (sin toggle ingreso/unidades).
- **Atajos de rango de fecha** (`Index.vue` + `DATE_SHORTCUTS`/`getDateRangeShortcut` en el servicio): fila siempre visible arriba de los filtros — Hoy / Ayer / Esta semana / Este mes / Mes pasado / Este año. Un toque setea `startDate`/`endDate` (strings `YYYY-MM-DD`) y dispara `loadData()`. Misma lógica que imv-back (semana inicia lunes, `end = hoy` donde aplica). Scroll horizontal en móvil, wrap en md+.
- **Fix de huso horario en el chart de ventas** (`computeSalesByDay`): antes agrupaba por día **UTC** (`toISOString()`), y como Lima es UTC−5 las ventas después de las ~19:00 caían al día siguiente → barras fantasma (p. ej. hoy 13 ya mostraba una barra en el "14"). Ahora agrupa por día **local** vía el helper `toDateStr` (componentes locales, no UTC), consistente con los atajos y con imv-back (que nunca tuvo el bug: ya usaba `getFullYear/getMonth/getDate`).

> **Versiones:** `package.json` 4.1.0 → **4.2.0**; nativas iOS `MARKETING_VERSION` 4.1.0 → **4.2.0** y `CURRENT_PROJECT_VERSION` 15 → **16** (`project.pbxproj`, ambas en Debug + Release). **Publicada** — salió dentro del binario 4.4.0 del 2026-07-07.

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

**Fix en `src/main.js`** *(histórico — eliminado en v4.4.0)*: Inicializar auth *antes* del router:

```js
// (histórico — eliminado en v4.4.0)
const authStore = useAuthStore()
authStore.init().then(() => {
  router.isReady().then(() => {
    app.mount('#app')
  })
})
```

**Fix en `src/router/index.js`:** Simplificado el guard — ya no llama `init()` porque el estado de auth está listo al llegar la primera navegación.

**Fix en `src/stores/auth.js`** *(histórico — eliminado en v4.4.0)*: Agregado timeout de seguridad de 5 segundos en `init()` para evitar que la app quede colgada si Firebase no responde (sin red, cold start).

> **Estado actual:** `authStore.init()` resultó código muerto y se eliminó en v4.4.0 — `main.js` monta directo con `router.isReady()`, `stores/auth.js` no tiene `init()`, y el guard espera `onAuthStateChanged` por su cuenta (`waitForAuth()` en `router/index.js`).

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
- `unregisterCurrentDeviceToken()` exportado, hace `arrayRemove(currentToken)` y se llama antes de `signOut(auth)`. Está conectado en un solo punto: la action `logout()` del Pinia store (`stores/auth.js`) — los botones de logout (menú lateral de `App.vue`, header del Dashboard) delegan en `authStore.logout()` (unificado en v4.4.0).

**Backend (`imv-functions/functions/notifications.js`, estado actual):**
- `createNotification` (trigger onCreate de `notifications/{id}`) arma la push con `subject`/`text` y resuelve destinatarios con `resolveRecipients(type)`: lee `appConfig/notifications.recipients[type]` (editable desde imv-back); sin `type` o tipo no configurado → `DEFAULT_RECIPIENT_USER_IDS`; lista vacía → nadie (apagado intencional, se respeta).
- `sendToUsers(userIds, notification)` envía en batch: trae los docs de usuario en paralelo y **deduplica por token entre usuarios** (un mismo dispositivo logueado con dos cuentas recibe la push UNA sola vez), recordando qué docs son dueños de cada token; luego dispara `send()` individuales en paralelo (HTTP v1).
- Helper `getUserTokens(data)` lee `tokens[]` y cae a `token` (string) si el doc aún no migró.
- Limpieza: si el envío falla con `messaging/registration-token-not-registered`, `messaging/invalid-registration-token` o `messaging/invalid-argument`, el token se remueve con `arrayRemove` de **todos** los docs de usuario que lo tenían.

> **Nota sobre `sendMulticast()`.** La primera versión del backend usaba `admin.messaging().sendMulticast()`, que en `firebase-admin <11` pega al endpoint legacy `/batch` de FCM. Google retiró ese endpoint el 22-06-2024 (devuelve `404`), y los pushes dejaron de llegar a *cualquier* dispositivo. La fix mínima sin upgrade del SDK fue reemplazar el batch por un loop paralelo de `send()` (que pasa por HTTP v1 y sigue activo). El comportamiento externo (formato de respuesta, cleanup) quedó idéntico.

### Brand: "Imv." en lugar de "Inv."

El nombre del producto es **Imv.** (con M). El path del repo `inv-front-v2` es legado. Corregido en `App.vue` (header del sidebar), `index.html` (title) y este archivo.

### Versión 4.2.0 / build 16

- `MARKETING_VERSION` 4.1.0 → 4.2.0 (en `ios/App/App.xcodeproj/project.pbxproj`, Debug + Release)
- `CURRENT_PROJECT_VERSION` 15 → 16
- `package.json` 4.1.0 → 4.2.0

### Versión 4.1.0 / build 15

- `MARKETING_VERSION` 4.0.3 → 4.1.0 (en `ios/App/App.xcodeproj/project.pbxproj`)
- `CURRENT_PROJECT_VERSION` 14 → 15
- `package.json` 4.0.3 → 4.1.0

Para release: `npm run build && npx cap sync ios`, luego Xcode → Any iOS Device → Product → Archive → Distribute App → App Store Connect → Upload.
