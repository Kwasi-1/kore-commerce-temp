import React from 'react';

interface Props {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}

/** A settings card: title and description on the left from lg up, the fields on the right; stacked on smaller screens. */
export default function SettingsSection({ title, description, children }: Props) {
  return (
    <section className="bg-card dark:bg-card/60 text-card-foreground rounded-xl p-4 md:p-6 border border-border dark:border-border/60">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
        <div>
          <h2 className="text-lg md:text-xl font-bold font-header tracking-tighter mb-1 text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </section>
  );
}
