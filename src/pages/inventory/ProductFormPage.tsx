import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductForm, { type ProductSaveResult } from "@/components/inventory/ProductForm";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import PageLayout from "@/components/layout/PageLayout";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!id) {
      setProductData(null);
      return;
    }
    setLoading(true);
    apiClient.get(`/tenant/products/${id}`)
      .then((res) => {
        const product = res.data.success?.data?.product;
        if (product) {
          setProductData(product);
        } else {
          toast.error("Product details not found");
          navigate("/inventory/products");
        }
      })
      .catch((err) => {
        console.error("Failed to load product details:", err);
        toast.error("Failed to load product details");
        navigate("/inventory/products");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // Warn before closing / reloading the tab with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const leave = () => {
    dirtyRef.current = false;
    setShowLeaveConfirm(false);
    navigate("/inventory/products");
  };

  const requestLeave = () => {
    if (dirtyRef.current) setShowLeaveConfirm(true);
    else leave();
  };

  const handleSuccess = ({ productId, created, warning, madeInHouse }: ProductSaveResult) => {
    dirtyRef.current = false;
    if (warning) {
      // Saved, but images didn't finish — reopen the saved product (no duplicate on retry)
      toast.error(warning, { duration: 7000 });
      if (created) navigate(`/inventory/products/${productId}/edit`, { replace: true });
      return;
    }
    toast.success(created ? "Product created" : "Product updated");
    navigate(created && madeInHouse ? `/inventory/products?recordBatch=${productId}` : "/inventory/products");
  };

  return (
    <PageLayout
      title={id ? "Edit Product" : "Add New Product"}
      showBackButton={true}
      backUrl="/inventory/products"
      onBackClick={requestLeave}
      className="max-w-5xl mx-auto"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading product details…</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto py-2">
          <ProductForm
            key={id || "new"}
            initialData={productData}
            onSuccess={handleSuccess}
            onCancel={requestLeave}
            onDirtyChange={handleDirtyChange}
          />
        </div>
      )}

      <CustomModal
        isOpen={showLeaveConfirm}
        onOpenChange={() => setShowLeaveConfirm(false)}
        size="sm"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-2">
            <h3 className="text-base font-bold text-foreground">Discard your changes?</h3>
          </div>
        }
        body={
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              You have unsaved changes to this product. If you leave now, they'll be lost.
            </p>
          </div>
        }
        footer={
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowLeaveConfirm(false)} className="font-medium">
              Keep editing
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={leave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              Discard
            </Button>
          </div>
        }
      />
    </PageLayout>
  );
}
