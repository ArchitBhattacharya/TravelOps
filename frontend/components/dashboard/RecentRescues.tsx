import React from 'react';
import Link from 'next/link';
import { CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MOCK_TRIP_HISTORY } from '@/services/mockData';
import { CRISIS_TYPE_LABELS } from '@/lib/demoMode';

export function RecentRescues() {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
          Recent Rescues
        </h2>
        <Link href="/trips" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_TRIP_HISTORY.map((trip) => (
          <Card key={trip.id} className="fade-slide-up" padding="md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-semibold text-sm">
                  {trip.origin} → {trip.destination}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {CRISIS_TYPE_LABELS[trip.crisisType]}
                </p>
              </div>
              {trip.status === 'resolved' ? (
                <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
              ) : (
                <RefreshCw size={18} className="text-yellow-400 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <Badge variant={trip.status === 'resolved' ? 'success' : 'warning'}>
                {trip.status.toUpperCase()}
              </Badge>
              <div className="text-right">
                <p className="text-cyan-400 font-bold text-sm">
                  {trip.currency}{trip.finalPrice.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Arrival: {trip.finalArrival}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
