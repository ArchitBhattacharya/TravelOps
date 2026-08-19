'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Bell, Settings, User, Zap } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useCrisis } from '@/store/crisisStore';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/crisis/new', label: 'New Crisis' },
  { href: '/trips', label: 'My Trips' },
  { href: '/how-it-works', label: 'How It Works' },
];

export function Navbar() {
  const pathname = usePathname();
  const { state, dispatch } = useCrisis();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass-card border-b border-blue-900/40">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Logo size="md" />
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                pathname === link.href
                  ? 'bg-blue-600/20 text-cyan-400 border border-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-blue-900/20'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Demo mode toggle */}
          <button
            onClick={() => dispatch({ type: 'SET_DEMO_MODE', enabled: !state.isDemoMode })}
            className={clsx(
              'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
              state.isDemoMode
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-700/30 text-slate-400 border-slate-600/30 hover:border-cyan-500/30 hover:text-cyan-400'
            )}
          >
            <Zap size={12} />
            Demo
          </button>

          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-blue-900/30 transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
          </button>

          <Link
            href="/settings"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-blue-900/30 transition-colors"
          >
            <Settings size={18} />
          </Link>

          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-colors cursor-pointer">
            <User size={18} />
          </div>
        </div>
      </div>
    </nav>
  );
}
