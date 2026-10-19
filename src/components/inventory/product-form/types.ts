export type SellMode = 'unit_only' | 'pack_only' | 'flexible';

/** A packaging tier as edited in the form. Numbers are kept as strings while typing. */
export interface TierRow {
  key: string; // stable React key
  id?: string; // server id (present when editing an existing tier)
  name: string;
  units_per_tier: string;
  is_base_unit: boolean;
  is_default_sale_unit: boolean;
  is_default_purchase_unit: boolean;
  retail_price: string;
  wholesale_price: string;
}

/** A variant's image: an already-uploaded gallery URL, or a gallery file that is uploaded on save. */
export type ImageRef = { kind: 'url'; url: string } | { kind: 'file'; fileId: string } | null;

export interface VariantRow {
  key: string;
  id?: string; // server id when editing
  sku: string;
  skuEdited: boolean; // true once the user typed a SKU; generation then leaves it alone
  variant_attributes: Record<string, string>;
  base_unit_name: string;
  stock_quantity: string;
  cost_price_per_base_unit: string;
  low_stock_threshold: string;
  sell_mode: SellMode;
  track_expiry: boolean;
  packaging_tiers: TierRow[];
  image: ImageRef;
  isExpanded: boolean;
}

export interface AttributeRow {
  key: string;
  name: string;
  values: string;
}

export interface GalleryImage {
  ref: Exclude<ImageRef, null>;
  src: string;
}

export interface RowErrors {
  sku?: string;
  retail?: string;
}

export interface FormErrors {
  name?: string;
  category?: string;
  simple?: RowErrors;
  variants: Record<string, RowErrors>;
  general?: string;
}
