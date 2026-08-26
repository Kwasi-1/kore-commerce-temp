# Server Pagination, Search Fix & Global Category Filter

## Background

The app uses `EnhancedTableComponent` (from `MainTableComponent.tsx`) across **15+ pages**. The server returns paginated responses (20 items per page), but many pages:
1. Fetch all data with `limit=150` and filter client-side — users never see page 2+.
2. Build category dropdowns from whatever data was loaded — so only the current page's categories appear.
3. Search triggers a 500 error due to a PostgreSQL `DISTINCT` bug on a `json` column.

---

## User Review Required

> [!IMPORTANT]
> **StockManagement** currently fetches `?limit=150` (a workaround to get all products at once). After this change it will use real server pagination (20/page). The UX for stock operations (restock, history) is unchanged — row actions still work. Confirm this is acceptable before proceeding.

> [!WARNING]
> **Transactions** currently fetches `per_page=100` and filters client-side by search query. After this change, search will be sent to the server. The `/pos/transactions` server endpoint must support `search` as a query param — if not, a backend fix is needed there too (similar to the products fix below).

---

## Part 1 — Backend Fixes (Flask Server)

### Problem 1: Search 500 Error — `SELECT DISTINCT` on JSON column

**Root cause**: When searching by SKU, the query does an `outerjoin(ProductVariant)` and adds `.distinct()`. PostgreSQL cannot use `DISTINCT` on the `images` column (type `json`) because JSON has no equality operator.

**Fix**: Replace `.distinct()` with a subquery using `EXISTS` — avoids the DISTINCT entirely and is also more performant.

#### [MODIFY] [`products.py`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion labs/vysion-tech commerce/vysion-tech-commerce-server/routes/tenant/products.py)

Change lines 78–85 from:
```python
if search:
    search_term = f"%{search}%"
    query = query.outerjoin(ProductVariant).filter(
        db.or_(
            Product.name.ilike(search_term),
            ProductVariant.sku.ilike(search_term)
        )
    ).distinct()
```

To:
```python
if search:
    search_term = f"%{search}%"
    sku_match = db.session.query(ProductVariant.product_id).filter(
        ProductVariant.sku.ilike(search_term)
    ).subquery()
    query = query.filter(
        db.or_(
            Product.name.ilike(search_term),
            Product.id.in_(sku_match)
        )
    )
```

This avoids the JOIN + DISTINCT entirely. No change to response shape.

---

### Problem 2: Categories Only Show Loaded Pages' Data

**Fix**: Add a new lightweight endpoint `GET /api/v1/tenant/products/categories` that returns all unique product categories for the tenant in one query.

#### [MODIFY] [`products.py`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion labs/vysion-tech commerce/vysion-tech-commerce-server/routes/tenant/products.py)

Add **before** the `get_product` route (line ~145):

```python
@tenant_products_bp.route('/categories', methods=['GET'])
@staff_required()
def get_product_categories():
    """Get all unique product categories for this tenant"""
    try:
        tenant = g.current_tenant
        categories = db.session.query(Product.category)\
            .filter(Product.tenant_id == tenant.id, Product.is_active == True)\
            .filter(Product.category.isnot(None))\
            .distinct()\
            .order_by(Product.category.asc())\
            .all()
        return jsonify({
            "success": {
                "status": "OK",
                "code": 200,
                "data": {
                    "categories": [c[0] for c in categories if c[0]]
                }
            }
        }), 200
    except Exception as e:
        logger.error(f"Get categories error: {e}")
        return jsonify({"error": {"status": "SERVER_ERROR", "message": "An error occurred", "code": 500}}), 500
```

> [!NOTE]
> This endpoint queries only the `products` table (not joined), so DISTINCT on `category` (a string) is safe — no JSON column involved.

---

## Part 2 — Frontend: Products Page

#### [MODIFY] [`Products.tsx`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion labs/vysion-tech commerce/headlesspos-admin/src/pages/inventory/Products.tsx)

1. **Categories**: On mount, call `GET /tenant/products/categories` once and populate the category dropdown — remove the client-side category extraction from product items.
2. **Search**: Already sends search to server via `fetchProducts(1, false)` — this will work once the backend bug is fixed.
3. **No other structural changes needed** — `serverPagination` + `onPageChange` already wired.

---

## Part 3 — Frontend: StockManagement Page

#### [MODIFY] [`StockManagement.tsx`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion labs/vysion-tech commerce/headlesspos-admin/src/pages/inventory/StockManagement.tsx)

Currently: fetches `?limit=150` (all at once), filters client-side.

Changes:
1. Add `pagination` state, `fetchProducts(page)` function that calls `?page=X&limit=20`.
2. Category dropdown fetched from `/tenant/products/categories` (same endpoint as Products).
3. Search: sent as `&search=...` param to the server (works after backend fix).
4. Status filter: sent as `&status=...` (already supported by backend).
5. Pass `serverPagination={pagination}` and `onPageChange={(page) => fetchProducts(page)}` into `<EnhancedTableComponent />`.

> [!NOTE]
> Because Stock Management shows flattened variant rows (one row per variant, not per product), the flattening logic stays on the frontend — it maps each page's 20 products into N variant rows (where N ≥ 20 for multi-variant products). The pagination counter will show `Showing 1–20 of 71 products` (products, not variant rows). This is consistent with how the server counts.

---

## Part 4 — Frontend: Transactions Page

#### [MODIFY] [`Transactions.tsx`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion labs/vysion-tech commerce/headlesspos-admin/src/pages/pos/Transactions.tsx)

Currently: fetches `per_page=100` and filters by search client-side.

Changes:
1. Add `pagination` state. Refactor `fetchTransactions(page)` to include `page` param.
2. Remove client-side search filter — pass `&search=...` to server URL (requires backend to support it — check transactions endpoint).
3. Pass `serverPagination={pagination}` and `onPageChange={(page) => fetchTransactions(page)}` to `<EnhancedTableComponent />`.

> [!IMPORTANT]
> The `/pos/transactions` endpoint must support `search` and `page` params. This needs to be verified — if not, a backend fix (same pattern as products search fix) will be added.

---

## Pages NOT Getting Server Pagination (Client-Side is Fine)

These pages load small, bounded datasets that don't grow indefinitely — client-side pagination is appropriate:

| Page | Reason |
| :--- | :--- |
| StockAdjustments | Date-filtered, bounded dataset |
| Suppliers | Small list, rarely > 20 |
| SupplierCredit | Bounded per supplier |
| CreditLedger | Date-filtered |
| Returns | Date-filtered |
| Expenses | Date-filtered |
| StaffManagement | Small list |
| PayrollManagement | Bounded |
| Reports (Product/Cashier) | Already aggregated |
| OnlineOrders | Date-filtered |
| Customers | Can add later if needed |
| Overview Dashboard | Summary view only |

---

## Proposed Changes Summary

### Backend (`vysion-tech-commerce-server`)

#### [MODIFY] [`products.py`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion labs/vysion-tech commerce/vysion-tech-commerce-server/routes/tenant/products.py)
- Fix DISTINCT bug in search (lines 78–85)  
- Add `GET /categories` route

---

### Frontend (`headlesspos-admin`)

#### [MODIFY] [`Products.tsx`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion labs/vysion-tech commerce/headlesspos-admin/src/pages/inventory/Products.tsx)
- Fetch categories from `/tenant/products/categories` on mount
- Remove client-side category extraction from product loop

#### [MODIFY] [`StockManagement.tsx`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion labs/vysion-tech commerce/headlesspos-admin/src/pages/inventory/StockManagement.tsx)
- Switch from `limit=150` → paginated `?page=X&limit=20`
- Fetch categories from shared endpoint
- Wire `serverPagination` + `onPageChange`

#### [MODIFY] [`Transactions.tsx`](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion labs/vysion-tech commerce/headlesspos-admin/src/pages/pos/Transactions.tsx)
- Add page state to `fetchTransactions`
- Move search to server-side
- Wire `serverPagination` + `onPageChange`

---

## Execution Order

```
1. Backend: Fix search DISTINCT bug in products.py
2. Backend: Add GET /tenant/products/categories endpoint  
3. Frontend: Update Products.tsx → fetch categories from new endpoint
4. Frontend: Update StockManagement.tsx → server pagination  
5. Frontend: Verify transactions endpoint supports page + search, then update Transactions.tsx
6. Run npx tsc --noEmit to verify types
```

---

## Verification Plan

### Automated
- `npx tsc --noEmit` — zero TypeScript errors

### Manual
- Search "Colgate" on Products page → returns matching results (not 500)
- Category dropdown shows ALL categories (not just page 1's)
- Clicking page 2 on Products → new 20 products loaded from server
- Clicking page 2 on Stock Management → correct data
- Clicking page 2 on Transactions → correct data
- Filter by category → resets to page 1, shows correct results
