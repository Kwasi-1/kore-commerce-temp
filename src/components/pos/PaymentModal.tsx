import React, { useState, useEffect, useMemo, useRef } from 'react';
import { posTotals } from '@/utils/posTotals';
import { createPortal } from 'react-dom';
import { lineDiscountAmount, lineTotal, useCartStore } from '@/store/cartStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFeaturesStore } from '@/store/featuresStore';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';
import { CurrencyDisplay, useReceiptHeader, useQuantityFormatter, formatPhoneNumber, isValidGhanaPhone } from '@/hooks';
import { CheckCircle2, Printer, CreditCard, Loader2, ChevronDown, Lock, WifiOff, Clock, AlertTriangle, UserCheck, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomModal from '@/components/modals/modal';
import { Icon } from '@iconify/react';
import PaymentMethodVisual from './PaymentMethodVisual';
import MomoPrompt, { type MomoAction } from './MomoPrompt';
import SplitMomoPrompt from './SplitMomoPrompt';
import RecoverableMomo, { type RecoverableCharge } from './RecoverableMomo';
import { CustomInputTextField, SearchableSelectField } from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';
import { Switch } from '@nextui-org/react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { useTillBusyStore } from '@/hooks/useIdleLock';
import { useCan } from '@/hooks/usePermissions';
import { APP_CONFIG } from '@/config/app.config';
import { getReceiptPrefix, generatePosOrderNumber } from '@/utils/receipt';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMethod?: 'cash' | 'mobile_money' | 'card';
}

type SplitMethod = 'cash' | 'mobile_money' | 'card' | 'credit';
interface SplitLine {
  id: string; method: SplitMethod; amount: string; momo?: string; txn?: string;
  /** MoMo part: confirmed by the cashier instead of a prompt */
  manual?: boolean;
  /** MoMo part paid through a prompt (Paystack reference and the number that paid) */
  paidRef?: string; paidPhone?: string;
  /** MoMo part: a prompt is out */
  pending?: boolean;
}
const SPLIT_LABEL: Record<SplitMethod, string> = { cash: 'Cash', mobile_money: 'MoMo', card: 'Card', credit: 'Credit' };
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
// Money as typed: digits, one point, two decimals
const cleanMoney = (raw: string) => {
  const t = raw.replace(/[^\d.]/g, '');
  const dot = t.indexOf('.');
  return dot === -1 ? t.slice(0, 7) : t.slice(0, dot).slice(0, 7) + '.' + t.slice(dot + 1).replace(/\./g, '').slice(0, 2);
};

export default function PaymentModal({ isOpen, onClose, defaultMethod = 'cash' }: PaymentModalProps) {
  const { items, subtotal, discount, discountApproval, clearCart } = useCartStore();

  const [activeTab, setActiveTab] = useState<'cash' | 'mobile_money' | 'card' | 'split'>(defaultMethod);
  // Split payment: paid several ways (e.g. part cash, part MoMo, rest on credit)
  const [splitLines, setSplitLines] = useState<SplitLine[]>([]);
  // MoMo prompt to the customer's phone (when the shop is set up for it); "manual" = cashier-confirmed
  const [momoManual, setMomoManual] = useState(false);
  const promptPaid = useRef<{ reference: string; phone: string; amount: number } | null>(null);
  // This cashier's recently paid prompts that aren't on a sale (e.g. the window was closed too soon)
  const [recoverable, setRecoverable] = useState<RecoverableCharge[]>([]);
  const [completeRecovered, setCompleteRecovered] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // What the bottom button does while a MoMo prompt is in use (see MomoPrompt)
  const [momoAction, setMomoAction] = useState<MomoAction | null>(null);
  const [amountTenderedStr, setAmountTenderedStr] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  // Transaction ID from the MoMo alert (manual MoMo): proof of payment for disputes
  const [momoTxnId, setMomoTxnId] = useState('');
  const [showOffline, setShowOffline] = useState(false);

  // Credit Toggle & Customer Autocomplete
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [debtorsList, setDebtorsList] = useState<any[]>([]);
  const [isLoadingDebtors, setIsLoadingDebtors] = useState(false);

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOfflineSale, setIsOfflineSale] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [frozenCart, setFrozenCart] = useState<any>(null);

  // Mobile-only: collapsible item list inside the compact summary
  const [mobileItemsExpanded, setMobileItemsExpanded] = useState(false);

  const { storeName, storeLocation, storePhone } = useReceiptHeader(receiptData);
  const { formatQuantity, formatQuantityWithUnit } = useQuantityFormatter();
  const { posSettings, storeSettings } = useSettingsStore();
  const tenant = useAuthStore((state) => state.tenant);
  const staffUser = useAuthStore((state) => state.staffUser);

  const { posSettings: featureSettings, getEffectivePaymentMethods } = useFeaturesStore();
  const can = useCan();

  // Network & offline queue
  const { isOnline } = useNetworkStatus();
  const { enqueue } = useOfflineQueueStore();

  // Tax is added on top of (subtotal - discount) when turned on in POS settings; `total` is what
  // the customer pays (the server works it out the same way)
  const { taxRate, taxLabel, taxPercent, tax, total } = posTotals(subtotal, discount, featureSettings);

  // Enabled payment methods derived centrally from featuresStore
  const ALL_TABS = [
    { id: 'cash',         label: 'Cash', requiresOnline: false },
    { id: 'mobile_money', label: 'MoMo', requiresOnline: false },
    { id: 'card',         label: 'Card', requiresOnline: false },
  ] as const;

  const enabledMethods = getEffectivePaymentMethods();

  // Active payment tabs: filter by enabled methods in POS settings
  // If offline, online-only tabs (like Card) are filtered out of active tabs
  const methodTabs = ALL_TABS.filter((t) => {
    if (!enabledMethods.includes(t.id)) return false;
    if (!isOnline && t.requiresOnline) return false;
    return true;
  });
  const splitEnabled = !!featureSettings.pos_split_payment_enabled;
  const paymentTabs: { id: 'cash' | 'mobile_money' | 'card' | 'split'; label: string }[] = [
    ...methodTabs,
    ...(splitEnabled ? [{ id: 'split' as const, label: 'Split' }] : []),
  ];

  // Gateway-only tabs shown as locked when offline
  const lockedGatewayTabs = !isOnline
    ? ALL_TABS.filter((t) => t.requiresOnline && enabledMethods.includes(t.id))
    : [];

  // Resolve default tab: prefer defaultMethod if available, else cash, else first available
  const resolveDefault = (preferred: string): 'cash' | 'mobile_money' | 'card' => {
    const ids = paymentTabs.map((t) => t.id);
    if (ids.includes(preferred as any)) return preferred as any;
    if (ids.includes('cash')) return 'cash';
    return (ids[0] as any) || 'cash';
  };

  // The idle lock waits while the payment window is open
  useEffect(() => {
    if (!isOpen) return;
    useTillBusyStore.getState().setBusy(true);
    return () => useTillBusyStore.getState().setBusy(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(resolveDefault(defaultMethod));
      setSplitLines([]);
      setMomoManual(false);
      promptPaid.current = null;
      setCompleteRecovered(false);
      setConfirmClose(false);
      setAmountTenderedStr('');
      setMomoNumber('');
      setMomoTxnId('');
      setIsCreditSale(false);
      setCustomerName('');
      setCustomerPhone('');
      setIsSuccess(false);
      setIsOfflineSale(false);
      setReceiptData(null);
      setFrozenCart(null);
      setMobileItemsExpanded(false);
    }
  }, [isOpen, defaultMethod]);

  // Load existing debtors for credit autocomplete
  useEffect(() => {
    if (isOpen && featureSettings.pos_credit_enabled) {
      const loadDebtors = async () => {
        setIsLoadingDebtors(true);
        try {
          const res = await apiClient.get('/pos/credit-ledger');
          const debtors = res.data.success?.data?.debtors || [];
          setDebtorsList(debtors);
          try {
            localStorage.setItem('pos_credit_debtors_active', JSON.stringify(debtors));
          } catch {}
        } catch (err) {
          console.error('Failed to load debtors for credit selector', err);
          try {
            const cached = localStorage.getItem('pos_credit_debtors_active');
            if (cached) {
              setDebtorsList(JSON.parse(cached));
            }
          } catch {}
        } finally {
          setIsLoadingDebtors(false);
        }
      };
      loadDebtors();
    }
  }, [isOpen, featureSettings.pos_credit_enabled]);

  const customerOptions = debtorsList.map((d: any) => ({
    label: d.name,
    value: d.name,
    description: d.phone ? `${d.phone}${d.outstanding_debt ? ` · Debt: GHS ${Number(d.outstanding_debt).toFixed(2)}` : ''}` : undefined,
    phone: d.phone || '',
  }));

  // Normalize phone number (match last 9 digits or exact digits)
  const normalizePhone = (p?: string) => (p ? p.replace(/\D/g, '').slice(-9) : '');

  const matchedDebtorByPhone = useMemo(() => {
    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 8) return null;
    const currentClean = normalizePhone(customerPhone);
    return debtorsList.find((d: any) => {
      const debtorClean = normalizePhone(d.phone);
      return debtorClean && debtorClean === currentClean;
    });
  }, [customerPhone, debtorsList]);

  // Is there a name mismatch between entered name and existing debtor for this phone number?
  const hasNameMismatch = useMemo(() => {
    if (!matchedDebtorByPhone || !customerName.trim()) return false;
    return customerName.trim().toLowerCase() !== matchedDebtorByPhone.name.trim().toLowerCase();
  }, [matchedDebtorByPhone, customerName]);

  const amountTendered = parseFloat(amountTenderedStr) || 0;
  const change = Math.max(0, amountTendered - total);

  // Split payment totals (the server checks the same: only cash can be more than what's left)
  const isSplit = !isCreditSale && activeTab === 'split';
  const splitPaid = r2(splitLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0));
  const splitCash = r2(splitLines.filter((l) => l.method === 'cash').reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0));
  const splitRemaining = r2(total - splitPaid);
  const splitChange = r2(Math.max(0, splitPaid - total));
  const splitHasCredit = isSplit && splitLines.some((l) => l.method === 'credit');
  // A MoMo part is paid by a prompt when the shop is set up for it and the till is online (a prompt
  // already out or paid stays one), otherwise confirmed by the cashier
  const momoPromptsReady = useFeaturesStore((st) => st.momo_prompts_ready);
  const linePrompted = (l: SplitLine) =>
    l.method === 'mobile_money' && !l.manual && (!!l.paidRef || !!l.pending || (momoPromptsReady && isOnline));
  const splitPending = isSplit && splitLines.some((l) => l.pending);
  const splitProblem = !isSplit
    ? null
    : splitLines.length === 0
    ? 'Add how the customer is paying'
    : splitLines.some((l) => !(parseFloat(l.amount) > 0))
    ? 'Each payment needs an amount'
    : splitRemaining > 0.001
    ? `GHS ${splitRemaining.toFixed(2)} is still to pay`
    : splitChange > splitCash + 0.001
    ? 'Only cash can be more than what\'s left (for change)'
    : splitPending
    ? 'Wait for the customer to approve the MoMo prompt'
    : splitLines.some((l) => linePrompted(l) && !l.paidRef)
    ? 'Send the MoMo prompt, or confirm it manually'
    : featureSettings.pos_require_momo_txn_id && splitLines.some((l) => l.method === 'mobile_money' && !linePrompted(l) && !l.txn?.trim())
    ? 'Enter the MoMo transaction ID'
    : null;
  const splitAddable: SplitMethod[] = [
    ...methodTabs.map((t) => t.id as SplitMethod).filter((m) => !splitLines.some((l) => l.method === m)),
    ...(featureSettings.pos_credit_enabled && !splitLines.some((l) => l.method === 'credit') ? ['credit' as SplitMethod] : []),
  ];
  const addSplit = (method: SplitMethod) =>
    setSplitLines((lines) => [...lines, { id: crypto.randomUUID(), method, amount: splitRemaining > 0 ? splitRemaining.toFixed(2) : '' }]);
  const updateSplit = (id: string, patch: Partial<SplitLine>) =>
    setSplitLines((lines) => lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeSplit = (id: string) => {
    const line = splitLines.find((l) => l.id === id);
    // A paid MoMo part taken off is offered again (it's still paid and not on a sale)
    if (line?.paidRef) {
      const paid = { reference: line.paidRef, phone: line.paidPhone || '', amount: parseFloat(line.amount) || 0, paid_at: new Date().toISOString() };
      setRecoverable((list) => [paid, ...list.filter((c) => c.reference !== paid.reference)]);
    }
    setSplitLines((lines) => lines.filter((l) => l.id !== id));
  };
  const splitPayload = () =>
    splitLines.map((l) => l.paidRef
      // Paid through a prompt: the server checks the reference with Paystack
      ? { method: 'mobile_money', amount: parseFloat(l.amount) || 0, paystackReference: l.paidRef, ...(l.paidPhone ? { momoNumber: l.paidPhone } : {}) }
      : {
        method: l.method === 'mobile_money' ? 'mobile_money_manual' : l.method,
        amount: parseFloat(l.amount) || 0,
        ...(l.momo ? { momoNumber: l.momo } : {}),
        ...(l.txn?.trim() ? { momoTransactionId: l.txn.trim() } : {}),
      });
  const owesCredit = isCreditSale || splitHasCredit;

  const usePrompt = activeTab === 'mobile_money' && !isCreditSale && momoPromptsReady && isOnline && !momoManual;
  const promptLocked = (usePrompt && !!momoAction?.locked) || splitPending;
  // Owners/managers see why prompts aren't on when Paystack is switched on but not set up
  const momoPromptsReason = useFeaturesStore((st) => st.momo_prompts_reason);
  const showPromptSetupHint = activeTab === 'mobile_money' && !momoPromptsReady && !!featureSettings.pos_paystack_enabled
    && !!momoPromptsReason && (staffUser?.role === 'owner' || staffUser?.role === 'manager');
  // The customer approved the prompt: complete the sale with Paystack's reference
  const completeWithPrompt = (reference: string, phone: string) => {
    promptPaid.current = { reference, phone, amount: total };
    setMomoNumber(phone);
    handleTransaction();
  };

  // ─── Paid MoMo prompts that never made it onto a sale ──────────────────────
  // Asked of the server each time the window opens (it survives a closed window, a refresh, or
  // another till). Payments in sales still waiting to sync from this till aren't offered again.
  useEffect(() => {
    setRecoverable([]);
    if (!isOpen || !isOnline || !momoPromptsReady) return;
    let alive = true;
    apiClient.get('/pos/momo/recoverable').then((r) => {
      const queued = new Set<string>();
      useOfflineQueueStore.getState().queue
        .filter((t) => t.syncStatus === 'pending' || t.syncStatus === 'syncing')
        .forEach((t: any) => {
          if (t.payload?.paystackReference) queued.add(t.payload.paystackReference);
          (t.payload?.payments || []).forEach((p: any) => p.paystackReference && queued.add(p.paystackReference));
        });
      if (alive) setRecoverable((r.data?.success?.data?.charges || []).filter((c: RecoverableCharge) => !queued.has(c.reference)));
    }).catch(() => {});
    return () => { alive = false; };
  }, [isOpen, isOnline, momoPromptsReady]);

  // A paid single MoMo whose sale didn't go through is given back if the cashier moves off MoMo
  useEffect(() => {
    if (activeTab === 'mobile_money' || !promptPaid.current || isSuccess) return;
    const paid = { ...promptPaid.current, paid_at: new Date().toISOString() };
    promptPaid.current = null;
    setRecoverable((list) => [paid, ...list.filter((c) => c.reference !== paid.reference)]);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const usedRefs = new Set(splitLines.map((l) => l.paidRef).filter(Boolean));
  const recoverShown = recoverable.filter((c) => !usedRefs.has(c.reference) && c.reference !== promptPaid.current?.reference);
  const splitHasPaidMomo = splitLines.some((l) => l.method === 'mobile_money' && l.paidRef);
  // Most a recovered payment can be: what's left for MoMo in a split, otherwise the sale's total
  // (a single MoMo payment has to match the total; a smaller one becomes the MoMo part of a split)
  const momoRoom = activeTab === 'split'
    ? r2(total - splitLines.filter((l) => !(l.method === 'mobile_money' && !l.paidRef)).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0))
    : total;
  const showRecover = !isCreditSale && !isSuccess && !promptLocked && recoverShown.length > 0
    && !(activeTab === 'split' && splitHasPaidMomo);

  const applyRecovered = (c: RecoverableCharge) => {
    if (activeTab !== 'split' && Math.abs(c.amount - total) < 0.01) {
      // The whole sale: complete it as a prompted MoMo sale
      promptPaid.current = { reference: c.reference, phone: c.phone, amount: c.amount };
      setMomoNumber(c.phone);
      setActiveTab('mobile_money');
      setCompleteRecovered(true);
      return;
    }
    if (!splitEnabled) {
      toast.error('This payment doesn’t match the total. Ask a manager to sort it out.');
      return;
    }
    // Part of the sale: the paid MoMo part of a split (taking the place of an unpaid MoMo part)
    const paid = { paidRef: c.reference, paidPhone: c.phone, amount: c.amount.toFixed(2), manual: false, pending: false };
    setActiveTab('split');
    setSplitLines((lines) => {
      const i = lines.findIndex((l) => l.method === 'mobile_money' && !l.paidRef);
      if (i === -1) return [...lines, { id: crypto.randomUUID(), method: 'mobile_money', ...paid }];
      return lines.map((l, j) => (j === i ? { ...l, ...paid } : l));
    });
  };

  // Completing a recovered whole-sale payment waits for the MoMo tab to be the active one
  useEffect(() => {
    if (!completeRecovered || activeTab !== 'mobile_money') return;
    setCompleteRecovered(false);
    handleTransaction();
  }, [completeRecovered, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Something is paid but the sale isn't complete: clicking outside doesn't close, and closing asks first
  const paidNotCompleted = !isSuccess && (splitLines.some((l) => !!l.paidRef) || !!promptPaid.current);
  const paymentStarted = promptLocked || paidNotCompleted;
  const paidAmount = splitLines.some((l) => l.paidRef)
    ? splitLines.filter((l) => l.paidRef).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
    : promptPaid.current?.amount || 0;

  // A manager's PIN approval is checked by the server, so these sales can't be saved on the till first
  // Raised prices and discounts are approved when they're made (the sale carries those tickets)
  const approvalTickets = [
    ...items.filter((i) => i.price_overridden && i.approval_ticket).map((i) => i.approval_ticket as string),
    ...items.filter((i) => lineDiscountAmount(i) > 0 && i.discount_ticket).map((i) => i.discount_ticket as string),
    ...(discount > 0 && discountApproval ? [discountApproval.ticket] : []),
  ];
  const needsApproval = (discount > 0 && !can('pos.discount') && !discountApproval) || (owesCredit && !can('pos.credit_sale'))
    || (items.some((i) => i.price_overridden && !i.approval_ticket) && !can('pos.price_override'))
    || (items.some((i) => lineDiscountAmount(i) > 0 && !i.discount_ticket) && !can('pos.discount'));

  /**
   * Save the sale on the till and sync it in the background. Used for every sale that doesn't need
   * Paystack or a manager's approval (offline-first: instant receipt, no waiting on the network), and
   * as the fallback when an online attempt loses its connection. `key` reuses the online attempt's
   * idempotency key so a sale the server did receive isn't recorded twice.
   */
  const saveOfflineSale = (toastId?: string, opts: { online?: boolean; key?: string } = {}) => {
    if (needsApproval) {
      const message = owesCredit && !can('pos.credit_sale')
        ? "Credit sales need a manager's approval, which needs an internet connection."
        : discount > 0 && !can('pos.discount')
        ? "This discount needs a manager's approval, which needs an internet connection."
        : "A changed price needs a manager's approval, which needs an internet connection.";
      if (toastId) toast.error(message, { id: toastId });
      else toast.error(message);
      setIsProcessing(false);
      return;
    }
    const localId = crypto.randomUUID();
    const idempotencyKey = opts.key || `offline-${localId}`;
    const effectiveStoreName = storeSettings?.name || tenant?.business_name || tenant?.name || '';
    const prefix = getReceiptPrefix(effectiveStoreName, posSettings.receipt_prefix);
    const offlineReceiptNum = generatePosOrderNumber(prefix);
    const offlinePayload: any = {
      orderNumber: offlineReceiptNum,
      items: items.map((item) => ({
        name: item.name,
        productName: item.name,
        variant_id: item.variant_id,
        packaging_tier_id: item.packaging_tier_id,
        tier_name: item.tier_name,
        tierName: item.tier_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unitPrice: item.unit_price,
        price_type: item.price_type,
        priceOverridden: !!item.price_overridden,
        lineDiscount: lineDiscountAmount(item),
        subtotal: lineTotal(item),
      })),
      discount: discount || 0,
      subtotal,
      tax,
      total,
      cashierName: staffUser?.name || 'Staff',
      // MoMo is confirmed by the cashier (there's no Paystack prompt at the till yet)
      paymentMethod: promptPaid.current ? 'mobile_money' : activeTab === 'mobile_money' ? 'mobile_money_manual' : activeTab,
      ...(promptPaid.current ? { paystackReference: promptPaid.current.reference } : {}),
      isCreditSale,
      customerDetails: owesCredit ? { name: customerName, phone: customerPhone } : undefined,
      customerName: owesCredit ? customerName : undefined,
      customerPhone: owesCredit ? customerPhone : undefined,
      ...(isSplit ? { payments: splitPayload() } : {}),
      // Recorded under the person who made the sale, at the time it was made (someone else may be
      // signed in on a shared till by the time it syncs)
      cashierId: staffUser?.id,
      offlineCreatedAt: new Date().toISOString(),
      ...(approvalTickets.length ? { approval: { tickets: approvalTickets } } : {}),
    };
    if (activeTab === 'cash') offlinePayload.amountTendered = amountTendered;
    if (activeTab === 'mobile_money') {
      offlinePayload.momoNumber = promptPaid.current?.phone || momoNumber || undefined;
      if (!promptPaid.current && momoTxnId.trim()) offlinePayload.momoTransactionId = momoTxnId.trim();
    }

    enqueue({
      localId,
      idempotencyKey,
      payload: offlinePayload,
      createdAt: new Date().toISOString(),
    });
    if (opts.online) window.dispatchEvent(new CustomEvent('pos:sync-now'));

    setReceiptData({ receiptNumber: offlineReceiptNum, dateCreated: new Date().toISOString() });
    setFrozenCart({ items, subtotal, discount, tax, total });
    clearCart();
    setIsOfflineSale(!opts.online);
    setIsSuccess(true);
    setIsProcessing(false);

    if (posSettings.auto_print === 'always') {
      setTimeout(() => window.print(), 100);
    }

    if (opts.online) {
      if (toastId) toast.success('Payment successful!', { id: toastId });
    } else if (toastId) {
      toast.success('Connection dropped — sale saved offline and will sync automatically', { id: toastId, duration: 5000 });
    } else {
      toast.success('Sale saved — will sync when back online');
    }
  };

  const handleTransaction = async () => {
    if (splitProblem) {
      toast.error(splitProblem);
      return;
    }
    if (activeTab === 'cash' && !isCreditSale && amountTendered < total) {
      toast.error('Tendered amount is less than total due');
      return;
    }

    // Manual MoMo: the number is optional (checked if typed); the transaction ID when the owner requires it
    const requireTxnId = !!featureSettings.pos_require_momo_txn_id;
    if (activeTab === 'mobile_money' && !isCreditSale && !promptPaid.current) {
      if (requireTxnId && !momoTxnId.trim()) {
        toast.error('Enter the transaction ID from the MoMo alert');
        return;
      }
      if (momoNumber && !isValidGhanaPhone(momoNumber)) {
        toast.error('Please enter a valid 10-digit MoMo number (e.g. 024XXXXXXX or 055XXXXXXX)');
        return;
      }
    }

    if (owesCredit && posSettings.require_customer_for_credit && (!customerName || !customerPhone)) {
      toast.error('Customer Name and Phone are required for Credit Sales');
      return;
    }

    setIsProcessing(true);

    // ─── OFFLINE BRANCH (explicitly offline) ──────────────────────────────────
    if (!isOnline) {
      saveOfflineSale();
      return;
    }

    // ─── OFFLINE-FIRST: everything that doesn't need a manager's PIN ──────────
    // Cash, card (shop's card machine), MoMo (confirmed by the cashier) and credit are saved on the
    // till and synced straight away in the background.
    if (!needsApproval) {
      saveOfflineSale(undefined, { online: true });
      return;
    }

    // ─── ONLINE BRANCH (a manager's approval is needed) ───────────────────────
    // The same key goes with the offline fallback, so a sale the server received before the
    // connection dropped isn't recorded twice
    const attemptKey = `pos-${crypto.randomUUID()}`;
    const toastId = toast.loading('Processing payment...');
    try {
      const payload: any = {
        items: items.map((item) => ({
          variant_id: item.variant_id,
          packaging_tier_id: item.packaging_tier_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          price_type: item.price_type,
          priceOverridden: !!item.price_overridden,
          lineDiscount: lineDiscountAmount(item),
        })),
        discount: discount || 0,
        paymentMethod: isCreditSale ? 'credit' : activeTab,
        isCreditSale,
        customerDetails: owesCredit ? { name: customerName, phone: customerPhone } : undefined,
        ...(isSplit ? { payments: splitPayload() } : {}),
        ...(approvalTickets.length ? { approval: { tickets: approvalTickets } } : {}),
      };

      if (!isCreditSale) {
        if (activeTab === 'cash') {
          payload.amountTendered = amountTendered;
        } else if (activeTab === 'mobile_money') {
          if (promptPaid.current) {
            // Paid through the prompt: the server checks this reference with Paystack
            payload.paymentMethod = 'mobile_money';
            payload.paystackReference = promptPaid.current.reference;
            payload.momoNumber = promptPaid.current.phone;
          } else {
            // Confirmed by the cashier
            payload.paymentMethod = 'mobile_money_manual';
            if (momoNumber) payload.momoNumber = momoNumber;
            if (momoTxnId.trim()) payload.momoTransactionId = momoTxnId.trim();
          }
        }
      }

      const response = await apiClient.post('/pos/transactions', payload, { headers: { 'X-Idempotency-Key': attemptKey } });

      toast.success('Payment successful!', { id: toastId });
      setReceiptData(response.data.success?.data?.receipt || { receiptNumber: 'RCP-' + Date.now().toString().slice(-4), dateCreated: new Date().toISOString() });
      setFrozenCart({ items, subtotal, discount, tax, total });
      clearCart();
      setIsOfflineSale(false);
      setIsSuccess(true);

      // Silently notify Register to update product stock counts without reloading UI
      window.dispatchEvent(new CustomEvent('pos:transaction-completed'));

      if (posSettings.auto_print === 'always') {
        setTimeout(() => window.print(), 100);
      }

    } catch (error: any) {
      console.error('Transaction attempt error:', error);

      const isNetworkError =
        !error.response ||
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error' ||
        error.message?.toLowerCase().includes('network') ||
        error.code === 'ECONNABORTED';

      // If online call failed due to network disconnect/timeout, fallback to offline queue (Cash / MoMo / Credit)
      if (isNetworkError) {
        saveOfflineSale(toastId, { key: attemptKey });
        return;
      }
      toast.error(error.response?.data?.error?.message || 'Transaction failed', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDone = () => {
    onClose();
  };

  // Shared "current cart or frozen cart" resolution, used by both receipt views
  const getDisplayData = () => ({
    displayItems: frozenCart ? frozenCart.items : items,
    displaySubtotal: frozenCart ? frozenCart.subtotal : subtotal,
    displayDiscount: frozenCart ? frozenCart.discount : discount,
    displayTax: frozenCart ? frozenCart.tax : tax,
    displayTotal: frozenCart ? frozenCart.total : total,
  });

  const renderReceiptPreview = () => {
    const { displayItems, displaySubtotal, displayDiscount, displayTax, displayTotal } = getDisplayData();

    return (
      <div className="bg-white text-black p-6 print:p-2 rounded-xl print:rounded-none shadow-sm print:shadow-none relative h-full flex flex-col font-sans text-sm border border-border/20 print:border-none">

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="font-['AtypDisplay'] font-bold text-xl tracking-wider mb-1 text-zinc-900 uppercase">{storeName}</h3>
          {storeLocation && <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{storeLocation}</p>}
          {storePhone && <p className="text-[10px] text-zinc-500">Tel: {storePhone}</p>}
        </div>

        {/* Info Section */}
        <div className="border-b border-dashed border-zinc-200 pb-3 mb-3 text-xs space-y-1 text-zinc-700">
          <div className="flex justify-between">
            <span className="font-semibold">Receipt #:</span>
            <span className="font-mono font-bold text-zinc-950">{receiptData ? receiptData.receiptNumber : 'TX-PREVIEW'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Date:</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Payment:</span>
            <span className="uppercase font-semibold text-zinc-900">
              {isCreditSale
                ? 'CREDIT'
                : activeTab === 'split'
                  ? 'SPLIT'
                  : activeTab === 'mobile_money'
                    ? 'MOBILE MONEY'
                    : activeTab.replace('_', ' ')}
            </span>
          </div>
          {isSplit && splitLines.map((l) => (
            <div key={l.id} className="flex justify-between pl-2 text-zinc-500">
              <span>{l.method === 'credit' ? 'On credit' : SPLIT_LABEL[l.method]}</span>
              <span>{(parseFloat(l.amount) || 0).toFixed(2)}</span>
            </div>
          ))}
          {isSplit && splitChange > 0 && (
            <div className="flex justify-between pl-2 text-zinc-500">
              <span>Change</span>
              <span>{splitChange.toFixed(2)}</span>
            </div>
          )}
          {/* {momoNumber && activeTab === 'mobile_money' && (
            <div className="flex justify-between">
              <span className="font-semibold">MoMo Phone:</span>
              <span className="font-mono font-bold text-zinc-950">{momoNumber}</span>
            </div>
          )} */}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto scrollbar-hide mb-4">
          <div className="flex font-['AtypDisplay'] font-bold text-[10px] border-b border-zinc-100 pb-2 mb-2 uppercase tracking-wider text-zinc-900">
            <span className="flex-1 text-left">Description</span>
            <span className="w-14 text-center">Qty</span>
            <span className="w-20 text-right">Total</span>
          </div>
          <div className="space-y-2 text-xs text-zinc-800">
            {displayItems.map((item: any) => {
              const qty = Number(item.quantity || 1);
              const isMultiQty = qty > 1;
              return (
                <div key={item.productId} className="flex flex-col border-b border-zinc-100/50 pb-1.5 last:border-0">
                  <div className="flex items-start">
                    <span className="flex-1 pr-2 leading-tight font-medium text-left">{item.name}</span>
                    <span className="w-14 text-center text-zinc-500 font-medium whitespace-nowrap">
                      {formatQuantityWithUnit(item.quantity, item.tier_name)}
                    </span>
                    <span className="w-20 text-right font-semibold">
                      <CurrencyDisplay amount={lineTotal(item)} showStyling={false} />
                    </span>
                  </div>
                  {lineDiscountAmount(item) > 0 && (
                    <span className="text-[10px] text-emerald-600 text-left font-medium">
                      Discount −{lineDiscountAmount(item).toFixed(2)}{item.line_discount_type === 'percent' ? ` (${item.line_discount_value}%)` : ''}
                    </span>
                  )}
                  {isMultiQty && (
                    <span className="text-[10px] text-zinc-400 text-left font-medium">
                      @{item.price.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-xs text-zinc-800 pt-3 border-t border-dashed border-zinc-200">
          <div className="flex justify-between font-medium">
            <span>Subtotal</span>
            <span><CurrencyDisplay amount={displaySubtotal} showStyling={false} /></span>
          </div>
          {displayDiscount > 0 && (
            <div className="flex justify-between font-medium">
              <span>Discount</span>
              <span className="text-emerald-600">-<CurrencyDisplay amount={displayDiscount} /></span>
            </div>
          )}
          {featureSettings.pos_tax_enabled && taxRate > 0 && (
          <div className="flex justify-between font-medium">
            <span>{taxLabel} ({taxPercent}%)</span>
            <span><CurrencyDisplay amount={displayTax} /></span>
          </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-dashed border-zinc-200 mt-2 uppercase text-zinc-900">
            <span>Total</span>
            <span><CurrencyDisplay amount={displayTotal} /></span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[9px] font-semibold text-zinc-400 flex flex-col items-center gap-1 uppercase tracking-widest">
          {isCreditSale && (
            <span className="font-bold border border-zinc-200 px-3 py-1 rounded-full mb-1 text-[9px] tracking-wider text-zinc-500">
              CREDIT SALE RECORD
            </span>
          )}
          <span>{APP_CONFIG.receiptFooter}</span>
          {posSettings.receipt_footer && (
            <div className="mt-4 pt-3 border-t border-dashed border-zinc-200 w-full text-center text-[9px] leading-relaxed hidden print:block whitespace-pre-wrap text-zinc-500">
              {posSettings.receipt_footer}
            </div>
          )}
        </div>
      </div>
    );
  };

  // NEW: compact, bounded-height receipt summary for mobile.
  // Shows totals up front; items are tucked behind a disclosure with its
  // own max-height + scroll, so it can never push the payment panel off screen.
  const renderMobileReceiptSummary = () => {
    const { displayItems, displaySubtotal, displayDiscount, displayTax, displayTotal } = getDisplayData();

    return (
      <div className="bg-secondary/40 rounded-xl border border-border/50 p-3.5 flex-shrink-0">
        <div className="space-y-1 text-xs text-muted-foreground font-medium">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-foreground"><CurrencyDisplay amount={displaySubtotal} symbolClassName={'text-[0.8em] text-muted-foreground'} /></span>
          </div>
          {displayDiscount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="text-emerald-600">-<CurrencyDisplay amount={displayDiscount} symbolClassName={'text-[0.8em] text-muted-foreground'}  /></span>
            </div>
          )}
          {featureSettings.pos_tax_enabled && taxRate > 0 && (
          <div className="flex justify-between">
            <span>{taxLabel} ({taxPercent}%)</span>
            <span className="text-foreground"><CurrencyDisplay amount={displayTax} symbolClassName={'text-[0.8em] text-muted-foreground'} /></span>
          </div>
          )}
        </div>

        <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-border/50">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          <span className="text-lg font-black text-foreground"><CurrencyDisplay amount={displayTotal} symbolClassName={'text-[0.8em] text-muted-foreground'} /></span>
        </div>

        <button
          type="button"
          onClick={() => setMobileItemsExpanded((v) => !v)}
          className="w-full mt-2.5 pt-2 border-t border-border/50 text-xs font-bold text-muted-foreground flex items-center justify-center gap-1"
        >
          {mobileItemsExpanded ? 'Hide' : 'View'} {displayItems.length} item{displayItems.length !== 1 ? 's' : ''}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileItemsExpanded ? 'rotate-180' : ''}`} />
        </button>

        {mobileItemsExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-border/50 max-h-36 overflow-y-auto space-y-2 scrollbar-hide">
            {displayItems.map((item: any) => (
              <div key={item.productId} className="flex justify-between text-xs">
                <div className="pr-2">
                  <span className="text-foreground font-semibold">{item.name}</span>
                  <span className="text-muted-foreground"> × {formatQuantityWithUnit(item.quantity, item.tier_name)}</span>
                </div>
                <span className="text-muted-foreground font-medium whitespace-nowrap">
                  <CurrencyDisplay amount={lineTotal(item)} showStyling={false} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Who owes the money: a credit sale, or the credit part of a split payment
  const renderCustomerFields = () => (
              <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                <SearchableSelectField
                  label="Customer Name"
                  labelPlacement="outside"
                  placeholder="Select or enter customer name..."
                  options={customerOptions}
                  value={customerName}
                  inputValue={customerName}
                  allowsCustomValue={true}
                  isLoading={isLoadingDebtors}
                  onInputChange={(val) => {
                    setCustomerName(val);
                  }}
                  onValueChange={(selectedVal) => {
                    if (!selectedVal) return;
                    setCustomerName(selectedVal);
                    const found = debtorsList.find((d: any) => d.name === selectedVal || d.id === selectedVal);
                    if (found && found.phone) {
                      setCustomerPhone(found.phone);
                    }
                  }}
                  onClear={() => {
                    setCustomerName('');
                    setCustomerPhone('');
                  }}
                />
                <CustomInputTextField
                  label="Phone Number"
                  labelPlacement="outside"
                  placeholder="+233"
                  value={customerPhone}
                  onChange={(e: any) => setCustomerPhone(e.target.value)}
                />

                {/* Phone number match warning & switch prompt */}
                {matchedDebtorByPhone && hasNameMismatch && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                      <div className="flex flex-col">
                        <span>
                          This number is already registered to <strong className="font-semibold text-amber-900 dark:text-amber-200">{matchedDebtorByPhone.name}</strong>
                        </span>
                        {Number(matchedDebtorByPhone.outstanding_debt || 0) > 0 && (
                          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                            Current Debt: GHS {Number(matchedDebtorByPhone.outstanding_debt).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerName(matchedDebtorByPhone.name);
                        if (matchedDebtorByPhone.phone) setCustomerPhone(matchedDebtorByPhone.phone);
                      }}
                      className="shrink-0 text-xs font-semibold px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 rounded-md transition-colors self-end sm:self-center"
                    >
                      Switch to {matchedDebtorByPhone.name}
                    </button>
                  </div>
                )}

                {/* Quick autofill prompt when phone is typed but customer name is empty */}
                {matchedDebtorByPhone && !customerName.trim() && (
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
                    <span className="truncate">
                      Found debtor: <strong className="font-semibold">{matchedDebtorByPhone.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerName(matchedDebtorByPhone.name);
                        if (matchedDebtorByPhone.phone) setCustomerPhone(matchedDebtorByPhone.phone);
                      }}
                      className="shrink-0 text-xs font-semibold px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-900 dark:text-blue-100 rounded transition-colors"
                    >
                      Use {matchedDebtorByPhone.name}
                    </button>
                  </div>
                )}
              </div>
  );

  const renderPaymentFlow = () => (
    <div className="flex flex-col h-full min-h-0">
      {/* Desktop Fixed Header: Pinned at top above scroll container on desktop */}
      <div className="hidden md:flex mb-6 justify-between items-end border-b border-border/50 pb-4 shrink-0">
        <span className="text-muted-foreground font-semibold text-sm uppercase tracking-wider">Payment Details</span>
        {!isOnline && (
          <div onClick={() => setShowOffline(prev => !prev)} className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold cursor-pointer">
            <WifiOff className="h-3.5 w-3.5" />
            <span>Offline Mode</span>
          </div>
        )}
      </div>

      {/* Desktop Offline Banner (Fixed) */}
      {!isOnline && showOffline && (
        <div className="hidden md:flex items-start gap-3 p-3 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium shrink-0">
          <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold mb-0.5">No Internet Connection</p>
            <p className="text-amber-600/80 dark:text-amber-400/80">Gateway payments are unavailable. Use Cash or Manual MoMo. Sales will sync automatically when back online.</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-fit md:pr-1 md:py-1 scrollbar-hide overflow-x-hidden flex flex-col gap-y-5 pb-6">
        {/* Mobile-only receipt summary: sits at top and scrolls with content */}
        <div className="md:hidden">
          {renderMobileReceiptSummary()}
        </div>

        {/* Inset wrapper for payment details header and controls on mobile */}
        <div className="px-2 py-1 md:px-0 md:py-0 flex flex-col gap-y-5">
          {/* Mobile-only Payment Details Title: sits below summary and scrolls with content so keyboard never crushes inputs */}
          <div className="md:hidden flex justify-between items-end border-b border-border/50 pb-3">
            <span className="text-muted-foreground font-semibold text-sm uppercase tracking-wider">Payment Details</span>
            {!isOnline && (
              <div onClick={() => setShowOffline(prev => !prev)} className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold cursor-pointer">
                <WifiOff className="h-3.5 w-3.5" />
                <span>Offline Mode</span>
              </div>
            )}
          </div>

          {/* Mobile-only Offline Banner (Scrolls with content) */}
          {!isOnline && showOffline && (
            <div className="md:hidden flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
              <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold mb-0.5">No Internet Connection</p>
                <p className="text-amber-600/80 dark:text-amber-400/80">Gateway payments are unavailable. Use Cash or Manual MoMo. Sales will sync automatically when back online.</p>
              </div>
            </div>
          )}

          {/* Credit Toggle Section — only shown when pos_credit_enabled */}
          {featureSettings.pos_credit_enabled && (
          <div>
            <div
              className="flex items-center justify-between cursor-pointer group rounded-xl p-3 -mx-3 hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/50"
              onClick={() => !promptLocked && setIsCreditSale(!isCreditSale)}
            >
              <div>
                <h4 className="font-bold text-foreground text-[15px]">Mark as Credit Sale</h4>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">Customer will pay at a later date</p>
              </div>
              <div className={`transition-colors ${isCreditSale ? 'text-foreground' : 'text-muted-foreground'}`}>
                <Switch
                   isSelected={isCreditSale}
                   onValueChange={(v) => !promptLocked && setIsCreditSale(v)}
                   isDisabled={promptLocked}
                   color="default"
                   size="sm"
                   classNames={{ wrapper: "mr-0" }}
                />
              </div>
            </div>

            {isCreditSale && renderCustomerFields()}
          </div>
          )}

          {/* Show Payment Methods ONLY if not credit sale */}
          {!isCreditSale && paymentTabs.length > 0 && (
            <>
              <div className="flex flex-col gap-2">
                {/* Active payment tabs */}
                <div className="flex p-1 bg-secondary/50 rounded-full border border-border/50 shrink-0">
                  {paymentTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => !promptLocked && setActiveTab(tab.id as any)}
                      disabled={promptLocked}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-[12px] md:text-sm font-bold transition-all duration-200 cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {/* Locked gateway tabs shown offline */}
                {lockedGatewayTabs.length > 0 && (
                  <div className="flex gap-2">
                    {lockedGatewayTabs.map(tab => (
                      <div
                        key={tab.id}
                        title="Requires internet connection"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[11px] font-bold border border-border/40 text-muted-foreground/40 bg-secondary/20 cursor-not-allowed select-none"
                      >
                        <Lock className="h-3 w-3" />
                        {tab.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {showRecover && (
                  <RecoverableMomo
                    charges={recoverShown}
                    canUse={(c) => c.amount <= momoRoom + 0.001 && (splitEnabled || (activeTab !== 'split' && Math.abs(c.amount - total) < 0.01))}
                    onUse={applyRecovered}
                  />
                )}
                {activeTab === 'cash' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CustomInputTextField
                      label="Amount Tendered"
                      labelPlacement="outside"
                      type="number"
                      placeholder="0.00"
                      value={amountTenderedStr}
                      onChange={(e: any) => setAmountTenderedStr(e.target.value)}
                      autoFocus
                      className="h-14 text-xl font-bold rounded-xl bg-background border-border"
                    />

                    {amountTenderedStr && amountTendered >= total && (
                      <div className="bg-secondary/80 rounded-lg p-4 py-3 flex items-center justify-between animate-in fade-in">
                        <span className="text-foreground font-bold uppercase tracking-wider text-xs">Change Due</span>
                        <span className="text-xl font-black text-foreground">
                          <CurrencyDisplay amount={change} />
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {usePrompt && (
                  <MomoPrompt amount={total} onPaid={completeWithPrompt} onManual={() => setMomoManual(true)} onAction={setMomoAction} />
                )}

                {activeTab === 'mobile_money' && !usePrompt && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {showPromptSetupHint && (
                      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        MoMo prompts are off: {momoPromptsReason}
                      </p>
                    )}
                    <CustomInputTextField
                      label="Transaction ID from the MoMo alert"
                      labelPlacement="outside"
                      placeholder={featureSettings.pos_require_momo_txn_id ? 'Required' : 'Optional, e.g. 52834019274'}
                      value={momoTxnId}
                      onChange={(e: any) => setMomoTxnId(e.target.value.replace(/[^\w.-]/g, '').slice(0, 60))}
                      className="h-14 text-lg font-bold rounded-xl bg-background border-border"
                    />
                    <CustomInputTextField
                      label="Customer MoMo Number (optional)"
                      labelPlacement="outside"
                      type="tel"
                      placeholder="e.g. 0241234567"
                      value={momoNumber}
                      onChange={(e: any) => setMomoNumber(e.target.value.replace(/[^\d+]/g, '').slice(0, 13))}
                      className="h-14 text-lg font-bold rounded-xl bg-background border-border"
                    />

                    <div className="p-4 bg-secondary rounded-lg text-[12px] md:text-sm font-medium border border-border/50 text-muted-foreground">
                      Check the customer&apos;s MoMo payment has arrived before completing the sale.
                    </div>
                  </div>
                )}

                {activeTab === 'card' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center bgsecondary/30 rounded-lg p-8 border border-border/50 text-center">
                    <CreditCard className="h-8 w-8 text-muted-foreground mb-3" />
                    <h4 className="font-bold text-base mb-1 text-foreground">Card machine</h4>
                    <p className="text-xs text-muted-foreground font-medium max-w-[220px]">
                      Take the payment on your card machine, then complete the sale.
                    </p>
                  </div>
                )}

                {activeTab === 'split' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {splitLines.length === 0 && (
                      <p className="text-xs text-muted-foreground font-medium">Add how the customer is paying, e.g. part cash and part MoMo.</p>
                    )}
                    {splitLines.map((l) => {
                      // A prompt that's out or paid fixes this part's amount
                      const fixed = !!l.pending || !!l.paidRef;
                      return (
                      <div key={l.id} className="rounded-xl border border-border/70 p-2.5 space-y-2">
                        <div className="flex items-center gap-2.5">
                          {l.method === 'credit' ? (
                            <span className="h-6 w-6 flex items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                              <Icon icon="solar:notebook-linear" className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <PaymentMethodVisual method={l.method} size="md" />
                          )}
                          <span className="text-sm font-semibold flex-1">{l.method === 'credit' ? 'On credit' : SPLIT_LABEL[l.method]}</span>
                          <label className={`flex items-center gap-1.5 rounded-lg border border-border px-2.5 h-10 w-36 ${fixed ? 'bg-muted/50' : 'bg-background cursor-text'}`}>
                            <span className="text-[11px] text-muted-foreground font-semibold">GHS</span>
                            <input
                              value={l.amount}
                              inputMode="decimal"
                              placeholder="0.00"
                              disabled={fixed}
                              onChange={(e) => updateSplit(l.id, { amount: cleanMoney(e.target.value) })}
                              aria-label={`${SPLIT_LABEL[l.method]} amount`}
                              className="w-full min-w-0 bg-transparent text-right text-sm font-bold tabular-nums focus:outline-none disabled:opacity-80"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeSplit(l.id)}
                            disabled={!!l.pending}
                            aria-label={`Remove ${SPLIT_LABEL[l.method]}`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {l.paidRef && (
                          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/30 px-3 py-2 text-xs">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex-1">Paid</span>
                            {l.paidPhone && <span className="text-muted-foreground">{formatPhoneNumber(l.paidPhone)}</span>}
                          </div>
                        )}
                        {linePrompted(l) && !l.paidRef && (
                          <SplitMomoPrompt
                            amount={parseFloat(l.amount) || 0}
                            onPaid={(reference, phone) => updateSplit(l.id, { paidRef: reference, paidPhone: phone, pending: false })}
                            onPending={(pending) => updateSplit(l.id, { pending })}
                            onManual={() => updateSplit(l.id, { manual: true, pending: false })}
                          />
                        )}
                        {l.method === 'mobile_money' && !linePrompted(l) && (
                          <input
                            value={l.txn || ''}
                            placeholder={featureSettings.pos_require_momo_txn_id ? 'MoMo transaction ID (required)' : 'MoMo transaction ID (optional)'}
                            onChange={(e) => updateSplit(l.id, { txn: e.target.value.replace(/[^\w.-]/g, '').slice(0, 60) })}
                            className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none"
                          />
                        )}
                        {l.method === 'mobile_money' && !linePrompted(l) && (
                          <input
                            value={l.momo || ''}
                            inputMode="tel"
                            placeholder="Customer MoMo number (optional)"
                            onChange={(e) => updateSplit(l.id, { momo: e.target.value.replace(/[^\d+]/g, '').slice(0, 13) })}
                            className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none"
                          />
                        )}
                        {l.method === 'mobile_money' && l.manual && momoPromptsReady && isOnline && (
                          <button
                            type="button"
                            onClick={() => updateSplit(l.id, { manual: false })}
                            className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
                          >
                            Send a prompt instead
                          </button>
                        )}
                      </div>
                      );
                    })}
                    {splitAddable.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {splitAddable.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => addSplit(m)}
                            className="h-8 px-3 rounded-full border border-border text-xs font-semibold hover:bg-muted inline-flex items-center gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {m === 'credit' ? 'Rest on credit' : SPLIT_LABEL[m]}
                          </button>
                        ))}
                      </div>
                    )}
                    {splitLines.length > 0 && (
                      <div className="bg-secondary/80 rounded-lg px-4 py-3 flex items-center justify-between">
                        <span className="text-foreground font-bold uppercase tracking-wider text-xs">
                          {splitChange > 0 ? 'Change due' : splitRemaining > 0.001 ? 'Left to pay' : 'Fully paid'}
                        </span>
                        <span className="text-xl font-black text-foreground">
                          <CurrencyDisplay amount={splitChange > 0 ? splitChange : Math.max(splitRemaining, 0)} />
                        </span>
                      </div>
                    )}
                    {splitHasCredit && renderCustomerFields()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Footer — sticky, never scrolls away */}
      <div className="mt-auto pt-4 md:pt-6 border-t border-border/50 shrink-0 md:bg-card m-2 md:m-0">
        <div className="flex justify-between items-end mb-4 px-1">
          <span className="text-muted-foreground font-bold text-sm uppercase tracking-wider">Total</span>
          <span className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight text-foreground"><CurrencyDisplay amount={total} /></span>
        </div>
        {usePrompt && momoAction ? (
          <>
            <Button
              onClick={momoAction.onClick}
              disabled={momoAction.disabled || isProcessing}
              className="w-full h-[3.25rem] md:h-14 rounded-full font-bold text-[16px] transition-all bg-foreground text-background hover:bg-foreground/90 shadow-sm gap-2"
            >
              {(momoAction.loading || isProcessing) && <Loader2 className="h-5 w-5 animate-spin" />}
              {momoAction.label}
            </Button>
            {momoAction.link && (
              <button
                type="button"
                onClick={momoAction.link.onClick}
                className="w-full mt-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {momoAction.link.label}
              </button>
            )}
          </>
        ) : (
          <Button
            onClick={handleTransaction}
            disabled={isProcessing || total === 0 || (activeTab === 'cash' && !isCreditSale && amountTendered < total) || !!splitProblem}
            className="w-full h-[3.25rem] md:h-14 rounded-full font-bold text-[16px] transition-all bg-foreground text-background hover:bg-foreground/90 shadow-sm"
          >
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : isCreditSale ? 'Complete Credit Sale' : 'Complete Transaction'}
          </Button>
        )}
      </div>
    </div>
  );

  const renderSuccessScreen = () => {
    const { displayTotal } = getDisplayData();
    const changeDue = Math.max(0, amountTendered - displayTotal);

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-in zoom-in-95 duration-300 fade-in fill-mode-forwards">
        <div className="mb-4 text-foreground">
          <CheckCircle2 className="h-14 w-14 md:h-16 md:w-16" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-1 text-foreground">
          Transaction Complete
        </h2>
        <p className="text-muted-foreground font-medium mb-5 text-sm">
          Receipt <span className="text-foreground font-bold">{receiptData?.receiptNumber}</span>
          {isOfflineSale ? ' saved locally.' : ' processed successfully.'}
        </p>

        {/* Transaction Summary Card */}
        <div className="w-full max-w-sm bgsecondary/40 border border-border/60 rounded-xl p-4 mb-6 text-left space-y-2">
          <div className="flex items-center justify-between py-1 border-b border-border/40 text-xs">
            <span className="text-muted-foreground font-medium">Payment Method</span>
            <span className="font-bold text-foreground uppercase">
              {isCreditSale ? 'Store Credit' : activeTab === 'split' ? 'Split' : activeTab === 'cash' ? 'Cash' : activeTab === 'mobile_money' ? 'Mobile Money' : 'Card'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-border/40 text-xs">
            <span className="text-muted-foreground font-medium">Total Amount</span>
            <span className="font-bold text-foreground text-sm">
              <CurrencyDisplay amount={displayTotal} />
            </span>
          </div>

          {activeTab === 'cash' && !isCreditSale && (
            <>
              <div className="flex items-center justify-between py-1 border-b border-border/40 text-xs">
                <span className="text-muted-foreground font-medium">Amount Tendered</span>
                <span className="font-medium text-foreground">
                  <CurrencyDisplay amount={amountTendered} />
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-muted-foreground font-medium">Change Due</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  <CurrencyDisplay amount={changeDue} />
                </span>
              </div>
            </>
          )}

          {isSplit && splitLines.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-1 border-b border-border/40 text-xs">
              <span className="text-muted-foreground font-medium">{l.method === 'credit' ? 'On credit' : SPLIT_LABEL[l.method]}</span>
              <span className="font-medium text-foreground"><CurrencyDisplay amount={parseFloat(l.amount) || 0} /></span>
            </div>
          ))}
          {isSplit && splitChange > 0 && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-muted-foreground font-medium">Change Due</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm"><CurrencyDisplay amount={splitChange} /></span>
            </div>
          )}

          {owesCredit && customerName && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-muted-foreground font-medium">Customer</span>
              <span className="font-bold text-foreground truncate max-w-[160px]">
                {customerName}
              </span>
            </div>
          )}

          {activeTab === 'mobile_money' && momoNumber && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-muted-foreground font-medium">Phone</span>
              <span className="font-sans font-medium text-foreground">
                {formatPhoneNumber(momoNumber)}
              </span>
            </div>
          )}

          {owesCredit && customerPhone && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-muted-foreground font-medium">Phone</span>
              <span className="font-sans font-medium text-foreground">
                {formatPhoneNumber(customerPhone)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          {posSettings.auto_print !== 'never' && (
            <Button
              className="w-full h-12 rounded-full font-bold gap-2 border border-border bg-secondary hover:bg-secondary/80 text-foreground shadow-none"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          )}
          <Button onClick={handleDone} className="w-full h-12 rounded-full font-bold bg-foreground text-background hover:bg-foreground/90 shadow-sm">
            Done
          </Button>
        </div>
      </div>
    );
  };

  const modalBody = (
    // h-[90dvh] on mobile (dvh accounts for the mobile browser chrome so the
    // sheet doesn't get cut off by the address bar), h-[80vh] from md up.
    <div className="flex flex-col md:flex-row w-full h-[85dvh] md:h-[80vh] min-h-0 overflow-hidden">

      {/* Left Column: full Receipt Preview — desktop/tablet only. Mobile relies on the
          compact summary inside the scrollable flow; printing is handled separately via the portal below. */}
      <div className="hidden md:flex md:w-[380px] lg:w-[400px] bg-zinc-50 dark:bg-black/40 border border-border rounded-xl p-4 md:p-5 m-2 flex-shrink-0 flex-col min-h-0">
         {renderReceiptPreview()}
      </div>

      {/* Right Column: Flow — always gets the remaining space, guaranteed */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-hidden relative md:bg-card flex flex-col min-h-0">
        <div className="max-w-md mx-auto w-full h-full flex flex-col justify-between min-h-0">
           {isSuccess ? renderSuccessScreen() : renderPaymentFlow()}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={() => {
          if (isProcessing) return;
          if (paidNotCompleted) {
            setConfirmClose(true);
            return;
          }
          if (promptLocked) {
            toast('Cancel the MoMo prompt first');
            return;
          }
          onClose();
        }}
        isDismissable={!paymentStarted}
        isKeyboardDismissDisabled={paymentStarted}
        size="4xl"
        classNames={{
          body: "p-0 overflow-hidden max-h-[90dvh] md:max-h-[90vh]",
          header: "hidden"
        }}
        body={modalBody}
      />
      <CustomModal
        isOpen={confirmClose}
        onOpenChange={() => setConfirmClose(false)}
        size="sm"
        classNames={{ header: 'hidden' }}
        body={
          <div className="py-4 space-y-4 pt-6">
            <div className="space-y-1.5">
              <p className="text-base font-bold text-foreground">Close without completing the sale?</p>
              <p className="text-sm text-muted-foreground">
                The customer already paid GHS {paidAmount.toFixed(2)} by MoMo. If you close, it&apos;s offered again when you
                open the payment window in the next 30 minutes. After that it goes to a manager under &quot;MoMo paid
                without a sale&quot;.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setConfirmClose(false)}>
                Keep it open
              </Button>
              <Button
                className="flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  setConfirmClose(false);
                  onClose();
                }}
              >
                Close anyway
              </Button>
            </div>
          </div>
        }
      />
      {/* Print Portal - Rendered at document root, only visible during print */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div id="print-portal" className="hidden">
           {renderReceiptPreview()}
        </div>,
        document.body
      )}
    </>
  );
}