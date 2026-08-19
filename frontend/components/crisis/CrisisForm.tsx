'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plane, TrainFront, Bus, GitFork, AlertCircle, Clock,
  MapPin, CalendarClock, Wallet, Target, Sliders, Users, ArrowRight, Zap,
  CheckCircle, XCircle, RefreshCw, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useCrisis } from '@/store/crisisStore';
import { DEMO_CRISIS } from '@/lib/demoMode';
import { agentService, getSessionHubs } from '@/services/agentService';
import type { SearchResult } from '@/services/agentService';
import type {
  CrisisType, Priority, TravelPreferences, PassengerCount,
  AgentSession, TravelRoute, AgentActivity
} from '@/types/travel';

// ── Crisis type options ──────────────────────────────────────
const CRISIS_OPTIONS: Array<{ type: CrisisType; label: string; icon: React.ReactNode }> = [
  { type: 'flight_cancelled', label: 'Flight Cancelled', icon: <Plane size={18} /> },
  { type: 'flight_delayed',   label: 'Flight Delayed',   icon: <Clock size={18} /> },
  { type: 'train_cancelled',  label: 'Train Cancelled',  icon: <TrainFront size={18} /> },
  { type: 'train_delayed',    label: 'Train Delayed',    icon: <Clock size={18} /> },
  { type: 'missed_connection',label: 'Missed Connection',icon: <GitFork size={18} /> },
  { type: 'other',            label: 'Other',            icon: <AlertCircle size={18} /> },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; desc: string }> = [
  { value: 'fastest',  label: 'Fastest',  desc: 'Get there ASAP' },
  { value: 'cheapest', label: 'Cheapest', desc: 'Minimize cost' },
  { value: 'safest',   label: 'Safest',   desc: 'Low risk only' },
  { value: 'balanced', label: 'Balanced', desc: 'Best overall' },
];

// ── Step tabs ────────────────────────────────────────────────
type Step = 'type' | 'details' | 'preferences' | 'running' | 'results';

// ── Activity log icon ────────────────────────────────────────
function ActivityIcon({ type }: { type: AgentActivity['type'] }) {
  switch (type) {
    case 'search':     return <span className="text-blue-400">⟳</span>;
    case 'found':      return <span className="text-green-400">✓</span>;
    case 'eliminated': return <span className="text-red-400">✗</span>;
    case 'selected':   return <span className="text-cyan-400">★</span>;
    case 'warning':    return <span className="text-yellow-400">⚠</span>;
    default:           return <span className="text-slate-400">·</span>;
  }
}

// ── Route card ────────────────────────────────────────────────
function RouteCard({ route, onSelect }: { route: TravelRoute; onSelect?: () => void }) {
  const statusColors = {
    recommended: 'border-cyan-500/40 bg-cyan-500/5',
    viable:      'border-slate-500/40 bg-slate-800/30',
    rejected:    'border-red-500/20 bg-red-900/10 opacity-70',
  };
  const riskColors = { LOW: 'success', MEDIUM: 'warning', HIGH: 'crisis' } as const;

  return (
    <Card className={`${statusColors[route.status]} border`} padding="md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {route.status === 'recommended' && (
            <Badge variant="info" dot>TOP PICK</Badge>
          )}
          {route.status === 'rejected' && (
            <Badge variant="rejected">REJECTED</Badge>
          )}
          {route.status === 'viable' && (
            <Badge variant="neutral">VIABLE</Badge>
          )}
          <Badge variant={riskColors[route.riskLevel]}>{route.riskLevel} RISK</Badge>
        </div>
        <div className="text-right">
          <p className="text-cyan-400 font-bold text-lg">{route.currency}{route.totalPrice.toLocaleString()}</p>
          <p className="text-xs text-slate-400">Score: {route.score}/100</p>
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-2 mb-3">
        {route.segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 capitalize w-12 text-xs">{seg.mode}</span>
            <span className="text-white font-medium">{seg.from}</span>
            <ArrowRight size={12} className="text-slate-500 flex-shrink-0" />
            <span className="text-white font-medium">{seg.to}</span>
            <span className="text-slate-400 text-xs ml-auto">{seg.departure} → {seg.arrival}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
        <span>⏱ {route.travelTime}</span>
        <span>✈ {route.transfers === 0 ? 'Direct' : `${route.transfers} stop`}</span>
        <span>Buffer: {route.safetyBuffer}</span>
        {route.deadlineMet
          ? <span className="text-green-400">✓ Meets deadline</span>
          : <span className="text-red-400">✗ Misses deadline</span>
        }
      </div>

      {route.rejectionReason && (
        <p className="text-xs text-red-400 mb-3">✗ {route.rejectionReason}</p>
      )}

      {route.recommendationReasons && route.recommendationReasons.length > 0 && (
        <ul className="text-xs text-green-400 mb-3 space-y-0.5">
          {route.recommendationReasons.map((r, i) => <li key={i}>✓ {r}</li>)}
        </ul>
      )}

      {route.status !== 'rejected' && onSelect && (
        <Button variant="primary" size="sm" className="w-full" onClick={onSelect} icon={<CheckCircle size={14} />}>
          Select This Route
        </Button>
      )}
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────
export function CrisisForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: crisisState, dispatch } = useCrisis();

  // Form state
  const [step, setStep] = useState<Step>('type');
  const [crisisType, setCrisisType] = useState<CrisisType>(
    (searchParams.get('type') as CrisisType) || 'flight_cancelled'
  );
  const [origin, setOrigin] = useState(crisisState.currentCrisis?.origin || '');
  const [destination, setDestination] = useState(crisisState.currentCrisis?.destination || '');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState(crisisState.currentCrisis?.maxBudget?.toString() || '8000');
  const [currency, setCurrency] = useState(crisisState.currentCrisis?.currency || '₹');
  const [priority, setPriority] = useState<Priority>(crisisState.currentCrisis?.priority || 'balanced');
  const [preferences, setPreferences] = useState<TravelPreferences>(
    crisisState.currentCrisis?.preferences || DEMO_CRISIS.preferences
  );
  const [passengers, setPassengers] = useState<PassengerCount>(
    crisisState.currentCrisis?.passengers || { adults: 1, children: 0, infants: 0 }
  );

  // Agent state
  const [session, setSession] = useState<AgentSession | null>(null);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [agentStatus, setAgentStatus] = useState('');
  const [hubs, setHubs] = useState<SearchResult['hubs'] | null>(null);
  const [dataSource, setDataSource] = useState<SearchResult['source'] | null>(null);

  // Pre-fill from demo mode
  useEffect(() => {
    if (crisisState.isDemoMode && crisisState.currentCrisis) {
      const c = crisisState.currentCrisis;
      setOrigin(c.origin);
      setDestination(c.destination);
      setBudget(c.maxBudget.toString());
      setCurrency(c.currency);
      setPriority(c.priority);
      setPreferences(c.preferences);
      setPassengers(c.passengers);
      setCrisisType(c.crisisType);
    }
  }, [crisisState.isDemoMode, crisisState.currentCrisis]);

  // Auto-advance from results of quick crisis grid
  useEffect(() => {
    const type = searchParams.get('type') as CrisisType;
    if (type) setCrisisType(type);
  }, [searchParams]);

  const handleLoadDemo = () => {
    dispatch({ type: 'SET_DEMO_MODE', enabled: true });
    dispatch({ type: 'SET_CRISIS', crisis: DEMO_CRISIS });
    setOrigin(DEMO_CRISIS.origin);
    setDestination(DEMO_CRISIS.destination);
    setBudget(DEMO_CRISIS.maxBudget.toString());
    setCurrency(DEMO_CRISIS.currency);
    setPriority(DEMO_CRISIS.priority);
    setPreferences(DEMO_CRISIS.preferences);
    setPassengers(DEMO_CRISIS.passengers);
    setCrisisType(DEMO_CRISIS.crisisType);
  };

  const handleStartSearch = async () => {
    const crisis = {
      id: `crisis-${Date.now()}`,
      crisisType,
      origin,
      destination,
      deadline: deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      maxBudget: parseFloat(budget) || 8000,
      currency,
      priority,
      preferences,
      passengers,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'SET_CRISIS', crisis });
    setActivities([]);
    setStep('running');

    const newSession = await agentService.startSession(crisis);
    setSession(newSession);
    dispatch({ type: 'SET_SESSION', session: newSession });

    await agentService.runResearch(
      newSession.id,
      (agentState, updatedSession) => {
        setAgentStatus(agentState);
        dispatch({ type: 'UPDATE_SESSION', session: updatedSession });
      },
      (activity) => {
        setActivities((prev) => [...prev, activity]);
      },
      () => {}
    );

    setStep('results');
    const resolvedHubs = getSessionHubs(newSession.id);
    if (resolvedHubs) setHubs(resolvedHubs);
    // source is stored in the fetch result — read from crisisState session
    const src = (crisisState.session as unknown as { source?: SearchResult['source'] })?.source;
    if (src) setDataSource(src);
  };

  const steps: Step[] = ['type', 'details', 'preferences'];
  const stepLabels = ['Crisis Type', 'Trip Details', 'Preferences'];

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Rescue My Trip</h1>
        <p className="text-slate-400 text-sm">Tell the agent what happened and it'll find your best options.</p>
      </div>

      {/* Demo banner */}
      {!crisisState.isDemoMode && step !== 'running' && step !== 'results' && (
        <div className="mb-6 flex items-center justify-between p-3 rounded-lg bg-blue-900/20 border border-blue-700/30 text-sm">
          <span className="text-slate-300">Want a quick preview?</span>
          <Button variant="ghost" size="sm" icon={<Zap size={14} />} onClick={handleLoadDemo}>
            Load Demo Data
          </Button>
        </div>
      )}

      {/* Step progress */}
      {step !== 'running' && step !== 'results' && (
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => setStep(s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  step === s
                    ? 'bg-blue-600/30 text-cyan-400 border border-blue-500/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  step === s ? 'bg-cyan-400 text-black' : 'bg-slate-700 text-slate-400'
                }`}>{i + 1}</span>
                {stepLabels[i]}
              </button>
              {i < steps.length - 1 && <ChevronRight size={14} className="text-slate-600" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── STEP 1: Crisis type ── */}
      {step === 'type' && (
        <Card padding="lg">
          <h2 className="text-white font-semibold mb-4">What happened?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {CRISIS_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setCrisisType(opt.type)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                  crisisType === opt.type
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-400'
                    : 'border-slate-600/40 bg-slate-800/30 text-slate-300 hover:border-slate-500/60 hover:text-white'
                }`}
              >
                <span className="flex-shrink-0">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="primary" size="md" icon={<ArrowRight size={16} />} onClick={() => setStep('details')} className="w-full">
            Continue
          </Button>
        </Card>
      )}

      {/* ── STEP 2: Trip details ── */}
      {step === 'details' && (
        <Card padding="lg">
          <h2 className="text-white font-semibold mb-5">Where are you heading?</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Origin</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Kolkata"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Destination</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Delhi"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Must arrive by</label>
                <div className="relative">
                  <CalendarClock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Max budget</label>
                <div className="flex gap-2">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="px-2 py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="₹">₹</option>
                    <option value="$">$</option>
                    <option value="€">€</option>
                    <option value="£">£</option>
                  </select>
                  <div className="relative flex-1">
                    <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="8000"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Passengers */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
                <Users size={12} /> Passengers
              </label>
              <div className="flex gap-3">
                {(['adults', 'children', 'infants'] as const).map((key) => (
                  <div key={key} className="flex-1">
                    <p className="text-xs text-slate-500 mb-1 capitalize">{key}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPassengers((p) => ({ ...p, [key]: Math.max(key === 'adults' ? 1 : 0, p[key] - 1) }))}
                        className="w-7 h-7 rounded bg-slate-700/50 border border-slate-600/40 text-white hover:bg-slate-600/50 text-sm font-bold"
                      >−</button>
                      <span className="w-6 text-center text-white text-sm font-semibold">{passengers[key]}</span>
                      <button
                        onClick={() => setPassengers((p) => ({ ...p, [key]: p[key] + 1 }))}
                        className="w-7 h-7 rounded bg-slate-700/50 border border-slate-600/40 text-white hover:bg-slate-600/50 text-sm font-bold"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="ghost" size="md" onClick={() => setStep('type')} className="flex-1">Back</Button>
            <Button variant="primary" size="md" icon={<ArrowRight size={16} />} onClick={() => setStep('preferences')} className="flex-1"
              disabled={!origin || !destination}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Preferences ── */}
      {step === 'preferences' && (
        <Card padding="lg">
          <h2 className="text-white font-semibold mb-5">How do you want to travel?</h2>

          {/* Priority */}
          <div className="mb-5">
            <label className="block text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
              <Target size={12} /> Priority
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    priority === p.value
                      ? 'border-cyan-500/60 bg-cyan-500/10'
                      : 'border-slate-600/40 bg-slate-800/30 hover:border-slate-500/60'
                  }`}
                >
                  <p className={`text-sm font-semibold ${priority === p.value ? 'text-cyan-400' : 'text-white'}`}>{p.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Preferences toggles */}
          <div className="mb-6">
            <label className="block text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
              <Sliders size={12} /> Travel preferences
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(preferences) as [keyof TravelPreferences, boolean][]).map(([key, val]) => {
                const labels: Record<keyof TravelPreferences, string> = {
                  preferDirect: 'Prefer direct',
                  avoidBus: 'Avoid bus',
                  preferTrain: 'Prefer train',
                  preferFlight: 'Prefer flight',
                  avoidLongLayovers: 'Avoid long layovers',
                  minimizeTransfers: 'Minimize transfers',
                };
                return (
                  <button
                    key={key}
                    onClick={() => setPreferences((p) => ({ ...p, [key]: !p[key] }))}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      val
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                        : 'border-slate-600/40 bg-slate-800/30 text-slate-400 hover:border-slate-500/60'
                    }`}
                  >
                    <span>{labels[key]}</span>
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${val ? 'bg-blue-500 text-white' : 'bg-slate-700'}`}>
                      {val ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" size="md" onClick={() => setStep('details')} className="flex-1">Back</Button>
            <Button variant="primary" size="lg" icon={<Zap size={16} />} onClick={handleStartSearch} className="flex-1">
              Find My Route
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 4: Running ── */}
      {step === 'running' && (
        <Card padding="lg">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              AGENT RUNNING — {agentStatus}
            </div>
            <h2 className="text-white font-bold text-xl">Searching for alternatives...</h2>
            <p className="text-slate-400 text-sm mt-1">{origin} → {destination}</p>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm py-1.5 border-b border-slate-800/60">
                <span className="mt-0.5 flex-shrink-0"><ActivityIcon type={a.type} /></span>
                <span className="text-slate-300 flex-1">{a.message}</span>
                <span className="text-slate-600 text-xs flex-shrink-0 font-mono">{a.timestamp}</span>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">Starting agent...</div>
            )}
          </div>
        </Card>
      )}

      {/* ── STEP 5: Results ── */}
      {step === 'results' && session && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-white font-bold text-xl">Routes Found</h2>
                {dataSource && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    dataSource === 'webcmd+gemini'
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : dataSource === 'gemini'
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
                  }`}>
                    {dataSource === 'webcmd+gemini' ? '🌐 LIVE' : dataSource === 'gemini' ? '🤖 AI' : '🔧 DEMO'}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">{origin} → {destination} · {session.routes.length} options</p>
            </div>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => setStep('type')}>
              New Search
            </Button>
          </div>

          {/* Hub resolution notice */}
          {hubs && (
            <div className="space-y-2">
              {!hubs.origin.hasDirectAirport && hubs.origin.nearestAirport && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30 text-sm">
                  <MapPin size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="text-yellow-300">
                    <span className="font-semibold">{hubs.origin.place}</span> has no direct airport.
                    Nearest: <span className="font-semibold">{hubs.origin.nearestAirport.name} ({hubs.origin.nearestAirport.iata})</span> — {hubs.origin.nearestAirport.distanceKm}km away. {hubs.origin.notes}
                  </span>
                </div>
              )}
              {!hubs.destination.hasDirectAirport && hubs.destination.nearestAirport && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30 text-sm">
                  <MapPin size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="text-yellow-300">
                    <span className="font-semibold">{hubs.destination.place}</span> has no direct airport.
                    Nearest: <span className="font-semibold">{hubs.destination.nearestAirport.name} ({hubs.destination.nearestAirport.iata})</span> — {hubs.destination.nearestAirport.distanceKm}km away. {hubs.destination.notes}
                  </span>
                </div>
              )}
              {hubs.origin.mainRailStation && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900/20 border border-blue-700/30 text-xs text-blue-300">
                  <span>🚉</span>
                  <span>Rail hub: <span className="font-semibold">{hubs.origin.mainRailStation.name}</span> → <span className="font-semibold">{hubs.destination.mainRailStation?.name ?? hubs.destination.place}</span></span>
                </div>
              )}
            </div>
          )}


          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Found', value: session.stats.totalFound, color: 'text-white' },
              { label: 'Eliminated', value: session.stats.eliminated, color: 'text-red-400' },
              { label: 'Viable', value: session.stats.viable, color: 'text-yellow-400' },
              { label: 'Recommended', value: session.stats.recommended, color: 'text-cyan-400' },
            ].map((s) => (
              <Card key={s.label} padding="sm" className="text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Routes */}
          {session.routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              onSelect={() => alert(`Route ${route.id} selected! (booking flow coming soon)`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
