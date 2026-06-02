import React from 'react';
import { cn } from '@/lib/utils';

export type PaymentMethodType = 'card' | 'cash' | 'mobile_money';

interface PaymentMethodVisualProps {
  method: PaymentMethodType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PaymentMethodVisual({ method, className, size = 'md' }: PaymentMethodVisualProps) {
  const containerSize = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size];

  const spaceClass = {
    sm: '-space-x-2',
    md: '-space-x-2.5',
    lg: '-space-x-2.5',
  }[size];

  if (method === 'card') {
    const circleClass = {
      sm: 'h-4 w-4 border',
      md: 'h-6 w-6 border-[1.5px]',
      lg: 'h-8 w-8 border-2',
    }[size];

    return (
      <div className={cn("flex shrink-0 items-center justify-center", spaceClass, className)}>
        <div className={cn("rounded-full bg-red-500 border-card z-10", circleClass)}></div>
        <div className={cn("rounded-full bg-yellow-400/90 border-card z-10", circleClass)}></div>
      </div>
    );
  }

  if (method === 'cash') {
    return (
      <div className={cn("relative shrink-0 flex items-center justify-center", containerSize, className)}>
        {/* Back bill */}
        <div className="absolute top-[10%] right-[5%] w-[80%] h-[60%] bg-emerald-600 rounded-[2px] rotate-[15deg]"></div>
        {/* Front bill */}
        <div className="absolute bottom-[10%] left-[5%] w-[85%] h-[65%] bg-green-500 rounded-[2px] border border-white/20 -rotate-6 shadow-sm flex items-center justify-center">
           <div className="w-[35%] h-[40%] bg-green-200/60 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (method === 'mobile_money') {
    return (
      <div className={cn("relative shrink-0 flex items-center justify-center", containerSize, className)}>
        <div className="w-[65%] h-[95%] bg-amber-500 rounded-[3px] p-[2px] shadow-sm flex flex-col items-center">
          {/* Screen */}
          <div className="w-full flex-1 bg-amber-50 rounded-[1px]"></div>
          {/* Home button */}
          <div className="w-[30%] h-[10%] bg-amber-700/40 rounded-full mt-[2px] mb-[1px]"></div>
        </div>
      </div>
    );
  }

  return null;
}
