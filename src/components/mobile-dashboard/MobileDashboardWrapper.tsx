import React from 'react';
import { cn } from '@/lib/utils';

interface MobileDashboardWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** The page shows its desktop layout from "sm" (640px, tablets) instead of "md" (see PageLayout desktopFrom) */
  desktopFrom?: 'sm' | 'md';
}

export const MobileDashboardWrapper: React.FC<MobileDashboardWrapperProps> = ({
  children,
  className,
  desktopFrom = 'md',
}) => {
  return (
    <div className={cn("block space-y-0 -mb-10 -mx-4 -mt-2 bg-action-bridge", desktopFrom === 'sm' ? 'desk:hidden' : 'md:hidden', className)}>
      {children}
    </div>
  );
};

export default MobileDashboardWrapper;
