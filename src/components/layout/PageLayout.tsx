import React from "react";

interface PageLayoutProps {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export default function PageLayout({
  title,
  actions,
  className = "",
  children,
}: PageLayoutProps) {
  return (
    <div
      className={`w-full h-full bg-primary-gray/20 overflow-x-hidden flex flex-col p-4 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-2xl md:text-3xl">{title}</h1>
          {actions && <div className="ml-4">{actions}</div>}
        </div>
      )}

      <div className="flex-1">{children}</div>
    </div>
  );
}
