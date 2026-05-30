import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { UserSquare2 } from 'lucide-react';

export default function CashierReport() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const startStr = dateRange.from?.toISOString();
      const endStr = dateRange.to?.toISOString();
      
      const response = await apiClient.get(
        `/tenant/reports/cashiers?start_date=${startStr}&end_date=${endStr}`
      );
      
      setReportData(response.data.success.data.cashiers || []);
    } catch (error) {
      console.error('Failed to fetch cashier report:', error);
      toast.error('Failed to load cashier metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchReport();
    }
  }, [dateRange]);

  const columns = [
    { key: 'cashier', label: 'Cashier Name' },
    { key: 'transaction_count', label: 'Total Transactions' },
    { key: 'total_sales', label: 'Total Sales (Revenue)' },
    { key: 'avg_transaction', label: 'Avg. Transaction Value' }
  ];

  let totalRevenueAll = 0;
  let totalTransactionsAll = 0;

  const rows = reportData.map((c: any) => {
    totalRevenueAll += parseFloat(c.total_sales || 0);
    totalTransactionsAll += parseInt(c.transaction_count || 0);

    return {
      id: c.staff_id,
      cashier: (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-pos-accent/10 flex items-center justify-center text-pos-accent">
            <UserSquare2 className="w-4 h-4" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</span>
        </div>
      ),
      transaction_count: <span className="font-medium">{c.transaction_count}</span>,
      total_sales: <span className="font-semibold text-green-600">GHS {parseFloat(c.total_sales || 0).toFixed(2)}</span>,
      avg_transaction: <span className="text-gray-600 dark:text-gray-400">GHS {parseFloat(c.avg_transaction || 0).toFixed(2)}</span>,
    };
  });

  const overallAvgValue = totalTransactionsAll > 0 ? (totalRevenueAll / totalTransactionsAll) : 0;

  return (
    <PageLayout title="Cashier Performance">
      <div className="flex flex-col gap-6">
        
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-pos-dark-card p-4 rounded-xl border border-gray-100 dark:border-pos-dark-border">
          <div className="w-full md:w-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1">Date Range</label>
            <DateRangePicker 
              date={dateRange} 
              setDate={(range: any) => setDateRange(range)} 
            />
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardCard
            title="Total Handled Revenue"
            value={isLoading ? '...' : `GHS ${totalRevenueAll.toFixed(2)}`}
            className="border border-gray-100 dark:border-pos-dark-border bg-pos-accent/5"
          />
          <DashboardCard
            title="Total Processed Transactions"
            value={isLoading ? '...' : totalTransactionsAll.toString()}
            className="border border-gray-100 dark:border-pos-dark-border"
          />
          <DashboardCard
            title="Overall Avg. Ticket Size"
            value={isLoading ? '...' : `GHS ${overallAvgValue.toFixed(2)}`}
            className="border border-gray-100 dark:border-pos-dark-border"
          />
        </div>

        {/* Data Table */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Staff Metrics"
          showSearch={true}
          showFilter={false}
          mobileFriendly={true}
        />

      </div>
    </PageLayout>
  );
}
