import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductForm from "@/components/inventory/ProductForm";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import PageLayout from "@/components/layout/PageLayout";
import { Loader2 } from "lucide-react";

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      setLoading(true);
      apiClient.get(`/tenant/products/${id}`)
        .then((res) => {
          const product = res.data.data?.product;
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
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, navigate]);

  const handleSuccess = () => {
    toast.success(id ? "Product updated successfully!" : "Product created successfully!");
    navigate("/inventory/products");
  };

  const handleCancel = () => {
    navigate("/inventory/products");
  };

  return (
    <PageLayout
      title={id ? "Edit Product" : "Add New Product"}
      showBackButton={true}
      backUrl="/inventory/products"
      className="max-w-4xl mx-auto"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading product details…</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto py-2">
          <ProductForm
            initialData={productData}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      )}
    </PageLayout>
  );
}
