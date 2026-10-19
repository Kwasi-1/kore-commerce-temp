# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **tenant-facing** admin + POS app (package name `kore-commerce`; older docs call it `headlesspos-admin`). It talks only to the Flask backend in `../vysion-tech-commerce-server`. The workspace-level `../CLAUDE.md` covers the backend and the sibling apps.

## Commands

```bash
npm install
npm run dev          # Vite dev server
npm run build        # tsc && vite build
npm run lint         # eslint, --max-warnings 0 (warnings fail)
npx tsc --noEmit     # type check only
npm run build:lib    # library build (vite --mode lib, entry src/index.ts, emits .d.ts); PWA plugin is off in this mode
```

There is no test runner. Verify changes with `npx tsc --noEmit`, `npm run lint`, and the running app.

Env lives in `.env.local`:
- `VITE_API_URL`: set to `http://localhost:5000/api/v1`, **including `/api/v1`**. Every call site uses paths relative to that, e.g. `apiClient.get('/tenant/products')` or `apiClient.post('/pos/transactions')`.
- `VITE_USE_MOCK_API=true`: `main.tsx` installs `axios-mock-adapter` on `apiClient` from `src/api/mock.ts` (~6k lines of fixtures, 600 ms delay), so the app runs with no backend. If you add an endpoint and want it in demo mode, add a handler there too.
- `VITE_STOREFRONT_BASE_URL`: used for links to the tenant's public storefront.

Known quirk: the refresh calls in `src/api/client.ts` and `src/hooks/useTokenRefresh.ts` build `${VITE_API_URL}/api/v1/auth/staff/refresh`. The `isAuthEndpoint` check in `client.ts` also matches on `/api/v1/auth/...`. Both assume a base URL without `/api/v1`, so they don't match the env convention above. Check this before you change auth or refresh behavior.

TS runs with `strict: false`, and ESLint turns `no-explicit-any` off, so `any` is common and allowed.

## Architecture

**Entry and routing.** `src/main.tsx` registers the service worker and sets up the providers: React Query (`retry: false`, no refetch on focus), BrowserRouter, NextUIProvider, and two toasters (shadcn `Toaster` and `react-hot-toast`). The real route table is in **`src/App.tsx`**. `src/router.tsx` and `src/pages/home-page.tsx` are leftover starter scaffolding and are not used. Pages are lazy-loaded through `lazyWithRetry`. `ChunkErrorBoundary`, plus a `vite:preloadError` listener that reloads the page, recover from stale chunks after a deploy.

**Three layouts.** `AuthLayout` (login), `POSLayout` (the full-screen register at `/pos/register`) and `DashboardLayout` (everything else). Cashiers land on `/pos/register`, and owners and managers land on `/dashboard`. `/pos/locked` is the cashier PIN lock screen.

**Two kinds of gate, nested per route:**
- `ProtectedRoute allowedRoles={['owner','manager']}` checks auth and staff role (`owner` / `manager` / `cashier`).
- `ModuleRoute requiredModule="..."` checks plan features. It renders `UpgradeWall` in place instead of redirecting. During a plan grace period (`authStore.graceInfo`), it also allows modules from the tenant's previous plan and exposes `isGraceAccess` through `useModuleContext()`. `PlanBlockedWall`, `PlanGraceModal` and `PlanGraceBanner` handle the plan-state UI app-wide.

**Feature flags** come from `featuresStore` (`GET /tenant/features`). It holds `plan`, `modules[]`, `hasModule(key)`, and `posSettings` (micro-toggles for the register such as tax, split payment, credit, wholesale and shift management). `PLAN_MODULES` in `featuresStore.ts` and `getModules()` in `utils/permissions.ts` mirror the backend's `models/tenants.py` PLAN_MODULES, so if you change plans, change all three. Prefer `useFeaturesStore(s => s.hasModule)` over the deprecated `getModules()`.

**State.** Zustand stores live in `src/store/` and most use `persist` (localStorage). `authStore` holds the token, refresh token, staff user, tenant and grace info. `settingsStore` is fetched whenever a token is present. Redux and redux-persist are in `package.json`, but `src/` does not use them.

**Data fetching.** Pages mostly call `apiClient` directly, with local `useState`/`useEffect`. React Query is set up but barely used, so follow whatever the neighbouring page does. `apiClient` attaches the bearer token and does a single-flight silent refresh on a 401, queueing concurrent requests while it refreshes. `useTokenRefresh` refreshes before the first render so route guards don't bounce a user whose session has expired but who still holds a valid refresh token.

**Offline POS.** Sales made while offline go into `offlineQueueStore` with a client `idempotencyKey`, which is sent as `X-Idempotency-Key`. `useOfflineSync` drains the queue to `POST /pos/transactions`. It waits 2.5 s after the browser comes back online, then polls every 25 s. Network errors keep an entry `pending`, and a 400 or 409 marks it `failed` for the cashier to review. `productCacheStore` keeps the catalog for offline lookup. The PWA (`vite.config.ts`, `registerType: autoUpdate`, own `public/manifest.json`) caches `/api/v1/pos/products` and `/api/v1/tenant/features` NetworkFirst. Its service worker is disabled in dev. `ReloadPrompt` surfaces updates.

**Domain rules that affect UI code.** Quantities can be fractional, because selling sub-packs is allowed and stock is NUMERIC(10,3). Use `useQuantityFormatter` and `utils/packaging.ts` (piece/pack/carton conversions), and never assume integers. Use `useCurrency` for money. Receipts are built in `utils/receipt.ts` with `useReceiptHeader` (jsPDF/html2canvas). App branding strings live in `src/config/app.config.ts`.

## UI conventions

- Primitives are in `src/components/ui` (Radix/shadcn style, `components.json`). Feature components live in folders named after the page area (`pos/`, `inventory/`, `ecommerce/`, ...). NextUI and Iconify/lucide are also used.
- Mobile pattern (from `PROJECT_CONTEXT.md`): wrap pages in `PageLayout` with `headerVariant="action-bridge"`, and use `MobileDashboardWrapper`, `MobileActionCapsuleBar` and `MobileActivitySheet` from `components/mobile-dashboard`. Show desktop tables with `hidden md:flex`.
- When you add a page: lazy-import it in `App.tsx`, wrap it in the right `ProtectedRoute`/`ModuleRoute`, and add it to the sidebar/bottom nav, which use the same module keys.

## Deployment

The app deploys as a SPA to Vercel (`vercel.json`) or Azure Static Web Apps (`staticwebapp.config.json`). Both rewrite every route to `index.html`.
