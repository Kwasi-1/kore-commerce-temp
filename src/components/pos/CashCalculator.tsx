import React, { useEffect, useState } from 'react';
import NumPad from './NumPad';

interface CashCalculatorProps {
  totalDue: number;
  onAmountTenderedChange: (amount: number) => void;
}

export default function CashCalculator({ totalDue, onAmountTenderedChange }: CashCalculatorProps) {
  const [tenderedStr, setTenderedStr] = useState('');
  
  const tendered = parseFloat(tenderedStr) || 0;
  const change = Math.max(0, tendered - totalDue);
  const isValid = tendered >= totalDue;

  // Exact amount shortcut
  const handleExactAmount = () => {
    setTenderedStr(totalDue.toString());
  };

  // Common bills shortcuts (assuming GHS - 50, 100, 200)
  const handleAddBill = (amount: number) => {
    setTenderedStr((amount).toString());
  };

  useEffect(() => {
    onAmountTenderedChange(tendered);
  }, [tendered, onAmountTenderedChange]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Input & Shortcuts */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount Tendered
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">GHS</span>
              <input
                type="text"
                value={tenderedStr}
                onChange={(e) => {
                  // Allow numbers and decimal
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setTenderedStr(val);
                }}
                className="w-full pl-12 pr-4 py-3 text-2xl font-bold bg-white dark:bg-pos-dark-panel border border-gray-300 dark:border-pos-dark-border rounded-lg focus:ring-pos-accent focus:border-pos-accent transition-colors text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExactAmount}
              className="py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              Exact ({totalDue.toFixed(2)})
            </button>
            <button
              onClick={() => handleAddBill(50)}
              className="py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              50
            </button>
            <button
              onClick={() => handleAddBill(100)}
              className="py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              100
            </button>
            <button
              onClick={() => handleAddBill(200)}
              className="py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              200
            </button>
          </div>
        </div>

        {/* Right: Change Display */}
        <div className="flex flex-col justify-center items-center bg-gray-50 dark:bg-pos-dark-panel rounded-xl border border-gray-100 dark:border-pos-dark-border p-4">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Change Due</span>
          <span className={`text-4xl font-bold tracking-tight ${isValid ? 'text-green-500' : 'text-gray-400'}`}>
            {change.toFixed(2)}
          </span>
          {!isValid && tendered > 0 && (
            <span className="text-xs text-red-500 mt-2 font-medium">Insufficient amount</span>
          )}
        </div>
      </div>
    </div>
  );
}
