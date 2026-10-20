import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload, UploadedFile } from '@/components/ui/file-upload';
import { Switch } from '@/components/ui/switch';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import DashboardCard from '@/components/ui/dashboard-card';
import { Globe, Save, Loader2, ExternalLink, Sparkles, Check, Trash2 } from 'lucide-react';
import CustomModal from '@/components/modals/modal';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

const AI_BANNER_PRESETS: Record<string, { label: string; icon: string; banners: string[] }> = {
  pet: {
    label: "Pets & Veterinary",
    icon: "🐾",
    banners: [
      "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=1920&q=80",
    ],
  },
  fashion: {
    label: "Fashion & Luxury",
    icon: "👗",
    banners: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1472806426350-8224672ca8e2?auto=format&fit=crop&w=1920&q=80",
    ],
  },
  beauty: {
    label: "Beauty & Wellness",
    icon: "✨",
    banners: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1608248597359-5988d44c86d8?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1920&q=80",
    ],
  },
  tech: {
    label: "Tech & Gadgets",
    icon: "📱",
    banners: [
      "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1920&q=80",
    ],
  },
  groceries: {
    label: "Gourmet & Groceries",
    icon: "☕",
    banners: [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1506484381205-f7945653044d?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1920&q=80",
    ],
  },
};

export default function StorefrontSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deploymentInfo, setDeploymentInfo] = useState<any>(null);
  const [products, setProducts] = useState<MultiSelectOption[]>([]);
  
  // AI Banner & Upload States
  const [isAiBannerModalOpen, setIsAiBannerModalOpen] = useState(false);
  const [selectedAesthetic, setSelectedAesthetic] = useState("pet");
  const [previewSelectedBanner, setPreviewSelectedBanner] = useState("");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const formik = useFormik({
    initialValues: {
      store_name: '',
      tagline: '',
      logo_url: '',
      banner_url: '',
      primary_color: '#4f46e5',
      announcement_text: '',
      announcement_active: false,
      featured_product_ids: [] as string[]
    },
    validationSchema: Yup.object({
      store_name: Yup.string().required('Store name is required'),
      tagline: Yup.string().max(100, 'Tagline must be 100 characters or less'),
      primary_color: Yup.string().required('Brand color is required'),
    }),
    onSubmit: async (values) => {
      setIsSaving(true);
      try {
        await apiClient.put('/tenant/storefront/settings', values);
        toast.success('Storefront settings saved successfully');
      } catch (error) {
        console.error('Failed to save settings:', error);
        toast.error('Failed to save settings');
      } finally {
        setIsSaving(false);
      }
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [settingsRes, deploymentRes, productsRes] = await Promise.all([
          apiClient.get('/tenant/storefront/settings'),
          apiClient.get('/tenant/storefront/deployment'),
          apiClient.get('/tenant/products') // mock exists from inventory module
        ]);

        if (settingsRes.data.data.settings) {
          formik.setValues(settingsRes.data.data.settings);
        }

        if (deploymentRes.data.data.deployment) {
          setDeploymentInfo(deploymentRes.data.data.deployment);
        }

        if (productsRes.data.data.products) {
          setProducts(productsRes.data.data.products.map((p: any) => ({
            value: p.id,
            label: p.name,
            description: p.sku
          })));
        }
      } catch (error) {
        console.error('Failed to load storefront data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogoUpload = (files: UploadedFile[]) => {
    if (files.length > 0 && files[0].preview) {
      formik.setFieldValue('logo_url', files[0].preview);
    }
  };

  const handleBannerUpload = async (files: UploadedFile[]) => {
    if (files.length > 0) {
      if (files[0].file) {
        setIsUploadingBanner(true);
        try {
          const formData = new FormData();
          formData.append('file', files[0].file);
          const res = await apiClient.post('/tenant/dashboard/my-store/banner', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const uploadedUrl = res.data?.data?.banner;
          if (uploadedUrl) {
            formik.setFieldValue('banner_url', uploadedUrl);
            toast.success('Banner uploaded successfully');
            return;
          }
        } catch (err) {
          console.error('API banner upload failed, using local preview:', err);
        } finally {
          setIsUploadingBanner(false);
        }
      }
      if (files[0].preview) {
        formik.setFieldValue('banner_url', files[0].preview);
      }
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Storefront Settings">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Storefront Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Form */}
        <div className="space-y-6">
          <form onSubmit={formik.handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              General Settings
            </h3>
            
            <div className="space-y-4">
              {/* Store Name */}
              <div className="space-y-1.5">
                <Label htmlFor="store_name">Store Display Name</Label>
                <Input
                  id="store_name"
                  {...formik.getFieldProps('store_name')}
                  placeholder="e.g. My Awesome Store"
                  className={formik.touched.store_name && formik.errors.store_name ? 'border-red-500' : ''}
                />
                {formik.touched.store_name && formik.errors.store_name && (
                  <p className="text-xs text-red-500">{formik.errors.store_name}</p>
                )}
              </div>

              {/* Tagline */}
              <div className="space-y-1.5">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  {...formik.getFieldProps('tagline')}
                  placeholder="e.g. The best products in town"
                  maxLength={100}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Shown below your store name</span>
                  <span>{formik.values.tagline.length}/100</span>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-1.5">
                <Label>Logo</Label>
                <FileUpload
                  maxFiles={1}
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={handleLogoUpload}
                />
                {formik.values.logo_url && (
                  <p className="text-xs text-success mt-1">Logo uploaded successfully.</p>
                )}
              </div>

              {/* Banner Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Banner / Hero Image</Label>
                    <p className="text-xs text-muted-foreground">High-resolution banner displayed across your storefront hero.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewSelectedBanner(formik.values.banner_url || AI_BANNER_PRESETS[selectedAesthetic].banners[0]);
                      setIsAiBannerModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs text-[#5A31F4] border-[#5A31F4]/30 hover:bg-[#5A31F4]/10 h-8 font-medium"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate with AI
                  </Button>
                </div>

                {formik.values.banner_url ? (
                  <div className="relative rounded-xl border border-border overflow-hidden group shadow-sm">
                    <img 
                      src={formik.values.banner_url} 
                      alt="Active Banner" 
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setPreviewSelectedBanner(formik.values.banner_url);
                          setIsAiBannerModalOpen(true);
                        }}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Change via AI
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => formik.setFieldValue('banner_url', '')}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <FileUpload
                    maxFiles={1}
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleBannerUpload}
                    disabled={isUploadingBanner}
                  />
                )}
                {isUploadingBanner && (
                  <p className="text-xs text-primary flex items-center gap-1.5 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading banner to cloud storage...
                  </p>
                )}
              </div>

              {/* Brand Color */}
              <div className="space-y-1.5">
                <Label htmlFor="primary_color">Brand Color</Label>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-md border border-border shadow-sm flex items-center justify-center overflow-hidden"
                  >
                    <input
                      type="color"
                      id="primary_color"
                      {...formik.getFieldProps('primary_color')}
                      className="w-[200%] h-[200%] cursor-pointer border-0 p-0 m-[-50%]"
                    />
                  </div>
                  <Input 
                    value={formik.values.primary_color}
                    onChange={formik.handleChange}
                    name="primary_color"
                    className="w-24 uppercase font-mono text-xs"
                  />
                </div>
              </div>

              {/* Announcement Bar */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Announcement Bar</Label>
                    <p className="text-sm text-muted-foreground">Display a banner at the top of your store.</p>
                  </div>
                  <Switch
                    checked={formik.values.announcement_active}
                    onCheckedChange={(checked) => formik.setFieldValue('announcement_active', checked)}
                  />
                </div>
                
                {formik.values.announcement_active && (
                  <Textarea
                    placeholder="e.g. Free shipping on all orders over GHS 500!"
                    {...formik.getFieldProps('announcement_text')}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Featured Products */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <Label>Featured Products (Homepage)</Label>
                <p className="text-xs text-muted-foreground mb-2">Select up to 6 products to highlight.</p>
                <MultiSelect
                  options={products}
                  value={formik.values.featured_product_ids}
                  onChange={(val) => formik.setFieldValue('featured_product_ids', val.slice(0, 6))}
                  placeholder="Select featured products..."
                  label="Products"
                  labelPlacement="inside"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button type="submit" disabled={isSaving || !formik.dirty} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </form>

          {/* Deployment Info Section */}
          {deploymentInfo ? (
            <DashboardCard
              title="Deployment Status"
              value="Live"
              className="border-green-500/30 bg-green-500/5 dark:bg-green-500/10"
            >
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Storefront URL:</span>
                  <a href={deploymentInfo.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline font-medium">
                    {deploymentInfo.url.replace('https://', '')} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Last Deployed:</span>
                  <span>{new Date(deploymentInfo.deployed_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Template:</span>
                  <span className="capitalize font-medium">{deploymentInfo.template}</span>
                </div>
              </div>
            </DashboardCard>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Your storefront hasn't been generated yet.</p>
              <p>Contact your HeadlessPOS administrator to set up your storefront domain and initial deployment.</p>
            </div>
          )}
        </div>

        {/* Right Column: Live Preview */}
        <div className="space-y-6">
          <div className="sticky top-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Live Preview</h3>
            
            {/* The Storefront Preview Card */}
            <div className="border-[8px] border-gray-800 dark:border-gray-700 rounded-[2rem] overflow-hidden shadow-2xl bg-white aspect-[9/16] max-w-sm mx-auto relative flex flex-col">
              
              {/* Browser/Device Top Bar */}
              <div className="h-6 w-full bg-gray-100 dark:bg-gray-800 flex justify-center items-center absolute top-0 z-20">
                <div className="w-16 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              <div className="flex-1 overflow-y-auto mt-6 bg-gray-50 flex flex-col relative pb-10">
                
                {/* Announcement Bar */}
                {formik.values.announcement_active && formik.values.announcement_text && (
                  <div 
                    className="w-full py-2 px-4 text-[10px] text-center text-white font-medium"
                    style={{ backgroundColor: formik.values.primary_color }}
                  >
                    {formik.values.announcement_text}
                  </div>
                )}

                {/* Banner Area */}
                <div 
                  className="h-32 w-full relative"
                  style={{ 
                    backgroundColor: !formik.values.banner_url ? formik.values.primary_color : 'transparent',
                    backgroundImage: formik.values.banner_url ? `url(${formik.values.banner_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-black/20" />
                </div>

                {/* Logo Overlapping Banner */}
                <div className="relative px-4 -mt-10 mb-4 z-10 flex items-end justify-between">
                  <div className="h-20 w-20 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
                    {formik.values.logo_url ? (
                      <img src={formik.values.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold" style={{ color: formik.values.primary_color }}>
                        {formik.values.store_name?.charAt(0) || 'S'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Store Name & Tagline */}
                <div className="px-4 text-center mt-2">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">
                    {formik.values.store_name || 'Store Name'}
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    {formik.values.tagline || 'Your tagline goes here'}
                  </p>
                </div>

                {/* Fake Featured Products */}
                <div className="px-4 mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Featured</h2>
                    <span className="text-[10px] text-gray-500">View All</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                        <div className="h-20 bg-gray-100" />
                        <div className="p-2">
                          <div className="h-2 bg-gray-200 rounded w-3/4 mb-1" />
                          <div className="h-2 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fake Footer */}
                <div className="mt-auto pt-8 pb-4">
                  <div className="w-full flex justify-center">
                     <div 
                       className="w-1/3 h-1 rounded-full opacity-30" 
                       style={{ backgroundColor: formik.values.primary_color }} 
                     />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      {/* AI Hero Banner Generator Modal */}
      <CustomModal
        isOpen={isAiBannerModalOpen}
        onOpenChange={() => setIsAiBannerModalOpen(!isAiBannerModalOpen)}
        size="3xl"
        header={
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#5A31F4]/10 flex items-center justify-center text-[#5A31F4]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Hero Banner Generator</h2>
              <p className="text-xs text-muted-foreground font-normal">
                Choose an aesthetic preset or select an ultra high-res AI banner tailored for your storefront.
              </p>
            </div>
          </div>
        }
        body={
          <div className="space-y-5 py-2">
            {/* Category Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Object.entries(AI_BANNER_PRESETS).map(([key, preset]) => {
                const isActive = selectedAesthetic === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedAesthetic(key);
                      setPreviewSelectedBanner(preset.banners[0]);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#5A31F4] text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Storefront Mockup Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Storefront Hero Preview
              </Label>
              <div className="relative h-52 w-full rounded-2xl overflow-hidden border border-border shadow-md bg-muted">
                {previewSelectedBanner ? (
                  <img
                    src={previewSelectedBanner}
                    alt="Preview"
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    Select a banner below to preview
                  </div>
                )}
                {/* Gradient Overlay & Live Mockup Text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 flex flex-col justify-end p-5 text-white">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-medium w-fit mb-1.5">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    <span>AI Enhanced Visuals</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">
                    {formik.values.store_name || 'Your Storefront Name'}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-1 max-w-md">
                    {formik.values.tagline || 'Premium Quality • Curated for You'}
                  </p>
                </div>
              </div>
            </div>

            {/* Gallery of Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Presets for {AI_BANNER_PRESETS[selectedAesthetic]?.label}
                </Label>
                <span className="text-xs text-muted-foreground">Click image to choose</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AI_BANNER_PRESETS[selectedAesthetic]?.banners.map((url, idx) => {
                  const isChosen = previewSelectedBanner === url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewSelectedBanner(url)}
                      className={`relative aspect-[16/10] rounded-xl overflow-hidden border-2 transition-all group ${
                        isChosen
                          ? 'border-[#5A31F4] ring-2 ring-[#5A31F4]/30 shadow-md'
                          : 'border-transparent hover:border-border opacity-85 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Option ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {isChosen && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#5A31F4] text-white flex items-center justify-center shadow-md">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAiBannerModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#5A31F4] hover:bg-[#4924cf] text-white flex items-center gap-1.5"
              disabled={!previewSelectedBanner}
              onClick={() => {
                formik.setFieldValue('banner_url', previewSelectedBanner);
                setIsAiBannerModalOpen(false);
                toast.success('Hero banner updated! Click "Save Changes" to publish to your storefront.');
              }}
            >
              <Check className="h-4 w-4" />
              Apply Banner
            </Button>
          </div>
        }
      />
    </PageLayout>
  );
}

