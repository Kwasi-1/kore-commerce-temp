import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CustomInputTextField,
  CustomSelectField,
  CustomTextareaField
} from "@/components/shared/text-field";
import { FileUpload, UploadedFile } from "@/components/ui/file-upload";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Switch } from "@/components/ui/switch";
import apiClient from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { PillSidebar } from "../shared/pill-sidebar";
import CustomModal from "@/components/modals/modal";
import CreatableCategorySelect from "./product-form/CategorySelect";
import PriceInput from "./product-form/PriceInput";
import TiersEditor from "./product-form/TiersEditor";
import VariantsTable from "./product-form/VariantsTable";
import SellModePicker from "./product-form/SellModePicker";
import type { AttributeRow, FormErrors, GalleryImage, ImageRef, SellMode, TierRow, VariantRow } from "./product-form/types";
import {
  blurOnWheel,
  cartesian,
  comboKey,
  enterToNextField,
  generateSimpleSku,
  generateVariantSku,
  hasErrors,
  makeBaseTier,
  marginInfo,
  namePrefix,
  newKey,
  parseOptions,
  randomCode,
  saleTierIndex,
  setSaleTierRetail,
  tiersFromServer,
  tiersToPayload,
  toNum,
  validateForm,
  variantLabel,
} from "./product-form/utils";

export interface ProductSaveResult {
  productId: string;
  created: boolean;
  /** Set when the product saved but a follow-up step (images) failed. */
  warning?: string;
}

interface ProductFormProps {
  /** Full product (with variants) when editing, as returned by GET /tenant/products/:id. */
  initialData?: any;
  onSuccess: (result: ProductSaveResult) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const DEFAULT_CATEGORIES = ["Beverages", "Bakery", "Dairy", "Grocery", "Fashion", "Electronics", "Snacks", "General"];

const emptyErrors: FormErrors = { variants: {} };

const newAttribute = (name = ""): AttributeRow => ({ key: newKey(), name, values: "" });

export default function ProductForm({ initialData, onSuccess, onCancel, onDirtyChange }: ProductFormProps) {
  const isEditing = !!initialData;
  const [isSaving, setIsSaving] = useState(false);

  // ── Section navigation ──────────────────────────────────────────────────
  const basicInfoRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("basic");
  const sidebarOptions = [
    { key: "basic", label: "Basic Info" },
    { key: "images", label: "Images" },
    { key: "config", label: "Variants" },
    { key: "pricing", label: "Pricing & Stock" },
  ];
  const refsMap: Record<string, React.RefObject<HTMLDivElement>> = {
    basic: basicInfoRef,
    images: imagesRef,
    config: configRef,
    pricing: pricingRef,
  };
  const handleNavClick = (key: string) => {
    setActiveSection(key);
    refsMap[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Basic info ──────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [status, setStatus] = useState("active");
  const [hasVariants, setHasVariants] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const addCurrentTag = () => {
    const trimmed = tagInput.trim().replace(/^[#,]+|[#,]+$/g, "");
    if (!trimmed) return;
    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" is already added.`);
      setTagInput("");
      return;
    }
    setTags(prev => [...prev, trimmed]);
    setTagInput("");
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCurrentTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  // Settings
  const { tenant } = useAuthStore();
  const [trackExpiryEnabled, setTrackExpiryEnabled] = useState(tenant?.track_expiry_enabled || false);

  // ── Simple product ──────────────────────────────────────────────────────
  const [baseUnitName, setBaseUnitName] = useState("unit");
  const [simpleSku, setSimpleSku] = useState("");
  const [simpleSellMode, setSimpleSellMode] = useState<SellMode>("unit_only");
  const [simpleStock, setSimpleStock] = useState("");
  const [simpleCostPrice, setSimpleCostPrice] = useState("");
  const [simpleLowStock, setSimpleLowStock] = useState("5");
  const [simpleTrackExpiry, setSimpleTrackExpiry] = useState(false);
  const [simpleTiers, setSimpleTiers] = useState<TierRow[]>(() => [makeBaseTier("unit")]);
  const [showSimplePacks, setShowSimplePacks] = useState(false);

  // ── Variants ────────────────────────────────────────────────────────────
  const [attributes, setAttributes] = useState<AttributeRow[]>([newAttribute("Size")]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const skuCodeRef = useRef(randomCode(3)); // keeps generated variant SKUs unique per product
  const variantSkuPrefix = `${namePrefix(name)}-${skuCodeRef.current}`;

  // ── Validation / confirmations ──────────────────────────────────────────
  const [errors, setErrors] = useState<FormErrors>(emptyErrors);
  const [pendingRegen, setPendingRegen] = useState<{ next: VariantRow[]; removed: VariantRow[]; added: number } | null>(null);
  const [belowCostItems, setBelowCostItems] = useState<string[] | null>(null);

  // ── Load reference data ─────────────────────────────────────────────────
  useEffect(() => {
    apiClient.get("/tenant/products/categories").then((res) => {
      const fetched: string[] = res.data.success?.data?.categories || [];
      setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...fetched])).sort());
    }).catch(() => {});

    apiClient.get("/tenant/products/brands").then((res) => {
      setBrandOptions(res.data.success?.data?.brands || []);
    }).catch(() => setBrandOptions([]));

    apiClient.get("/tenant/settings").then((res) => {
      const storeData = res.data.success?.data?.store || {};
      setTrackExpiryEnabled(storeData.track_expiry_enabled || false);
    }).catch(() => {});
  }, []);

  // ── Populate from the product being edited (already fetched by the page) ─
  const [ready, setReady] = useState(!isEditing);
  useEffect(() => {
    if (!initialData) return;
    const p = initialData;
    setName(p.name || "");
    setDescription(p.description || "");
    setCategory(p.category || "");
    setBrand(p.brand || "");
    setStatus(p.status || "active");
    setHasVariants(!!p.has_variants);
    setTags(
      Array.isArray(p.tags)
        ? p.tags.filter(Boolean)
        : typeof p.tags === "string" && p.tags.trim()
          ? p.tags.split(/[|,]/).map((t: string) => t.trim()).filter(Boolean)
          : []
    );
    setUploadedFiles((p.images || []).map((url: string) => ({ id: url, file: new File([], "existing_image"), preview: url })));

    // Only active variants are edited; removed (deactivated) ones stay hidden
    const active = (p.variants || []).filter((v: any) => v.is_active !== false);
    const unit = active[0]?.base_unit_name || "unit";
    setBaseUnitName(unit);

    if (!p.has_variants) {
      const v = active[0];
      if (v) {
        setSimpleSku(v.sku || "");
        setSimpleSellMode(v.sell_mode || "unit_only");
        setSimpleStock(v.stock_quantity?.toString() ?? "0");
        setSimpleCostPrice(v.cost_price_per_base_unit?.toString() ?? "");
        setSimpleLowStock(v.low_stock_threshold?.toString() ?? "5");
        setSimpleTrackExpiry(!!v.track_expiry);
        const tiers = tiersFromServer(v.packaging_tiers, unit);
        setSimpleTiers(tiers);
        setShowSimplePacks(tiers.length > 1 || tiers.some(t => t.wholesale_price));
      }
    } else {
      setVariants(active.map((v: any): VariantRow => ({
        key: newKey(),
        id: v.id,
        sku: v.sku || "",
        skuEdited: true,
        variant_attributes: v.variant_attributes || {},
        base_unit_name: v.base_unit_name || "unit",
        stock_quantity: v.stock_quantity?.toString() ?? "0",
        cost_price_per_base_unit: v.cost_price_per_base_unit?.toString() ?? "",
        low_stock_threshold: v.low_stock_threshold?.toString() ?? "5",
        sell_mode: v.sell_mode || "unit_only",
        track_expiry: !!v.track_expiry,
        packaging_tiers: tiersFromServer(v.packaging_tiers, v.base_unit_name || "unit"),
        image: v.image_url ? { kind: "url", url: v.image_url } : null,
        isExpanded: false,
      })));

      const attrMap = new Map<string, string[]>();
      active.forEach((v: any) => {
        Object.entries(v.variant_attributes || {}).forEach(([key, val]) => {
          const list = attrMap.get(key) || [];
          if (!list.some(x => x.toLowerCase() === String(val).toLowerCase())) list.push(String(val));
          attrMap.set(key, list);
        });
      });
      const loaded = Array.from(attrMap.entries()).map(([key, vals]) => ({ key: newKey(), name: key, values: vals.join(", ") }));
      setAttributes(loaded.length ? loaded : [newAttribute("Size")]);
    }
    setReady(true);
  }, [initialData]);

  // ── Unsaved-changes tracking ────────────────────────────────────────────
  const snapshot = useMemo(
    () =>
      JSON.stringify({
        name, description, category, brand, status, hasVariants, tags,
        files: uploadedFiles.map(f => f.id),
        baseUnitName, simpleSku, simpleSellMode, simpleStock, simpleCostPrice, simpleLowStock, simpleTrackExpiry, simpleTiers,
        attributes: attributes.map(a => [a.name, a.values]),
        variants: variants.map(v => ({ ...v, isExpanded: undefined, key: undefined })), // UI-only fields don't count
      }),
    [name, description, category, brand, status, hasVariants, tags, uploadedFiles, baseUnitName, simpleSku, simpleSellMode,
      simpleStock, simpleCostPrice, simpleLowStock, simpleTrackExpiry, simpleTiers, attributes, variants]
  );
  const baselineRef = useRef<string | null>(null);
  useEffect(() => {
    if (ready && baselineRef.current === null) baselineRef.current = snapshot;
  }, [ready, snapshot]);
  const isDirty = ready && baselineRef.current !== null && snapshot !== baselineRef.current;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Generated variant SKUs follow the product name until the user edits them
  useEffect(() => {
    if (!hasVariants) return;
    setVariants(prev => {
      let changed = false;
      const next = prev.map(v => {
        if (v.id || v.skuEdited) return v;
        const sku = generateVariantSku(variantSkuPrefix, Object.values(v.variant_attributes));
        if (sku === v.sku) return v;
        changed = true;
        return { ...v, sku };
      });
      return changed ? next : prev;
    });
  }, [variantSkuPrefix, hasVariants]);

  // ── Gallery (existing URLs + newly added files) ─────────────────────────
  const gallery: GalleryImage[] = useMemo(
    () =>
      uploadedFiles.map(f => ({
        ref: f.file.size > 0 ? { kind: "file" as const, fileId: f.id } : { kind: "url" as const, url: f.id },
        src: f.preview || f.id,
      })),
    [uploadedFiles]
  );

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    const newIds = new Set(newFiles.map(f => f.id));
    const removed = uploadedFiles.filter(f => !newIds.has(f.id));
    removed.forEach(f => {
      if (f.file.size === 0 && (f.id.startsWith("http") || f.id.includes("/"))) {
        setRemovedImageUrls(prev => [...prev, f.id]);
      }
    });
    if (removed.length) {
      const gone = new Set(removed.map(f => f.id));
      const stillThere = (ref: ImageRef) => !ref || !gone.has(ref.kind === "url" ? ref.url : ref.fileId);
      setVariants(prev => prev.map(v => (stillThere(v.image) ? v : { ...v, image: null })));
    }
    setUploadedFiles(newFiles);
  };

  // ── Attribute builder ───────────────────────────────────────────────────
  const updateAttribute = (key: string, field: "name" | "values", value: string) =>
    setAttributes(prev => prev.map(a => (a.key === key ? { ...a, [field]: value } : a)));

  const addAttribute = () => {
    if (attributes.length >= 3) {
      toast.error("Up to 3 options (e.g. Flavour, Size, Colour)");
      return;
    }
    setAttributes(prev => [...prev, newAttribute()]);
  };

  /**
   * Build the variant list from the options. Existing rows (prices, SKUs, images, ids) are kept,
   * new combinations are added, and rows that no longer match are only removed after confirmation.
   */
  const generateVariants = () => {
    const valid = attributes
      .map(a => ({ name: a.name.trim(), options: parseOptions(a.values) }))
      .filter(a => a.name && a.options.length);
    if (valid.length === 0) {
      toast.error("Add an option name and at least one value, e.g. Flavour: Mango, Pineapple");
      return;
    }
    const names = valid.map(a => a.name);
    if (new Set(names.map(n => n.toLowerCase())).size !== names.length) {
      toast.error("Each option needs a different name");
      return;
    }

    const combos = cartesian(valid.map(a => a.options));
    const existing = new Map(variants.map(v => [comboKey(Object.values(v.variant_attributes)), v]));
    let added = 0;
    const next: VariantRow[] = combos.map(combo => {
      const attrs = Object.fromEntries(names.map((n, i) => [n, combo[i]]));
      const old = existing.get(comboKey(combo));
      if (old) {
        return {
          ...old,
          variant_attributes: attrs,
          sku: old.id || old.skuEdited ? old.sku : generateVariantSku(variantSkuPrefix, combo),
        };
      }
      added += 1;
      return {
        key: newKey(),
        sku: generateVariantSku(variantSkuPrefix, combo),
        skuEdited: false,
        variant_attributes: attrs,
        base_unit_name: baseUnitName || "unit",
        stock_quantity: "",
        cost_price_per_base_unit: "",
        low_stock_threshold: "5",
        sell_mode: "unit_only",
        track_expiry: false,
        packaging_tiers: [makeBaseTier(baseUnitName || "unit")],
        image: null,
        isExpanded: false,
      };
    });
    const keep = new Set(next.map(v => v.key));
    const removed = variants.filter(v => !keep.has(v.key));

    if (removed.length > 0) {
      setPendingRegen({ next, removed, added });
      return;
    }
    applyVariants(next, added, 0);
  };

  const applyVariants = (next: VariantRow[], added: number, removed: number) => {
    setVariants(next);
    setPendingRegen(null);
    setErrors(e => ({ ...e, general: undefined }));
    if (added || removed) {
      toast.success(
        [added && `${added} variant${added === 1 ? "" : "s"} added`, removed && `${removed} removed`].filter(Boolean).join(", ")
      );
    } else {
      toast("Variants already match these options");
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const scrollToField = (id: string | null) => {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement) setTimeout(() => el.focus({ preventScroll: true }), 300);
  };

  const belowCostList = () => {
    if (!hasVariants) {
      const t = simpleTiers[saleTierIndex(simpleTiers)];
      const m = marginInfo(t?.retail_price, simpleCostPrice, t?.is_base_unit ? 1 : t?.units_per_tier);
      return m?.below ? [name || "This product"] : [];
    }
    return variants
      .filter(v => {
        const t = v.packaging_tiers[saleTierIndex(v.packaging_tiers)];
        return marginInfo(t?.retail_price, v.cost_price_per_base_unit, t?.is_base_unit ? 1 : t?.units_per_tier)?.below;
      })
      .map(variantLabel);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const result = validateForm({ name, category, hasVariants, simpleTiers, variants });
    setErrors(result.errors);
    if (hasErrors(result.errors)) {
      toast.error(result.summary.join(" · "));
      scrollToField(result.firstErrorId);
      return;
    }
    const below = belowCostList();
    if (below.length > 0) {
      setBelowCostItems(below);
      return;
    }
    await save();
  };

  const save = async () => {
    setBelowCostItems(null);
    setIsSaving(true);
    const unit = (baseUnitName || "unit").trim() || "unit";
    const payload: Record<string, any> = {
      name: name.trim(),
      description: description?.trim() || "",
      category,
      brand: brand.trim() || null,
      status,
      tags: tags.map(t => t.trim()).filter(Boolean),
      has_variants: hasVariants,
    };
    if (hasVariants) {
      payload.variants = variants.map(v => {
        const vUnit = (v.base_unit_name || unit).trim() || "unit";
        return {
          ...(v.id ? { id: v.id } : { stock_quantity: toNum(v.stock_quantity) ?? 0 }),
          sku: v.sku.trim(),
          variant_attributes: v.variant_attributes,
          base_unit_name: vUnit,
          cost_price_per_base_unit: toNum(v.cost_price_per_base_unit),
          sell_mode: v.sell_mode,
          low_stock_threshold: toNum(v.low_stock_threshold) ?? 5,
          track_expiry: v.track_expiry,
          image_url: v.image?.kind === "url" ? v.image.url : null,
          packaging_tiers: tiersToPayload(v.packaging_tiers, vUnit),
        };
      });
    } else {
      payload.variant = {
        sku: simpleSku.trim(),
        base_unit_name: unit,
        cost_price_per_base_unit: toNum(simpleCostPrice),
        ...(isEditing ? {} : { stock_quantity: toNum(simpleStock) ?? 0 }),
        sell_mode: simpleSellMode,
        low_stock_threshold: toNum(simpleLowStock) ?? 5,
        track_expiry: simpleTrackExpiry,
        packaging_tiers: tiersToPayload(simpleTiers, unit),
      };
    }

    let productId = "";
    try {
      const res = isEditing
        ? await apiClient.put(`/tenant/products/${initialData.id}`, payload)
        : await apiClient.post("/tenant/products", payload);
      productId = res.data?.success?.data?.product?.id || initialData?.id;
    } catch (error: any) {
      setIsSaving(false);
      toast.error(error?.response?.data?.error?.message || error?.message || "Failed to save product");
      return;
    }

    // The product is saved; images are follow-up steps. Failures here must not cause a duplicate on retry.
    let warning: string | undefined;
    try {
      for (const url of isEditing ? removedImageUrls : []) {
        await apiClient.delete(`/tenant/products/${productId}/images`, { data: { imageUrl: url } }).catch(() => {});
      }

      const newFiles = uploadedFiles.filter(f => f.file.size > 0);
      const fileUrl = new Map<string, string>();
      if (newFiles.length > 0) {
        const form = new FormData();
        newFiles.forEach(f => form.append("files", f.file));
        const up = await apiClient.post(`/tenant/products/${productId}/images`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const urls: string[] = up.data?.success?.data?.uploadedUrls || [];
        newFiles.forEach((f, i) => urls[i] && fileUrl.set(f.id, urls[i]));
      }

      const links = hasVariants
        ? variants
          .filter(v => v.image?.kind === "file" && fileUrl.has(v.image.fileId))
          .map(v => ({ sku: v.sku.trim(), image_url: fileUrl.get((v.image as { kind: "file"; fileId: string }).fileId) }))
        : [];
      if (links.length > 0) {
        await apiClient.patch(`/tenant/products/${productId}/variant-images`, { images: links });
      }
    } catch (error: any) {
      warning = `Product saved, but images didn't finish uploading: ${error?.response?.data?.error?.message || error?.message || "unknown error"}. Open it again to retry.`;
    }

    setIsSaving(false);
    baselineRef.current = snapshot; // nothing unsaved any more
    onDirtyChange?.(false);
    onSuccess({ productId, created: !isEditing, warning });
  };

  if (!ready) {
    return (
      <div className="space-y-4 py-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const simpleSale = simpleTiers[saleTierIndex(simpleTiers)];

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full bg-transparent md:py-4 spacing-sm font-header">
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full relative">

        {/* Left column sidebar (sticky on desktop, horizontal scrollable on mobile) */}
        <div className="sticky top-4 lg:top-6 z-30 bg-background/95 backdrop-blur-md lg:border-r lg:border-border/50 lg:pr-4 md:py-2 lg:py-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide shrink-0 w-full lg:w-[17rem] 2xl:w-72">
          <PillSidebar
            options={sidebarOptions}
            activeKey={activeSection}
            onChange={handleNavClick}
            className="w-full font-semibold !tracking-tighter"
            variant="primary"
          />
        </div>

        <div className="flex-1 w-full min-w-0 space-y-6 pb-6">

          {/* SECTION 1: BASIC INFO */}
          <div ref={basicInfoRef} className="scroll-mt-24 border border-border bg-card p-5 md:p-6 rounded-xl space-y-3 md:space-y-5 shadow-sm">
            <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Basic Info</h3>

            <div id="pf-name">
              <CustomInputTextField
                label="Product Name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                required
                error={errors.name}
                placeholder="e.g. Kalypo Juice Drink"
              />
            </div>

            <CustomInputTextField
              label="Brand (Optional)"
              name="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Kalypo — used to group and compare products in reports"
              inputProps={{ list: "product-brand-options", maxLength: 100, autoComplete: "off" }}
            />
            <datalist id="product-brand-options">
              {brandOptions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <CreatableCategorySelect
                id="pf-category"
                value={category}
                onChange={(c) => {
                  setCategory(c);
                  if (errors.category) setErrors(prev => ({ ...prev, category: undefined }));
                }}
                categories={categories}
                error={errors.category}
                onAddCategory={(newCat) => {
                  setCategories((prev) => Array.from(new Set([...prev, newCat])).sort());
                }}
              />

              <CustomSelectField
                label="Status"
                options={[
                  { label: "Active — available for sale", value: "active" },
                  { label: "Draft — hidden from POS & store", value: "draft" },
                ]}
                value={status}
                inputProps={{
                  onSelectionChange: (keys) => setStatus(Array.from(keys)[0] as string || "active")
                }}
                required
              />
            </div>

            <CustomTextareaField
              label="Description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description..."
              rows={3}
            />

            {/* Tags / search keywords */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Search Tags & Keywords <span className="text-[11px] font-normal lowercase tracking-normal text-muted-foreground">(Optional)</span>
                </label>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {tags.length} {tags.length === 1 ? "tag" : "tags"}
                </span>
              </div>

              <div className="min-h-[3.25rem] w-full p-2 rounded-lg border border-input bg-card hover:border-foreground/30 focus-within:border-foreground/50 transition-all duration-200 flex flex-wrap items-center gap-1.5">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground border border-border shadow-2xs group transition-all"
                  >
                    <span className="text-muted-foreground font-mono">#</span>
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => setTags(prev => prev.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive rounded-full p-0.5 hover:bg-muted transition-colors"
                      title={`Remove "${tag}"`}
                      aria-label={`Remove tag ${tag}`}
                    >
                      <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}

                <div className="flex-1 min-w-[150px] flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? "Add keywords for quick POS search (e.g. coke, soda, painkiller)..." : "Add another tag..."}
                    className="w-full bg-transparent text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground/60 py-1 px-1"
                  />
                  {tagInput.trim() && (
                    <button
                      type="button"
                      onClick={addCurrentTag}
                      className="px-2.5 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shrink-0 transition-colors shadow-2xs"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Add keywords or synonyms that make this product quickly searchable at POS checkout. Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">Enter</kbd> or <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">,</kbd> to add.
              </p>
            </div>

            {/* Images */}
            <div ref={imagesRef} className="scroll-mt-24 pt-4 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase">Product Images</label>
                <span className="text-[11px] text-muted-foreground">First image is the main photo{hasVariants ? " · pick one per variant below" : ""}</span>
              </div>
              <FileUpload
                value={uploadedFiles}
                onChange={handleFilesChange}
                accept="image/*"
                maxFiles={6}
              />
            </div>
          </div>

          {/* SECTION 2: VARIANTS TOGGLE */}
          <div ref={configRef} className="scroll-mt-24 border border-border bg-card p-4 md:p-6 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Variants</h3>
            <div className="flex items-center justify-between gap-4 p-4 border border-border dark:border-gray-800 rounded-lg bg-muted/10">
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-foreground">This product comes in different flavours, sizes or colours</label>
                <p className="text-xs text-muted-foreground">
                  {isEditing
                    ? "This can't be changed after the product is created."
                    : "Each variant gets its own SKU, price, stock and image."}
                </p>
              </div>
              <Switch
                checked={hasVariants}
                onCheckedChange={setHasVariants}
                disabled={isEditing}
                aria-label="Product has variants"
              />
            </div>
          </div>

          {/* SECTION 3a: SIMPLE PRODUCT */}
          {!hasVariants ? (
            <div ref={pricingRef} className="scroll-mt-24 border border-border bg-card p-5 md:p-6 rounded-xl space-y-4 md:space-y-5 shadow-sm">
              <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Pricing & Stock</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <CustomInputTextField
                  label="SKU / Barcode"
                  name="sku"
                  value={simpleSku}
                  onChange={(e) => setSimpleSku(e.target.value)}
                  onKeyDown={enterToNextField}
                  placeholder="Scan, type, or leave blank to auto-generate"
                  endContent={
                    <button
                      type="button"
                      onClick={() => setSimpleSku(generateSimpleSku(name))}
                      className="text-muted-foreground/50 hover:text-foreground p-1 rounded transition-colors"
                      title="Generate a SKU"
                      aria-label="Generate a SKU"
                    >
                      <Icon icon="lucide:refresh-cw" className="text-[14px]" />
                    </button>
                  }
                />
                <CustomInputTextField
                  label="Sold per (unit name)"
                  name="baseUnit"
                  value={baseUnitName}
                  onChange={(e) => setBaseUnitName(e.target.value)}
                  placeholder="e.g. bottle, box, piece"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Retail price {simpleSale && !simpleSale.is_base_unit ? `per ${simpleSale.name || "pack"}` : `per ${baseUnitName || "unit"}`} <span className="text-destructive">*</span>
                  </label>
                  <PriceInput
                    id="pf-simple-retail"
                    size="md"
                    value={simpleSale?.retail_price || ""}
                    onChange={(v) => {
                      setSimpleTiers(prev => setSaleTierRetail(prev, v));
                      if (errors.simple?.retail) setErrors(prev => ({ ...prev, simple: undefined }));
                    }}
                    cost={simpleCostPrice}
                    units={simpleSale?.is_base_unit ? 1 : simpleSale?.units_per_tier}
                    error={errors.simple?.retail}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Cost per {baseUnitName || "unit"} (what you pay)</label>
                  <PriceInput
                    size="md"
                    value={simpleCostPrice}
                    onChange={setSimpleCostPrice}
                    placeholder="Optional — needed for profit reports"
                    showMargin={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <CustomInputTextField
                  label={isEditing ? "In stock (locked)" : "Opening stock"}
                  name="stock"
                  type="number"
                  disabled={isEditing}
                  value={simpleStock}
                  onChange={(e) => setSimpleStock(e.target.value)}
                  placeholder="0"
                  inputProps={{ min: "0", step: "any", inputMode: "decimal", disabled: isEditing, onWheel: blurOnWheel }}
                  className={cn(isEditing && "opacity-75 bg-muted/40 cursor-not-allowed text-muted-foreground")}
                />
                <CustomInputTextField
                  label="Low stock alert"
                  name="lowStock"
                  type="number"
                  value={simpleLowStock}
                  onChange={(e) => setSimpleLowStock(e.target.value)}
                  placeholder="5"
                  inputProps={{ min: "0", step: "any", inputMode: "decimal", onWheel: blurOnWheel }}
                />
                {isEditing && (
                  <p className="col-span-2 text-[10px] text-muted-foreground">
                    To change stock on hand, use <span className="font-semibold text-foreground">Stock Adjustments</span>, <span className="font-semibold text-foreground">Stock In</span> or <span className="font-semibold text-foreground">Reconcile</span>.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">How it's sold</label>
                <SellModePicker value={simpleSellMode} onChange={setSimpleSellMode} />
              </div>

              {trackExpiryEnabled && (
                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-foreground">Track expiry dates</label>
                    <p className="text-[10px] text-muted-foreground">Prompts cashiers and tracks batches automatically.</p>
                  </div>
                  <Switch checked={simpleTrackExpiry} onCheckedChange={setSimpleTrackExpiry} />
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowSimplePacks(s => !s)}
                  aria-expanded={showSimplePacks}
                  className="w-full flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left hover:bg-muted/40"
                >
                  <span>
                    <span className="block text-xs font-bold uppercase text-muted-foreground">Packs & wholesale prices</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {simpleTiers.length > 1
                        ? `${simpleTiers.length - 1} pack size${simpleTiers.length > 2 ? "s" : ""} set up`
                        : "Optional — sell by the pack/crate, or set a wholesale price"}
                    </span>
                  </span>
                  <Icon icon={showSimplePacks ? "lucide:chevron-up" : "lucide:chevron-down"} className="text-muted-foreground" />
                </button>
                {showSimplePacks && (
                  <TiersEditor tiers={simpleTiers} onChange={setSimpleTiers} unitName={baseUnitName} cost={simpleCostPrice} />
                )}
              </div>
            </div>
          ) : (

            /* SECTION 3b: VARIANTS */
            <div ref={pricingRef} className="scroll-mt-24 border border-border bg-card p-5 md:p-6 rounded-xl space-y-4 md:space-y-5 shadow-sm">
              <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Variant Options, Pricing & Stock</h3>

              <div className="space-y-3">
                {attributes.map((attr, idx) => {
                  const count = parseOptions(attr.values).length;
                  return (
                    <div key={attr.key} className="flex flex-col md:flex-row gap-3 md:items-end">
                      <div className="flex-1">
                        <CustomInputTextField
                          label={idx === 0 ? "Option name" : undefined}
                          value={attr.name}
                          onChange={(e) => updateAttribute(attr.key, "name", e.target.value)}
                          placeholder="e.g. Flavour, Size, Colour"
                          labelPlacement={idx === 0 ? "inside" : "outside"}
                        />
                      </div>
                      <div className="flex-[2]">
                        <CustomInputTextField
                          label={idx === 0 ? "Values (comma-separated)" : undefined}
                          value={attr.values}
                          onChange={(e) => updateAttribute(attr.key, "values", e.target.value)}
                          placeholder="e.g. Mango, Pineapple, Apple"
                          endContent={count > 0 ? <span className="text-[10px] text-muted-foreground whitespace-nowrap">{count} value{count === 1 ? "" : "s"}</span> : undefined}
                          labelPlacement={idx === 0 ? "inside" : "outside"}
                        />
                      </div>
                      {attributes.length > 1 && (
                        <button
                          type="button"
                          className="p-2 mb-1.5 rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors h-[38px] flex items-center justify-center"
                          onClick={() => setAttributes(prev => prev.filter(a => a.key !== attr.key))}
                          aria-label={`Remove option ${attr.name || idx + 1}`}
                          title="Remove this option"
                        >
                          <Icon icon="lucide:trash-2" className="text-[16px]" />
                        </button>
                      )}
                    </div>
                  );
                })}

                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary gap-1 pl-0 font-bold hover:bg-transparent self-start"
                    onClick={addAttribute}
                  >
                    <Icon icon="fluent:add-12-filled" className="text-[14px]" /> Add another option
                  </Button>
                  <div className="md:ml-auto md:w-64">
                    <CustomInputTextField
                      label="Sold per (unit name)"
                      value={baseUnitName}
                      onChange={(e) => setBaseUnitName(e.target.value)}
                      placeholder="e.g. bottle"
                    />
                  </div>
                </div>
              </div>

              <div id="pf-variants">
                <Button
                  type="button"
                  className="w-full bg-secondary-gray text-foreground border font-bold py-2 rounded-xl"
                  onClick={generateVariants}
                >
                  <Icon icon={variants.length ? "lucide:refresh-cw" : "fluent:settings-20-filled"} className="mr-2 text-lg" />
                  {variants.length ? "Update variants from options" : "Create variants"}
                </Button>
                <p className={cn("mt-1.5 text-[11px]", errors.general ? "text-destructive font-semibold" : "text-muted-foreground")}>
                  {errors.general || (variants.length
                    ? "Adds new combinations and keeps the prices, SKUs and images you've already entered."
                    : "One variant is created for each combination of values.")}
                </p>
              </div>

              {variants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase !tracking-wider">
                    Variants ({variants.length})
                  </label>
                  <VariantsTable
                    variants={variants}
                    onChange={(rows) => {
                      setVariants(rows);
                      if (Object.keys(errors.variants).length) setErrors(prev => ({ ...prev, variants: {} }));
                    }}
                    errors={errors.variants}
                    isEditing={isEditing}
                    gallery={gallery}
                    trackExpiryEnabled={trackExpiryEnabled}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer so Save stays reachable on long variant lists */}
      <div className="sticky bottom-0 z-30 -mx-1 px-1 py-3 bg-background/95 backdrop-blur border-t border-border dark:border-gray-800 flex items-center justify-end gap-3">
        {isDirty && <span className="mr-auto text-[11px] text-muted-foreground hidden sm:block">Unsaved changes</span>}
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
          className="font-medium px-6 rounded-full"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-primary text-primary-foreground font-bold px-6 rounded-full"
        >
          {isSaving ? "Saving…" : isEditing ? "Save Changes" : "Create Product"}
        </Button>
      </div>

      {/* Confirm removing variants that no longer match the options */}
      <CustomModal
        isOpen={!!pendingRegen}
        onOpenChange={() => setPendingRegen(null)}
        size="md"
        header={
          <div className="pt-2 px-2 border-b border-border/60 pb-3">
            <h2 className="text-lg font-bold !tracking-tight">Remove {pendingRegen?.removed.length} variant{pendingRegen?.removed.length === 1 ? "" : "s"}?</h2>
            <p className="text-xs md:text-[13px] text-muted-foreground">These no longer match your options{isEditing ? " — they'll be hidden from sale, but their sales history is kept" : ""}.</p>
          </div>
        }
        body={
          <ul className="py-2 space-y-1 max-h-60 overflow-y-auto">
            {pendingRegen?.removed.map(v => (
              <li key={v.key} className="flex items-center justify-between text-sm rounded-md bg-muted/40 px-3 py-1.5">
                <span className="capitalize">{variantLabel(v)}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{v.sku}</span>
              </li>
            ))}
          </ul>
        }
        footer={
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <Button variant="outline" size="sm" type="button" onClick={() => setPendingRegen(null)}>
              Keep them
            </Button>
            <Button
              size="sm"
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
              onClick={() => pendingRegen && applyVariants(pendingRegen.next, pendingRegen.added, pendingRegen.removed.length)}
            >
              Remove & update
            </Button>
          </div>
        }
      />

      {/* Confirm saving with prices below cost */}
      <CustomModal
        isOpen={!!belowCostItems}
        onOpenChange={() => setBelowCostItems(null)}
        size="md"
        header={
          <div className="pt-2 px-2 border-b border-border/60 pb-3">
            <h2 className="text-lg font-bold !tracking-tight">Selling below cost?</h2>
            <p className="text-xs md:text-[13px] text-muted-foreground">The retail price is lower than what you pay for:</p>
          </div>
        }
        body={
          <ul className="py-2 space-y-1 max-h-60 overflow-y-auto">
            {belowCostItems?.map(label => (
              <li key={label} className="text-sm rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-1.5 capitalize">{label}</li>
            ))}
          </ul>
        }
        footer={
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <Button variant="outline" size="sm" type="button" onClick={() => setBelowCostItems(null)}>
              Fix prices
            </Button>
            <Button size="sm" type="button" className="bg-primary text-primary-foreground font-semibold" onClick={save} disabled={isSaving}>
              Save anyway
            </Button>
          </div>
        }
      />
    </form>
  );
}
