import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import type { UnsavedChangesGuard } from '@/hooks/useUnsavedChanges';

interface Props {
  guard: UnsavedChangesGuard;
  count: number;
  saving: boolean;
  onDiscard: () => void;
  /** Resolves true when everything saved */
  onSave: () => Promise<boolean>;
  /** For the leave prompt, e.g. "your POS settings" */
  subject: string;
}

/**
 * The floating save bar (only while there are changes) and the "Save your changes?" prompt when
 * leaving. Place it last inside the page's content so the bar sticks to the bottom of the view.
 */
export default function UnsavedChanges({ guard, count, saving, onDiscard, onSave, subject }: Props) {
  const changes = `${count} unsaved change${count === 1 ? '' : 's'}`;
  return (
    <>
      {count > 0 && (
        <div className="sticky bottom-4 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200 mx-2 sm:mx-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-full border border-border bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
            <p className="text-sm text-foreground min-w-0 pl-3 sm:pl-4">{changes}</p>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="ghost" disabled={saving} onClick={onDiscard}>
                Discard
              </Button>
              <Button type="button" disabled={saving} onClick={onSave} className="font-semibold px-5">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CustomModal
        isOpen={!!guard.pendingLeave}
        onOpenChange={() => !saving && guard.stay()}
        size="sm"
        classNames={{
          base: "w-[360px] rounded-3xl",
        }}
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-2">
            <h3 className="text-base font-bold text-foreground">Save your changes?</h3>
          </div>
        }
        body={
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              You have {changes} to {subject}.
            </p>
          </div>
        }
        footer={
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={saving}
              onClick={() => {
                onDiscard();
                guard.leave();
              }}
              className="font-medium"
            >
              Discard
            </Button>
            <Button
              size="sm"
              type="button"
              variant='neutral'
              disabled={saving}
              onClick={async () => {
                if (await onSave()) guard.leave();
              }}
              className="font-semibold"
            >
              {saving ? 'Saving…' : 'Save and leave'}
            </Button>
          </div>
        }
      />
    </>
  );
}
