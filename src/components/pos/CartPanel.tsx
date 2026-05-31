import React, { useState, useRef, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import {
  Trash2,
  Plus,
  Minus,
  ChevronRight,
  Ticket,
  ShoppingCart,
  Box,
} from "lucide-react";
import PaymentModal from "./PaymentModal";
import { Button } from "../ui/button";

export default function CartPanel() {
  const {
    items,
    subtotal,
    discount,
    total,
    removeItem,
    updateQuantity,
    clearCart,
    setDiscount,
  } = useCartStore();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<
    "cash" | "mobile_money" | "card"
  >("card");
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const itemsLength = items.length;
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [itemsLength]);

  useEffect(() => {
    if (isPromoApplied) {
      setDiscount(subtotal * 0.1);
    } else {
      setDiscount(0);
    }
  }, [subtotal, isPromoApplied, setDiscount]);

  const taxRate = 0.12;
  const taxAmount = subtotal * taxRate;
  const calculatedTotal = subtotal + taxAmount - discount;

  return (
    <div className="flex flex-col h-full bg-secondary border rounded-[24px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-[18px] font-bold text-foreground">
          Detail Transaction
        </h2>
        <Button
          variant="outline"
          onClick={clearCart}
          disabled={items.length === 0}
          className="flex items-center gap-1.5 rounded-full bg-background border border-border text-destructive hover:bg-destructive/10 hover:text-destructive h-9 px-3 text-[13px] font-semibold shadow-none"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Reset Order
        </Button>
      </div>

      {/* Cart Items */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 space-y-3 scrollbar-hide pb-4"
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-10">
            <div className="h-24 w-24 bg-muted/50 rounded-full flex items-center justify-center mb-2">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-[15px] font-bold text-foreground">
              Your cart is empty
            </p>
            <p className="text-[13px] text-muted-foreground/80 max-w-[220px] text-center leading-relaxed">
              Tap items from the product grid to add them to the transaction.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-3 p-3 rounded-[20px] bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* Image */}
              <div className="w-[88px] h-[88px] rounded-[14px] flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover mix-blend-multiply"
                  />
                ) : (
                  <Box className="h-9 w-9 text-muted-foreground/30 stroke-[1.5]" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                {/* Top row */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-bold text-[14px] text-foreground line-clamp-1 tracking-tight pr-2">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="border border-border rounded-full px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Size 42
                      </span>
                      <span className="border border-border rounded-full px-2 py-0.5 text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600 inline-block"></span>
                        Green
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeItem(item.productId)}
                    className="h-8 w-8 rounded-full shrink-0 bg-[#e6173a] hover:bg-[#d80028] shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Bottom row: qty + total */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 bg-secondary rounded-full px-1 py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      className="h-7 w-7 rounded-full hover:bg-black/5 text-foreground"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-bold text-[13px] w-6 text-center">
                      {item.quantity.toString().padStart(2, "0")}
                    </span>
                    <Button
                      size="icon"
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      className="h-7 w-7 rounded-full bg-primary hover:brightness-95 text-primary-foreground shadow-sm"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="font-bold text-[14px] text-foreground tracking-tight">
                    <span className="text-muted-foreground text-[12px] font-semibold mr-1">
                      Total
                    </span>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Summary */}
              {items.length > 0 && (

      <div className="px-5 pb-5 pt-2 rounded-t-2xl bg-transparent flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 bg-card border rounded-[1.55rem] px-2 py-2 ">
            {/* Promo */}
            <div className="flex items-center justify-between p-2 rounded-full bg-secondary">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 flex items-center justify-center">
                  <Ticket
                    className="h-4.5 w-4.5"
                    style={{ height: "18px", width: "18px" }}
                  />
                </div>
                <p className="text-[14px] font-bold text-foreground">
                  Promo New User (10%)
                </p>
              </div>
              <Button
                onClick={() => setIsPromoApplied(!isPromoApplied)}
                className={`rounded-full h-9 px-4 text-[13px] font-bold shadow-none border-none transition-colors ${
                  isPromoApplied
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-primary text-primary-foreground hover:brightness-95"
                }`}
              >
                {isPromoApplied ? "Remove Promo" : "Change Promo"}
              </Button>
            </div>

            {/* Totals */}
            <div className="space-y-2.5 p-3 border rounded-[1.25rem]">
              <div className="flex justify-between text-[14px]">
                <span className="text-muted-foreground font-medium">
                  Sub-Total
                </span>
                <span className="text-foreground font-semibold">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-muted-foreground font-medium">
                  Tax (12%)
                </span>
                <span className="text-foreground font-semibold">
                  ${taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-muted-foreground font-medium">
                  Discount
                </span>
                <span className="text-foreground font-semibold">
                  -${discount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[16px] font-bold text-foreground pt-1">
                <span>Total Payment</span>
                <span>${calculatedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

        {/* Payment Method */}
        <div className="flex items-center justify-between bg-card py-2.5 px-4 rounded-full">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              <div className="h-6 w-6 rounded-full bg-red-500"></div>
              <div className="h-6 w-6 rounded-full bg-yellow-400"></div>
            </div>
            <span className="font-semibold text-[14px]">Credit Card</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setDefaultPaymentMethod("card");
              setIsPaymentModalOpen(true);
            }}
            className="flex items-center gap-0.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-transparent px-1 h-auto py-1"
          >
            Change Method <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Continue */}
        <Button
          onClick={() => setIsPaymentModalOpen(true)}
          disabled={items.length === 0}
          className="w-full py-4 font-bold text-[16px] rounded-full h-auto"
        >
          Continue
        </Button>

      </div>
      )}


      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultMethod={defaultPaymentMethod}
      />
    </div>
  );
}
