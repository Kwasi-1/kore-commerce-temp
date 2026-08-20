/**
 * Determines whether a payroll salary profile has all required fields to be
 * included in a payroll run and disbursed.
 *
 * Rules:
 *  - base_amount must be > 0  (mandatory for all payment methods)
 *  - payment_method must be set
 *  - For 'bank_transfer' and 'mobile_money': bank_or_momo_name + account_number are required
 *  - For 'cash': no account details needed
 */
export function isProfileConfigured(profile: any): boolean {
  if (!profile) return false;
  if (!profile.base_amount || Number(profile.base_amount) <= 0) return false;
  if (!profile.payment_method) return false;
  if (profile.payment_method === 'cash') return true;
  if (!profile.bank_or_momo_name?.trim()) return false;
  if (!profile.account_number?.trim()) return false;
  return true;
}
