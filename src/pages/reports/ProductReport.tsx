import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DashboardCard from '@/components/ui/dashboard-card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function ProductReport() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  
  const [sortMode, setSortMode] = useState<Set<string>>(new Set(['top_selling']));
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const startStr = dateRange.from?.toISOString();
      const endStr = dateRange.to?.toISOString();
      const sortStr = Array.from(sortMode)[0];
      
      const response = await apiClient.get(
        `/tenant/reports/products?start_date=${startStr}&end_date=${endStr}&sort=${sortStr}`
      );
      
      setReportData(response.data.success.data.products || []);
    } catch (error) {
      console.error('Failed to fetch product report:', error);
      toast.error('Failed to load product report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchReport();
    }
  }, [dateRange, sortMode]);

  const columns = [
    { key: 'name', label: 'Product Name' },
    { key: 'units_sold', label: 'Units Sold' },
    { key: 'revenue', label: 'Total Revenue' },
    { key: 'cogs', label: 'COGS' },
    { key: 'margin', label: 'Gross Margin' }
  ];

  let totalRevenue = 0;
  let totalUnits = 0;
  let averageMargin = 0;
  let validMarginCount = 0;

  const rows = reportData.map((p: any) => {
    totalRevenue += parseFloat(p.revenue || 0);
    totalUnits += parseInt(p.units_sold || 0);
    
    if (p.gross_margin !== null) {
      averageMargin += parseFloat(p.gross_margin);
      validMarginCount++;
    }

    return {
      id: p.id,
      name: (
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</span>
          {p.sku && <span className="text-xs text-gray-500 block">SKU: {p.sku}</span>}
        </div>
      ),
      units_sold: <span className="font-medium">{p.units_sold}</span>,
      revenue: <span className="font-semibold text-green-600">GHS {parseFloat(p.revenue || 0).toFixed(2)}</span>,
      cogs: <span className="text-gray-600 dark:text-gray-400">{p.cost_of_goods !== null ? `GHS ${parseFloat(p.cost_of_goods).toFixed(2)}` : 'N/A'}</span>,
      margin: (
        <span className={`font-semibold ${
          p.gross_margin === null ? 'text-gray-400' :
          parseFloat(p.gross_margin) >= 40 ? 'text-green-600' :
          parseFloat(p.gross_margin) >= 20 ? 'text-yellow-600' : 'text-red-500'
        }`}>
          {p.gross_margin !== null ? `${parseFloat(p.gross_margin).toFixed(1)}%` : 'N/A'}
        </span>
      ),
    };
  });

  const avgMarginFinal = validMarginCount > 0 ? (averageMargin / validMarginCount) : 0;

  return (
    <PageLayout title="Product Performance Report">
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
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Sorted by:</span>
            <select 
              className="bg-transparent font-medium text-pos-accent focus:outline-none border-b border-pos-accent/30 pb-0.5 cursor-pointer"
              value={Array.from(sortMode)[0]}
              onChange={(e) => setSortMode(new Set([e.target.value]))}
            >
              <option value="top_selling">Top Selling (Revenue)</option>
              <option value="slow_movers">Slow Movers</option>
              <option value="margin">Highest Margin</option>
            </select>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardCard
            title="Report Total Revenue"
            value={isLoading ? '...' : `GHS ${totalRevenue.toFixed(2)}`}
            className="border border-gray-100 dark:border-pos-dark-border bg-pos-accent/5"
          />
          <DashboardCard
            title="Total Units Moved"
            value={isLoading ? '...' : totalUnits.toString()}
            className="border border-gray-100 dark:border-pos-dark-border"
          />
          <DashboardCard
            title="Avg. Gross Margin"
            value={isLoading ? '...' : `${avgMarginFinal.toFixed(1)}%`}
            className="border border-gray-100 dark:border-pos-dark-border"
          />
        </div>

        {/* Data Table */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Product Analytics"
          showSearch={true}
          showFilter={false}
          mobileFriendly={true}
        />

      </div>
    </PageLayout>
  );
}
