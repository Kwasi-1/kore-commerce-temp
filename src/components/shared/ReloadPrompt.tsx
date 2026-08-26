import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

export const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 15 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('PWA registration error:', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-muted/30 text-muted-foreground flex items-center justify-center shrink-0">
              <Icon icon="solar:stars-minimalistic-bold-duotone" className="text-lg" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Update Available</h4>
              <p className="text-[11px] text-muted-foreground">
                A new version of the app is available.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <Icon icon="solar:close-circle-linear" className="text-base" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-3"
            onClick={handleClose}
          >
            Later
          </Button>
          <Button
            size="sm"
            className="text-xs font-bold h-8 px-3.5 shadow-sm"
            onClick={handleUpdate}
          >
            <Icon icon="solar:restart-circle-linear" className="text-sm mr-1.5 animate-spin" />
            Update Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReloadPrompt;
