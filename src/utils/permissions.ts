export type TenantPlan = 'pos_only' | 'ecommerce_only' | 'full_suite' | string;

export const getModules = (plan: TenantPlan) => ({
  pos:        ['pos_only', 'full_suite'].includes(plan),
  ecommerce:  ['ecommerce_only', 'full_suite'].includes(plan),
  inventory:  true,   // always
  reports:    true,   // always
  staff:      true,   // always
  expenses:   true,   // always
  settings:   true,   // always
});
