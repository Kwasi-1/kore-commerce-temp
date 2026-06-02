import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ArrowLeft,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle,
  Pause,
  Clock,
  AlertCircle,
  ShoppingBag,
  Eye,
  Tag,
  Layers,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export type ProductStatus = "active" | "draft" | "sold_out" | "paused" | "deleted";

export interface Product {
  id: string;
  name: string;
  price: number;
  comparePrice?: number;
  status: ProductStatus;
  stock_quantity?: number;
  images?: string[];
  thumbnail?: string;
  imageUrl?: string;
  description?: string;
  category?: string;
  minOrderQuantity?: number;
  tags?: string[];
  soldCount?: number;
  viewCount?: number;
  [key: string]: any;
}
import { useCurrency } from "@/hooks";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProductDetailPanelProps {
  product: Product | null;
  isMobile: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDeleteRequest: (product: Product) => void;
  onUpdateStatus: (product: Product, status: "active" | "paused") => void;
  isUpdatingStatus: boolean;
}

const STATUS_CONFIG: Record<
  ProductStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  active: { label: "Active", color: "bg-primary/10 text-primary border border-primary/20", icon: CheckCircle },
  draft: { label: "Draft", color: "bg-muted text-muted-foreground border border-border", icon: Clock },
  sold_out: { label: "Sold Out", color: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertCircle },
  paused: { label: "Paused", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20", icon: Pause },
  deleted: { label: "Deleted", color: "bg-destructive/10 text-destructive border border-destructive/20", icon: AlertCircle },
};

export function ProductDetailPanel({
  product,
  isMobile,
  onClose,
  onEdit,
  onDeleteRequest,
  onUpdateStatus,
  isUpdatingStatus,
}: ProductDetailPanelProps) {
  const { formatAmount } = useCurrency();

  // Reset image index when product changes
  if (!product) return null;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.thumbnail
        ? [product.thumbnail]
        : [];

  const statusConfig = STATUS_CONFIG[product.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const canToggleStatus =
    product.status === "active" || product.status === "paused";

  const handleStatusToggle = (newStatus: "active" | "paused") => {
    if (newStatus === product.status || isUpdatingStatus) return;
    onUpdateStatus(product, newStatus);
  };

  // ── Animation variants ──
  const desktopVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };
  const mobileVariants = {
    hidden: { y: "100%" },
    visible: { y: 0 },
    exit: { y: "100%" },
  };
  const variants = isMobile ? mobileVariants : desktopVariants;

  const panelClass = isMobile
    ? "fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
    : "h-full w-full bg-background flex flex-col overflow-hidden z-10";

  return (
    <AnimatePresence>
      <motion.div
        key={product.id}
        className={panelClass}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          {isMobile ? (
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </button>
          ) : (
            <h3 className="text-base font-semibold text-foreground truncate pr-4 max-w-[80%]">
              {product.name}
            </h3>
          )}
          {!isMobile && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Product info */}
          <div className="p-5 space-y-4">
            {/* Name + status */}
            <div>
              {isMobile && (
              <h2 className="text-base font-semibold text-foreground leading-snug">
                {product.name}
              </h2>
              )}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="focus:outline-none text-left" disabled={!canToggleStatus || isUpdatingStatus}>
                      <Badge className={`${statusConfig.color} flex items-center gap-1 ${canToggleStatus ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </button>
                  </PopoverTrigger>
                  {canToggleStatus && (
                    <PopoverContent align="start" className="w-40 p-2" sideOffset={8}>
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1 px-2">Set Status</p>
                        <button
                          onClick={() => handleStatusToggle("active")}
                          disabled={isUpdatingStatus}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                            product.status === "active"
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Active
                        </button>
                        <button
                          onClick={() => handleStatusToggle("paused")}
                          disabled={isUpdatingStatus}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                            product.status === "paused"
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <Pause className="h-4 w-4" />
                          Paused
                        </button>
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
                <span className="text-xs text-muted-foreground">
                  {product.stock_quantity ?? 0} in stock
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-normal text-muted-foreground">GHS</span>
              <span className="text-xl font-bold text-foreground tracking-tight">
                {formatAmount(product.price)}
              </span>
              {product.comparePrice && (
                <span className="text-sm text-muted-foreground line-through ml-2">
                  {formatAmount(product.comparePrice)}
                </span>
              )}
            </div>

            {/* Image Carousel */}
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 -mx-5 px-4 snap-x snap-mandatory scroll-pl-5">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] w-52 flex-shrink-0 overflow-hidden rounded-lg border border-border snap-start bg-muted"
                  >
                    <img
                      src={img}
                      alt={`${product.name} - ${i + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4">
                  {product.description}
                </p>
              </div>
            )}

            {/* Meta row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Layers className="h-3 w-3" />
                  Category
                </div>
                <p className="text-sm font-medium text-foreground capitalize">
                  {product.category || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Tag className="h-3 w-3" />
                  Min Order
                </div>
                <p className="text-sm font-medium text-foreground">
                  {product.minOrderQuantity ?? 1}
                </p>
              </div>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="text-xs">Sold</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {product.soldCount ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span className="text-xs">Views</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {product.viewCount ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky action bar ── */}
        <div className="flex-shrink-0 border-t border-border bg-background px-5 py-4 space-y-3">
          {/* Edit + Delete */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => onEdit(product)}
            >
              <Edit2 className="h-4 w-4" />
              Edit Product
            </Button>
            <Button
              variant="ghost"
              className=" border-border text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDeleteRequest(product)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
