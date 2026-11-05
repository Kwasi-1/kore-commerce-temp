import { useEffect, useState } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import PageLayout from '@/components/layout/PageLayout';
import { CustomOnlyDateFilterComponent, DateFilterValue } from '@/components/shared/custom-only-date-filter';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';

interface Row {
  locationId: string;
  name: string;
  type: 'store' | 'warehouse';
  status: string;
  sales: number;
  orders: number;
  averageSale: number;
  grossProfit: number;
  margin: number | null;
  stockValue: number;
}

/** Each location side by side: sales, orders, average sale, gross profit and stock value. */
export default function BranchComparison() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: 'this_month',
    start_date: startOfMonth(new Date()),
    end_date: endOfMonth(new Date()),
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (dateFilter.start_date) params.set('start_date', dateFilter.start_date.toISOString());
    if (dateFilter.end_date) params.set('end_date', dateFilter.end_date.toISOString());
    setIsLoading(true);
    apiClient
      .get(`/tenant/locations/branch-report?${params.toString()}`)
      .then((r) => setRows(r.data?.success?.data?.rows || []))
      .catch((e) => toast.error(e?.response?.data?.error?.message || "Couldn't load the report"))
      .finally(() => setIsLoading(false));
  }, [dateFilter]);

  const best = rows.length > 1 ? Math.max(...rows.map((r) => r.sales)) : null;

  return (
    <PageLayout
      title="Branch Comparison"
      actions={
        <CustomOnlyDateFilterComponent defaultDate="this_month" value={dateFilter} onChange={setDateFilter} align="end" showLabelOnMobile />
      }
    >
      <div className="space-y-4 mb-4">
        <div className="hidden md:block bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left font-medium px-4 py-3">Location</th>
                <th className="text-right font-medium px-4 py-3">Sales</th>
                <th className="text-right font-medium px-4 py-3">Orders</th>
                <th className="text-right font-medium px-4 py-3">Average sale</th>
                <th className="text-right font-medium px-4 py-3">Gross profit</th>
                <th className="text-right font-medium px-4 py-3">Margin</th>
                <th className="text-right font-medium px-4 py-3">Stock value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.locationId}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon icon={r.type === 'warehouse' ? 'solar:box-linear' : 'solar:shop-2-linear'} className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{r.name}</span>
                        {best !== null && r.sales === best && r.sales > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">Top seller</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium"><CurrencyDisplay amount={r.sales} /></td>
                    <td className="px-4 py-3 text-right">{r.orders.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right"><CurrencyDisplay amount={r.averageSale} /></td>
                    <td className="px-4 py-3 text-right"><CurrencyDisplay amount={r.grossProfit} /></td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{r.margin === null ? '—' : `${r.margin}%`}</td>
                    <td className="px-4 py-3 text-right"><CurrencyDisplay amount={r.stockValue} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
          {rows.map((r) => (
            <div key={r.locationId} className="p-4">
              <div className="flex justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{r.name}</p>
                <p className="text-sm font-semibold"><CurrencyDisplay amount={r.sales} /></p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs">
                <span><span className="text-muted-foreground">Orders</span> {r.orders}</span>
                <span><span className="text-muted-foreground">Avg</span> <CurrencyDisplay amount={r.averageSale} /></span>
                <span><span className="text-muted-foreground">Profit</span> <CurrencyDisplay amount={r.grossProfit} /></span>
                <span><span className="text-muted-foreground">Stock</span> <CurrencyDisplay amount={r.stockValue} /></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
