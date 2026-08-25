import React from 'react';
import { cn } from '@/lib/utils';

export interface MobileActionItem {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export interface MobileActionCapsuleBarProps {
  actions: MobileActionItem[];
  className?: string;
}

export const MobileActionCapsuleBar: React.FC<MobileActionCapsuleBarProps> = ({
  actions,
  className,
}) => {
  return (
    <div className={cn("bg-action-bridge text-white py-3 px-3 flex items-center justify-around shadow-xl gap-1", className)}>
      {actions.map((action, idx) => (
        <button
          key={action.id || action.label || idx}
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className={cn(
            "action-pill-button flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all",
            action.disabled && "opacity-50 pointer-events-none",
            action.className
          )}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default MobileActionCapsuleBar;
