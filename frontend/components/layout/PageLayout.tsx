import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <main className={`min-h-screen pt-20 pb-12 px-4 max-w-7xl mx-auto ${className}`}>
      {children}
    </main>
  );
}
