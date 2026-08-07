# inv-front-v2 — Structure

Vue 3 (Composition API) + Ionic Vue 8 (iOS mode) + Capacitor 6 app, plain JavaScript (no TypeScript, workspace rule). Global styles in SCSS with Ionic theming (pre-dates the workspace Tailwind default). Entry point: `index.html` → `src/main.js`; the Vite build output (`dist/`) is packaged into the native iOS shell by Capacitor.

```
inv-front-v2/
├── index.html                 # SPA shell (es): viewport with maximum-scale=1 (no input zoom), CSP meta tag
├── vite.config.js             # @ → src alias, SCSS auto-imports (config + mixins), remove-crossorigin
│                              # plugin, manualChunks vendor splitting (vue / ionic / firebase / charts)
├── capacitor.config.json      # appId com.inv.app, appName "Imv", webDir dist, push presentationOptions, iOS ≥14
├── ionic.config.json          # Ionic CLI marker
├── package.json               # version (kept in sync with MARKETING_VERSION); scripts: dev / build / preview
├── resources/                 # icon.png + splash.png sources (@capacitor/assets)
├── docs/                      # this documentation (English)
├── ios/App/                   # native Xcode project (CocoaPods)
│   ├── App.xcworkspace        # what you open in Xcode
│   ├── App.xcodeproj/project.pbxproj  # MARKETING_VERSION + CURRENT_PROJECT_VERSION (Debug + Release)
│   ├── App/                   # Info.plist (camera/photo usage strings), GoogleService-Info.plist (FCM),
│   │                          # entitlements, app icons, copied web build (public/)
│   └── Podfile                # Capacitor plugin pods
└── src/
    ├── main.js                # createApp + IonicVue({ mode:'ios' }) + Pinia + ApexCharts + router;
    │                          # mounts after router.isReady()
    ├── App.vue                # ion-split-pane shell: iPad side menu + user footer; StatusBar style,
    │                          # push registration on auth, voucher-queue sync init
    ├── assets/scss/           # styles.scss + base/_config (tokens, semantic colors), base/_reset,
    │                          # components/_card, utilities/_mixins (respond-to breakpoints)
    ├── components/
    │   ├── dashboard/         # KpiCard, SalesChart, RankingList, TopProductsList, FeaturedProducts
    │   └── products/          # ProductCard
    ├── composables/
    │   └── useBreakpoint.js   # reactive window.matchMedia wrapper
    ├── firebase/
    │   └── index.js           # Firebase init: Firestore (persistentLocalCache), Auth
    │                          # (indexedDBLocalPersistence), Storage — WKWebView-safe choices
    ├── router/
    │   └── index.js           # /login + /tabs/{dashboard,products,pedidos}; guard awaits
    │                          # onAuthStateChanged before every navigation
    ├── services/              # all Firestore/Storage access lives here
    │   ├── productService.js  # products + competitors / stocks subcollections (one-shot getDocs)
    │   ├── salesService.js    # sales range query + pure computations (KPIs, charts, top/featured
    │   │                      # products, date shortcuts, local-time grouping)
    │   ├── digitalOrdersService.js  # orders list/detail, transactional status change (+history),
    │   │                      # voucher capture/upload, queue flush + sync listeners
    │   ├── orderStatus.js     # business/Kontento/invoice status labels, Ionic colors, TRANSITIONS
    │   ├── voucherQueue.js    # IndexedDB offline queue for voucher photos (attempt counter)
    │   └── notificationService.js  # FCM token registry (users.tokens arrayUnion/arrayRemove),
    │                          # push-tap navigation
    ├── stores/
    │   └── auth.js            # Pinia: login (requires claim admin), logout (unregisters device token)
    └── views/
        ├── Login.vue
        ├── Tabs.vue           # iPhone bottom tab bar (Dashboard / Productos / Pedidos), hidden md+
        ├── dashboard/Index.vue          # KPIs, charts, filters, date shortcuts
        ├── products/Index.vue           # catalog grid + search
        ├── products/CompetitorInspector.vue  # competitor prices modal (ApexCharts)
        ├── products/StockInspector.vue       # per-warehouse stock modal
        ├── pedidos/Index.vue            # Digital Orders Center: list + status chips filter
        └── pedidos/PedidoInspector.vue  # order detail modal: items, status actions, voucher gallery/capture
```

## Conventions

- **Services own all Firestore/Storage access**; views and components only present. `salesService` computations are pure functions over already-loaded sales (no extra queries).
- **One-shot reads** (`getDocs`) + pull-to-refresh (`ion-refresher`) — no `onSnapshot` listeners anywhere.
- **Responsive**: `useBreakpoint` composable + `respond-to($bp)` SCSS mixin (sm/md/lg/xl = 576/768/992/1200). iPhone gets the tab bar; iPad (md+) gets the split-pane menu; modals receive explicit desktop dimensions via global classes (`.competitor-modal`, `.stock-modal`, …), sheet behavior on iPhone.
- **Vendor chunk splitting** in `vite.config.js` (`vendor-vue`, `vendor-ionic`, `vendor-firebase`, `vendor-charts`) keeps the entry bundle tiny — a single 2.1 MB bundle used to break WKWebView startup.
- **Native versioning**: bump `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in `ios/App/App.xcodeproj/project.pbxproj` (both Debug and Release) together with `package.json` on every release.
