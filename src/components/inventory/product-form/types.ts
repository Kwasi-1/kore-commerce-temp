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

/** A variant's image: the URL of one of the product's (already uploaded) gallery photos. */
export type ImageRef = string | null;

/** A product photo in the form. Photos upload as soon as they're picked. */
export interface GalleryItem {
  key: string;
  url?: string; // set once uploaded (or for photos already on the product)
  preview?: string; // local object URL while uploading
  file?: File; // kept for retries
  status: 'uploading' | 'done' | 'error';
  error?: string;
  isNew?: boolean; // uploaded in this session (not yet saved to the product)
}

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
  volume_ml: string; // size of one unit (ml), splits shared batch costs
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
  url: string;
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
