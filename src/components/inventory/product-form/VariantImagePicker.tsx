import { useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { GalleryImage, ImageRef } from './types';
import { imageSrc } from './utils';

interface Props {
  value: ImageRef;
  gallery: GalleryImage[];
  onChange: (ref: ImageRef) => void;
  label: string;
  size?: 'sm' | 'md';
}

const sameRef = (a: ImageRef, b: ImageRef) =>
  !!a && !!b && (a.kind === 'url' && b.kind === 'url' ? a.url === b.url : a.kind === 'file' && b.kind === 'file' && a.fileId === b.fileId);

/** Pick this variant's photo from the product gallery (no separate uploads per variant). */
export default function VariantImagePicker({ value, gallery, onChange, label, size = 'sm' }: Props) {
  const [open, setOpen] = useState(false);
  const src = imageSrc(value, gallery);
  const main = gallery[0]?.src || null;
  const box = size === 'md' ? 'h-14 w-14' : 'h-9 w-9';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Choose image for ${label}`}
          title={src ? 'Change image' : 'Uses the main product image — click to pick one'}
          className={cn(
            box,
            'relative shrink-0 rounded-lg border overflow-hidden flex items-center justify-center bg-muted/40 hover:border-foreground/40 transition-colors',
            src ? 'border-border' : 'border-dashed border-border',
          )}
        >
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : main ? (
            <>
              <img src={main} alt="" className="h-full w-full object-cover opacity-35" />
              <Icon icon="lucide:image-plus" className="absolute text-[14px] text-foreground/70" />
            </>
          ) : (
            <Icon icon="lucide:image-plus" className="text-[14px] text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 bg-card text-card-foreground border-border">
        <p className="text-xs font-semibold mb-2 truncate">Image for {label}</p>
        {gallery.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">
            Add photos under <b>Product Images</b> first, then pick one for each variant.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {gallery.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onChange(g.ref);
                  setOpen(false);
                }}
                className={cn(
                  'aspect-square rounded-md overflow-hidden border-2 transition-colors',
                  sameRef(value, g.ref) ? 'border-primary' : 'border-transparent hover:border-foreground/30',
                )}
                aria-label={`Use image ${i + 1}`}
              >
                <img src={g.src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="mt-2 w-full h-8 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Use main product image
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
