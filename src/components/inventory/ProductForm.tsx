import React, { useState, useEffect, useMemo, useRef } from "react";
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

interface ProductFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const isEditing = !!initialData;
  const [isLoading, setIsLoading] = useState(false);
  
  // Section refs for anchor navigation
  const basicInfoRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState("basic");

  const sidebarOptions = [
    { key: "basic", label: "Basic Info" },
    { key: "config", label: "Configuration" },
    { key: "pricing", label: "Pricing & Inventory" },
    { key: "images", label: "Images" }
  ];

  const refsMap: Record<string, React.RefObject<HTMLDivElement>> = {
    basic: basicInfoRef,
    config: configRef,
    pricing: pricingRef,
    images: imagesRef
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavClick = (key: string) => {
    const targetRef = refsMap[key];
    if (targetRef) {
      setActiveSection(key);
      scrollToSection(targetRef);
    }
  };


  const [categories, setCategories] = useState<string[]>([]);
  
  // Basic Info States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [hasVariants, setHasVariants] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);

  // Settings
  const { tenant } = useAuthStore();
  const [trackExpiryEnabled, setTrackExpiryEnabled] = useState(tenant?.track_expiry_enabled || false);

  // Simple Product Variant State (used if hasVariants === false)
  const [simpleSku, setSimpleSku] = useState("");
  const [simpleBaseUnitName, setSimpleBaseUnitName] = useState("unit");
  const [simpleSellMode, setSimpleSellMode] = useState<"unit_only" | "pack_only" | "flexible">("unit_only");
  const [simpleStock, setSimpleStock] = useState("0");
  const [simpleCostPrice, setSimpleCostPrice] = useState("");
  const [simpleLowStock, setSimpleLowStock] = useState("5");
  const [simpleTrackExpiry, setSimpleTrackExpiry] = useState(false);
  const [simpleTiers, setSimpleTiers] = useState<any[]>([
    {
      id: Math.random().toString(),
      name: "Unit",
      units_per_tier: 1,
      is_base_unit: true,
      is_default_sale_unit: true,
      is_default_purchase_unit: true,
      retail_price: "0.00",
      wholesale_price: ""
    }
  ]);

  // Variant Product Builder State (used if hasVariants === true)
  const [attributes, setAttributes] = useState<any[]>([
    { id: Math.random().toString(), name: "Size", values: "" }
  ]);
  const [variants, setVariants] = useState<any[]>([]);

  // Bulk-edit states for variants
  const [bulkStock, setBulkStock] = useState("");
  const [bulkCost, setBulkCost] = useState("");
  const [bulkSellMode, setBulkSellMode] = useState<"unit_only" | "pack_only" | "flexible">("unit_only");

  const handleApplyBulkVariants = () => {
    if (!bulkStock && !bulkCost) {
      toast.error("Please enter a Stock or Cost value to apply.");
      return;
    }
    setVariants(prev => prev.map(v => {
      let updated = { ...v };
      if (bulkStock !== "") updated.stock_quantity = bulkStock;
      if (bulkCost !== "") updated.cost_price_per_base_unit = bulkCost;
      updated.sell_mode = bulkSellMode;
      return updated;
    }));
    toast.success("Bulk changes applied to all variants locally!");
  };

  // Update base unit tier name dynamically on change of base unit name label
  useEffect(() => {
    setSimpleTiers(prev => 
      prev.map(t => t.is_base_unit ? { ...t, name: simpleBaseUnitName || "Unit" } : t)
    );
  }, [simpleBaseUnitName]);

  // Fetch unique categories and store preferences on mount
  useEffect(() => {
    apiClient.get("/tenant/products?limit=100").then((res) => {
      const prods = res.data.data.products || [];
      const cats = Array.from(new Set(prods.map((p: any) => p.category).filter(Boolean))) as string[];
      setCategories(cats);
    }).catch(console.error);

    apiClient.get("/tenant/settings").then((res) => {
      const storeData = res.data.success?.data?.store || {};
      setTrackExpiryEnabled(storeData.track_expiry_enabled || false);
    }).catch(console.error);
  }, []);

  // Fetch full nested product details if editing
  useEffect(() => {
    if (initialData && initialData.id) {
      setIsLoading(true);
      apiClient.get(`/tenant/products/${initialData.id}`)
        .then((res) => {
          const fullProduct = res.data.data.product;
          setName(fullProduct.name || "");
          setDescription(fullProduct.description || "");
          setCategory(fullProduct.category || "");
          setStatus(fullProduct.status || "active");
          setHasVariants(fullProduct.has_variants || false);
          
          if (fullProduct.images) {
            setUploadedFiles(fullProduct.images.map((url: string) => ({
              id: url,
              file: new File([], "existing_image"),
              preview: url
            })));
          }

          if (!fullProduct.has_variants) {
            const v = fullProduct.variants?.[0];
            if (v) {
              setSimpleSku(v.sku || "");
              setSimpleBaseUnitName(v.base_unit_name || "unit");
              setSimpleSellMode(v.sell_mode || "unit_only");
              setSimpleStock(v.stock_quantity?.toString() || "0");
              setSimpleCostPrice(v.cost_price_per_base_unit?.toString() || "");
              setSimpleLowStock(v.low_stock_threshold?.toString() || "5");
              setSimpleTrackExpiry(v.track_expiry || false);
              
              if (v.packaging_tiers && v.packaging_tiers.length > 0) {
                setSimpleTiers(v.packaging_tiers.map((t: any) => {
                  const retail = t.prices?.find((p: any) => p.price_type === "retail")?.price || "0.00";
                  const wholesale = t.prices?.find((p: any) => p.price_type === "wholesale")?.price || "";
                  return {
                    id: t.id || Math.random().toString(),
                    name: t.name,
                    units_per_tier: t.units_per_tier,
                    is_base_unit: t.is_base_unit,
                    is_default_sale_unit: t.is_default_sale_unit,
                    is_default_purchase_unit: t.is_default_purchase_unit,
                    retail_price: retail.toString(),
                    wholesale_price: wholesale.toString()
                  };
                }));
              }
            }
          } else {
            // Load list of variants
            setVariants(fullProduct.variants.map((v: any) => {
              const tiers = v.packaging_tiers?.map((t: any) => {
                const retail = t.prices?.find((p: any) => p.price_type === "retail")?.price || "0.00";
                const wholesale = t.prices?.find((p: any) => p.price_type === "wholesale")?.price || "";
                return {
                  id: t.id || Math.random().toString(),
                  name: t.name,
                  units_per_tier: t.units_per_tier,
                  is_base_unit: t.is_base_unit,
                  is_default_sale_unit: t.is_default_sale_unit,
                  is_default_purchase_unit: t.is_default_purchase_unit,
                  retail_price: retail.toString(),
                  wholesale_price: wholesale.toString()
                };
              }) || [];
              
              return {
                id: v.id,
                sku: v.sku,
                variant_attributes: v.variant_attributes || {},
                base_unit_name: v.base_unit_name || "unit",
                stock_quantity: v.stock_quantity?.toString() || "0",
                cost_price_per_base_unit: v.cost_price_per_base_unit?.toString() || "",
                low_stock_threshold: v.low_stock_threshold?.toString() || "5",
                sell_mode: v.sell_mode || "unit_only",
                track_expiry: v.track_expiry || false,
                packaging_tiers: tiers,
                isExpanded: false
              };
            }));
            
            // Build attributes array based on variant attributes keys/values
            const attrMap: Record<string, Set<string>> = {};
            fullProduct.variants.forEach((v: any) => {
              Object.entries(v.variant_attributes || {}).forEach(([key, val]) => {
                if (!attrMap[key]) attrMap[key] = new Set();
                attrMap[key].add(String(val));
              });
            });
            const loadedAttrs = Object.entries(attrMap).map(([key, valSet]) => ({
              id: Math.random().toString(),
              name: key,
              values: Array.from(valSet).join(", ")
            }));
            setAttributes(loadedAttrs.length > 0 ? loadedAttrs : [{ id: Math.random().toString(), name: "Size", values: "" }]);
          }
        })
        .catch((err) => {
          console.error("Failed to load product details:", err);
          toast.error("Failed to load product details for editing");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [initialData]);

  // Attribute Builder Actions
  const addAttribute = () => {
    if (attributes.length >= 3) {
      toast.error("Maximum 3 attributes allowed");
      return;
    }
    setAttributes(prev => [...prev, { id: Math.random().toString(), name: "", values: "" }]);
  };

  const removeAttribute = (id: string) => {
    setAttributes(prev => prev.filter(a => a.id !== id));
  };

  const updateAttribute = (idx: number, field: "name" | "values", value: string) => {
    setAttributes(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  // Generate combinations from attribute definitions
  const generateVariants = () => {
    const validAttrs = attributes.filter(a => a.name.trim() && a.values.trim());
    if (validAttrs.length === 0) {
      toast.error("Add at least one attribute with values");
      return;
    }

    const attrNames = validAttrs.map(a => a.name.trim());
    const attrValuesList = validAttrs.map(a => 
      a.values.split(",").map((v: string) => v.trim()).filter(Boolean)
    );

    // Cartesian product function
    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce((acc, curr) => 
        acc.flatMap(d => curr.map(e => [...d, e])), [[]] as string[][]
      );
    };

    const combinations = cartesian(attrValuesList);

    const generated = combinations.map(combo => {
      const variant_attributes: Record<string, string> = {};
      combo.forEach((val, idx) => {
        variant_attributes[attrNames[idx]] = val;
      });

      const nameSuffix = combo.join(" / ");
      const skuSuffix = combo.map(v => v.toUpperCase().replace(/\s+/g, "")).join("-");
      const generatedSku = `${simpleSku || name.toUpperCase().replace(/\s+/g, "") || "SKU"}-${skuSuffix}`;

      return {
        id: Math.random().toString(),
        name: `${name} - ${nameSuffix}`,
        variant_attributes,
        sku: generatedSku,
        stock_quantity: "0",
        cost_price_per_base_unit: simpleCostPrice || "",
        low_stock_threshold: simpleLowStock || "5",
        sell_mode: simpleSellMode || "unit_only",
        track_expiry: simpleTrackExpiry || false,
        packaging_tiers: [
          {
            id: Math.random().toString(),
            name: "Unit",
            units_per_tier: 1,
            is_base_unit: true,
            is_default_sale_unit: true,
            is_default_purchase_unit: true,
            retail_price: "0.00",
            wholesale_price: ""
          }
        ],
        isExpanded: false
      };
    });

    setVariants(generated);
    toast.success(`Generated ${generated.length} variant combinations`);
  };

  // Variant combinations manipulation
  const updateVariantField = (idx: number, field: string, value: any) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const deleteVariant = (idx: number) => {
    setVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const addVariantTier = (vIdx: number) => {
    const variant = variants[vIdx];
    const newTier = {
      id: Math.random().toString(),
      name: "",
      units_per_tier: 1,
      is_base_unit: false,
      is_default_sale_unit: false,
      is_default_purchase_unit: false,
      retail_price: "0.00",
      wholesale_price: ""
    };
    updateVariantField(vIdx, "packaging_tiers", [...variant.packaging_tiers, newTier]);
  };

  // Simple Product Tier actions
  const addSimpleTier = () => {
    setSimpleTiers(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        name: "",
        units_per_tier: 1,
        is_base_unit: false,
        is_default_sale_unit: false,
        is_default_purchase_unit: false,
        retail_price: "0.00",
        wholesale_price: ""
      }
    ]);
  };

  // Generic Packaging Tiers table component renderer
  const renderTiersTable = (tiers: any[], onTiersChange: (newTiers: any[]) => void, costPriceValue: string) => {
    const updateTierField = (tierIdx: number, field: string, value: any) => {
      const updated = tiers.map((t, i) => {
        if (i !== tierIdx) return t;
        
        let newTier = { ...t, [field]: value };
        if (field === "units_per_tier") {
          const num = parseInt(value);
          newTier.units_per_tier = isNaN(num) || num < 1 ? 1 : num;
        }
        return newTier;
      });

      // Maintain radio button semantics for default selectors
      if (field === "is_default_sale_unit" && value === true) {
        updated.forEach((t, i) => {
          if (i !== tierIdx) t.is_default_sale_unit = false;
        });
      }
      if (field === "is_default_purchase_unit" && value === true) {
        updated.forEach((t, i) => {
          if (i !== tierIdx) t.is_default_purchase_unit = false;
        });
      }

      onTiersChange(updated);
    };

    const deleteTier = (tierIdx: number) => {
      const t = tiers[tierIdx];
      if (t.is_base_unit) return;
      onTiersChange(tiers.filter((_, i) => i !== tierIdx));
    };

    if (tiers.length === 1) {
      const t = tiers[0];
      return (
        <div className="p-4 border border-border dark:border-gray-800 rounded-xl bg-muted/10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Base Unit Name</label>
              <input
                type="text"
                required
                disabled={t.is_base_unit}
                className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-card focus:outline-none disabled:opacity-80 disabled:bg-muted/20 text-foreground font-semibold h-9"
                value={t.name}
                onChange={(e) => updateTierField(0, "name", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Retail Price (GHS) *</label>
              <input
                type="number"
                step="0.01"
                required
                className={cn(
                  "w-full px-3 py-2 text-xs border rounded-lg bg-card focus:outline-none text-foreground font-semibold h-9",
                  costPriceValue && Number(t.retail_price) < (Number(costPriceValue) * t.units_per_tier)
                    ? "border-amber-500 bg-amber-500/5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    : "border-border"
                )}
                value={t.retail_price}
                onChange={(e) => updateTierField(0, "retail_price", e.target.value)}
              />
              {costPriceValue && Number(t.retail_price) < (Number(costPriceValue) * t.units_per_tier) && (
                <span className="text-[9px] text-amber-500 block mt-0.5 font-semibold leading-none">
                  Below cost!
                </span>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Wholesale Price (GHS)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-card focus:outline-none text-foreground h-9"
                value={t.wholesale_price}
                placeholder="Optional"
                onChange={(e) => updateTierField(0, "wholesale_price", e.target.value)}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border border-border dark:border-gray-800 rounded-xl bg-muted/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border/70 text-[10px] text-muted-foreground uppercase font-bold">
              <th className="p-3">Name</th>
              <th className="p-3 w-24">Units/Tier</th>
              <th className="p-3 text-center w-24">Default Sale</th>
              <th className="p-3 text-center w-28">Default Purchase</th>
              <th className="p-3 w-28">Retail (GHS)</th>
              <th className="p-3 w-28">Wholesale (GHS)</th>
              <th className="p-3 text-right w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {tiers.map((t, tierIdx) => (
              <tr key={t.id} className="hover:bg-muted/30">
                <td className="p-2">
                  <input
                    type="text"
                    required
                    disabled={t.is_base_unit}
                    className="w-full px-2 py-1 text-xs border border-border rounded bg-card focus:outline-none disabled:opacity-80 disabled:bg-muted/20 text-foreground font-semibold"
                    value={t.name}
                    onChange={(e) => updateTierField(tierIdx, "name", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    required
                    disabled={t.is_base_unit}
                    className="w-full px-2 py-1 text-xs border border-border rounded bg-card focus:outline-none disabled:opacity-80 disabled:bg-muted/20"
                    value={t.units_per_tier}
                    min="1"
                    onChange={(e) => updateTierField(tierIdx, "units_per_tier", e.target.value)}
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:outline-none"
                    checked={t.is_default_sale_unit}
                    onChange={(e) => updateTierField(tierIdx, "is_default_sale_unit", e.target.checked)}
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:outline-none"
                    checked={t.is_default_purchase_unit}
                    onChange={(e) => updateTierField(tierIdx, "is_default_purchase_unit", e.target.checked)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    required
                    className={cn(
                      "w-full px-2 py-1 text-xs border rounded bg-card focus:outline-none text-foreground font-semibold",
                      costPriceValue && Number(t.retail_price) < (Number(costPriceValue) * t.units_per_tier)
                        ? "border-amber-500 bg-amber-500/5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        : "border-border"
                    )}
                    value={t.retail_price}
                    onChange={(e) => updateTierField(tierIdx, "retail_price", e.target.value)}
                  />
                  {costPriceValue && Number(t.retail_price) < (Number(costPriceValue) * t.units_per_tier) && (
                    <span className="text-[9px] text-amber-500 block mt-0.5 font-semibold leading-none">
                      Below cost!
                    </span>
                  )}
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-2 py-1 text-xs border border-border rounded bg-card focus:outline-none text-foreground"
                    value={t.wholesale_price}
                    placeholder="Optional"
                    onChange={(e) => updateTierField(tierIdx, "wholesale_price", e.target.value)}
                  />
                </td>
                <td className="p-2 text-right">
                  <button
                    type="button"
                    disabled={t.is_base_unit}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-40"
                    onClick={() => deleteTier(tierIdx)}
                  >
                    <Icon icon="lucide:trash-2" className="text-[14px]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Image Upload removal tracking
  const handleFilesChange = (newFiles: UploadedFile[]) => {
    // Check if any existing file URL has been deleted
    const newIds = new Set(newFiles.map(f => f.id));
    uploadedFiles.forEach(f => {
      if (!newIds.has(f.id) && (f.id.startsWith("http") || f.id.includes("/"))) {
        setRemovedImageUrls(prev => [...prev, f.id]);
      }
    });
    setUploadedFiles(newFiles);
  };

  // Submit form handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !category) {
      toast.error("Product Name and Category are required");
      return;
    }

    if (!hasVariants && !simpleSku) {
      toast.error("SKU is required for simple products");
      return;
    }

    setIsLoading(true);
    try {
      // Build packaging tiers helper format
      const mapTiersPayload = (tiers: any[]) => tiers.map(t => ({
        name: t.name.trim() || "Unit",
        units_per_tier: t.units_per_tier,
        is_base_unit: t.is_base_unit,
        is_default_sale_unit: t.is_default_sale_unit,
        is_default_purchase_unit: t.is_default_purchase_unit,
        prices: [
          { price_type: "retail", price: parseFloat(t.retail_price) || 0 },
          ...(t.wholesale_price ? [{ price_type: "wholesale", price: parseFloat(t.wholesale_price) }] : [])
        ]
      }));

      const payload = {
        name,
        description,
        category,
        status,
        has_variants: hasVariants,
        ...(hasVariants ? {
          variants: variants.map(v => ({
            sku: v.sku.trim(),
            variant_attributes: v.variant_attributes,
            base_unit_name: v.base_unit_name.trim() || "unit",
            cost_price_per_base_unit: v.cost_price_per_base_unit ? parseFloat(v.cost_price_per_base_unit) : null,
            stock_quantity: parseInt(v.stock_quantity) || 0,
            sell_mode: v.sell_mode,
            low_stock_threshold: parseInt(v.low_stock_threshold) || 5,
            track_expiry: v.track_expiry,
            packaging_tiers: mapTiersPayload(v.packaging_tiers)
          }))
        } : {
          variant: {
            sku: simpleSku.trim(),
            base_unit_name: simpleBaseUnitName.trim() || "unit",
            cost_price_per_base_unit: simpleCostPrice ? parseFloat(simpleCostPrice) : null,
            stock_quantity: parseInt(simpleStock) || 0,
            sell_mode: simpleSellMode,
            low_stock_threshold: parseInt(simpleLowStock) || 5,
            track_expiry: simpleTrackExpiry,
            packaging_tiers: mapTiersPayload(simpleTiers)
          }
        })
      };

      let productId = "";
      if (isEditing) {
        await apiClient.put(`/tenant/products/${initialData.id}`, payload);
        productId = initialData.id;
        toast.success("Product updated successfully");
      } else {
        const response = await apiClient.post("/tenant/products", payload);
        productId = response.data.success.data.product.id;
        toast.success("Product created successfully");
      }

      // Handle removed images on server
      if (isEditing && removedImageUrls.length > 0) {
        for (const url of removedImageUrls) {
          try {
            await apiClient.delete(`/tenant/products/${productId}/images`, {
              data: { imageUrl: url }
            });
          } catch (err) {
            console.error("Failed to delete product image:", url, err);
          }
        }
      }

      // Handle uploading new images
      const newFiles = uploadedFiles.filter(f => f.file.size > 0).map(f => f.file);
      if (newFiles.length > 0) {
        toast.loading("Uploading product images...", { id: "upload" });
        const imgFormData = new FormData();
        newFiles.forEach(file => {
          imgFormData.append("files", file);
        });

        await apiClient.post(`/tenant/products/${productId}/images`, imgFormData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.dismiss("upload");
        toast.success("Images uploaded successfully");
      }

      onSuccess();
    } catch (error: any) {
      toast.dismiss("upload");
      console.error("Save product error:", error);
      toast.error(error.response?.data?.error?.message || "Failed to save product");
    } finally {
      setIsLoading(false);
    }
  };

  const categoryOptions = categories.map(c => ({ label: c, value: c }));
  if (category && !categories.includes(category)) {
    categoryOptions.push({ label: category, value: category });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full bg-transparent md:py-4">
      {/* Two Column Grid layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full relative">
        
        {/* Left column sidebar (sticky on desktop, horizontal scrollable on mobile) */}
        <div className="sticky top-4 lg:top-6 z-50 bg-background/95 backdrop-blur-md lg:border-r lg:border-border/50 lg:pr-4 md:py-2 lg:py-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide shrink-0 w-full lg:w-64 2xl:w-72">
          <PillSidebar
            options={sidebarOptions}
            activeKey={activeSection}
            onChange={handleNavClick}
            className="w-full font-semibold"
          />
        </div>

        {/* Right column scrollable cards container */}
        <div className="flex-1 w-full space-y-6 pb-10">
        
        {/* SECTION 1: BASIC INFO */}
        <div ref={basicInfoRef} className="scroll-mt-24 border border-border bg-card p-5 md:p-6 rounded-xl space-y-3 md:space-y-5 shadow-sm">
          <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Section 1: Basic Info</h3>
          
          <CustomInputTextField
            label="Product Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Coca-Cola Drink"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <CustomSelectField
              label="Category"
              options={categoryOptions.length > 0 ? categoryOptions : [{ label: "General", value: "General" }]}
              value={category}
              inputProps={{
                onSelectionChange: (keys) => setCategory(Array.from(keys)[0] as string || "")
              }}
              placeholder="Select category"
              required
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

          {/* SECTION 1b: IMAGES */}
          <div ref={imagesRef} className="scroll-mt-24 pt-4 border-t border-border/50 space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Product Images</label>
            <FileUpload
              value={uploadedFiles}
              onChange={handleFilesChange}
              accept="image/*"
              maxFiles={6}
            />
          </div>
        </div>

        {/* SECTION 2: CONFIGURATION */}
        <div ref={configRef} className="scroll-mt-24 border border-border bg-card p-4 md:p-6 rounded-xl space-y-4 shadow-sm">
          <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Section 2: Configuration</h3>
          <div className="flex items-center justify-between p-4 border border-border dark:border-gray-800 rounded-lg bg-muted/10">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-foreground">Multiple Variants</label>
              <p className="text-xs text-muted-foreground">Toggle on if product has different sizes, colors, flavors, etc.</p>
            </div>
            <Switch
              checked={hasVariants}
              onCheckedChange={setHasVariants}
              disabled={isEditing} // Cannot toggle has_variants post-creation for DB integrity
            />
          </div>
        </div>

        {/* SECTION 3a: SIMPLE PRODUCT FORM */}
        {!hasVariants ? (
          <div ref={pricingRef} className="scroll-mt-24 border border-border bg-card p-5 md:p-6 rounded-xl space-y-4 md:space-y-5 shadow-sm">
            <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Section 3: Product Inventory & Pricing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <CustomInputTextField
                label="SKU / Barcode"
                name="sku"
                value={simpleSku}
                onChange={(e) => setSimpleSku(e.target.value)}
                required
                placeholder="e.g. COKE-33"
              />

              <CustomInputTextField
                label="Base Unit Name"
                name="baseUnit"
                value={simpleBaseUnitName}
                onChange={(e) => setSimpleBaseUnitName(e.target.value)}
                required
                placeholder="e.g. bottle, box, piece"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <CustomInputTextField
                label="Initial Stock"
                name="stock"
                type="number"
                value={simpleStock}
                onChange={(e) => setSimpleStock(e.target.value)}
                placeholder="0"
                inputProps={{ min: "0" }}
              />

              <CustomInputTextField
                label="Cost / Base Unit"
                name="costPrice"
                type="number"
                step="0.01"
                value={simpleCostPrice}
                onChange={(e) => setSimpleCostPrice(e.target.value)}
                placeholder="0.00"
                inputProps={{ min: "0" }}
              />

              <CustomInputTextField
                label="Low Stock Alert"
                name="lowStock"
                type="number"
                value={simpleLowStock}
                onChange={(e) => setSimpleLowStock(e.target.value)}
                placeholder="5"
                inputProps={{ min: "0" }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Sell Mode</label>
              <div className="flex gap-2">
                {(["unit_only", "pack_only", "flexible"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "flex-1 py-2 text-xs font-bold border rounded-lg transition-all capitalize shadow-sm",
                      simpleSellMode === mode
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    )}
                    onClick={() => setSimpleSellMode(mode)}
                  >
                    {mode.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {trackExpiryEnabled && (
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-foreground">Track Expiry Dates</label>
                  <p className="text-[10px] text-muted-foreground">Prompts cashiers and tracks batches automatically.</p>
                </div>
                <Switch
                  checked={simpleTrackExpiry}
                  onCheckedChange={setSimpleTrackExpiry}
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase">Packaging Tiers</label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 rounded-lg text-xs"
                  onClick={addSimpleTier}
                >
                  <Icon icon="fluent:add-12-filled" className="text-[14px]" /> Add Tier
                </Button>
              </div>

              {renderTiersTable(simpleTiers, setSimpleTiers, simpleCostPrice)}
            </div>
          </div>
        ) : (
          
          /* SECTION 3b: VARIANT BUILDER */
          <div ref={pricingRef} className="scroll-mt-24 border border-border bg-card p-5 md:p-6 rounded-xl space-y-4 md:space-y-5 shadow-sm">
            <h3 className="text-[12px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Section 3: Variant Options Builder</h3>
            
            {/* Attribute lines */}
            <div className="space-y-3">
              {attributes.map((attr, idx) => (
                <div key={attr.id} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <CustomInputTextField
                      label={idx === 0 ? "Attribute Name" : undefined}
                      value={attr.name}
                      onChange={(e) => updateAttribute(idx, "name", e.target.value)}
                      placeholder="e.g. Size, Color, Flavor"
                    />
                  </div>
                  <div className="flex-[2]">
                    <CustomInputTextField
                      label={idx === 0 ? "Attribute Options (comma-separated)" : undefined}
                      value={attr.values}
                      onChange={(e) => updateAttribute(idx, "values", e.target.value)}
                      placeholder="e.g. S, M, L"
                    />
                  </div>
                  {attributes.length > 1 && (
                    <button
                      type="button"
                      className="p-2 mb-1.5 rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors h-[38px] flex items-center justify-center"
                      onClick={() => removeAttribute(attr.id)}
                    >
                      <Icon icon="lucide:trash-2" className="text-[16px]" />
                    </button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary gap-1 pl-0 font-bold hover:bg-transparent"
                onClick={addAttribute}
              >
                <Icon icon="fluent:add-12-filled" className="text-[14px]" /> Add Attribute
              </Button>
            </div>

            <Button
              type="button"
              className="w-full bg-secondary-gray text-foreground border font-bold py-2 rounded-xl"
              onClick={generateVariants}
            >
              <Icon icon="fluent:settings-20-filled" className="mr-2 text-lg" /> Generate Variant Combinations
            </Button>

            {/* Bulk Edit Panel */}
            {variants.length > 0 && (
              <div className="p-4 border border-border rounded-xl bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Bulk Edit Variants</h4>
                  <span className="text-[10px] text-muted-foreground">Quickly apply base values to all rows</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Initial Stock</label>
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card focus:outline-none"
                      placeholder="e.g. 50"
                      value={bulkStock}
                      onChange={(e) => setBulkStock(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Cost Price (Base Unit)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card focus:outline-none"
                      placeholder="e.g. 25.00"
                      value={bulkCost}
                      onChange={(e) => setBulkCost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Sell Mode</label>
                    <select
                      className="px-3 py-1.5 text-xs border border-border rounded-lg bg-card focus:outline-none w-full capitalize"
                      value={bulkSellMode}
                      onChange={(e) => setBulkSellMode(e.target.value as any)}
                    >
                      <option value="unit_only">Unit Only</option>
                      <option value="pack_only">Pack Only</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg h-9"
                    onClick={handleApplyBulkVariants}
                  >
                    Apply to All
                  </Button>
                </div>
              </div>
            )}

            {/* Combinations list */}
            {variants.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground uppercase">Generated Combinations ({variants.length})</label>
                
                {/* Desktop view table */}
                <div className="hidden sm:block border border-border rounded-xl overflow-hidden shadow-sm bg-card">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted border-b border-border/80 text-[10px] text-muted-foreground uppercase font-bold">
                        <th className="p-3">Attributes</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3 w-20">Stock</th>
                        <th className="p-3 w-24">Cost</th>
                        <th className="p-3 w-28">Sell Mode</th>
                        <th className="p-3 text-right w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {variants.map((v, idx) => (
                        <React.Fragment key={v.id}>
                          <tr className="hover:bg-muted/10">
                            <td className="p-3 font-semibold text-foreground capitalize">
                              {Object.entries(v.variant_attributes).map(([key, val]) => `${key}: ${val}`).join(", ")}
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                required
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-transparent focus:outline-none font-mono"
                                value={v.sku}
                                onChange={(e) => updateVariantField(idx, "sku", e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-transparent focus:outline-none"
                                value={v.stock_quantity}
                                onChange={(e) => updateVariantField(idx, "stock_quantity", e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-transparent focus:outline-none"
                                value={v.cost_price_per_base_unit}
                                onChange={(e) => updateVariantField(idx, "cost_price_per_base_unit", e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <select
                                className="px-2 py-1 text-xs border border-border rounded bg-card focus:outline-none w-full capitalize"
                                value={v.sell_mode}
                                onChange={(e) => updateVariantField(idx, "sell_mode", e.target.value)}
                              >
                                <option value="unit_only">Unit Only</option>
                                <option value="pack_only">Pack Only</option>
                                <option value="flexible">Flexible</option>
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  className={cn("p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground", v.isExpanded && "bg-muted text-foreground")}
                                  onClick={() => updateVariantField(idx, "isExpanded", !v.isExpanded)}
                                  title="Packaging Tiers"
                                >
                                  <Icon icon="fluent:box-multiple-20-filled" className="text-[16px]" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteVariant(idx)}
                                  title="Delete Combination"
                                >
                                  <Icon icon="lucide:trash-2" className="text-[16px]" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded packaging tiers for this specific variant */}
                          {v.isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-muted/10 p-4 border-b border-border">
                                <div className="border border-border rounded-xl bg-card p-4 shadow-sm animate-in fade-in duration-300">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tiers for {Object.values(v.variant_attributes).join("/")}</h4>
                                    <div className="flex items-center gap-4">
                                      {trackExpiryEnabled && (
                                        <div className="flex items-center gap-2 mr-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/50">
                                          <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Track Expiry</span>
                                          <Switch
                                            checked={v.track_expiry || false}
                                            onCheckedChange={(val) => updateVariantField(idx, "track_expiry", val)}
                                          />
                                        </div>
                                      )}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1 rounded-lg text-xs"
                                        onClick={() => addVariantTier(idx)}
                                      >
                                        <Icon icon="fluent:add-12-filled" className="text-[14px]" /> Add Tier
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {renderTiersTable(v.packaging_tiers, (tiers) => updateVariantField(idx, "packaging_tiers", tiers), v.cost_price_per_base_unit)}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view stacked cards */}
                <div className="block sm:hidden space-y-3">
                  {variants.map((v, idx) => (
                    <div key={v.id} className="border border-border bg-card rounded-xl p-4 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-bold text-foreground capitalize">
                          {Object.entries(v.variant_attributes).map(([key, val]) => `${key}: ${val}`).join(", ")}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className={cn("p-1.5 rounded hover:bg-muted text-muted-foreground", v.isExpanded && "bg-muted text-foreground")}
                            onClick={() => updateVariantField(idx, "isExpanded", !v.isExpanded)}
                            title="Packaging Tiers"
                          >
                            <Icon icon="fluent:box-multiple-20-filled" className="text-base" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteVariant(idx)}
                            title="Delete Combination"
                          >
                            <Icon icon="lucide:trash-2" className="text-base" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">SKU</label>
                          <input
                            type="text"
                            required
                            className="w-full px-2.5 py-1.5 text-xs border border-border rounded bg-transparent focus:outline-none font-mono"
                            value={v.sku}
                            onChange={(e) => updateVariantField(idx, "sku", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Stock</label>
                          <input
                            type="number"
                            className="w-full px-2.5 py-1.5 text-xs border border-border rounded bg-transparent focus:outline-none"
                            value={v.stock_quantity}
                            onChange={(e) => updateVariantField(idx, "stock_quantity", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Cost</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full px-2.5 py-1.5 text-xs border border-border rounded bg-transparent focus:outline-none"
                            value={v.cost_price_per_base_unit}
                            onChange={(e) => updateVariantField(idx, "cost_price_per_base_unit", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Sell Mode</label>
                          <select
                            className="px-2.5 py-1.5 text-xs border border-border rounded bg-card focus:outline-none w-full capitalize"
                            value={v.sell_mode}
                            onChange={(e) => updateVariantField(idx, "sell_mode", e.target.value)}
                          >
                            <option value="unit_only">Unit Only</option>
                            <option value="pack_only">Pack Only</option>
                            <option value="flexible">Flexible</option>
                          </select>
                        </div>
                      </div>

                      {v.isExpanded && (
                        <div className="border border-border rounded-xl bg-muted/10 p-3 shadow-inner animate-in fade-in duration-300 space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tiers list</h4>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 rounded-lg text-[10px]"
                              onClick={() => addVariantTier(idx)}
                            >
                              <Icon icon="fluent:add-12-filled" className="text-[12px]" /> Add Tier
                            </Button>
                          </div>
                          {renderTiersTable(v.packaging_tiers, (tiers) => updateVariantField(idx, "packaging_tiers", tiers), v.cost_price_per_base_unit)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        )}

        </div>
      </div>

      <div className="pt-4 border-t border-border dark:border-gray-800 flex justify-end gap-3 mt-auto shrink-0">
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
          disabled={isLoading}
          className="bg-primary text-primary-foreground font-bold px-6 rounded-full"
        >
          {isLoading ? "Saving..." : isEditing ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
