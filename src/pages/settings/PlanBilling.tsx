import React from 'react';
import PageLayout from '@/components/layout/PageLayout';
import useAuthStore from '@/store/authStore';
import { getModules } from '@/utils/permissions';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@nextui-org/react';

export default function PlanBilling() {
  const { tenant } = useAuthStore();
  
  if (!tenant) return null;

  const currentPlan = tenant.plan || 'pos_only';
  const modules = getModules(currentPlan as any);

  const planFeatures = [
    { name: 'Point of Sale (POS)', available: modules.pos, description: 'In-store sales, cashier shifts, printed receipts.' },
    { name: 'Ecommerce Storefront', available: modules.ecommerce, description: 'Online store, customer accounts, digital payments.' },
    { name: 'Inventory Management', available: modules.inventory, description: 'Products, stock tracking, purchase orders.' },
    { name: 'Analytics & Reports', available: modules.reports, description: 'Sales summaries, product performance, end of day.' },
    { name: 'Staff Management', available: modules.staff, description: 'Role-based access, cashiers, managers.' },
  ];

  const formatPlanName = (plan: string) => {
    return plan.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <PageLayout title="Plan & Billing">
      <div className="max-w-4xl space-y-8">
        
        {/* Current Plan Overview */}
        <section className="bg-white dark:bg-pos-dark-card rounded-xl p-8 border border-pos-accent/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pos-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10">
            <h2 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-1">Current Subscription</h2>
            <div className="flex items-end gap-4 mb-6">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {formatPlanName(currentPlan)}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mb-2">
                Active
              </span>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mb-8">
              You are currently on the {formatPlanName(currentPlan)} plan. This determines which modules and features are available to your staff.
            </p>

            <div className="flex gap-4">
              <Button className="bg-pos-accent text-pos-accent-text font-bold" disabled>
                Upgrade Plan (Coming Soon)
              </Button>
              <Button variant="flat" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium" disabled>
                View Invoices
              </Button>
            </div>
          </div>
        </section>

        {/* Module Entitlements */}
        <section className="bg-white dark:bg-pos-dark-card rounded-xl border border-gray-100 dark:border-pos-dark-border overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Module Entitlements</h3>
            <p className="text-sm text-gray-500">Features included in your current subscription.</p>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {planFeatures.map((feature, idx) => (
              <div key={idx} className="p-6 flex items-start gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                <div className="mt-0.5 shrink-0">
                  {feature.available ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-gray-300 dark:text-gray-700" />
                  )}
                </div>
                <div>
                  <h4 className={`text-base font-semibold ${feature.available ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                    {feature.name}
                  </h4>
                  <p className={`text-sm mt-1 ${feature.available ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </PageLayout>
  );
}
