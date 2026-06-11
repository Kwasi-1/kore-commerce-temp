import React, { useState, useEffect, useMemo } from "react";
import { 
  Check, 
  ArrowLeft, 
  RotateCcw, 
  UserCheck, 
  KeyRound, 
  AlertTriangle, 
  ShoppingBag, 
  Sparkles,
  ClipboardList,
  CheckCircle,
  XCircle,
  Printer
} from "lucide-react";
import CustomModal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import { useCurrency } from "@/hooks/useCurrency";

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any; // original transaction data
  onSuccess: () => void;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

export default function ReturnModal({ 
  isOpen, 
  onClose, 
  transaction, 
  onSuccess 
}: ReturnModalProps) {
  const { formatGHS, formatAmount } = useCurrency();
  
  // Step tracker
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  
  // Step 1: Selected items & quantities
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; checked: boolean }>>({});
  
  // Step 2: Item conditions (sellable / damaged)
  const [itemConditions, setItemConditions] = useState<Record<string, "sellable" | "damaged">>({});
  
  // Step 3: Return details
  const [reason, setReason] = useState("defective");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  
  // Step 4: Manager approval
  const [managers, setManagers] = useState<Staff[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 5: Success & Receipt print
  const [createdReturn, setCreatedReturn] = useState<any>(null);

  // Initialize selected items and conditions when transaction changes
  useEffect(() => {
    if (transaction && transaction.items) {
      const initialSelected: Record<string, { quantity: number; checked: boolean }> = {};
      const initialConditions: Record<string, "sellable" | "damaged"> = {};
      
      transaction.items.forEach((item: any, idx: number) => {
        const key = `${item.variant_id || item.id || idx}`;
        initialSelected[key] = {
          quantity: item.quantity || 1,
          checked: false
        };
        initialConditions[key] = "sellable";
      });
      
      setSelectedItems(initialSelected);
      setItemConditions(initialConditions);
      setStep(1);
      setPinCode("");
      setNotes("");
      setReason("defective");
      setRefundMethod("cash");
      setCreatedReturn(null);
    }
  }, [transaction]);

  // Load manager staff for PIN authorization
  useEffect(() => {
    if (isOpen) {
      apiClient.get("/tenant/staff")
        .then(res => {
          const staffList = res.data.data?.staff || [];
          const managersList = staffList.filter((s: Staff) => s.role === "owner" || s.role === "manager");
          setManagers(managersList);
          if (managersList.length > 0) {
            setSelectedManagerId(managersList[0].id);
          }
        })
        .catch(err => {
          console.error("Failed to load staff list for return approval:", err);
        });
    }
  }, [isOpen]);

  // Calculations
  const refundTotal = useMemo(() => {
    if (!transaction || !transaction.items) return 0;
    return transaction.items.reduce((sum: number, item: any, idx: number) => {
      const key = `${item.variant_id || item.id || idx}`;
      const state = selectedItems[key];
      if (state && state.checked) {
        const price = item.price || (item.subtotal / item.quantity) || 0;
        return sum + (price * state.quantity);
      }
      return sum;
    }, 0);
  }, [transaction, selectedItems]);

  const hasSelectedItems = useMemo(() => {
    return Object.values(selectedItems).some(item => item.checked);
  }, [selectedItems]);

  const handleToggleItem = (key: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        checked: !prev[key].checked
      }
    }));
  };

  const handleQtyChange = (key: string, val: number, maxQty: number) => {
    const qty = Math.min(Math.max(1, val), maxQty);
    setSelectedItems(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        quantity: qty
      }
    }));
  };

  const handleConditionChange = (key: string, cond: "sellable" | "damaged") => {
    setItemConditions(prev => ({
      ...prev,
      [key]: cond
    }));
  };

  const handlePinKeyPress = (digit: string) => {
    if (pinCode.length < 4) {
      setPinCode(prev => prev + digit);
    }
  };

  const handlePinBackspace = () => {
    setPinCode(prev => prev.slice(0, -1));
  };

  const handleSubmitReturn = async () => {
    if (!transaction) return;
    if (pinCode.length !== 4) {
      toast.error("Please enter a 4-digit PIN code.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build returned items payload
      const returnItems = transaction.items.map((item: any, idx: number) => {
        const key = `${item.variant_id || item.id || idx}`;
        const selection = selectedItems[key];
        if (selection && selection.checked) {
          return {
            variant_id: item.variant_id || item.id,
            product_name: item.productName || item.name,
            packaging_tier_id: item.packaging_tier_id || null,
            packaging_tier_name: item.packaging_tier_name || "Unit",
            quantity: selection.quantity,
            unit_price: item.price || (item.subtotal / item.quantity) || 0,
            condition: itemConditions[key]
          };
        }
        return null;
      }).filter(Boolean);

      // 1. Create return request
      const returnRes = await apiClient.post("/pos/returns", {
        original_transaction_id: transaction.id,
        reason,
        notes,
        refund_method: refundMethod,
        items: returnItems
      });

      const returnId = returnRes.data.data.return.id;

      // 2. Approve return request with PIN in one flow
      const approveRes = await apiClient.post(`/pos/returns/${returnId}/approve`, {
        approver_pin: pinCode
      });

      setCreatedReturn(approveRes.data.data.return);
      toast.success("Return processed and approved successfully!");
      setStep(5);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || "Failed to process return approval";
      toast.error(msg);
      setPinCode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById("return-receipt-print");
    if (!printContent) return;
    
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // restore react app
  };

  // Helper labels
  const reasonLabels: Record<string, string> = {
    defective: "Defective / Damaged",
    wrong_item: "Wrong Item Delivered",
    customer_change: "Customer Changed Mind",
    other: "Other Reason"
  };

  const methodLabels: Record<string, string> = {
    cash: "Cash Refund",
    mobile_money: "Mobile Money (MoMo)",
    card: "Card Credit"
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="md"
      placement="center"
      header={
        <div className="pt-2 px-2 text-left">
          <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-1">Return Order Process</span>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Refund Transaction
          </h2>
          {transaction && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Ref: <span className="font-mono font-semibold">{transaction.receiptNumber}</span> · Total Paid: {formatGHS(transaction.totalAmount)}
            </p>
          )}
        </div>
      }
      body={
        <div className="py-2 text-left">
          {/* STEP 1: Select Items & Qty */}
          {step === 1 && transaction && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-3.5 rounded-xl border flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-primary shrink-0" />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Select which items the customer is returning. You can adjust the quantity to execute partial returns.
                </p>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {transaction.items?.map((item: any, idx: number) => {
                  const key = `${item.variant_id || item.id || idx}`;
                  const state = selectedItems[key] || { quantity: 1, checked: false };
                  const itemPrice = item.price || (item.subtotal / item.quantity) || 0;
                  
                  return (
                    <div 
                      key={key} 
                      onClick={() => handleToggleItem(key)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between hover:bg-muted/10 ${
                        state.checked ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          state.checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 bg-background"
                        }`}>
                          {state.checked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="text-left min-w-0 pr-2">
                          <p className="text-xs font-bold text-foreground truncate capitalize">
                            {item.productName || item.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                            {formatGHS(itemPrice)} / {item.packaging_tier_name || "Unit"} · Max Qty: {item.quantity}
                          </p>
                        </div>
                      </div>

                      {state.checked && (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="flex items-center gap-2 bg-background border rounded-lg p-1 shadow-sm shrink-0"
                        >
                          <button 
                            type="button"
                            onClick={() => handleQtyChange(key, state.quantity - 1, item.quantity)}
                            className="h-6 w-6 rounded-md hover:bg-muted font-bold text-sm flex items-center justify-center active:scale-95"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold w-6 text-center">{state.quantity}</span>
                          <button 
                            type="button"
                            onClick={() => handleQtyChange(key, state.quantity + 1, item.quantity)}
                            className="h-6 w-6 rounded-md hover:bg-muted font-bold text-sm flex items-center justify-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-xs text-muted-foreground">
                  Refund Total: <strong className="text-foreground text-sm font-bold">{formatGHS(refundTotal)}</strong>
                </span>
                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!hasSelectedItems} 
                  className="bg-primary rounded-xl h-10 px-6 font-semibold text-xs"
                >
                  Continue to Audit
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Condition Audit */}
          {step === 2 && transaction && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-3.5 rounded-xl border flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Audit the items condition. <strong>Sellable</strong> items return to stock. <strong>Damaged</strong> items are logged as write-offs.
                </p>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {transaction.items?.map((item: any, idx: number) => {
                  const key = `${item.variant_id || item.id || idx}`;
                  const state = selectedItems[key];
                  if (!state || !state.checked) return null;

                  const condition = itemConditions[key] || "sellable";

                  return (
                    <div key={key} className="p-3.5 border rounded-xl bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground capitalize truncate">
                          {item.productName || item.name}
                        </span>
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold">
                          Qty: {state.quantity}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleConditionChange(key, "sellable")}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                            condition === "sellable"
                              ? "border-green-500 bg-green-500/5 text-green-600 dark:text-green-400"
                              : "border-border hover:bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          Sellable (Restock)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConditionChange(key, "damaged")}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                            condition === "damaged"
                              ? "border-destructive bg-destructive/5 text-destructive"
                              : "border-border hover:bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          Damaged (Write-off)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(1)} 
                  className="rounded-xl h-10 gap-1 text-xs"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="bg-primary rounded-xl h-10 px-6 font-semibold text-xs"
                >
                  Continue to Details
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Return Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Reason for Return *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 px-3 py-2 border rounded-xl bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="defective">Defective / Damaged Item</option>
                  <option value="wrong_item">Wrong Item Delivered</option>
                  <option value="customer_change">Customer Changed Mind</option>
                  <option value="other">Other Reason</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Refund Method *
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full h-10 px-3 py-2 border rounded-xl bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="cash">Cash Refund</option>
                  <option value="mobile_money">Mobile Money (MoMo)</option>
                  <option value="card">Card Refund</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Return Notes (Optional)
                </label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide any additional comments about the customer's request..."
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Refund Amount:</span>
                  <span className="font-bold text-foreground text-sm">{formatGHS(refundTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span>Method Selected:</span>
                  <span className="font-semibold capitalize text-foreground">{refundMethod.replace("_", " ")}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(2)} 
                  className="rounded-xl h-10 gap-1 text-xs"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={() => setStep(4)} 
                  className="bg-primary rounded-xl h-10 px-6 font-semibold text-xs"
                >
                  Go to Authorize
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Manager Approval PIN Pad */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  Select Approving Manager *
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full h-10 px-3 py-2 border rounded-xl bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                  {managers.length === 0 && (
                    <option value="">No managers found</option>
                  )}
                </select>
              </div>

              {/* PIN Code Dots Indicators */}
              <div className="flex justify-center gap-4 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`h-4.5 w-4.5 rounded-full border-2 transition-all ${
                      pinCode.length > idx
                        ? "bg-primary border-primary scale-110"
                        : "bg-transparent border-border"
                    }`}
                  />
                ))}
              </div>

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto pb-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinKeyPress(digit)}
                    className="h-12 w-12 rounded-full border bg-muted/30 hover:bg-muted font-bold text-base text-foreground flex items-center justify-center transition-colors shadow-sm focus:outline-none active:scale-95"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPinCode("")}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center justify-center focus:outline-none active:scale-95"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinKeyPress("0")}
                  className="h-12 w-12 rounded-full border bg-muted/30 hover:bg-muted font-bold text-base text-foreground flex items-center justify-center transition-colors shadow-sm focus:outline-none active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center justify-center focus:outline-none active:scale-95"
                >
                  Delete
                </button>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(3)} 
                  disabled={isSubmitting}
                  className="rounded-xl h-10 gap-1 text-xs"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                
                <Button 
                  onClick={handleSubmitReturn} 
                  disabled={isSubmitting || pinCode.length !== 4} 
                  className="bg-green-500 hover:bg-green-600 text-white rounded-xl h-10 px-6 font-bold text-xs min-w-[120px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Authorize"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Success & Receipt Print */}
          {step === 5 && createdReturn && (
            <div className="space-y-6 text-center py-4">
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-12 w-12 text-green-500 animate-bounce" />
                <h3 className="text-base font-bold text-foreground">Refund Authorized</h3>
                <p className="text-xs text-muted-foreground">The transaction return has been recorded successfully.</p>
              </div>

              {/* Receipt Preview */}
              <div 
                id="return-receipt-print"
                className="bg-white text-zinc-950 p-6 rounded-xl border font-sans text-xs space-y-4 max-w-[320px] mx-auto text-left shadow-sm print:border-none print:shadow-none"
              >
                <div className="text-center pb-3 border-b border-dashed border-zinc-200">
                  <span className="border border-red-500 text-red-500 font-extrabold px-3 py-1 rounded text-[10px] tracking-widest inline-block uppercase rotate-[-5deg] mb-3">
                    Customer Return
                  </span>
                  <h4 className="font-bold text-sm tracking-wider uppercase">{createdReturn.storeName || "VYSION LABS POS"}</h4>
                  <p className="text-[9px] text-zinc-500">REFUND RECEIPT</p>
                </div>

                <div className="space-y-1 text-[10px] pb-3 border-b border-dashed border-zinc-200">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Return ID:</span>
                    <span className="font-mono font-bold text-zinc-900">{createdReturn.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Orig Receipt #:</span>
                    <span className="font-mono text-zinc-900">{createdReturn.original_transaction_ref}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Date Processed:</span>
                    <span>{new Date(createdReturn.approved_at || createdReturn.date_created).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Auth Manager:</span>
                    <span className="font-semibold">{createdReturn.approved_by_name}</span>
                  </div>
                </div>

                {/* Items returned list */}
                <div className="pb-3 border-b border-dashed border-zinc-200">
                  <div className="flex text-[9px] font-bold pb-1 text-zinc-900 border-b border-zinc-100 mb-1.5 uppercase">
                    <span className="flex-1">Item</span>
                    <span className="w-12 text-center">Qty</span>
                    <span className="w-16 text-right">Refund</span>
                  </div>
                  <div className="space-y-1">
                    {createdReturn.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-start text-[10px]">
                        <div className="flex-1 pr-1 capitalize">
                          <p className="font-medium leading-none text-zinc-900">{item.product_name}</p>
                          <span className="text-[8px] text-zinc-400 capitalize">Condition: {item.condition}</span>
                        </div>
                        <span className="w-12 text-center text-zinc-500">{item.quantity}</span>
                        <span className="w-16 text-right font-semibold text-zinc-950">
                          {formatGHS(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-between items-center font-bold text-sm text-zinc-950 uppercase pt-1.5">
                  <span>Total Refunded</span>
                  <span>{formatGHS(createdReturn.total_refund_amount)}</span>
                </div>

                <div className="text-center text-[9px] text-zinc-400 font-semibold pt-4 border-t border-dashed border-zinc-200 uppercase tracking-widest">
                  <span>Refund Method: {methodLabels[createdReturn.refund_method] || createdReturn.refund_method}</span>
                </div>
              </div>

              {/* Success footer options */}
              <div className="flex gap-2 justify-center pt-2">
                <Button 
                  onClick={handlePrintReceipt}
                  variant="outline"
                  className="rounded-xl h-10 border-border gap-1.5 text-xs font-semibold"
                >
                  <Printer className="h-4 w-4" /> Print Receipt
                </Button>
                <Button 
                  onClick={() => {
                    onClose();
                    onSuccess();
                  }}
                  className="bg-primary rounded-xl h-10 px-6 text-xs font-semibold"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      }
      footer={null}
    />
  );
}
