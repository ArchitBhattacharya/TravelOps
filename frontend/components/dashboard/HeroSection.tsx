'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useCrisis } from '@/store/crisisStore';
import { DEMO_CRISIS } from '@/lib/demoMode';

export function HeroSection() {
  const { dispatch } = useCrisis();

  const handleDemo = () => {
    dispatch({ type: 'SET_DEMO_MODE', enabled: true });
    dispatch({ type: 'SET_CRISIS', crisis: DEMO_CRISIS });
  };

  return (
    <div className="relative text-center py-16 md:py-24">
      {/* Live badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-8">
        <span className="w-2 h-2 rounded-full bg-cyan-400 dot-blink" />
        AUTONOMOUS TRAVEL CRISIS AGENT
      </div>

      <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight tracking-tight">
        Travel plans changed?
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
          TravelOps finds another way.
        </span>
      </h1>

      <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
        An autonomous AI travel crisis agent that searches, compares, and replans
        your journey when things go wrong.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
        <Link href="/crisis/new">
          <Button size="lg" variant="primary" icon={<AlertTriangle size={18} />}>
            Rescue My Trip
          </Button>
        </Link>
        <Link href="/how-it-works">
          <Button size="lg" variant="secondary" icon={<Info size={18} />}>
            How It Works
          </Button>
        </Link>
        <Link href="/crisis/new" onClick={handleDemo}>
          <Button size="lg" variant="ghost" icon={<ArrowRight size={18} />}>
            Run Demo
          </Button>
        </Link>
      </div>

      {/* Trust strip */}
      <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Shield size={12} className="text-green-400" /> No automatic purchases
        </span>
        <span className="flex items-center gap-1.5">
          <Shield size={12} className="text-cyan-400" /> You confirm before booking
        </span>
        <span className="flex items-center gap-1.5">
          <Shield size={12} className="text-blue-400" /> Works offline with mock data
        </span>
      </div>
    </div>
  );
}
