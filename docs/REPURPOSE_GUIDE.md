# REPURPOSE_GUIDE.md
## Campuzon → HeadlessPOS: AI-Assisted Restructuring Brief

**Purpose:** This document is written for an AI model (or developer) tasked with restructuring the `test-server` (Campuzon) codebase into the HeadlessPOS backend. It is a technical brief — not a proposal. Read it before touching any code.

---

## 1. What Campuzon Is

**Campuzon** is a campus-focused, eBay-style multi-vendor ecommerce platform for Ghanaian university students. Key traits:

- **Framework:** Flask (Python), PostgreSQL via SQLAlchemy ORM, Redis for cache and WebSocket
- **Architecture:** Single-user-type marketplace — students can be both buyers and sellers. One `User` table serves both roles.
- **Auth:** JWT (access + refresh tokens), role-based via decorators (`store_owner_required`, `admin_required`, etc.)
- **Payments:** Paystack (GHS, card + mobile money), escrow system, wallet per store, Paystack payout to mobile money/bank
- **Infra:** Flask blueprints, Cloudinary for image uploads, APScheduler for background tasks, Firebase FCM for push, SocketIO for real-time chat/notifications, Sentry for error tracking, Docker + Gunicorn/wsgi ready
- **Route groups:** `public/`, `custom/` (buyer-facing), `store/` (seller-facing), `admin/`

**Campuzon-specific concepts to strip out:**
- `Institution`, `Hall`, `HallType` — campus/university context, irrelevant to HeadlessPOS
- `UserRole.STUDENT`, `UserRole.SELLER` — replace with HeadlessPOS user model
- Campus delivery logic (hall-based addresses, GPS coordinates for dormitories)
- `SubscriptionPlan` tiers (Campuzon-specific feature gating)
- Platform escrow / buyer protection model (keep the Paystack integration, discard the escrow-hold logic)
- `chat` module (SocketIO-based buyer-seller chat) — not needed in HeadlessPOS Phase 1
- Firebase FCM push notifications — optional, deprioritise
- Dispute / refund workflow — out of scope for Phase 1

---

## 2. What HeadlessPOS Is

**HeadlessPOS** is a multi-tenant, headless ecommerce + point-of-sale backend built for Ghanaian SMEs. It serves two kinds of businesses: those running a physical shop (POS), an online store, or both — unified through a single backend.

### The three-phase product:

| Phase | What it is |
|-------|-----------|
| **Phase 1** | Multi-tenant backend: tenant management, product/inventory, orders, Paystack checkout |
| **Phase 2** | Admin portal UI + POS interface (separate frontend, not this repo) |
| **Phase 3** | AI-powered storefront generator (Anthropic API + Vercel Deploy API) — internal agency tool |

**This repurpose task covers Phase 1 only.** You are building the backend engine that Phases 2 and 3 plug into.

---

## 3. Core Architecture Difference

### Campuzon (what it is)
```
User (student/seller) → Store → Products → Orders
```
Single deployment. All stores are on the same domain. User IS the tenant.

### HeadlessPOS (what you're building)
```
Tenant → (Staff Users + Customer Users) → Store → Products → Orders
         ↑
   Identified by tenant_id + API key
```
**Multi-tenant.** Every business is a `Tenant`. All database queries are scoped to `tenant_id`. Staff (admin, cashier) and customers are separate user types with separate JWT scopes.

---

## 4. Multi-Tenancy Pattern — The Most Important Thing

Every model that holds business data must carry `tenant_id`. No exceptions.

### The pattern to enforce:

```python
# Every data model gets this
tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

# Every query gets scoped
Product.query.filter_by(tenant_id=g.current_tenant.id, ...)
```

### Tenant identification at the request level:
- **Storefront API calls** → identified by `X-API-Key` header (per-tenant key, hashed in DB)
- **Staff/POS calls** → identified by JWT that embeds `tenant_id` in the payload
- **Platform admin calls** → superadmin JWT, no tenant scope

Create a `get_current_tenant()` function (similar to how Campuzon's `g.current_user` works) that runs early in the request cycle and sets `g.current_tenant`.

---

## 5. Model Mapping: What Survives, What Changes, What's New

### KEEP (with modifications)

| Campuzon model | HeadlessPOS equivalent | Key changes |
|---------------|----------------------|-------------|
| `Store` | `Tenant` | Rename. Remove `ownerID` FK to User (owner is a `StaffUser`). Add `api_key_hash`, `api_key_prefix`. Remove `institution_id`, `status=PENDING` approval flow |
| `Product` | `Product` | Add `tenant_id`. Add `sku` field (critical for POS barcode scanning). Replace `storeID` FK with `tenant_id`. Keep `quantity`, `price`, `images`, `category`, `status` |
| `Order` | `Order` | Add `tenant_id`. Add `channel` field: `ENUM('online', 'pos')`. Online orders need customer linkage; POS orders may be anonymous (walk-in). Keep `OrderItem`, `DeliveryMethod` |
| `Transaction` | `Transaction` | Add `tenant_id`. Keep Paystack reference fields. Add `payment_method` field: `card`, `mobile_money`, `cash` (POS needs cash) |
| `Account` | `Account` | Keep as-is. Paystack payout accounts for tenants |
| `Wallet` + `WalletTransaction` | `Wallet` + `WalletTransaction` | Add `tenant_id`. Keep structure |
| `Admin` | `PlatformAdmin` | Rename for clarity. Keep `AdminRole` enum. This is the platform superadmin — NOT the tenant's own staff |
| `Notification` | `Notification` | Add `tenant_id`. Keep structure |
| `Review` | `Review` | Add `tenant_id`. Keep structure |

### REMOVE (Campuzon-specific, not needed)

| Model | Reason |
|-------|--------|
| `Institution` | Campus context |
| `Hall` | Campus context |
| `Address` (hall-based) | Replace with simple address string for delivery |
| `UserActivity` | Can re-add later if needed |
| `UserSession` (device tracking) | Simplify for Phase 1 |
| `Escrow` | Remove escrow hold logic; keep Paystack webhook verification |
| `Dispute` | Out of scope Phase 1 |
| `PlatformRevenue` | Out of scope Phase 1 |
| `Wishlist` | Out of scope Phase 1 |
| `ProductView` | Nice-to-have, defer |
| `Subscription` / `SubscriptionPlan` | Replace with simpler `plan` field on `Tenant` if needed |
| `PaymentMethod` (saved cards) | Defer to Phase 2 |

### NEW (HeadlessPOS-specific)

| New model | Purpose |
|-----------|---------|
| `Tenant` | Core multi-tenancy model. Fields: `id`, `business_name`, `slug`, `api_key_hash`, `api_key_prefix`, `plan`, `is_active`, `date_created` |
| `StaffUser` | Tenant's own staff. Fields: `id`, `tenant_id`, `email`, `hPassword`, `role` (`ENUM: owner, manager, cashier`), `is_active`, JWT scope: `staff` |
| `Customer` | Customers of a specific tenant's online store. Fields: `id`, `tenant_id`, `email`, `hPassword`, `first_name`, `last_name`. JWT scope: `customer` |
| `POSTransaction` | A POS-specific record for in-store sales. Links to `Order` with `channel='pos'`. Fields: `id`, `tenant_id`, `order_id`, `cashier_id` (FK → `StaffUser`), `payment_method` (`cash`/`mobile_money`/`card`), `amount_tendered`, `change_given` |
| `StorefrontDeployment` | Phase 3. Records generated storefronts. Fields: `id`, `tenant_id`, `vercel_url`, `template_id`, `ai_generated_content` (JSON), `deployed_at` |

---

## 6. Authentication Model

Campuzon has one token type for users. HeadlessPOS needs **three distinct JWT scopes**:

### Scope 1 — Staff JWT (`scope: "staff"`)
- Issued on staff login (`POST /api/v1/auth/staff/login`)
- Payload includes: `sub` (staff_user_id), `tenant_id`, `role` (owner/manager/cashier), `scope: "staff"`
- Used for: admin portal, POS terminal, inventory management
- Cashier token: role `cashier` → can only access POS endpoints
- Owner/manager token: full access to tenant's routes

### Scope 2 — Customer JWT (`scope: "customer"`)
- Issued on customer login (`POST /api/v1/auth/customer/login`)
- Payload includes: `sub` (customer_id), `tenant_id`, `scope: "customer"`
- Used for: storefront API (browse, cart, checkout, order history)
- Always scoped to ONE tenant — a customer of Tenant A cannot authenticate against Tenant B's storefront

### Scope 3 — Platform Admin JWT (`scope: "platform_admin"`)
- Issued on platform admin login (`POST /api/v1/platform/auth/login`)
- Payload includes: `sub` (admin_id), `role`, `scope: "platform_admin"`
- No `tenant_id` — cross-tenant access
- Used for: platform management dashboard

### API Key (Storefront identification)
- Not a JWT — a static key per tenant
- Sent as `X-API-Key: hpos_live_xxxxxxxxxxxx` header on storefront API calls
- Hashed with SHA-256 before storage (never store plaintext)
- Identifies which tenant the storefront belongs to before any customer auth check

### Auth decorator pattern (adapt from Campuzon's `store_owner_required`):

```python
# Campuzon pattern to adapt:
def store_owner_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_token(request)
        payload = TokenManager.verify_token(token)
        user = User.query.get(payload['sub'])
        g.current_user = user
        return f(*args, **kwargs)
    return decorated

# HeadlessPOS equivalent — create three decorators:
def staff_required(roles=None):         # checks scope='staff', optionally checks role
def customer_required():                 # checks scope='customer', sets g.current_customer
def platform_admin_required(roles=None): # checks scope='platform_admin'

# Plus one for API key:
def storefront_api_key_required():       # extracts X-API-Key, hashes it, finds Tenant
                                         # sets g.current_tenant
```

---

## 7. Route Structure

Campuzon's route groups map to HeadlessPOS like this:

| Campuzon | HeadlessPOS | Auth | Notes |
|----------|------------|------|-------|
| `routes/public/auth.py` | `routes/auth/staff.py` | None | Staff login/register |
| — | `routes/auth/customer.py` | None | Customer login/register (per tenant) |
| `routes/store/products.py` | `routes/tenant/products.py` | `staff_required` | Tenant product CRUD |
| `routes/store/orders.py` | `routes/tenant/orders.py` | `staff_required` | Tenant order management |
| `routes/store/dashboard.py` | `routes/tenant/dashboard.py` | `staff_required` | Tenant analytics |
| `routes/store/settings.py` | `routes/tenant/settings.py` | `staff_required(roles=['owner'])` | Tenant config |
| `routes/store/wallet.py` | `routes/tenant/wallet.py` | `staff_required` | Payouts |
| — | `routes/pos/transactions.py` | `staff_required(roles=['cashier','manager','owner'])` | POS in-store sales |
| — | `routes/pos/products.py` | `staff_required` | POS product lookup by SKU |
| `routes/custom/orders.py` | `routes/storefront/orders.py` | `customer_required` | Customer order history |
| `routes/public/products.py` | `routes/storefront/products.py` | `storefront_api_key_required` | Public product browse |
| `routes/admin/` | `routes/platform/` | `platform_admin_required` | Platform management |
| — | `routes/platform/tenants.py` | `platform_admin_required` | Tenant CRUD |
| — | `routes/platform/generate.py` | `platform_admin_required` | Phase 3: storefront generation |

---

## 8. What to Keep from Campuzon Helpers

### KEEP — these are reusable as-is or near as-is:

| File | What it does | Action |
|------|-------------|--------|
| `helpers/extensions/database.py` | SQLAlchemy `db` instance | Keep exactly |
| `helpers/extensions/cache.py` | Flask-Caching with Redis | Keep exactly |
| `helpers/custom/payment_service.py` | Paystack transactions, verify, transfer | Keep. Remove escrow-specific methods. Add `cash` payment path for POS |
| `helpers/custom/file_upload.py` | Cloudinary image upload | Keep exactly |
| `helpers/custom/email_service.py` | ZeptoMail SMTP | Keep. Update sender addresses (campuzon.me → your domain) |
| `helpers/custom/utils.py` | `validate_uuid`, `generate_slug`, `sanitize_input` | Keep exactly |
| `helpers/custom/wallet_service.py` | Wallet debit/credit logic | Keep, adapt for tenant context |
| `security/auth.py` (TokenManager, PasswordSecurity) | JWT generation/verification, password hashing | Keep. Add `tenant_id` to token payload. Add new scopes. |
| `settings/config.py` | Environment config | Keep structure. Remove campus-specific keys. Add `ANTHROPIC_API_KEY`, `VERCEL_API_TOKEN` |
| `messages/responses.py` | Standardised response helpers | Keep exactly |

### REMOVE or DEFER:

| File | Reason |
|------|--------|
| `helpers/extensions/websocket.py` + `models/chat.py` | SocketIO chat — defer |
| `helpers/extensions/firebase.py` | Push notifications — defer |
| `helpers/custom/sms_service.py` | SMS — optional, defer |
| `helpers/custom/push_service.py` | Firebase push — defer |
| `helpers/extensions/scheduler.py` | APScheduler background tasks — keep the extension, remove campus-specific scheduled jobs |
| `helpers/custom/totp_service.py` | 2FA — defer to Phase 2 |

---

## 9. The POS Module (New, No Campuzon Equivalent)

The POS is the key feature that doesn't exist in Campuzon. Build it fresh:

### What the POS does:
1. **Product lookup by SKU** — cashier scans barcode or types SKU, backend returns product
2. **Build cart** — add items, quantities
3. **Process sale** — deduct inventory, create Order with `channel='pos'`, create POSTransaction
4. **Payment methods** — cash (change calculation), MTN MoMo (Paystack), card (Paystack)
5. **Receipt** — return receipt data (JSON) that the POS UI renders/prints

### Key POS endpoints to build:

```
GET  /api/v1/pos/products/lookup?sku=SKU123       → product details + stock
POST /api/v1/pos/transactions                     → process sale, deduct inventory, create order
GET  /api/v1/pos/transactions/:id/receipt         → receipt data
GET  /api/v1/pos/transactions?date=2025-05-27     → transaction history for cashier
```

### Inventory rules:
- When a POS sale completes → `product.quantity -= quantity_sold`
- When an online order is placed → same deduction
- Both go through the same inventory deduction function — not two separate code paths

---

## 10. Paystack Integration Changes

Campuzon's `PaymentService` is excellent and mostly reusable. The key changes:

### What stays:
- `initialize_transaction()` — online checkout
- `verify_transaction()` — webhook verification (HMAC-SHA512)
- `initialize_transfer()` / `verify_transfer()` — payout to mobile money/bank

### What changes:
- Remove escrow hold logic (`ESCROW_HOLD_HOURS`, auto-release scheduler job)
- Add `cash` payment path for POS (no Paystack needed — just record the amount)
- Webhook endpoint: `POST /api/v1/webhooks/paystack` — keep the HMAC-SHA512 signature check, remove escrow-specific event handling

### Paystack webhook events to handle:
- `charge.success` → mark order as paid, trigger fulfilment
- `transfer.success` → mark payout as completed
- `transfer.failed` → mark payout as failed, notify tenant

---

## 11. Database Schema Key Decisions

### Tenant isolation approach: **shared schema, tenant_id column**
Do NOT use separate schemas or separate databases per tenant. This is the correct approach for Phase 1.

Every table that holds tenant business data gets:
```python
tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
```

Tables that are tenant-scoped (add `tenant_id`):
`products`, `orders`, `order_items`, `transactions`, `pos_transactions`, `customers`, `staff_users`, `accounts`, `wallets`, `wallet_transactions`, `notifications`, `reviews`

Tables that are platform-level (no `tenant_id`):
`tenants`, `platform_admins`, `storefront_deployments`

### Index strategy (critical for multi-tenant performance):
```python
# Composite index on every tenant-scoped table:
Index('ix_product_tenant_status', 'tenant_id', 'status')
Index('ix_order_tenant_created', 'tenant_id', 'date_created')
# etc.
```

---

## 12. Config Changes

In `settings/config.py`, add:

```python
# HeadlessPOS additions
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")           # Phase 3: site generator
VERCEL_API_TOKEN = os.getenv("VERCEL_API_TOKEN")             # Phase 3: deploy API
VERCEL_TEAM_ID = os.getenv("VERCEL_TEAM_ID", None)          # Phase 3: optional

# API key config
API_KEY_PREFIX = "hpos_live_"                                 # prefix for tenant API keys
API_KEY_LENGTH = 32                                           # bytes of entropy

# Remove campus-specific:
# BUYER_PLATFORM_FEE_PERCENT
# SELLER_COMMISSION_PERCENT
# ESCROW_HOLD_HOURS
# DISPUTE_WINDOW_HOURS
# AUTO_CONFIRM_DAYS
```

Update these in `.env`:
- `APP_NAME` → `HeadlessPOS`
- Mail sender addresses → your domain
- `SMS_SENDER_ID` → `HeadlessPOS`

---

## 13. File & Folder Rename Map

```
campuzon-backend/          →  headlesspos-backend/
  app.py                   →  app.py  (update app name, remove campus-specific init calls)
  models/
    users.py               →  models/users.py  (keep User base but restructure — see Section 5)
    store.py               →  models/tenants.py
    operations.py          →  models/operations.py  (keep, add tenant_id, add POS models)
    admin.py               →  models/platform.py  (rename Admin → PlatformAdmin)
    chat.py                →  REMOVE (defer)
  routes/
    public/auth.py         →  routes/auth/staff.py + routes/auth/customer.py
    public/products.py     →  routes/storefront/products.py
    public/stores.py       →  routes/storefront/store_info.py
    custom/orders.py       →  routes/storefront/orders.py
    custom/profile.py      →  routes/storefront/profile.py
    custom/reviews.py      →  routes/storefront/reviews.py
    custom/chat.py         →  REMOVE
    custom/notifications.py →  routes/storefront/notifications.py
    custom/wishlist.py     →  REMOVE
    store/products.py      →  routes/tenant/products.py
    store/orders.py        →  routes/tenant/orders.py
    store/dashboard.py     →  routes/tenant/dashboard.py
    store/settings.py      →  routes/tenant/settings.py
    store/wallet.py        →  routes/tenant/wallet.py
    store/analytics.py     →  routes/tenant/analytics.py
    admin/                 →  routes/platform/
    NEW                    →  routes/pos/transactions.py
    NEW                    →  routes/pos/products.py
    NEW                    →  routes/platform/tenants.py
    NEW (Phase 3)          →  routes/platform/generate.py
```

---

## 14. Step-by-Step Repurpose Order

Do this in sequence. Each step should be a clean, testable state before moving to the next.

1. **Clone repo, set up env** — copy `settings/config.py`, update `.env`, rename app references from `campuzon` to `headlesspos`
2. **New models first** — create `Tenant`, `StaffUser`, `Customer`, `POSTransaction` in new files. Keep all existing models alongside for now.
3. **Add `tenant_id` to existing models** — `Product`, `Order`, `OrderItem`, `Transaction`, `Wallet`, `WalletTransaction`, `Notification`. Add composite indexes.
4. **Remove campus models** — delete `Institution`, `Hall`, `Address` (hall-based). Remove FK references.
5. **Auth rewrite** — update `security/auth.py` to support three scopes. Add `tenant_id` to JWT payload for staff and customer tokens. Add API key verification decorator.
6. **Update `app.py`** — remove campus-specific init calls (Firebase optional, SMS optional). Register new blueprints.
7. **Port routes group by group** — start with `routes/auth/`, then `routes/tenant/`, then `routes/storefront/`, then `routes/platform/`
8. **Build POS routes** — `routes/pos/` is entirely new; no Campuzon equivalent
9. **Paystack webhook cleanup** — remove escrow event handlers, keep `charge.success` and transfer events
10. **Smoke test** — create a tenant, create a staff user, issue a staff JWT, create a product, place a POS order
11. **Phase 3 stub** — add `StorefrontDeployment` model and empty `routes/platform/generate.py` blueprint (implement in Phase 3 weeks)

---

## 15. What the Proposal Says Phase 1 Delivers (for alignment)

The submitted HeadlessPOS proposal (updated May 2025) lists these Phase 1 deliverables:

- Multi-tenant backend with complete tenant isolation
- Tenant registration and API key provisioning
- Product and inventory management API
- Dual-channel order processing (online + POS)
- Paystack payment integration (card, MoMo, AirtelTigo)
- Staff and customer authentication (JWT with role scopes)
- Admin portal API (platform management)
- Webhook handling for payment events

Everything in this guide maps to those deliverables. Do not build beyond Phase 1 scope in this repurpose pass — Phase 3 (Anthropic API + Vercel deploy) is stubbed, not implemented.

---

*Guide written: May 2026. Based on codebase at https://github.com/Kwasi-1/test-server.git*


---

---

# PART 2: SERVER ADDITIONS BEFORE FRONTEND
## Pre-Frontend Backend Checklist

These additions are required before building the POS frontend. The 11-step repurpose gave you the foundation. These steps complete the server so every frontend screen has a working endpoint behind it.

---

## Step 12 — Add `plan` field to Tenant + Module Enforcement Decorators

**What:** Tenants need a `plan` field so the backend knows which modules they've paid for. Two new decorators enforce this at the route level.

**Tenant model addition:**
```python
class TenantPlan(Enum):
    POS_ONLY       = "pos_only"
    ECOMMERCE_ONLY = "ecommerce_only"
    FULL_SUITE     = "full_suite"

# Add to Tenant model:
plan = Column(SQLEnum(TenantPlan), nullable=False, default=TenantPlan.POS_ONLY)
```

**New decorators in `security/auth.py`:**
```python
def pos_module_required(f):
    # Check g.current_tenant.plan in ['pos_only', 'full_suite'] else 403

def ecommerce_module_required(f):
    # Check g.current_tenant.plan in ['ecommerce_only', 'full_suite'] else 403
```

**IDE Prompt — Step 12:**
> The `Tenant` model exists in `models/tenants.py`. Add a `TenantPlan` enum with values: `pos_only`, `ecommerce_only`, `full_suite`. Add a `plan` column to the Tenant model defaulting to `pos_only`. Then add two decorators to `security/auth.py`: `pos_module_required` and `ecommerce_module_required`. Each checks `g.current_tenant.plan` and returns 403 with `{"error": "Module not included in your plan"}` if the plan doesn't include that module. Wrap every existing route in `routes/pos/` with `@pos_module_required` after the staff auth decorator.

---

## Step 13 — Supplier + Purchase Order Models and Routes

**What:** Tracks where stock comes from. Required for stock reups and margin calculation.

**New models in `models/inventory.py`:**
```
Supplier:
  id, tenant_id, name, contact_name, phone, email,
  address, notes, is_active, date_created

PurchaseOrder:
  id, tenant_id, supplier_id (FK), reference_number,
  status (ENUM: draft, ordered, received, cancelled),
  notes, ordered_at, received_at, date_created

PurchaseOrderItem:
  id, purchase_order_id (FK), product_id (FK),
  quantity_ordered, quantity_received,
  cost_price, date_created
```

**Routes in `routes/tenant/suppliers.py` and `routes/tenant/purchase_orders.py`:**
```
POST   /api/v1/tenant/suppliers                     → create supplier
GET    /api/v1/tenant/suppliers                     → list suppliers
PUT    /api/v1/tenant/suppliers/:id                 → update supplier

POST   /api/v1/tenant/purchase-orders               → create PO
GET    /api/v1/tenant/purchase-orders               → list POs
GET    /api/v1/tenant/purchase-orders/:id           → PO detail with items
POST   /api/v1/tenant/purchase-orders/:id/receive   → mark as received, update stock quantities
```

The `/receive` endpoint is the critical one — it loops through `PurchaseOrderItem`, adds `quantity_received` to each product's stock, and creates a `StockMovement` record for each.

**IDE Prompt — Step 13:**
> Create `models/inventory.py` with three models: `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`. Field specs are in the guide Section "Step 13". Every model gets `tenant_id` FK and composite index following the pattern in Section 11. Then create `routes/tenant/suppliers.py` and `routes/tenant/purchase_orders.py`. The most important endpoint is `POST /api/v1/tenant/purchase-orders/:id/receive` — it must: set PO status to `received`, loop through each `PurchaseOrderItem`, add `quantity_received` to the linked product's `quantity` field, and commit in one transaction. Use `staff_required(roles=['owner', 'manager'])` and `@pos_module_required` on all routes. Register both blueprints in `app.py`.

---

## Step 14 — Expense Tracking

**What:** Records petty cash and operational costs. Needed for end-of-day profit calculation.

**New model in `models/inventory.py` (append to same file):**
```
ExpenseCategory (Enum):
  PETTY_CASH, UTILITIES, RENT, SUPPLIES, TRANSPORT,
  SALARIES, MAINTENANCE, OTHER

Expense:
  id, tenant_id, category (SQLEnum ExpenseCategory),
  description, amount (Numeric 10,2),
  recorded_by (FK → StaffUser), receipt_url (Cloudinary, nullable),
  expense_date (Date), date_created
```

**Routes in `routes/tenant/expenses.py`:**
```
POST  /api/v1/tenant/expenses           → log expense
GET   /api/v1/tenant/expenses           → list (filter by date range, category)
GET   /api/v1/tenant/expenses/summary   → total by category for a date range
DELETE /api/v1/tenant/expenses/:id      → void (manager/owner only)
```

**IDE Prompt — Step 14:**
> Append an `ExpenseCategory` enum and `Expense` model to `models/inventory.py`. Fields: `id`, `tenant_id`, `category` (SQLEnum), `description`, `amount` (Numeric 10,2), `recorded_by` (FK to StaffUser), `receipt_url` (nullable String), `expense_date` (Date column, not DateTime), `date_created`. Create `routes/tenant/expenses.py` with four endpoints as listed in the guide. The summary endpoint must return totals grouped by category for a given date range — use SQLAlchemy `func.sum` grouped by `category`. All routes use `staff_required` and `@pos_module_required`. Register in `app.py`.

---

## Step 15 — Cash Drawer / Shift Model

**What:** Tracks each POS shift — opening float, all transactions during shift, closing count, variance. Required for end-of-day reconciliation screen.

**New model in `models/pos.py` (append):**
```
ShiftStatus (Enum): open, closed

Shift:
  id, tenant_id, cashier_id (FK → StaffUser),
  status (SQLEnum ShiftStatus),
  opening_float (Numeric 10,2),     ← cash in drawer at start
  closing_count (Numeric 10,2),     ← cash counted at end (nullable until closed)
  expected_cash (Numeric 10,2),     ← calculated: opening_float + cash sales
  variance (Numeric 10,2),          ← closing_count - expected_cash (nullable)
  opened_at (DateTime), closed_at (DateTime nullable),
  notes (TEXT nullable)
```

**Routes in `routes/pos/shifts.py`:**
```
POST /api/v1/pos/shifts/open          → start shift, record opening float
POST /api/v1/pos/shifts/close         → close shift, record closing count, calculate variance
GET  /api/v1/pos/shifts/current       → get active shift for current cashier
GET  /api/v1/pos/shifts               → shift history (manager/owner)
GET  /api/v1/pos/shifts/:id/report    → full shift report with all transactions
```

**Business rule:** A cashier can only have one open shift at a time. `POST /open` must check for an existing open shift and reject if found.

**IDE Prompt — Step 15:**
> Append `ShiftStatus` enum and `Shift` model to `models/pos.py`. Fields as listed in guide Step 15. Add a relationship from `Shift` to `POSTransaction` (one shift has many transactions — add `shift_id` FK to `POSTransaction` model, nullable for now so existing records don't break). Create `routes/pos/shifts.py` with five endpoints. The open endpoint must reject if the cashier already has an open shift. The close endpoint must calculate `expected_cash` (opening_float + sum of cash POSTransactions in this shift) and `variance` (closing_count - expected_cash) before saving. Register in `app.py`.

---

## Step 16 — Staff Management Routes + PIN Login

**What:** Tenant owner manages their staff. Cashiers can log into POS with a 4-digit PIN (faster than email+password at a register).

**StaffUser model additions** (in `models/staff.py`):
```python
pos_pin_hash = Column(String(255), nullable=True)  # hashed 4-digit PIN
last_pin_change = Column(DateTime(timezone=True), nullable=True)
```

**New routes in `routes/tenant/staff.py`:**
```
GET    /api/v1/tenant/staff                    → list all staff (owner/manager only)
POST   /api/v1/tenant/staff                    → create staff user
PUT    /api/v1/tenant/staff/:id                → update role, deactivate
DELETE /api/v1/tenant/staff/:id                → remove staff member
POST   /api/v1/tenant/staff/:id/set-pin        → set POS PIN for a cashier
```

**New auth endpoint in `routes/auth/staff.py`:**
```
POST /api/v1/auth/staff/pin-login
  Body: { "staff_id": "uuid", "pin": "1234" }
  Returns: short-lived JWT (4 hour expiry), scope: "staff", role: "cashier"
  Use case: quick POS terminal login without typing a full password
```

**IDE Prompt — Step 16:**
> Add `pos_pin_hash` and `last_pin_change` fields to the `StaffUser` model. Create `routes/tenant/staff.py` with full CRUD for staff management — all routes require `staff_required(roles=['owner', 'manager'])` and `@pos_module_required`. The `set-pin` endpoint takes a 4-digit PIN, validates it's exactly 4 digits, hashes it with `PasswordSecurity.hash_password()`, and saves to `pos_pin_hash`. Add a new endpoint `POST /api/v1/auth/staff/pin-login` to `routes/auth/staff.py` — it accepts `staff_id` and `pin`, verifies with `PasswordSecurity.verify_password()`, and returns a JWT with `scope: staff`, `tenant_id`, `role: cashier`, and expiry of 4 hours. Register new blueprint in `app.py`.

---

## Step 17 — Reports Endpoints

**What:** Aggregated data endpoints the reports dashboard screens will call. All read-only, no writes.

**New file: `routes/tenant/reports.py`**

```
GET /api/v1/tenant/reports/sales-summary
    Query params: start_date, end_date, channel (pos|online|all)
    Returns: total_revenue, total_orders, avg_order_value,
             breakdown_by_payment_method, breakdown_by_channel

GET /api/v1/tenant/reports/products
    Query params: start_date, end_date, sort (top_selling|slow_movers|margin)
    Returns: list of products with units_sold, revenue, cost_of_goods, gross_margin

GET /api/v1/tenant/reports/cashiers
    Query params: start_date, end_date
    Returns: per-cashier breakdown of transactions, total_sales, avg_transaction

GET /api/v1/tenant/reports/end-of-day
    Query params: date (defaults to today)
    Returns: shift summary, sales_by_hour, payment_method_totals,
             total_expenses, net_revenue (sales - expenses),
             cash_variance if shift closed
```

**IDE Prompt — Step 17:**
> Create `routes/tenant/reports.py` with four GET endpoints. All require `staff_required(roles=['owner', 'manager'])`. All queries must be scoped to `g.current_tenant.id`. Use SQLAlchemy `func.sum`, `func.count`, `func.avg` for aggregations — do not pull all records into Python and sum in a loop. For the products report, gross margin calculation is: `(price - cost_price) / price * 100` where `cost_price` comes from the most recent received `PurchaseOrderItem` for that product. If no purchase order exists for a product, return `cost_price: null` and `gross_margin: null`. All endpoints accept `start_date` and `end_date` as query params in `YYYY-MM-DD` format. Register blueprint in `app.py`.

---

## Step 18 — Final Smoke Test (Updated)

**IDE Prompt — Step 18:**
> Update `scripts/smoke_test.py` to cover all new endpoints. The test must run these in sequence:
> 1. Create tenant with plan `pos_only`
> 2. Create owner staff user, login, get JWT
> 3. Create cashier staff user, set their PIN
> 4. PIN login as cashier, get cashier JWT
> 5. Create a supplier
> 6. Create a product with SKU and cost price
> 7. Create a purchase order from the supplier, receive it — verify product stock increased
> 8. Open a shift (cashier JWT)
> 9. Process a cash POS sale — verify stock decreased, shift transaction count increased
> 10. Log an expense
> 11. Close the shift — verify variance is calculated
> 12. Call end-of-day report — verify it returns data
> 13. Try calling an ecommerce route with a pos_only tenant — verify 403
> Print PASS/FAIL for each step with the HTTP status code received.

---

---

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

