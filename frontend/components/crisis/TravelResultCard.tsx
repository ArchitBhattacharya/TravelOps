'use client';

import { useState } from 'react';
import { ArrowRight, Bus, ChevronDown, ExternalLink, MapPin, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { BookingSource, TravelRoute } from '@/types/travel';

function isBookingUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function SourceRow({ source, currency }: { source: BookingSource; currency: string }) {
  const bookingAvailable = isBookingUrl(source.bookingUrl);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-700/60 px-3 py-3 first:border-t-0">
      <p className="min-w-28 text-sm font-semibold text-white">{source.name}</p>
      {typeof source.rating === 'number' && (
        <span className="inline-flex items-center gap-1 text-xs text-yellow-300"><Star size={12} fill="currentColor" /> {source.rating.toFixed(1)}</span>
      )}
      {typeof source.price === 'number' && <span className="text-sm text-cyan-300">{currency}{source.price.toLocaleString()}</span>}
      <span className="ml-auto">
        {bookingAvailable ? (
          <a
            href={source.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
          >
            Book Now <ExternalLink size={12} />
          </a>
        ) : <span className="text-xs text-slate-500">Booking link unavailable</span>}
      </span>
    </div>
  );
}

export function TravelResultCard({ route, maxBudget, researchPowered, onSelect }: { route: TravelRoute; maxBudget: number; researchPowered: boolean; onSelect?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const firstSegment = route.segments[0];
  const lastSegment = route.segments[route.segments.length - 1] ?? firstSegment;
  const operatorName = route.operatorName ?? firstSegment?.carrier;
  const sources = route.sources ?? [];
  const sourceNames = sources.map((source) => source.name);
  const priceAvailable = route.priceAvailable ?? true;
  const withinBudget = priceAvailable && (route.withinBudget ?? route.totalPrice <= maxBudget);
  const statusVariant = route.status === 'rejected' ? 'rejected' : route.status === 'recommended' ? 'info' : 'success';
  const riskVariant = route.riskLevel === 'LOW' ? 'success' : route.riskLevel === 'MEDIUM' ? 'warning' : 'crisis';
  const detailsAvailable = Boolean(route.serviceName || route.vehicleType || route.category || route.amenities?.length || route.boardingPoints?.length || route.droppingPoints?.length || route.segments.length > 1 || sources.some((source) => source.timestamp || source.bookingUrl));

  return (
    <Card className={`border ${route.status === 'rejected' ? 'border-red-500/30 bg-red-950/10' : 'border-slate-700/80 bg-slate-900/50'}`} padding="none">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700/70 px-5 py-3">
        <Badge variant={statusVariant} dot>{route.status === 'rejected' ? 'Rejected' : 'Viable'}</Badge>
        {route.status === 'recommended' && <Badge variant="info">Top pick</Badge>}
        <Badge variant={riskVariant}>{route.riskLevel} risk</Badge>
        {researchPowered && <span className="ml-auto text-xs text-slate-500">Research powered by TravelOps Browser Agent</span>}
      </div>

      <div className="grid divide-y divide-slate-700/60 xl:grid-cols-[1.2fr_1.4fr_.7fr_1fr] xl:divide-x xl:divide-y-0">
        <section className="p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400"><Bus size={13} /> {route.primaryMode}</p>
          <h3 className="text-lg font-bold text-white">{operatorName ?? 'Operator details unavailable'}</h3>
          {route.serviceName && <p className="mt-1 text-sm font-medium text-slate-200">{route.serviceName}</p>}
          {route.vehicleType && <p className="mt-1 text-sm text-slate-400">{route.vehicleType}</p>}
          {route.category && <p className="mt-1 text-xs text-slate-500">{route.category}</p>}
          {route.amenities && route.amenities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {route.amenities.map((amenity) => <span key={amenity} className="rounded-full border border-slate-600/70 bg-slate-800 px-2 py-1 text-xs text-slate-300">{amenity}</span>)}
            </div>
          )}
        </section>

        <section className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Route & timing</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div><p className="text-sm font-semibold text-white">{firstSegment?.from}</p><p className="mt-1 text-cyan-300">{firstSegment?.departure}</p></div>
            <div className="min-w-24 text-center"><p className="mb-1 text-xs text-slate-400">{route.travelTime}</p><ArrowRight className="mx-auto text-cyan-500" size={24} /><p className="mt-1 text-xs text-slate-500">{route.transfers === 0 ? 'Direct' : `${route.transfers} transfer${route.transfers === 1 ? '' : 's'}`}</p></div>
            <div className="text-right"><p className="text-sm font-semibold text-white">{lastSegment?.to}</p><p className="mt-1 text-cyan-300">{lastSegment?.arrival}</p></div>
          </div>
          <div className="mt-4 space-y-1 text-xs text-slate-400">
            {route.stops !== undefined && <p>Stops: {route.stops}</p>}
            <p>Transfers: {route.transfers}</p>
            {route.deadlineMet ? <p className="font-medium text-green-400">✓ Meets deadline {route.safetyBuffer && `· ${route.safetyBuffer} buffer`}</p> : <p className="font-medium text-red-400">✕ {route.rejectionReason ?? 'Misses deadline'}</p>}
          </div>
        </section>

        <section className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Price & score</p>
          {priceAvailable ? <><p className="mt-3 text-2xl font-bold text-cyan-300">{route.currency}{route.totalPrice.toLocaleString()}</p><p className="text-xs text-slate-500">per seat</p></> : <p className="mt-3 text-sm font-medium text-slate-400">Fare unavailable</p>}
          <p className="mt-4 text-sm text-slate-300">Score: <span className="font-bold text-white">{route.score}/100</span></p>
          <p className={`mt-2 text-xs font-medium ${priceAvailable ? (withinBudget ? 'text-green-400' : 'text-red-400') : 'text-yellow-400'}`}>{!priceAvailable ? 'Fare not returned by source' : withinBudget ? '✓ Within budget' : `✕ Exceeds ${route.currency}${maxBudget.toLocaleString()} budget`}</p>
          {route.rejectionReason && <p className="mt-3 text-xs leading-5 text-red-300">{route.rejectionReason}</p>}
        </section>

        <section className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available on</p>
          {sources.length > 0 ? <div className="mt-3 overflow-hidden rounded-lg border border-slate-700/70 bg-slate-950/30"><>{sources.map((source, index) => <SourceRow key={`${source.name}-${index}`} source={source} currency={route.currency} />)}</></div> : <p className="mt-3 text-sm text-slate-500">No booking provider data was returned for this option.</p>}
          {(sourceNames.length > 0 || route.researchSource) && <p className="mt-3 text-xs text-slate-500">Data sourced from: {sourceNames.length > 0 ? sourceNames.join(' • ') : route.researchSource}</p>}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/70 px-5 py-3">
        <button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          View Full Details <ChevronDown size={16} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {route.status !== 'rejected' && onSelect && <button type="button" onClick={onSelect} className="ml-auto rounded-lg border border-blue-500/50 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">Select This Route</button>}
        {expanded && (
          <div className="mt-1 grid w-full gap-4 border-t border-slate-700/60 pt-4 text-sm md:grid-cols-2">
            {route.boardingPoints && route.boardingPoints.length > 0 && <div><p className="mb-1 font-semibold text-slate-300">Boarding points</p>{route.boardingPoints.map((point) => <p key={point} className="flex gap-1.5 text-slate-400"><MapPin size={13} className="mt-0.5 text-cyan-500" />{point}</p>)}</div>}
            {route.droppingPoints && route.droppingPoints.length > 0 && <div><p className="mb-1 font-semibold text-slate-300">Dropping points</p>{route.droppingPoints.map((point) => <p key={point} className="flex gap-1.5 text-slate-400"><MapPin size={13} className="mt-0.5 text-cyan-500" />{point}</p>)}</div>}
            {route.segments.length > 1 && <div><p className="mb-1 font-semibold text-slate-300">Journey legs</p>{route.segments.map((segment, index) => <p key={`${segment.from}-${index}`} className="text-slate-400">{segment.from} → {segment.to} · {segment.departure}–{segment.arrival}</p>)}</div>}
            {sources.some((source) => source.timestamp || source.bookingUrl) && <div><p className="mb-1 font-semibold text-slate-300">Source details</p>{sources.map((source, index) => <p key={`${source.name}-${index}`} className="text-slate-400">{source.name}{source.timestamp ? ` · ${source.timestamp}` : ''}{isBookingUrl(source.bookingUrl) ? ' · booking link available' : ''}</p>)}</div>}
            {!detailsAvailable && <p className="text-slate-500">No additional operator, vehicle, or provider detail was returned for this option.</p>}
          </div>
        )}
      </div>
    </Card>
  );
}
