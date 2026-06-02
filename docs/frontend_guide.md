# PART 3: POS FRONTEND STRUCTURE

## Stack Decision

**Framework:** React (Vite) + TypeScript
**Styling:** Tailwind CSS
**State:** Zustand (lightweight, no boilerplate — better than Redux for a POS)
**API calls:** Axios with an interceptor that auto-attaches the JWT and tenant API key
**Routing:** React Router v6

This is a single repo: `headlesspos-admin/`
It serves both the POS terminal view and the tenant management dashboard from the same codebase — different routes, different layouts, same auth system.

---

## Repo Structure

```
headlesspos-admin/
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts           ← Axios instance, interceptors, token refresh
│   │   ├── auth.ts             ← login, pin-login, refresh
│   │   ├── products.ts         ← product CRUD + SKU lookup
│   │   ├── pos.ts              ← transactions, shifts, receipt
│   │   ├── inventory.ts        ← stock, suppliers, purchase orders
│   │   ├── expenses.ts
│   │   ├── staff.ts
│   │   └── reports.ts
│   ├── store/                  ← Zustand stores
│   │   ├── authStore.ts        ← JWT, current user, tenant, plan
│   │   ├── cartStore.ts        ← POS cart state
│   │   ├── shiftStore.ts       ← current shift state
│   │   └── uiStore.ts          ← modals, sidebar open/close
│   ├── layouts/
│   │   ├── DashboardLayout.tsx ← sidebar + topbar, module-aware nav
│   │   ├── POSLayout.tsx       ← full-screen POS terminal layout
│   │   └── AuthLayout.tsx      ← login screens
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.tsx           ← email + password login
│   │   │   └── PinLogin.tsx        ← 4-digit PIN pad for cashiers
│   │   ├── dashboard/
│   │   │   └── Overview.tsx        ← home screen after login
│   │   ├── pos/
│   │   │   ├── Register.tsx        ← main POS terminal screen
│   │   │   ├── Transactions.tsx    ← transaction history
│   │   │   └── Shifts.tsx          ← shift management
│   │   ├── inventory/
│   │   │   ├── Products.tsx        ← product catalogue
│   │   │   ├── StockManagement.tsx ← restock / stock levels
│   │   │   ├── StockReconciliation.tsx
│   │   │   ├── Suppliers.tsx
│   │   │   └── PurchaseOrders.tsx
│   │   ├── expenses/
│   │   │   └── Expenses.tsx
│   │   ├── staff/
│   │   │   └── StaffManagement.tsx
│   │   ├── reports/
│   │   │   ├── SalesSummary.tsx
│   │   │   ├── ProductReport.tsx
│   │   │   ├── CashierReport.tsx
│   │   │   └── EndOfDay.tsx
│   │   └── settings/
│   │       ├── BusinessProfile.tsx
│   │       └── PlanBilling.tsx
│   ├── components/
│   │   ├── pos/
│   │   │   ├── ProductSearchBar.tsx   ← SKU/name search
│   │   │   ├── CartPanel.tsx          ← right panel with cart items
│   │   │   ├── CartItem.tsx
│   │   │   ├── PaymentModal.tsx       ← cash / MoMo / card flow
│   │   │   ├── CashCalculator.tsx     ← tendered amount + change
│   │   │   ├── ReceiptModal.tsx       ← receipt preview + print
│   │   │   └── NumPad.tsx             ← reusable numpad (PIN + cash)
│   │   ├── inventory/
│   │   │   ├── ProductForm.tsx
│   │   │   ├── SupplierForm.tsx
│   │   │   └── PurchaseOrderForm.tsx
│   │   ├── shared/
│   │   │   ├── DataTable.tsx          ← reusable sortable table
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── StatCard.tsx           ← metric cards for dashboards
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   └── navigation/
│   │       ├── Sidebar.tsx            ← module-aware, reads plan from authStore
│   │       └── TopBar.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePOSCart.ts              ← cart logic (add, remove, quantity, discount)
│   │   ├── useShift.ts                ← open/close shift, current shift state
│   │   └── usePrint.ts                ← browser print / receipt formatting
│   ├── utils/
│   │   ├── currency.ts                ← GHS formatting helpers
│   │   ├── dates.ts                   ← date formatting, range helpers
│   │   └── permissions.ts             ← role + plan permission checks
│   ├── types/
│   │   ├── tenant.ts
│   │   ├── product.ts
│   │   ├── order.ts
│   │   ├── pos.ts
│   │   └── staff.ts
│   ├── App.tsx                        ← routes + protected route wrapper
│   └── main.tsx
├── .env.local
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

---

## Module-Aware Navigation

The sidebar reads `plan` from `authStore` and renders only what's available:

```typescript
// utils/permissions.ts
export const getModules = (plan: TenantPlan) => ({
  pos:        ['pos_only', 'full_suite'].includes(plan),
  ecommerce:  ['ecommerce_only', 'full_suite'].includes(plan),
  inventory:  true,   // always
  reports:    true,   // always
  staff:      true,   // always
})
```

---

## The POS Register Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [≡ HeadlessPOS]    Register         Cashier: Kwame  [Exit] │
├──────────────────────────────┬──────────────────────────────┤
│                              │  CART                        │
│  [Search by name or SKU...]  │  ─────────────────────────── │
│                              │  Product A    x2    GHS 40   │
│  ┌────┐ ┌────┐ ┌────┐        │  Product B    x1    GHS 15   │
│  │ P1 │ │ P2 │ │ P3 │        │  ─────────────────────────── │
│  └────┘ └────┘ └────┘        │  Subtotal:          GHS 55   │
│  ┌────┐ ┌────┐ ┌────┐        │  Discount:           GHS 0   │
│  │ P4 │ │ P5 │ │ P6 │        │  ─────────────────────────── │
│  └────┘ └────┘ └────┘        │  TOTAL:             GHS 55   │
│                              │                              │
│                              │  [  CASH  ] [  MOMO  ]       │
│                              │  [  CARD  ] [ HOLD   ]       │
└──────────────────────────────┴──────────────────────────────┘
```

Left panel: product grid / search results
Right panel: cart + payment buttons
Payment modal opens as an overlay when a payment method is selected

---

## Environment Variables (frontend)

```
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=HeadlessPOS
```

No API keys in the frontend env — the tenant API key is only needed for the storefront (Phase 3), not the admin/POS portal.

---

## Frontend Build Prompts (use after server is complete)

### Opening context prompt (attach REPURPOSE_GUIDE.md):

> I'm building the POS admin frontend for HeadlessPOS — a multi-tenant ecommerce + POS system. The backend is a Flask REST API. The attached REPURPOSE_GUIDE.md has the full system context including all API endpoints and auth patterns.
>
> The frontend is React + TypeScript + Vite + Tailwind + Zustand. The structure is defined in Part 3 of the guide.
>
> We build one file or one component at a time. Start by scaffolding the project — run the Vite create command, install dependencies (tailwind, zustand, axios, react-router-dom), and show me the config files. Do not build any components yet.
>
> Dependencies to install:
> `npm install axios zustand react-router-dom`
> `npm install -D tailwindcss postcss autoprefixer`
>
> Wait for confirmation before proceeding.

---

### Prompt FE-1 — API client + auth store:

> Build `src/api/client.ts` — an Axios instance pointing to `VITE_API_URL`. Add a request interceptor that attaches `Authorization: Bearer {token}` from localStorage if a token exists. Add a response interceptor that catches 401 errors and clears the auth store.
> Then build `src/store/authStore.ts` using Zustand. State: `token`, `refreshToken`, `staffUser` (id, name, role), `tenant` (id, name, plan). Actions: `login(token, refreshToken, staffUser, tenant)`, `logout()`, `setTenant()`. Persist to localStorage.
> Then build `src/api/auth.ts` with two functions: `loginWithPassword(email, password)` and `loginWithPin(staffId, pin)` — both call the backend and return the token payload.

---

### Prompt FE-2 — App routing + protected routes:

> Build `src/App.tsx` with React Router v6. Routes:
>
> - `/login` → `AuthLayout` + `Login.tsx`
> - `/pin` → `AuthLayout` + `PinLogin.tsx`
> - `/pos/register` → `POSLayout` + `Register.tsx` (requires auth + pos module)
> - `/dashboard` → `DashboardLayout` + `Overview.tsx` (requires auth)
> - All other dashboard routes under `/dashboard/*`
>
> Create a `ProtectedRoute` component that checks `authStore` for a token. If no token, redirect to `/login`. Create a `ModuleRoute` component that additionally checks the tenant plan — if plan doesn't include the required module, redirect to `/dashboard` with a toast.

---

### Prompt FE-3 — Dashboard layout + module-aware sidebar:

> Build `src/layouts/DashboardLayout.tsx` with a left sidebar and top bar. Build `src/components/navigation/Sidebar.tsx`. The sidebar must read `tenant.plan` from `authStore` and use `getModules()` from `utils/permissions.ts` to show/hide nav sections. Nav sections: POS (Register, Transactions, Shifts), Inventory (Products, Stock, Suppliers, Purchase Orders), Expenses, Staff, Reports (Sales, Products, Cashiers, End of Day), Settings. Inactive module sections are hidden entirely — not greyed out, not locked, just absent.

---

### Prompt FE-4 — PIN login screen:

> Build `src/pages/auth/PinLogin.tsx`. Layout: centered card, staff member selects their name from a dropdown (calls `GET /api/v1/tenant/staff` with the tenant API key to get the list — this is a public-ish call scoped by tenant), then enters a 4-digit PIN using the `NumPad` component. On submit, calls `loginWithPin(staffId, pin)`. Build `src/components/pos/NumPad.tsx` — a reusable 3x4 number grid (1-9, clear, 0, submit) that accepts an `onComplete(value: string)` callback.

---

### Prompt FE-5 — POS Register screen (core):

> Build `src/pages/pos/Register.tsx`. This is the main POS screen. Layout as described in the guide (left product panel, right cart panel — see the ASCII diagram in Part 3).
>
> Left panel: `ProductSearchBar` component that calls `GET /api/v1/pos/products/lookup?sku=` on Enter keypress, and also supports browsing by category. Clicking a product adds it to the cart.
>
> Right panel: `CartPanel` component fed from `cartStore`. Shows items, quantities (editable), line totals, subtotal, discount field, and total. Four payment buttons: Cash, MoMo, Card, Hold.
>
> Build `src/store/cartStore.ts` with Zustand: `items[]`, `discount`, actions: `addItem`, `removeItem`, `updateQuantity`, `setDiscount`, `clearCart`.
>
> Do not build the payment modal yet — buttons are present but not wired. One component at a time.

---

### Prompt FE-6 — Payment modal + receipt:

> Build `src/components/pos/PaymentModal.tsx`. It receives the cart total and payment method as props. Three tabs inside: Cash, MoMo, Card.
>
> Cash tab: shows total due, `CashCalculator` component (input for tendered amount, displays change in large text), confirm button. On confirm: calls `POST /api/v1/pos/transactions` with `payment_method: 'cash'`, `amount_tendered`, and cart items. On success: clears cart, opens `ReceiptModal`.
>
> MoMo tab: shows total, phone number input, instruction text ("Customer will receive a prompt on their phone"), confirm button. Calls the same transaction endpoint with `payment_method: 'mobile_money'`.
>
> Card tab: simple confirm button ("Swipe or tap card, then confirm"). Calls endpoint with `payment_method: 'card'`.
>
> Build `src/components/pos/ReceiptModal.tsx` — shows receipt data returned from the API. Include a print button that calls `window.print()` with the receipt div targeted.

---

### Prompt FE-7 — Shift management:

> Build `src/pages/pos/Shifts.tsx` and `src/hooks/useShift.ts`.
>
> `useShift` hook: on mount, calls `GET /api/v1/pos/shifts/current`. If no open shift found, sets `currentShift: null`. Exposes `openShift(float)` and `closeShift(closingCount)` functions that call the respective API endpoints.
>
> `Shifts.tsx` page: if no open shift, show "Open Shift" card with an input for opening float and a start button. If shift is open, show shift summary (opened at time, cashier name, transaction count so far, expected cash). Show "Close Shift" button that opens a modal asking for the closing count, then calls `closeShift()` and shows the variance.

---

### Prompt FE-8 — Inventory: Products page:

> Build `src/pages/inventory/Products.tsx`. It calls `GET /api/v1/tenant/products` and renders results in a `DataTable` component. Columns: name, SKU, category, price, stock quantity, status. Include filters for category and status. Include a search input. Add "New Product" button that opens `ProductForm` in a slide-over panel. Build `src/components/inventory/ProductForm.tsx` — a form for creating/editing a product. Fields: name, SKU (required), description, price, cost price, initial quantity, category (dropdown), images (Cloudinary upload). On submit: POST or PUT to the products API.

---

### Prompt FE-9 — Suppliers + Purchase Orders:

> Build `src/pages/inventory/Suppliers.tsx` — list of suppliers with create/edit via `SupplierForm` slide-over.
>
> Build `src/pages/inventory/PurchaseOrders.tsx` — list of POs with status badges (draft, ordered, received). "New PO" button opens `PurchaseOrderForm`. The form has: supplier dropdown, reference number, and a dynamic line-item table (add product by name/SKU, enter quantity ordered and cost price). On submit: creates the PO as draft.
>
> Each PO row has a "Mark Received" button — calls `POST /api/v1/tenant/purchase-orders/:id/receive` and shows a success toast with how many units were added to stock.

---

### Prompt FE-10 — Reports dashboard:

> Build `src/pages/reports/SalesSummary.tsx`. At the top: a `DateRangePicker` component and a channel filter (All / POS / Online). Below: four `StatCard` components (Total Revenue, Total Orders, Avg Order Value, Top Payment Method). Below that: a bar chart using Recharts showing revenue by day across the selected range. Data comes from `GET /api/v1/tenant/reports/sales-summary`.
>
> Build `src/pages/reports/EndOfDay.tsx`. Shows today's shift summary if a shift was closed today: all stat cards, payment method breakdown as a pie chart, expenses table, net revenue calculation.
>
> Use Recharts for all charts. Install it: `npm install recharts`.

---

### Prompt FE-11 — Staff management:

> Build `src/pages/staff/StaffManagement.tsx`. Shows a table of staff users with columns: name, email, role, status, last login. "Add Staff" button opens a form to create a new staff user (name, email, role dropdown: owner/manager/cashier). Each row has an "Edit" button to update role or deactivate. For cashier rows, show a "Set PIN" button — opens a small modal with the `NumPad` component where the owner sets a 4-digit PIN on behalf of the cashier.

---

### Prompt FE-12 — Expenses page:

> Build `src/pages/expenses/Expenses.tsx`. Top section: summary cards showing total expenses by category this month (from `GET /api/v1/tenant/expenses/summary`). Below: a table of individual expense records with filters for date range and category. "Log Expense" button opens a form: category dropdown, description, amount, date, optional receipt image upload (Cloudinary). Manager/owner role also sees a void button on each expense row.


# PART 4: ECOMMERCE MODULE — FRONTEND PROMPTS (FE-13 to FE-17)

## Context

These prompts build the Ecommerce module inside `headlesspos-admin/`. They follow directly after FE-12 (Expenses). All screens sit inside `DashboardLayout` and are gated by `ModuleRoute` checking `plan` includes `ecommerce_only` or `full_suite`.

The ecommerce module has four sections:

- Online Orders (`/dashboard/ecommerce/orders`)
- Storefront Settings (`/dashboard/ecommerce/storefront`)
- Customers (`/dashboard/ecommerce/customers`)
- Discounts & Promotions (`/dashboard/ecommerce/discounts`)

All API calls use `staff_required` JWT — the tenant staff member manages ecommerce from the admin portal. Customer-facing storefront calls (browse, cart, checkout) are made by the storefront frontend, not this dashboard.

---

## Backend Endpoints These Prompts Depend On

All routes are under the staff JWT auth + `ecommerce_module_required` decorator on the backend.

### Online Orders

```
GET  /api/v1/tenant/orders?channel=online&status=&page=&start_date=&end_date=
GET  /api/v1/tenant/orders/:id
PUT  /api/v1/tenant/orders/:id/status   body: { status: 'processing'|'shipped'|'delivered'|'cancelled' }
GET  /api/v1/tenant/orders/:id/items
```

### Customers

```
GET  /api/v1/tenant/customers?page=&search=
GET  /api/v1/tenant/customers/:id
GET  /api/v1/tenant/customers/:id/orders
```

### Storefront Settings

```
GET  /api/v1/tenant/storefront/settings
PUT  /api/v1/tenant/storefront/settings
     body: { store_name, tagline, logo_url, banner_url, primary_color,
             announcement_text, announcement_active, featured_product_ids[] }
GET  /api/v1/tenant/storefront/deployment   → StorefrontDeployment record if exists
```

### Discounts

```
GET  /api/v1/tenant/discounts
POST /api/v1/tenant/discounts
PUT  /api/v1/tenant/discounts/:id
DELETE /api/v1/tenant/discounts/:id
POST /api/v1/tenant/discounts/:id/toggle   → activate / deactivate
```

Discount model fields: `code` (uppercase string), `type` (ENUM: `percentage`, `fixed`), `value` (Numeric), `min_order_amount` (Numeric nullable), `max_uses` (Integer nullable), `uses_count` (Integer), `is_active` (Boolean), `expires_at` (DateTime nullable).

---

## Step: Add Ecommerce Routes to the Router

Before building any page, add the ecommerce routes to `src/router.tsx` (or `src/App.tsx` depending on your setup).

> Add these lazy-loaded routes inside the `DashboardLayout` route group in `src/router.tsx`. Wrap each in `<ModuleRoute module="ecommerce">`:
>
> ```
> /dashboard/ecommerce/orders          → pages/ecommerce/OnlineOrders.tsx
> /dashboard/ecommerce/orders/:id      → pages/ecommerce/OrderDetail.tsx
> /dashboard/ecommerce/customers       → pages/ecommerce/Customers.tsx
> /dashboard/ecommerce/customers/:id   → pages/ecommerce/CustomerDetail.tsx
> /dashboard/ecommerce/storefront      → pages/ecommerce/StorefrontSettings.tsx
> /dashboard/ecommerce/discounts       → pages/ecommerce/Discounts.tsx
> ```
>
> Also add the ecommerce nav section to `Sidebar.tsx` — it should appear only when `getModules(plan).ecommerce` is true. Nav items: Online Orders (ShoppingBag icon), Customers (Users icon), Storefront (Globe icon), Discounts (Tag icon). Group them under an "Ecommerce" section label in the sidebar, same pattern as the POS section.

---

## Prompt FE-13 — Online Orders List + Order Detail

> Build `src/pages/ecommerce/OnlineOrders.tsx`.
>
> **Top of page:** Four `DashboardCard` stat cards in a row — Total Orders (all time), Pending Orders (status=pending), Today's Revenue (online channel, today), Avg Order Value. Each card calls the reports summary endpoint filtered to `channel=online`.
>
> **Filters bar:** Status filter tabs (All / Pending / Processing / Shipped / Delivered / Cancelled) — pill-style tabs matching the design system. Date range picker using the existing `DateRangePicker` component. Search input for order number or customer name.
>
> **Orders table:** Use the existing `DataTable` component. Columns: Order # (truncated ID with copy button), Customer name + email, Items count, Total (GHS formatted), Payment method, Status badge (use `StatusBadge` component — map statuses to colors: pending=yellow, processing=blue, shipped=purple, delivered=green, cancelled=red), Date placed, Actions (View button → `/dashboard/ecommerce/orders/:id`).
>
> **Pagination:** pass `manualPagination=true` to `DataTable`, manage `pageIndex` in state, pass `pageCount` from API response.
>
> Then build `src/pages/ecommerce/OrderDetail.tsx`.
>
> Layout: back button top left, order number + status badge as page title. Two-column layout:
>
> - Left (wider): Order Items table (product image thumbnail, name, SKU, quantity, unit price, line total), Order summary (subtotal, discount, delivery fee, total).
> - Right (narrower): Customer info card (name, email, phone), Delivery address card, Payment info card (method, Paystack reference if online), Order timeline card (status history as an activity timeline — use `ActivityTimeline` component if present in the template).
>
> Status update: a dropdown at the top right letting manager/owner change order status. On change calls `PUT /api/v1/tenant/orders/:id/status`. Show a confirmation dialog before submitting. On success show a toast and refresh the order.
>
> Use `@tanstack/react-query` (`useQuery`) for data fetching on both pages.

---

## Prompt FE-14 — Customers List + Customer Detail

> Build `src/pages/ecommerce/Customers.tsx`.
>
> **Stats row:** Three `DashboardCard` cards — Total Customers, New This Month, Repeat Customers (customers with more than 1 order).
>
> **Customers table:** Use `DataTable`. Columns: Avatar (initials-based using `Avatar` component from the template), Full name, Email, Phone (if available), Total orders (count), Total spent (GHS), Date joined, Actions (View button).
>
> Search input filters by name or email (pass `searchKey` prop to `DataTable`). No status filter needed — customers are always active.
>
> Then build `src/pages/ecommerce/CustomerDetail.tsx`.
>
> Layout: back button, customer name as page title, subtitle showing email and join date.
>
> Three sections:
>
> 1. **Summary cards row:** Total orders, Total spent, Avg order value, Last order date — four `DashboardCard` components fed from the customer's order history.
> 2. **Order history table:** same columns as the Online Orders table but without the customer column. Clicking a row navigates to `/dashboard/ecommerce/orders/:id`.
> 3. **Customer info card:** name, email, phone, date joined, total spend. No edit functionality — customers manage their own profile via the storefront.
>
> Use `useQuery` with the key `['customer', id]` for the customer detail, and `['customer-orders', id]` for their orders.

---

## Prompt FE-15 — Storefront Settings

> Build `src/pages/ecommerce/StorefrontSettings.tsx`.
>
> This page has two sections side by side: a settings form on the left and a live preview panel on the right that updates in real time as the user types.
>
> **Settings form (left):**
> Use `formik` + `yup` for form state and validation. On mount, call `GET /api/v1/tenant/storefront/settings` and populate the form. Fields:
>
> - Store display name (text input)
> - Tagline (text input, max 100 chars, char counter shown)
> - Logo (image upload via Cloudinary — use the existing `FileUpload` component from the template if present, otherwise a basic file input that uploads to Cloudinary and stores the URL)
> - Banner image (same upload pattern)
> - Brand color (hex color input — a simple `<input type="color">` wrapped in a styled div)
> - Announcement bar: toggle switch (`Switch` component) + text input for the message. Input only shown when toggle is on.
> - Featured products: a multi-select (`MultiSelect` component from the template) that searches `GET /api/v1/tenant/products` and lets the owner pin up to 6 products to the storefront homepage.
>
> Save button calls `PUT /api/v1/tenant/storefront/settings`. Show success toast on save.
>
> **Live preview panel (right):**
> A simplified storefront preview card — not a full storefront, just a miniature representation showing: the banner image (or a placeholder gradient using the brand color if no banner), the logo overlaid bottom-left of the banner, the store name in large text, the tagline below it, and the announcement bar as a colored strip at the top if active. This updates live from `formik.values` — no API call needed for the preview.
>
> **Deployment info section (below the two-column area):**
> Call `GET /api/v1/tenant/storefront/deployment`. If a `StorefrontDeployment` record exists, show a card with the live URL (clickable), deployment date, and template name. If no deployment exists, show an info banner: "Your storefront hasn't been generated yet. Contact your HeadlessPOS administrator to set up your storefront." — this is intentional, the generator is a platform admin tool, not a tenant self-serve tool.

---

## Prompt FE-16 — Discounts & Promotions

> Build `src/pages/ecommerce/Discounts.tsx`.
>
> **Header row:** Page title "Discounts & Promotions" on the left. "Create Discount" button on the right — opens the create form in a `Sheet` (slide-over panel) from the existing template.
>
> **Discounts table:** Use `DataTable`. Columns:
>
> - Code (monospace font, uppercase, with a copy-to-clipboard button)
> - Type badge (Percentage = blue badge, Fixed = green badge)
> - Value (show as "10%" or "GHS 5.00" depending on type)
> - Min order (show "None" if null)
> - Uses (show as "24 / 100" where second number is max_uses, or "24 / ∞" if no max)
> - Expiry (formatted date or "No expiry" if null — use `date-fns` `format`)
> - Status toggle (`Switch` component — calls `POST /api/v1/tenant/discounts/:id/toggle` on change, optimistic update)
> - Actions: Edit (pencil icon), Delete (trash icon with `ConfirmDialog`)
>
> **Create / Edit sheet:**
> Build `src/components/ecommerce/DiscountForm.tsx`. A `Sheet` containing a `formik` form. Fields:
>
> - Discount code (text input, auto-uppercase on change, with "Generate random code" button that fills the field with a random 8-char alphanumeric string)
> - Type: segmented control or radio — Percentage / Fixed Amount
> - Value (number input — label changes to "%" or "GHS" based on type selection)
> - Minimum order amount (optional number input)
> - Maximum uses (optional number input — leave empty for unlimited)
> - Expiry date (optional — use `DateSelector` component from the template)
> - Active toggle (default: on)
>
> Validation with `yup`: code required, min length 3, max 20. Value required, min 0.01. If type is percentage, max value 100. On submit: POST for create, PUT for edit. Close sheet on success, invalidate the discounts query.
>
> **Empty state:** If no discounts exist, show the `EmptyState` component with a Tag icon, heading "No discount codes yet", and a "Create your first discount" button.

---

## Prompt FE-17 — Ecommerce Dashboard Overview Widget

> The main `/dashboard` overview page (`src/pages/dashboard/Overview.tsx`) should show different content depending on the tenant's plan. Update it to include an ecommerce summary section for tenants with `ecommerce_only` or `full_suite` plans.
>
> Add a section below the existing POS summary (or as the primary content for ecommerce-only tenants). The ecommerce section contains:
>
> **Stats row:** Online Orders Today, Online Revenue Today, New Customers Today, Active Discount Codes — four `DashboardCard` components. Data comes from the reports summary endpoint filtered to `channel=online` and today's date range.
>
> **Recent online orders:** A condensed table (5 rows max, no pagination) showing the 5 most recent online orders — columns: order #, customer name, total, status badge, time ago (use `date-fns` `formatDistanceToNow`). "View all orders" link at the bottom navigates to `/dashboard/ecommerce/orders`.
>
> **Logic:** Wrap both the POS summary section and the ecommerce summary section in the module permission check from `getModules(plan)`. A `full_suite` tenant sees both sections. A `pos_only` tenant sees only POS. An `ecommerce_only` tenant sees only ecommerce. The layout adjusts automatically — no hardcoded visibility flags.