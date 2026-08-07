# inv-front-v2 — Infrastructure

## Distribution

- Native iOS app distributed through the **App Store** (bundle id `com.inv.app`, min iOS 14.0). No web deployment — the Vite build is packaged into the Capacitor shell.
- Release pipeline (manual, no CI): `npm run build` → `npx cap sync ios` → open `ios/App/App.xcworkspace` in Xcode → Any iOS Device → Product → Archive → Distribute App → App Store Connect → Upload.
- Versioning: `package.json` + `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in `ios/App/App.xcodeproj/project.pbxproj` (Debug + Release). Currently 4.4.1 / build 20.

## Backend / database

- **Firebase project `imvialex`** — shared with the whole IMV ecosystem (imv-back, imv-dash, imv-pos, imv-functions, Kontento store). The app is a pure client; it has no backend of its own.
- **Firestore** initialized with `persistentLocalCache()` (`src/firebase/index.js`) — IndexedDB local cache + long-polling transport, both required for iOS WKWebView (default WebSocket transport gets interrupted).
- Collections used:
  - `products` + subcollections `products/{id}/competitors` (scraped competitor prices / price history) and `products/{id}/stocks` (per-warehouse stock) — one-shot reads.
  - `sales` — range query on `issueDate` (optional `establishment.name` filter); all KPIs are computed client-side.
  - `digitalOrders` + subcollection `digitalOrders/{id}/history` — list (orderBy `createdAt` desc, limit 100); status changes run in a `runTransaction` that re-validates the transition and writes state + history atomically; voucher metadata is `arrayUnion`-ed into `deliveryVouchers`.
  - `users` — doc located by `uid` field; per-device FCM tokens maintained in `tokens[]` (`arrayUnion` on registration, `arrayRemove` on logout).
- Security rules are versioned and deployed from **imv-back** (`firestore.rules`, `storage.rules`); the app's reads/writes require the `admin` claim.

## Authentication

- Firebase Auth (email + password), same user pool as the rest of the ecosystem.
- `initializeAuth` with `indexedDBLocalPersistence` — WKWebView blocks the default local-storage persistence.
- **Admin-only**: `stores/auth.js` checks the custom claim `admin` at login and signs the user out otherwise; the router guard awaits `onAuthStateChanged` and redirects unauthenticated navigation to `/login`. Firestore rules enforce `admin` server-side.

## Storage (delivery vouchers)

- Firebase **Storage**: courier delivery-voucher photos are uploaded as base64 (`uploadString`) to `digitalOrders/{orderId}/deliveryVouchers/{uuid}.{format}` (format from the captured photo, default `jpeg`).
- Offline-first: photos are queued in IndexedDB (DB `imv-vouchers`, `services/voucherQueue.js`) and flushed on app start, on reconnect (`@capacitor/network`) and on returning to foreground (`@capacitor/app`); an entry is discarded after 5 failed upload attempts.
- Storage rules for `digitalOrders/{orderId}/deliveryVouchers/**` live in `imv-back/storage.rules`.

## Push notifications (FCM)

- **Client** (`services/notificationService.js`, `@capacitor/push-notifications`): after login the device registers and stores its FCM token in the user's `tokens[]` (multi-device); logout removes exactly this device's token (single call site: `stores/auth.js` `logout()`). Tapping a push navigates via `data.route` / `data.type` (`digitalOrder` → Pedidos tab); the backend does not send a `data` payload yet, so other pushes only foreground the app. iOS side: `GoogleService-Info.plist` in the native project; presentation options (badge/sound/alert) in `capacitor.config.json`.
- **Pipeline** (lives in **imv-functions**): ecosystem modules (digital orders, inventory, invoices, products, sales, Falabella, schedules) write docs into the `notifications` Firestore collection → the `createNotification` trigger (`functions/notifications.js`, region `southamerica-east1`) builds the push from `subject`/`text`, resolves recipients per notification `type` from `appConfig/notifications.recipients[type]` (fallback: hardcoded default admin user ids; an empty list means intentionally silenced), **dedupes tokens across users** so each physical device receives one push, sends via FCM HTTP v1 (`send()` per token) and removes invalid tokens from every user doc that held them.

## Content-Security-Policy

`index.html` ships a CSP `<meta>` tag (hardened in v4.4.0 — previously `default-src *`): `default-src 'self' gap:`; `script-src` adds `'unsafe-inline' 'unsafe-eval'`; `style-src` adds `'unsafe-inline'`; `img-src` allows `data:`/`blob:`/`https:`; `connect-src` is restricted to Firebase endpoints (`*.googleapis.com`, `firestore.googleapis.com`, `*.firebaseio.com` https+wss, `*.firebasestorage.app`, `firebasestorage.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `fcmregistrations.googleapis.com`).

## Environment variables

None. The Firebase web config is public by design and hardcoded in `src/firebase/index.js` (same pattern as imv-dash / imv-back). The only `import.meta.env` usage is Vite's built-in `BASE_URL` in the router; there are no `.env` files.

## Native iOS specifics

- Capacitor 6 plugins: app, camera, network, push-notifications, status-bar, haptics, keyboard (haptics/keyboard are used by Ionic at runtime even though the app code never imports them).
- `Info.plist`: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription` (voucher capture).
- CocoaPods workspace (`App.xcworkspace`); keep pods in sync with `npx cap sync ios` (plus `pod install` when plugins change).
