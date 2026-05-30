import React, { useState } from 'react';
import { Delete, Check } from 'lucide-react';

interface NumPadProps {
  onComplete: (value: string) => void;
  maxLength?: number;
  mask?: boolean;
}

export default function NumPad({ onComplete, maxLength = 4, mask = true }: NumPadProps) {
  const [value, setValue] = useState('');

  const handlePress = (num: string) => {
    if (value.length < maxLength) {
      setValue((prev) => prev + num);
    }
  };

  const handleClear = () => {
    setValue((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setValue('');
  };

  const handleSubmit = () => {
    if (value.length > 0) {
      onComplete(value);
      setValue('');
    }
  };

  const displayValue = mask ? '•'.repeat(value.length) : value;

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Display */}
      <div className="mb-6 flex h-16 items-center justify-center rounded-xl bg-gray-100 dark:bg-pos-dark-panel text-3xl tracking-[0.5em] font-mono text-gray-900 dark:text-gray-100 shadow-inner">
        {displayValue || <span className="text-gray-400 dark:text-gray-600">----</span>}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handlePress(num.toString())}
            className="flex h-16 items-center justify-center rounded-xl bg-white dark:bg-pos-dark-card text-2xl font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-pos-dark-border"
          >
            {num}
          </button>
        ))}

        {/* Clear Button */}
        <button
          onClick={handleClear}
          onDoubleClick={handleClearAll}
          className="flex h-16 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-500 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all border border-red-100 dark:border-red-900/30"
          aria-label="Delete"
        >
          <Delete className="h-6 w-6" />
        </button>

        {/* Zero */}
        <button
          onClick={() => handlePress('0')}
          className="flex h-16 items-center justify-center rounded-xl bg-white dark:bg-pos-dark-card text-2xl font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-pos-dark-border"
        >
          0
        </button>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={value.length === 0}
          className="flex h-16 items-center justify-center rounded-xl bg-pos-accent text-pos-accent-text font-bold shadow-sm hover:brightness-95 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Submit"
        >
          <Check className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
