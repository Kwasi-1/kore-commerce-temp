export const APP_CONFIG = {
  name: 'Kore Commerce',
  shortName: 'Kore',
  brandName: 'KoreCommerce',
  tagline: 'Unified Retail Management & POS Platform',
  receiptFooter: 'Powered by Kore Commerce',
  defaultStoreName: 'Kore Commerce Store',
  supportEmail: 'support@kore-commerce.com',
  website: 'https://korecommerce.com',
} as const;

export type AppConfig = typeof APP_CONFIG;
