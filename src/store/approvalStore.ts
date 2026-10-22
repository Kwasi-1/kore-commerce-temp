import { create } from 'zustand';

export interface Approval {
  staff_id: string;
  pin: string;
}

interface ApprovalRequest {
  permissions: string[];
  message?: string;
  error?: string; // e.g. "Incorrect PIN. 3 tries left." when asking again
}

interface ApprovalState {
  request: ApprovalRequest | null;
  resolve: ((value: Approval | null) => void) | null;
  /** Ask someone with one of `permissions` to approve with their PIN. Resolves null if cancelled. */
  ask: (request: ApprovalRequest) => Promise<Approval | null>;
  answer: (value: Approval | null) => void;
}

/**
 * One-off manager approval at the till. The API client calls ask() when the server answers
 * PERMISSION_REQUIRED; <ApprovalModal /> shows the request and calls answer().
 */
export const useApprovalStore = create<ApprovalState>((set, get) => ({
  request: null,
  resolve: null,
  ask: (request) =>
    new Promise<Approval | null>((resolve) => {
      get().resolve?.(null); // a newer request replaces any open one
      set({ request, resolve });
    }),
  answer: (value) => {
    get().resolve?.(value);
    set({ request: null, resolve: null });
  },
}));
