# 🚀 Vysion Tech Commerce & HeadlessPOS — Master Project Context

> **Document Version:** 1.0.0  
> **Last Updated:** August 29, 2026  
> **Purpose:** Comprehensive architecture, design system, API references, and development state for seamless onboarding and continued pair programming across any machine or environment.

---

## 1. 🏗️ Ecosystem Architecture & Tech Stack

### Repository Structure:
```
vysion-tech commerce/
├── headlesspos-admin/           # React + TypeScript + Vite Admin Web Dashboard
│   ├── src/
│   │   ├── api/                 # Axios client, endpoints, interceptors
│   │   ├── components/
│   │   │   ├── layout/          # PageLayout, AppShell, Header
│   │   │   ├── mobile-dashboard/# Mobile UI components (Hero, Pills, CapsuleBar, ActivitySheet)
│   │   │   ├── shared/          # MainTableComponent, Modals, Date Filters
│   │   │   ├── inventory/       # Stock, Supplier, PO specific forms & modals
│   │   │   ├── expenses/        # Expense forms & recurring modals
│   │   │   └── staff/           # Staff, Payroll, Salary Profile modals & drawers
│   │   ├── pages/               # Routed pages (inventory, staff, pos, expenses, settings)
│   │   ├── store/               # Zustand stores (authStore, themeStore, featuresStore)
│   │   └── hooks/               # Custom React hooks (CurrencyDisplay, useIsMobile, etc.)
│   └── package.json
│
├── vysion-tech-commerce-server/ # Python + Flask + SQLAlchemy Multi-Tenant Backend
│   ├── routes/
│   │   ├── tenant/              # Tenant API endpoints (products, suppliers, expenses, staff, payroll)
│   │   └── auth/                # Authentication & staff login
│   ├── models/                  # Database models & schema definitions
│   ├── app.py                   # Application entrypoint & configuration
│   └── requirements.txt
│
└── PROJECT_CONTEXT.md           # This master knowledge file
```

### Core Technologies:
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, Date-fns, Lucide React / Iconify, NextUI / Custom Radix Modals.
- **Backend**: Python 3.11+, Flask, Flask-SQLAlchemy, PostgreSQL / SQLite, SQLAlchemy ORM with multi-tenancy scoping.
- **Development Ports**:
  - Frontend: `http://localhost:5173` (or as assigned by Vite)
  - Backend: `http://localhost:5000/api/v1`

---

## 2. 📱 Mobile Design System & UI Architecture

All administrative and operational pages follow a high-aesthetic, unified mobile design pattern that bridges seamlessly with desktop layouts:

### Layout Standard:
```tsx
<PageLayout
  title="Page Title"
  subtitle={isMobile ? `${items.length} items listed` : undefined}
  actions={
    /* Desktop-only action bar / tab switcher */
    <div className="hidden md:flex items-center gap-3">
      ...
    </div>
  }
  headerVariant="action-bridge"
  constrainHeight={true}
  subtitleStyles="!block -mt-3 mb-2 md:-mt-4 md:mb-2 text-[11px] md:text-sm"
>
  {/* ========================================================================= */}
  {/* MOBILE VIEW (Hidden >= md, Block < md)                                    */}
  {/* ========================================================================= */}
  <MobileDashboardWrapper className="block md:hidden">
    {/* 1. Hero KPI Card + Metric Carousel (optional for financial/count stats) */}
    <MobileHeroCard title="..." value={...} badge="...">
      <MobileMetricPill title="..." value={...} icon={...} onClick={...} />
    </MobileHeroCard>

    {/* 2. Action Capsule Bar (Sticky dark action strip) */}
    <MobileActionCapsuleBar
      dateFilterConfig={...}   // Optional Date filter integration
      searchConfig={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Search..." }}
      actions={[
        { label: "New Item", icon: <Plus className="h-3.5 w-3.5 text-primary" />, onClick: ... },
        { label: "Refresh", icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />, onClick: ... }
      ]}
    />

    {/* 3. Activity Sheet (Card list with pill tabs & scrollable list) */}
    <MobileActivitySheet
      title="Recent Records"
      secondary={true}
      viewAllLabel="Other Tab →"
      onViewAll={...}
      tabs={[ { id: 'all', label: 'All' }, ... ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* Individual structured cards */}
    </MobileActivitySheet>
  </MobileDashboardWrapper>

  {/* ========================================================================= */}
  {/* DESKTOP VIEW (Hidden < md, Flex >= md)                                    */}
  {/* ========================================================================= */}
  <div className="hidden md:flex flex-col flex-1 min-h-0 relative h-full">
    <EnhancedTableComponent ... />
  </div>
</PageLayout>
```

---

## 3. 📦 Feature Modules & Implementation Status

### 1. Products & Inventory ([`pages/inventory/`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion%20labs/vysion-tech%20commerce/headlesspos-admin/src/pages/inventory))
- **Stock Management (`StockManagement.tsx`)**: Real-time stock levels, low stock badges, packaging tiers, and variant tracking.
- **Stock Adjustments (`StockAdjustments.tsx`)**: Manual balance overrides, damage/spoilage logging, approval statuses, and impact records.
- **Stock Reconciliation (`StockReconciliation.tsx`)**: Physical count sheets, variance calculations (system vs counted), and discrepancy resolution modal.

### 2. Suppliers & Credit Ledger ([`pages/inventory/`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion%20labs/vysion-tech%20commerce/headlesspos-admin/src/pages/inventory))
- **Suppliers Directory (`Suppliers.tsx`)**: Supplier records, contact info, total debt indicators, and supplier detail slide-over.
- **Supplier Credit Ledger (`SupplierCredit.tsx`)**: Outstanding credit tracking, payment history modal, and custom PDF receipt generator.

### 3. Purchase Orders (`PurchaseOrders.tsx`)
- Order creation with multi-variant tier lines.
- Lifecycle tracking: `draft` ➔ `ordered` ➔ `partially_received` ➔ `received` / `cancelled`.
- Mobile intake: Direct **`[ 📥 Receive ]`** stock intake modal button on receivable orders.

### 4. Expenses & Cash Outlays (`Expenses.tsx`)
- **Expense Log**: Categorized operational expenditures, petty cash, POS till movements, and voiding capabilities.
- **Recurring Schedules**: Automated recurring expense rules with pause/play toggles, edit schedules, and 1-tap **`[ Post Now ]`** execution.
- **KPI Carousel**: Dynamic category breakdown (`Rent`, `Utilities`, `Salaries`, `Supplies`) with 1-tap filtering.

### 5. Staff & Access Management (`StaffManagement.tsx`)
- Team directory with role-colored avatar badges (`Owner` purple, `Manager` blue, `Cashier` emerald).
- Dropdown quick actions: Edit Details, Change Role, Reset POS PIN, Reset Password, and Activate/Deactivate.

### 6. Payroll & Salaries (`PayrollManagement.tsx`)
- **Disbursal Log**: Historical records of batch payroll runs and single off-cycle payouts with detailed pay slip drawer.
- **Salary Profiles**: Compensation configuration for Platform Staff and External Contractors (Bank accounts, Mobile Money, Cash).
- **Mobile Workflow**: Quick switch between log and profiles via `viewAllLabel` links, `dateFilterConfig` in the capsule bar, and `MobilePayrollRunModal`.

---

## 4. 🔌 Key Backend API Routes Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/tenant/products` | GET / POST | Fetch catalog & inventory with variant tiers |
| `/api/v1/tenant/inventory/adjustments` | GET / POST | Adjust inventory balances with reason codes |
| `/api/v1/tenant/suppliers` | GET / POST / PUT | Manage supplier contacts and profiles |
| `/api/v1/tenant/suppliers/credit` | GET / POST | Supplier credit ledger & debt repayments |
| `/api/v1/tenant/purchase-orders` | GET / POST | Purchase orders & stock intake |
| `/api/v1/tenant/expenses` | GET / POST | Operational expenses log |
| `/api/v1/tenant/expenses/recurring` | GET / POST / PUT | Recurring outlay automation rules |
| `/api/v1/tenant/staff` | GET / POST / PUT | Staff members, roles, PINs, and statuses |
| `/api/v1/tenant/payroll` | GET / POST | Batch payroll runs & salary profiles |

---

## 5. 🛠️ Development & Onboarding Commands

### Starting the Backend:
```bash
cd vysion-tech-commerce-server
# Activate virtual environment if configured
python app.py
```

### Starting the Frontend:
```bash
cd headlesspos-admin
npm install
npm run dev
```

### Running Type Validation:
```bash
cd headlesspos-admin
npx tsc --noEmit
```

---

## 6. 🎯 Resuming Development on Your New Laptop

1. Clone or pull this repository onto your new machine.
2. Ensure Node.js (v18+) and Python (v3.11+) are installed.
3. Open the project in **Antigravity IDE**.
4. Reference this file directly (`@PROJECT_CONTEXT.md`) in your prompt when asking for new features or continuations!
