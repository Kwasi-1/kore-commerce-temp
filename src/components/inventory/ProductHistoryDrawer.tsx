import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import CustomModal from "@/components/modals/modal";
import { ProductChangesList } from "@/components/inventory/ProductHistoryPanels";

interface ProductHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Products page "History": every product created or changed, by whom, and what changed. */
export function ProductHistoryDrawer({ isOpen, onClose }: ProductHistoryDrawerProps) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  // Search once typing pauses
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSearch("");
    }
  }, [isOpen]);

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="md"
      placement="right"
      scrollBehavior="inside"
      classNames={{
        base: "min-w-[calc(100%-0.75rem)] sm:w-[500px] md:w-[540px] scrollbar-hide",
      }}
      header={
        <div className="pt-2 px-1 border-b border-border/50 pb-3 space-y-2.5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Product History</h2>
            <p className="text-[12px] text-muted-foreground font-normal mt-0.5 leading-normal">
              Who added or changed products, and what changed. Stock changes are in each product's stock history.
            </p>
          </div>
          <div className="relative">
            <Icon
              icon="solar:magnifer-linear"
              className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      }
      body={<div className="py-3">{isOpen && <ProductChangesList search={search} showProduct />}</div>}
    />
  );
}
