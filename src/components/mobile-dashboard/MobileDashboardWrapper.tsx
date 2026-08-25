import React from 'react';
import { cn } from '@/lib/utils';

interface MobileDashboardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileDashboardWrapper: React.FC<MobileDashboardWrapperProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("block md:hidden space-y-0 -mb-10 -mx-4 -mt-6 bg-action-bridge", className)}>
      {children}
    </div>
  );
};

export default MobileDashboardWrapper;
