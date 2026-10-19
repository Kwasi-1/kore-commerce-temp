import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { BuiltReportPdf } from '../utils/exportProductReportPdf';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo: string;
  defaultSubject: string;
  /** Builds the PDF for the current view (charts included). */
  buildPdf: () => Promise<BuiltReportPdf>;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_RECIPIENTS = 5;

const fieldClass = 'w-full px-3 rounded-md bg-background border border-border outline-none focus:border-foreground/30 text-sm';

export default function EmailReportDialog({ open, onOpenChange, defaultTo, defaultSubject, buildPdf }: Props) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTo(defaultTo);
    setSubject(defaultSubject);
    setMessage('');
  }, [open, defaultTo, defaultSubject]);

  const recipients = to.split(/[,;\s]+/).map((r) => r.trim()).filter(Boolean);
  const invalid = recipients.filter((r) => !EMAIL_RE.test(r));
  const error =
    recipients.length === 0
      ? null
      : invalid.length
        ? `Check this address: ${invalid[0]}`
        : recipients.length > MAX_RECIPIENTS
          ? `Up to ${MAX_RECIPIENTS} recipients`
          : null;
  const canSend = recipients.length > 0 && !error && !isSending;

  const handleSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    try {
      const pdf = await buildPdf();
      const form = new FormData();
      form.append('file', pdf.blob, pdf.filename);
      form.append('to', recipients.join(','));
      form.append('subject', subject.trim() || defaultSubject);
      if (message.trim()) form.append('message', message.trim());
      await apiClient.post('/tenant/reports/email', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Report sent to ${recipients.join(', ')}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to send the report');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>Email this report</DialogTitle>
          <DialogDescription>Sends the current view as a PDF attachment — same filters, charts and table.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">To</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="owner@business.com, partner@business.com"
              className={`${fieldClass} h-9 ${error ? 'border-rose-500/60' : ''}`}
            />
            <span className={`text-[11px] ${error ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
              {error || `Separate addresses with commas · up to ${MAX_RECIPIENTS}`}
            </span>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} className={`${fieldClass} h-9`} />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Mango and Pineapple need restocking before the weekend…"
              className={`${fieldClass} py-2 resize-none`}
            />
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSend} onClick={handleSend}>
            {isSending ? 'Sending…' : 'Send report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
