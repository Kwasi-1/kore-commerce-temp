import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import SettingsSection from '@/components/settings/SettingsSection';
import apiClient from '@/api/client';
import { cn } from '@/lib/utils';
import StorefrontPlanBanner from '@/components/shared/StorefrontPlanBanner';

interface Storefront {
  status: 'active' | 'maintenance' | 'unpublished';
  url: string;
  template_id: string | null;
  updated_at: string | null;
  entitlement?: { state: 'full' | 'grace' | 'lapsed' };
}

const STATUS: Record<Storefront['status'], { label: string; note: string; className: string }> = {
  active: {
    label: 'Live',
    note: 'Shoppers can browse and order from your store.',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  unpublished: {
    label: 'Not published yet',
    note: 'Shoppers see a "coming soon" page until your store is published.',
    className: 'bg-muted text-muted-foreground',
  },
  maintenance: {
    label: 'Under maintenance',
    note: 'Shoppers see a "back shortly" page and can\'t place orders.',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
};

const TEMPLATE_NAMES: Record<string, string> = {
  'linea-luxury': 'Linea Luxe',
  'vetshore-retail': 'Vetshore Flow',
};

/**
 * Read-only status of the tenant's online store. Design and content are managed by the platform
 * team for now, so there's nothing to edit here.
 */
export default function StorefrontSettings() {
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiClient
      .get('/tenant/my-store/storefront')
      .then((r) => setStorefront(r.data?.success?.data?.storefront ?? null))
      .catch(() => setFailed(true))
      .finally(() => setIsLoading(false));
  }, []);

  // A paused plan overrides the deployment status: shoppers see "taking a short break"
  const status = !storefront
    ? null
    : storefront.entitlement?.state === 'lapsed'
      ? {
          label: 'Paused',
          note: 'Your plan no longer includes the online store, so shoppers see a "short break" page.',
          className: 'bg-muted text-muted-foreground',
        }
      : STATUS[storefront.status] ?? STATUS.unpublished;

  return (
    <PageLayout title="Storefront">
      <div className="max-w-4xl mb-4 custom-header space-y-4">
        <StorefrontPlanBanner />
        <SettingsSection title="Your online store" description="Its address and whether shoppers can see it.">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-40 rounded bg-muted" />
              <div className="h-4 w-64 rounded bg-muted" />
            </div>
          ) : failed ? (
            <p className="text-sm text-muted-foreground">Couldn't load your store's status. Refresh to try again.</p>
          ) : !storefront || !status ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Your online store hasn't been set up yet.</p>
              <p className="text-sm text-muted-foreground">Contact us to get it designed and launched.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className={cn('inline-flex text-xs font-semibold px-2.5 py-1 rounded-full', status.className)}>
                  {status.label}
                </span>
                <p className="text-sm text-muted-foreground">{status.note}</p>
              </div>

              <dl className="divide-y divide-border rounded-xl border border-border text-sm">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="min-w-0">
                    <a
                      href={storefront.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-foreground hover:underline truncate"
                    >
                      <span className="truncate">{storefront.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </dd>
                </div>
                {storefront.template_id && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-foreground">Design</dt>
                    <dd className="font-medium text-foreground">
                      {TEMPLATE_NAMES[storefront.template_id] ?? storefront.template_id}
                    </dd>
                  </div>
                )}
                {storefront.updated_at && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-foreground">Last updated</dt>
                    <dd className="font-medium text-foreground">
                      {new Date(storefront.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </dd>
                  </div>
                )}
              </dl>

              <p className="text-xs text-muted-foreground">
                To change your store's design, content or status, contact us.
              </p>
            </div>
          )}
        </SettingsSection>
      </div>
    </PageLayout>
  );
}
