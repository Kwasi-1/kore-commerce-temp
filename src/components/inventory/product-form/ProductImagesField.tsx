import React, { useRef, useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { cn } from '@/lib/utils';
import type { GalleryItem } from './types';
import { discardUpload, newKey } from './utils';

interface Props {
  items: GalleryItem[];
  setItems: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  max?: number;
  maxSizeMb?: number;
}

const errorMessage = (e: any) => e?.response?.data?.error?.message || (e?.code === 'ERR_NETWORK' ? 'No connection' : 'Upload failed');

/**
 * Product photos. Each picked image uploads straight away, showing progress and a retry on
 * failure, so problems are fixed before the product is saved. The first image is the main photo.
 */
export default function ProductImagesField({ items, setItems, max = 6, maxSizeMb = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const patch = (key: string, p: Partial<GalleryItem>) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const upload = async (key: string, file: File) => {
    patch(key, { status: 'uploading', error: undefined });
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await apiClient.post('/tenant/uploads/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url: string = r.data?.success?.data?.upload?.url;
      if (!url) throw new Error('No URL returned');
      setItems((prev) => {
        // Removed while uploading: throw the upload away
        if (!prev.some((i) => i.key === key)) {
          discardUpload(url);
          return prev;
        }
        return prev.map((i) => (i.key === key ? { ...i, url, status: 'done', isNew: true } : i));
      });
    } catch (e) {
      patch(key, { status: 'error', error: errorMessage(e) });
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const room = max - items.length;
    const files = Array.from(list);
    if (room <= 0) {
      toast.error(`You can add up to ${max} photos`);
      return;
    }
    const accepted: GalleryItem[] = [];
    const rejected: string[] = [];
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) rejected.push(`${file.name} isn't an image`);
      else if (file.size > maxSizeMb * 1024 * 1024) rejected.push(`${file.name} is over ${maxSizeMb} MB`);
      else if (accepted.length < room) accepted.push({ key: newKey(), preview: URL.createObjectURL(file), file, status: 'uploading' });
    });
    if (files.length - rejected.length > room) toast.error(`Only ${room} more photo${room === 1 ? '' : 's'} can be added (max ${max})`);
    if (rejected.length) toast.error(rejected[0] + (rejected.length > 1 ? ` (+${rejected.length - 1} more)` : ''));
    if (!accepted.length) return;
    setItems((prev) => [...prev, ...accepted]);
    accepted.forEach((i) => upload(i.key, i.file!));
  };

  const remove = (item: GalleryItem) => {
    setItems((prev) => prev.filter((i) => i.key !== item.key));
    if (item.isNew && item.url) discardUpload(item.url); // saved product images are released on save instead
  };

  const makeMain = (item: GalleryItem) => setItems((prev) => [item, ...prev.filter((i) => i.key !== item.key)]);

  const full = items.length >= max;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {items.map((item, idx) => (
          <div key={item.key} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/40">
            <img src={item.url || item.preview} alt="" className={cn('h-full w-full object-cover', item.status !== 'done' && 'opacity-50')} />

            {idx === 0 && item.status === 'done' && (
              <span className="absolute left-1 top-1 rounded bg-foreground/80 px-1.5 py-0.5 text-[9px] font-semibold text-background">Main</span>
            )}

            {item.status === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon icon="lucide:loader-2" className="animate-spin text-xl text-foreground" />
              </div>
            )}

            {item.status === 'error' && (
              <button
                type="button"
                onClick={() => item.file && upload(item.key, item.file)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-destructive/10 text-destructive"
                title={item.error}
              >
                <Icon icon="lucide:rotate-cw" className="text-lg" />
                <span className="text-[10px] font-semibold">Retry</span>
              </button>
            )}

            <div className="absolute right-1 top-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
              {idx > 0 && item.status === 'done' && (
                <button
                  type="button"
                  onClick={() => makeMain(item)}
                  className="h-6 w-6 inline-flex items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                  aria-label="Make main photo"
                  title="Make main photo"
                >
                  <Icon icon="lucide:star" className="text-[12px]" />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(item)}
                className="h-6 w-6 inline-flex items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:text-destructive"
                aria-label="Remove photo"
                title="Remove"
              >
                <Icon icon="lucide:x" className="text-[12px]" />
              </button>
            </div>
          </div>
        ))}

        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              'aspect-square rounded-lg border border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors',
              items.length === 0 && 'col-span-3 sm:col-span-4 md:col-span-6 aspect-auto h-28',
              dragging ? 'border-primary bg-primary/5 text-foreground' : 'border-foreground/20 hover:bg-muted/40 hover:text-foreground',
            )}
          >
            <Icon icon="lucide:image-plus" className="text-xl" />
            <span className="text-[11px] font-medium">{items.length === 0 ? 'Add photos — click or drop here' : 'Add'}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <p className="text-[11px] text-muted-foreground">
        {items.length}/{max} · first photo is the main one
      </p>
    </div>
  );
}
