import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from '@nextui-org/react';
import { useCurrency } from '@/hooks';

interface DebtSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtor: any;
  onSettle: (amount: number, method: string) => Promise<void>;
}

export default function DebtSettlementModal({ isOpen, onClose, debtor, onSettle }: DebtSettlementModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formatAmount } = useCurrency();

  const handleSettle = async () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > debtor?.outstanding_debt) return;
    
    setIsSubmitting(true);
    await onSettle(amount, method);
    setIsSubmitting(false);
    setAmountStr('');
    setMethod('cash');
  };

  const handleSetFullAmount = () => {
    if (debtor) {
      setAmountStr(debtor.outstanding_debt.toString());
    }
  };

  const amount = parseFloat(amountStr);
  const isValid = !isNaN(amount) && amount > 0 && amount <= (debtor?.outstanding_debt || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Settle Debt
          <span className="text-sm font-normal text-muted-foreground">
            For {debtor?.name}
          </span>
        </ModalHeader>
        <ModalBody>
          <div className="bg-muted/50 p-4 rounded-xl flex items-center justify-between mb-2">
            <span className="text-muted-foreground font-medium">Outstanding Balance:</span>
            <span className="text-xl font-bold text-destructive">
              {debtor ? formatAmount(debtor.outstanding_debt) : 'GHS 0.00'}
            </span>
          </div>

          <div className="space-y-4">
            <Input
              type="number"
              label="Settlement Amount"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              startContent={<span className="text-muted-foreground text-sm font-bold">GHS</span>}
              endContent={
                <Button size="sm" variant="flat" color="primary" onClick={handleSetFullAmount} className="h-6">
                  Max
                </Button>
              }
            />

            <Select 
              label="Payment Method" 
              selectedKeys={[method]} 
              onChange={(e) => setMethod(e.target.value)}
            >
              <SelectItem key="cash" value="cash">Cash</SelectItem>
              <SelectItem key="mobile_money" value="mobile_money">Mobile Money</SelectItem>
              <SelectItem key="card" value="card">Card / POS</SelectItem>
              <SelectItem key="bank_transfer" value="bank_transfer">Bank Transfer</SelectItem>
            </Select>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSettle} isLoading={isSubmitting} isDisabled={!isValid}>
            Process Payment
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
