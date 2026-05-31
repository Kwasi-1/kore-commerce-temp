import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomModal from '@/components/modals/modal';
import { CustomInputTextField } from '@/components/shared/text-field';
import toast from 'react-hot-toast';

export default function NewCashierModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (name.trim() && pin.length >= 4) {
      toast.success(`Successfully added ${name} with access PIN.`);
      setIsOpen(false);
      setName('');
      setPin('');
    } else {
      toast.error('Please provide a valid name and a 4+ digit PIN.');
    }
  };

  const modalBody = (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2 pb-4">
      <CustomInputTextField
        label="Cashier Name"
        id="name"
        placeholder="e.g. John Doe"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      
      <CustomInputTextField
        label="Access PIN"
        id="pin"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="4-6 digit PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="tracking-widest font-medium"
        required
      />

      <Button 
        type="submit" 
        variant="secondary"
        className="w-full h-12 rounded-xl font-bold text-[15px] mt-2 shadow-sm"
      >
        Create Access
      </Button>
    </form>
  );

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-full shadow-sm font-medium border-border/80 hover:bg-muted transition-colors"
      >
        <UserPlus className="h-4 w-4" />
        New Access
      </Button>

      <CustomModal
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(!isOpen)}
        size="md"
        header={
          <div className="flex items-center gap-2 text-xl font-bold pt-2">
            Grant New Access
          </div>
        }
        body={modalBody}
      />
    </>
  );
}
