import toast from 'react-hot-toast';
import apiClient from '@/api/client';

export interface ApprovalTicket {
  ticket: string;
  approvedBy: string;
}

/**
 * Ask a manager to approve something at the till right now (a raised price, a discount). The
 * server answers PERMISSION_REQUIRED, the app's approval prompt asks for a manager and their PIN
 * (see api/client.ts), and the server returns a signed ticket the sale carries later.
 * Returns the ticket, `null` when the person doesn't need one, or `false` if it was cancelled or
 * couldn't be checked (offline, wrong PINs).
 */
export async function getApprovalTicket(permission: 'pos.price_override' | 'pos.discount'): Promise<ApprovalTicket | null | false> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    toast.error("A manager's approval needs an internet connection.");
    return false;
  }
  try {
    const res = await apiClient.post('/pos/auth/approval-ticket', { permission });
    const data = res.data?.success?.data;
    if (!data?.ticket) return null;
    return { ticket: data.ticket, approvedBy: data.approver_name || 'a manager' };
  } catch (err: any) {
    const status = err?.response?.data?.error?.status;
    // Cancelled prompts come back as the original PERMISSION_REQUIRED; anything else is worth saying
    if (status && status !== 'PERMISSION_REQUIRED') toast.error(err.response.data.error.message || 'Approval failed');
    return false;
  }
}
