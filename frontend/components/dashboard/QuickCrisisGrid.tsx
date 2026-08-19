'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plane,
  Clock,
  TrainFront,
  Bus,
  GitFork,
  AlertCircle,
} from 'lucide-react';
import { useCrisis } from '@/store/crisisStore';
import type { CrisisType } from '@/types/travel';
import { DEMO_CRISIS } from '@/lib/demoMode';

const CRISIS_OPTIONS: Array<{
  type: CrisisType;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { type: 'flight_cancelled', label: 'Flight Cancelled', icon: <Plane size={20} />, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20' },
  { type: 'flight_delayed', label: 'Flight Delayed', icon: <Clock size={20} />, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20' },
  { type: 'train_cancelled', label: 'Train Cancelled', icon: <TrainFront size={20} />, color: 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20' },
  { type: 'train_delayed', label: 'Train Delayed', icon: <Clock size={20} />, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20' },
  { type: 'missed_connection', label: 'Missed Connection', icon: <GitFork size={20} />, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20' },
  { type: 'other', label: 'Other Crisis', icon: <AlertCircle size={20} />, color: 'text-slate-400 border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/20' },
];

export function QuickCrisisGrid() {
  const router = useRouter();
  const { dispatch } = useCrisis();

  const handleSelect = (type: CrisisType) => {
    dispatch({
      type: 'SET_CRISIS',
      crisis: { ...DEMO_CRISIS, crisisType: type, id: `crisis-${Date.now()}` },
    });
    router.push('/crisis/new?type=' + type);
  };

  return (
    <div className="mb-16">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">
        What happened?
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CRISIS_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => handleSelect(opt.type)}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${opt.color}`}
          >
            <div className="transition-transform duration-200 group-hover:scale-110">
              {opt.icon}
            </div>
            <span className="text-xs font-semibold text-center leading-tight">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
