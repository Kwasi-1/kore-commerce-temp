import { useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { simpleSearch } from "@/lib/searchUtils";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export default function CreatableCategorySelect({
  value,
  onChange,
  categories,
  onAddCategory,
  error,
  id,
}: {
  value: string;
  onChange: (val: string) => void;
  categories: string[];
  onAddCategory: (newCat: string) => void;
  error?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    return simpleSearch(categories, search, [(c) => c]);
  }, [categories, search]);

  const exactMatch = categories.some(
    (c) => c.toLowerCase() === search.trim().toLowerCase()
  );

  const handleSelect = (cat: string) => {
    onChange(cat);
    setSearch("");
    setOpen(false);
  };

  const handleCreate = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    onChange(trimmed);
    setSearch("");
    setOpen(false);
  };

  const hasValue = Boolean(value);

  return (
    <div className="relative w-full font-header">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className={cn(
              "w-full text-left rounded-lg border border-input bg-background px-3.5 h-[3.5rem] relative flex items-center justify-between transition-all duration-200 outline-none focus:outline-none focus:ring-0",
              open && "border-foreground/30",
              error && "border-destructive"
            )}
          >
            {/* Floating Label */}
            <span
              className={cn(
                "absolute left-3.5 transition-all duration-200 pointer-events-none text-muted-foreground",
                hasValue || open
                  ? "top-2 text-[10px] uppercase font-bold tracking-wider"
                  : "top-1/2 -translate-y-1/2 text-sm"
              )}
            >
              Category <span className="text-red-500">*</span>
            </span>

            {/* Selected Value */}
            <span
              className={cn(
                "text-sm font-semibold text-foreground pt-4 truncate",
                !hasValue && "opacity-0"
              )}
            >
              {value || "Select Category"}
            </span>

            <Icon
              icon="lucide:chevrons-up-down"
              className="text-muted-foreground h-4 w-4 shrink-0 ml-2"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[calc(100vw-2rem)] sm:w-[320px] p-2 rounded-xl shadow-xl border border-border bg-card z-50"
        >
          {/* Search bar inside popover */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 border border-border rounded-lg bg-muted/20 mb-2">
            <Icon icon="lucide:search" className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or type new category..."
              className="w-full bg-transparent text-xs text-foreground focus:outline-none placeholder:text-muted-foreground"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!exactMatch && search.trim()) {
                    handleCreate();
                  } else if (filtered.length > 0) {
                    handleSelect(filtered[0]);
                  }
                }
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon icon="lucide:x" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filtered.map((cat) => {
              const isSelected = cat.toLowerCase() === value.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors font-medium",
                    isSelected
                      ? "bg-muted font-semibold text-foreground"
                      : "text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="truncate">{cat}</span>
                  {isSelected && <Icon icon="lucide:check" className="h-3.5 w-3.5 shrink-0 text-foreground" />}
                </button>
              );
            })}

            {filtered.length === 0 && !search.trim() && (
              <p className="text-center text-xs text-muted-foreground py-4">
                No categories available.
              </p>
            )}

            {/* Creatable option if typed text is new */}
            {search.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-foreground font-medium bg-muted/40 hover:bg-muted border border-dashed border-border mt-1.5 transition-colors"
              >
                <Icon icon="lucide:plus" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  Create <strong className="font-semibold text-foreground">"{search.trim()}"</strong>
                </span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && <span className="text-destructive text-xs mt-1 block">{error}</span>}
    </div>
  );
}
