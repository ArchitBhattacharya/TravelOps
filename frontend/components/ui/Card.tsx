import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bright' | 'crisis' | 'success';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variants = {
  default: 'glass-card rounded-xl',
  bright: 'glass-card-bright rounded-xl',
  crisis: 'bg-orange-950/30 border border-orange-500/30 rounded-xl crisis-glow',
  success: 'bg-green-950/30 border border-green-500/30 rounded-xl success-glow',
};

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className, variant = 'default', padding = 'md' }: CardProps) {
  return (
    <div className={clsx(variants[variant], paddings[padding], className)}>
      {children}
    </div>
  );
}
