import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import DashboardCard from '@/components/ui/dashboard-card';
import { CurrencyDisplay, useCurrency } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function EndOfDay() {
  const { formatGHS } = useCurrency();
  const [eodData, setEodData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for missing backend aggregation
  const [paymentBreakdown] = useState([
    { name: 'Cash', value: 4500, color: '#00C853' },
    { name: 'MoMo', value: 2100, color: '#FFCC00' },
    { name: 'Card', value: 1200, color: '#2563EB' }
  ]);

  const [expenses] = useState([
    { id: 1, category: 'Utilities', description: 'Electricity Token', amount: 150 },
    { id: 2, category: 'Supplies', description: 'Receipt Paper Roll', amount: 45 },
  ]);

  useEffect(() => {
    const fetchEOD = async () => {
      setIsLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const response = await apiClient.get(`/tenant/reports/end-of-day?date=${todayStr}`);
        setEodData(response.data.success.data.summary);
      } catch (error) {
        console.error('Failed to fetch EOD report:', error);
        toast.error('Failed to load End of Day summary');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEOD();
  }, []);

  if (isLoading) {
    return (
      <PageLayout title="End of Day Report">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  const hasClosedShifts = eodData?.shifts?.closed_shifts > 0;
  
  const totalSales = eodData?.total_sales || 0;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netRevenue = totalSales - totalExpenses;

  return (
    <PageLayout title={`End of Day: ${format(new Date(), 'MMMM do, yyyy')}`}>
      
      {!hasClosedShifts && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/30 mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">No Closed Shifts Today</h3>
            <p className="text-sm opacity-90 mt-1">Cashiers must close their shifts from the Register module for complete daily reconciliation.</p>
          </div>
        </div>
      )}

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard
          title="Total Gross Sales"
          value={<CurrencyDisplay amount={totalSales} />}
          subvalue={`${(eodData?.pos?.transactions || 0) + (eodData?.ecommerce?.transactions || 0)} Total Transactions`}
          className="border border-border"
        />
        <DashboardCard
          title="Net Revenue"
          value={<CurrencyDisplay amount={netRevenue} />}
          subvalue="Gross Sales minus Expenses"
          className="border border-border"
        />
        <DashboardCard
          title="Shift Variance"
          value={
            <span className={(eodData?.shifts?.total_variance || 0) < 0 ? 'text-red-500' : 'text-green-500'}>
              {(eodData?.shifts?.total_variance || 0) > 0 ? '+' : ''}<CurrencyDisplay amount={eodData?.shifts?.total_variance || 0} />
            </span>
          }
          subvalue="Expected vs Actual Cash"
          className="border border-border"
        />
        <DashboardCard
          title="POS vs E-Commerce"
          value={`${eodData?.pos?.transactions || 0} / ${eodData?.ecommerce?.transactions || 0}`}
          subvalue="Transaction volume split"
          className="border border-border"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pie Chart */}
        <div className="lg:col-span-1 bg-card text-card-foreground p-6 rounded-xl border border-border h-[350px] flex flex-col">
          <h3 className="text-lg font-semibold mb-2 text-foreground">Payment Methods</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => formatGHS(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="lg:col-span-2 bg-card text-card-foreground rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Today's Expenses</h3>
            <span className="bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
              Total: <CurrencyDisplay amount={totalExpenses} />
            </span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-[#1f1f1f] text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {expenses.length > 0 ? (
                  expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors">
                      <td className="px-6 py-4 font-medium">{exp.category}</td>
                      <td className="px-6 py-4 text-muted-foreground">{exp.description}</td>
                      <td className="px-6 py-4 text-right font-medium"><CurrencyDisplay amount={exp.amount} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">No expenses recorded today.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </PageLayout>
  );
}
