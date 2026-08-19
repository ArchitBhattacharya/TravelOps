import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'crisis' | 'success' | 'warning' | 'info' | 'neutral' | 'rejected';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  crisis: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  success: 'bg-green-500/20 text-green-400 border border-green-500/40',
  warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  info: 'bg-blue-500/20 text-cyan-400 border border-cyan-500/40',
  neutral: 'bg-slate-700/50 text-slate-300 border border-slate-600/40',
  rejected: 'bg-red-500/20 text-red-400 border border-red-500/40',
};

const dotColors: Record<BadgeVariant, string> = {
  crisis: 'bg-orange-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  info: 'bg-cyan-400',
  neutral: 'bg-slate-400',
  rejected: 'bg-red-400',
};

export function Badge({ variant, children, className, dot }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant], variant === 'info' && 'dot-blink')} />
      )}
      {children}
    </span>
  );
}
