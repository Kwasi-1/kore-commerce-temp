import React, { useState, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ShiftModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenShift: (float: number) => Promise<boolean>;
  isOpening: boolean;
}

export default function ShiftModal({ isOpen, onOpenChange, onOpenShift, isOpening }: ShiftModalProps) {
  const [openingFloatStr, setOpeningFloatStr] = useState('');

  // Reset form when opened
  useEffect(() => {
    if (isOpen) setOpeningFloatStr('');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const floatVal = parseFloat(openingFloatStr);
    if (!isNaN(floatVal) && floatVal >= 0) {
      await onOpenShift(floatVal);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <PlayCircle className="h-5 w-5" />
            </div>
            Start New Shift
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mt-1 mb-2 px-1">
          You must open a shift to begin processing transactions. Enter the starting cash in the drawer.
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="float" className="text-foreground font-semibold">Opening Float (GHS)</Label>
            <Input
              id="float"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={openingFloatStr}
              onChange={(e) => setOpeningFloatStr(e.target.value)}
              className="rounded-xl h-14 bg-muted/50 border-border/50 text-lg font-bold"
              autoFocus
            />
          </div>
          <Button 
            type="submit" 
            disabled={isOpening || !openingFloatStr}
            className="w-full h-12 rounded-xl font-bold text-[15px] mt-4 shadow-sm"
          >
            {isOpening ? 'Starting Shift...' : 'Start Shift'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
