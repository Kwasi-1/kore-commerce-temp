import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

export default function NewCashierModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && pin.length >= 4) {
      toast.success(`Successfully added ${name} with access PIN.`);
      setIsOpen(false);
      setName('');
      setPin('');
    } else {
      toast.error('Please provide a valid name and a 4+ digit PIN.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 rounded-full shadow-sm font-medium border-border/80 hover:bg-muted transition-colors">
          <UserPlus className="h-4 w-4" />
          New Access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Grant New Access</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground font-semibold">Cashier Name</Label>
            <Input
              id="name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-11 bg-muted/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin" className="text-foreground font-semibold">Access PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="4-6 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="rounded-xl h-11 bg-muted/50 border-border/50 tracking-widest font-medium"
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl font-bold text-[15px] mt-2">
            Create Access
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
