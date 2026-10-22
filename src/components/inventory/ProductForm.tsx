import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CustomInputTextField,
  CustomSelectField,
  CustomTextareaField
} from "@/components/shared/text-field";
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
import TiersEditor from "./product-form/TiersEditor";
import ProductImagesField from "./product-form/ProductImagesField";
import BulkCostHelper from "./product-form/BulkCostHelper";
import VariantsTable from "./product-form/VariantsTable";
import type { AttributeRow, FormErrors, GalleryImage, GalleryItem, SellMode, TierRow, VariantRow } from "./product-form/types";
import {
  blurOnWheel,
  discardUpload,
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
import { useCan } from '@/hooks/usePermissions';

export interface ProductSaveResult {
  productId: string;
  created: boolean;
  /** Made in-house: the page opens "Record batch" straight after creating it. */
  madeInHouse?: boolean;
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
  // People without "Profit & costs" don't see costs (the server hides them too and ignores their cost edits)
  const can = useCan();
  const canSeeCosts = can("reports.profit");
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
  const [isMadeInHouse, setIsMadeInHouse] = useState(false);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [status, setStatus] = useState("active");
  const [hasVariants, setHasVariants] = useState(false);
  const [images, setImages] = useState<GalleryItem[]>([]);
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
  // Edited cost prices: real price change, or fixing a mistake (then also fix past sales)?
  const [costReview, setCostReview] = useState<{
    changes: { variantId: string; label: string; old: number | null; next: number | null; big: boolean }[];
    mistake: boolean;
    since: string;
  } | null>(null);

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
    setIsMadeInHouse(!!p.is_made_in_house);
    setStatus(p.status || "active");
    setHasVariants(!!p.has_variants);
    setTags(
      Array.isArray(p.tags)
        ? p.tags.filter(Boolean)
        : typeof p.tags === "string" && p.tags.trim()
          ? p.tags.split(/[|,]/).map((t: string) => t.trim()).filter(Boolean)
          : []
    );
    setImages((p.images || []).map((url: string): GalleryItem => ({ key: newKey(), url, status: "done" })));

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
        volume_ml: v.volume_ml?.toString() ?? "",
        sell_mode: v.sell_mode || "unit_only",
        track_expiry: !!v.track_expiry,
        packaging_tiers: tiersFromServer(v.packaging_tiers, v.base_unit_name || "unit"),
        image: v.image_url || null,
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
        name, description, category, brand, isMadeInHouse, status, hasVariants, tags,
        images: images.map(i => i.url || i.key),
        baseUnitName, simpleSku, simpleSellMode, simpleStock, simpleCostPrice, simpleLowStock, simpleTrackExpiry, simpleTiers,
        attributes: attributes.map(a => [a.name, a.values]),
        variants: variants.map(v => ({ ...v, isExpanded: undefined, key: undefined })), // UI-only fields don't count
      }),
    [name, description, category, brand, isMadeInHouse, status, hasVariants, tags, images, baseUnitName, simpleSku, simpleSellMode,
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

  // ── Gallery: photos upload as soon as they're picked ───────────────────
  const gallery: GalleryImage[] = useMemo(
    () => images.filter(i => i.status === "done" && i.url).map(i => ({ url: i.url as string })),
    [images]
  );

  // A variant can't keep a photo that was removed from the gallery
  useEffect(() => {
    const urls = new Set(gallery.map(g => g.url));
    setVariants(prev => (prev.some(v => v.image && !urls.has(v.image)) ? prev.map(v => (v.image && !urls.has(v.image) ? { ...v, image: null } : v)) : prev));
  }, [gallery]);

  // Leaving without saving: throw away photos uploaded in this session (nightly cleanup is the backstop)
  const savedRef = useRef(false);
  const imagesRef_ = useRef(images);
  imagesRef_.current = images;
  useEffect(
    () => () => {
      if (savedRef.current) return;
      imagesRef_.current.filter(i => i.isNew && i.url).forEach(i => discardUpload(i.url as string));
    },
    []
  );

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
        volume_ml: "",
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
    if (images.some(i => i.status === "uploading")) {
      toast.error("Wait for the photos to finish uploading");
      handleNavClick("images");
      return;
    }
    if (images.some(i => i.status === "error")) {
      toast.error("Some photos failed to upload — retry or remove them");
      handleNavClick("images");
      return;
    }
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
    await reviewCostsOrSave();
  };

  /** Cost prices changed on existing variants (edit mode only). */
  const costChanges = () => {
    if (!isEditing) return [];
    const original = new Map<string, number | null>(
      (initialData?.variants || []).map((v: any) => [v.id, v.cost_price_per_base_unit ?? null])
    );
    const rows: { id?: string; label: string; cost: string }[] = hasVariants
      ? variants.map(v => ({ id: v.id, label: variantLabel(v), cost: v.cost_price_per_base_unit }))
      : [{ id: (initialData?.variants || []).find((v: any) => v.is_active !== false)?.id, label: name || "This product", cost: simpleCostPrice }];
    return rows
      .filter(r => r.id && original.has(r.id))
      .map(r => {
        const old = original.get(r.id as string) ?? null;
        const next = toNum(r.cost);
        return { variantId: r.id as string, label: r.label, old, next, big: !!old && next !== null && Math.abs(next - old) / old > 0.3 };
      })
      .filter(c => (c.old ?? null) !== (c.next ?? null) && !(c.old !== null && c.next !== null && Math.abs(c.old - c.next) < 0.00005));
  };

  const reviewCostsOrSave = async () => {
    setBelowCostItems(null);
    const changes = costChanges().filter(c => c.next !== null);
    if (changes.length === 0) {
      await save();
      return;
    }
    // Default "fix sales since" = last time stock was received for these items (else 30 days ago)
    let since = new Date(Date.now() - 30 * 86400000);
    try {
      const results = await Promise.all(
        changes.map(c => apiClient.get(`/tenant/products/variants/${c.variantId}/cost-history`).then(r => r.data?.success?.data?.last_received_at).catch(() => null))
      );
      const dates = results.filter(Boolean).map((d: string) => new Date(d));
      if (dates.length) since = new Date(Math.min(...dates.map(d => d.getTime())));
    } catch {
      /* keep default */
    }
    setCostReview({ changes, mistake: changes.some(c => c.big), since: since.toISOString().slice(0, 10) });
  };

  const save = async (costDecision?: { mistake: boolean; since: string; variantIds: string[] }) => {
    setBelowCostItems(null);
    setCostReview(null);
    setIsSaving(true);
    const costNote = costDecision ? (costDecision.mistake ? "Corrected a mistake" : "Cost price changed") : undefined;
    const unit = (baseUnitName || "unit").trim() || "unit";
    const payload: Record<string, any> = {
      name: name.trim(),
      description: description?.trim() || "",
      category,
      brand: brand.trim() || null,
      is_made_in_house: isMadeInHouse,
      status,
      tags: tags.map(t => t.trim()).filter(Boolean),
      has_variants: hasVariants,
      images: images.filter(i => i.status === "done" && i.url).map(i => i.url),
    };
    if (hasVariants) {
      payload.variants = variants.map(v => {
        const vUnit = (v.base_unit_name || unit).trim() || "unit";
        return {
          ...(v.id ? { id: v.id } : { stock_quantity: isMadeInHouse ? 0 : toNum(v.stock_quantity) ?? 0 }),
          sku: v.sku.trim(),
          variant_attributes: v.variant_attributes,
          base_unit_name: vUnit,
          cost_price_per_base_unit: toNum(v.cost_price_per_base_unit),
          sell_mode: v.sell_mode,
          low_stock_threshold: toNum(v.low_stock_threshold) ?? 5,
          track_expiry: v.track_expiry,
          volume_ml: toNum(v.volume_ml),
          image_url: v.image || null,
          ...(costNote ? { cost_note: costNote } : {}),
          packaging_tiers: tiersToPayload(v.packaging_tiers, vUnit),
        };
      });
    } else {
      payload.variant = {
        sku: simpleSku.trim(),
        base_unit_name: unit,
        cost_price_per_base_unit: toNum(simpleCostPrice),
        ...(isEditing ? {} : { stock_quantity: isMadeInHouse ? 0 : toNum(simpleStock) ?? 0 }),
        sell_mode: simpleSellMode,
        low_stock_threshold: toNum(simpleLowStock) ?? 5,
        track_expiry: simpleTrackExpiry,
        packaging_tiers: tiersToPayload(simpleTiers, unit),
        ...(costNote ? { cost_note: costNote } : {}),
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

    // Mistake corrected: also fix the cost recorded on recent sales so profit reports are right
    if (costDecision?.mistake) {
      const since = new Date(`${costDecision.since}T00:00:00`).toISOString();
      const results = await Promise.all(
        costDecision.variantIds.map(id =>
          apiClient.post(`/tenant/products/variants/${id}/fix-sales-cost`, { since }).then(r => r.data?.success?.data?.updated || 0).catch(() => null)
        )
      );
      if (results.some(r => r === null)) toast.error("Saved, but some past sales couldn't be corrected");
      else toast.success(`Cost corrected on ${results.reduce((a, b) => a + (b || 0), 0)} past sale line(s)`);
    }

    setIsSaving(false);
    baselineRef.current = snapshot; // nothing unsaved any more
    onDirtyChange?.(false);
    savedRef.current = true;
    onSuccess({ productId, created: !isEditing, madeInHouse: isMadeInHouse });
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
  const simpleBelowCost = !!marginInfo(simpleSale?.retail_price, simpleCostPrice, simpleSale?.is_base_unit ? 1 : simpleSale?.units_per_tier)?.below;

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

            <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/10 px-4 py-3 cursor-pointer">
              <span>
                <span className="block text-sm font-bold text-foreground">Made in-house</span>
                <span className="block text-xs text-muted-foreground">You make it yourself (e.g. sobolo). Stock and cost come from batches you record.</span>
              </span>
              <Switch checked={isMadeInHouse} onCheckedChange={setIsMadeInHouse} aria-label="Made in-house" />
            </label>

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
                  { label: "Active", value: "active" },
                  { label: "Draft", value: "draft" },
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
              <label className="text-xs font-bold text-muted-foreground uppercase !tracking-wide">Product Images</label>
              <ProductImagesField items={images} setItems={setImages} max={6} />
            </div>
          </div>

          {/* SECTION 2: VARIANTS TOGGLE */}
          <div ref={configRef} className="scroll-mt-24 border border-border bg-card p-4 md:p-6 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Variants</h3>
            <div
              className="flex items-center justify-between gap-4 p-4 border border-border dark:border-gray-800 rounded-lg bg-muted/10"
              title={isEditing ? "Can't be changed after the product is created" : undefined}
            >
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-foreground">Multiple variants</label>
                <p className="text-xs text-muted-foreground">Different flavours, sizes or colours</p>
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
                  placeholder="Scan or leave blank"
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
                  label="Unit name"
                  name="baseUnit"
                  value={baseUnitName}
                  onChange={(e) => setBaseUnitName(e.target.value)}
                  placeholder="e.g. bottle, box, piece"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <CustomInputTextField
                    label={`Retail price${simpleSale && !simpleSale.is_base_unit ? ` per ${simpleSale.name || "pack"}` : ""}`}
                    required
                    type="number"
                    value={simpleSale?.retail_price || ""}
                    onChange={(e) => {
                      setSimpleTiers(prev => setSaleTierRetail(prev, e.target.value));
                      if (errors.simple?.retail) setErrors(prev => ({ ...prev, simple: undefined }));
                    }}
                    startContent={<span className="text-sm text-muted-foreground">GHS</span>}
                  startContentPadding="pl-12"
                    error={errors.simple?.retail}
                    inputProps={{ id: "pf-simple-retail", min: "0", step: "any", inputMode: "decimal", onWheel: blurOnWheel }}
                  />
                  {!errors.simple?.retail && simpleBelowCost && (
                    <span className="mt-1 block text-xs font-semibold text-amber-600 dark:text-amber-400">Below cost</span>
                  )}
                </div>
                <div>
                  <CustomInputTextField
                    label="Cost price"
                    type={canSeeCosts ? "number" : "text"}
                    value={canSeeCosts ? simpleCostPrice : ""}
                    onChange={(e) => setSimpleCostPrice(e.target.value)}
                    placeholder={canSeeCosts ? "Optional" : "Hidden"}
                    disabled={!canSeeCosts}
                    startContent={<span className="text-sm text-muted-foreground">GHS</span>}
                    startContentPadding="pl-12"
                    inputProps={{ min: "0", step: "any", inputMode: "decimal", onWheel: blurOnWheel }}
                  />
                  <div className={cn("mt-1", (isMadeInHouse || !canSeeCosts) && "hidden")}>
                    <BulkCostHelper
                      unitName={baseUnitName}
                      packs={simpleTiers.filter(t => !t.is_base_unit && toNum(t.units_per_tier)).map(t => ({ name: t.name || "Pack", units: toNum(t.units_per_tier) as number }))}
                      onApply={setSimpleCostPrice}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {isMadeInHouse && !isEditing ? (
                  <p className="self-center text-xs text-muted-foreground">Stock is added when you record a batch.</p>
                ) : (
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
                )}
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
                  <p className="col-span-2 text-[11px] text-muted-foreground">Change stock levels in Stock Adjustments.</p>
                )}
              </div>

              {trackExpiryEnabled && (
                <label className="flex items-center gap-2 text-xs font-medium" title="Batches and expiry alerts at the till">
                  <Switch checked={simpleTrackExpiry} onCheckedChange={setSimpleTrackExpiry} />
                  Track expiry dates
                </label>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowSimplePacks(s => !s)}
                  aria-expanded={showSimplePacks}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Icon icon="lucide:sliders-horizontal" className="text-[13px]" />
                  Packs & wholesale{simpleTiers.length > 1 ? ` (${simpleTiers.length - 1})` : ""}
                  <Icon icon={showSimplePacks ? "lucide:chevron-up" : "lucide:chevron-down"} className="text-[13px]" />
                </button>
                {showSimplePacks && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <TiersEditor
                      tiers={simpleTiers}
                      onChange={setSimpleTiers}
                      unitName={baseUnitName}
                      cost={simpleCostPrice}
                      sellMode={simpleSellMode}
                      onSellModeChange={setSimpleSellMode}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (

            /* SECTION 3b: VARIANTS */
            <div ref={pricingRef} className="scroll-mt-24 border border-border bg-card p-5 md:p-6 rounded-xl space-y-4 md:space-y-5 shadow-sm">
              <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Pricing & Stock</h3>

              <div className="space-y-3">
                {attributes.map((attr, idx) => {
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
                    <Icon icon="fluent:add-12-filled" className="text-[14px]" /> Add option
                  </Button>
                  <div className="md:ml-auto md:w-64">
                    <CustomInputTextField
                      label="Unit name"
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
                  className="w-full bg-secondary text-secondary-foreground hover:text-primary-foreground  border font-bold py-2 rounded-lg"
                  onClick={generateVariants}
                >
                  <Icon icon={variants.length ? "lucide:refresh-cw" : "fluent:settings-20-filled"} className="mr-2 text-lg" />
                  {variants.length ? "Update variants" : "Generate variants"}
                </Button>
                {errors.general && <p className="mt-1.5 text-[11px] text-destructive font-semibold">{errors.general}</p>}
              </div>

              {variants.length > 0 && (
                <div>
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
                    madeInHouse={isMadeInHouse}
                    canSeeCosts={canSeeCosts}
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

      {/* Edited cost prices: real change or a mistake? */}
      <CustomModal
        isOpen={!!costReview}
        onOpenChange={() => setCostReview(null)}
        size="md"
        header={
          <div className="pt-2 px-2 border-b border-border/60 pb-3">
            <h2 className="text-lg font-bold !tracking-tight">Cost price changed</h2>
            <p className="text-xs md:text-[13px] text-muted-foreground">Tell us why, so your profit reports stay accurate.</p>
          </div>
        }
        body={
          costReview && (
            <div className="py-2 space-y-3">
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {costReview.changes.map(c => (
                  <li key={c.variantId} className="flex items-center justify-between gap-2 text-sm rounded-md bg-muted/40 px-3 py-1.5">
                    <span className="capitalize truncate">{c.label}</span>
                    <span className="tabular-nums whitespace-nowrap">
                      {c.old !== null ? c.old.toFixed(2) : "—"} → <b>{c.next !== null ? c.next.toFixed(2) : "—"}</b>
                      {c.big && <span className="ml-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">big change</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <label className={cn("flex gap-2.5 rounded-lg border p-3 cursor-pointer", !costReview.mistake ? "border-primary bg-primary/5" : "border-border")}>
                <input type="radio" className="mt-0.5 accent-primary" checked={!costReview.mistake} onChange={() => setCostReview({ ...costReview, mistake: false })} />
                <span>
                  <span className="block text-sm font-medium">The cost really changed</span>
                  <span className="block text-xs text-muted-foreground">Applies to sales from now on. Past sales keep the cost they had.</span>
                </span>
              </label>
              <label className={cn("flex gap-2.5 rounded-lg border p-3 cursor-pointer", costReview.mistake ? "border-primary bg-primary/5" : "border-border")}>
                <input type="radio" className="mt-0.5 accent-primary" checked={costReview.mistake} onChange={() => setCostReview({ ...costReview, mistake: true })} />
                <span className="flex-1">
                  <span className="block text-sm font-medium">The old cost was a mistake</span>
                  <span className="block text-xs text-muted-foreground">Also correct the cost on sales since:</span>
                  <input
                    type="date"
                    value={costReview.since}
                    max={new Date().toISOString().slice(0, 10)}
                    disabled={!costReview.mistake}
                    onChange={(e) => setCostReview({ ...costReview, since: e.target.value })}
                    className="mt-1.5 h-8 px-2 text-xs border border-border rounded-md bg-background disabled:opacity-50"
                  />
                </span>
              </label>
            </div>
          )
        }
        footer={
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <Button variant="outline" size="sm" type="button" onClick={() => setCostReview(null)}>
              Back
            </Button>
            <Button
              size="sm"
              type="button"
              className="bg-primary text-primary-foreground font-semibold"
              disabled={isSaving || (costReview?.mistake && !costReview.since)}
              onClick={() =>
                costReview && save({ mistake: costReview.mistake, since: costReview.since, variantIds: costReview.changes.map(c => c.variantId) })
              }
            >
              Save
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
            <Button size="sm" type="button" className="bg-primary text-primary-foreground font-semibold" onClick={() => reviewCostsOrSave()} disabled={isSaving}>
              Save anyway
            </Button>
          </div>
        }
      />
    </form>
  );
}
