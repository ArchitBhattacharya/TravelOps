// ============================================================
// TravelOps — Agent Service
// Demo mode: fully dynamic mock (no hardcoded routes).
// Live mode: calls /api/search which shells out to webcmd CLI.
// ============================================================

import type {
  TravelCrisis,
  AgentSession,
  AgentState,
  AgentActivity,
  BrowserAgentEvent,
  ReplanTrigger,
} from '@/types/travel';
import { generateRoutes } from './routeEngine';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AgentStateChangeCallback = (state: AgentState, session: AgentSession) => void;
export type ActivityCallback = (activity: AgentActivity) => void;
export type BrowserEventCallback = (event: BrowserAgentEvent) => void;

export interface AgentServiceInterface {
  startSession(crisis: TravelCrisis): Promise<AgentSession>;
  runResearch(
    sessionId: string,
    onStateChange: AgentStateChangeCallback,
    onActivity: ActivityCallback,
    onBrowserEvent: BrowserEventCallback
  ): Promise<AgentSession>;
  replan(
    session: AgentSession,
    trigger: ReplanTrigger,
    onStateChange: AgentStateChangeCallback,
    onActivity: ActivityCallback,
    onBrowserEvent: BrowserEventCallback
  ): Promise<AgentSession>;
  getSession(sessionId: string): AgentSession | null;
}

const sessionStore = new Map<string, AgentSession>();
const hubStore     = new Map<string, SearchResult['hubs']>();

export function getSessionHubs(sessionId: string): SearchResult['hubs'] | undefined {
  return hubStore.get(sessionId);
}

function createSession(crisis: TravelCrisis): AgentSession {
  const id = `session-${Date.now()}`;
  const session: AgentSession = {
    id,
    crisis,
    state: 'UNDERSTANDING',
    activities: [],
    browserEvents: [],
    routes: [],
    stats: { totalFound: 0, eliminated: 0, viable: 0, recommended: 0 },
    startedAt: new Date().toISOString(),
    replanCount: 0,
  };
  sessionStore.set(id, session);
  return session;
}

function ts() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

// Build dynamic activity log from the actual crisis data
function buildActivities(crisis: TravelCrisis): AgentActivity[] {
  const { origin, destination, maxBudget, currency, passengers } = crisis;
  const pax = passengers.adults + passengers.children + passengers.infants;
  return [
    { timestamp: ts(), message: `Understanding crisis: ${crisis.crisisType.replace(/_/g, ' ')}`, type: 'info' },
    { timestamp: ts(), message: `Route: ${origin} → ${destination}`, type: 'info' },
    { timestamp: ts(), message: `Searching flights: ${origin} → ${destination}`, type: 'search' },
    { timestamp: ts(), message: `Searching trains: ${origin} → ${destination}`, type: 'search' },
    { timestamp: ts(), message: `Searching buses: ${origin} → ${destination}`, type: 'search' },
    { timestamp: ts(), message: `Checking departure times for ${pax} passenger${pax !== 1 ? 's' : ''}`, type: 'info' },
    { timestamp: ts(), message: `Extracting prices and schedules`, type: 'info' },
    { timestamp: ts(), message: `Applying budget filter (≤ ${currency}${maxBudget.toLocaleString()})`, type: 'info' },
    { timestamp: ts(), message: `Checking deadline compliance`, type: 'info' },
    { timestamp: ts(), message: `Evaluating connection risk scores`, type: 'info' },
    { timestamp: ts(), message: `Scoring routes by priority: ${crisis.priority}`, type: 'info' },
    { timestamp: ts(), message: `Generating final recommendation`, type: 'selected' },
  ];
}

function buildBrowserEvents(crisis: TravelCrisis): BrowserAgentEvent[] {
  const { origin, destination } = crisis;
  return [
    { timestamp: ts(), tab: 'flight', action: `Navigating to flight search`, status: 'searching' },
    { timestamp: ts(), tab: 'flight', action: `Searching: ${origin} → ${destination}`, status: 'searching' },
    { timestamp: ts(), tab: 'flight', action: `Extracting flight results`, status: 'extracting' },
    { timestamp: ts(), tab: 'flight', action: `Flights extracted`, status: 'done' },
    { timestamp: ts(), tab: 'rail',   action: `Searching trains: ${origin} → ${destination}`, status: 'searching' },
    { timestamp: ts(), tab: 'rail',   action: `Extracting train schedules`, status: 'extracting' },
    { timestamp: ts(), tab: 'rail',   action: `Trains extracted`, status: 'done' },
    { timestamp: ts(), tab: 'bus',    action: `Checking bus routes: ${origin} → ${destination}`, status: 'searching' },
    { timestamp: ts(), tab: 'bus',    action: `Bus options checked`, status: 'done' },
    { timestamp: ts(), tab: 'maps',   action: `Checking transfer distances`, status: 'done' },
    { timestamp: ts(), tab: 'weather',action: `Checking weather disruptions`, status: 'done' },
  ];
}

// ── Live mode: call Next.js API route → webcmd CLI ────────────
export interface SearchResult {
  routes: ReturnType<typeof generateRoutes>['routes'];
  totalFound: number;
  eliminated: number;
  viable: number;
  recommended: number;
  source: 'webcmd+gemini' | 'gemini' | 'demo';
  hubs?: {

    origin: { place: string; nearestAirport: { name: string; iata: string; distanceKm: number } | null; mainRailStation: { name: string } | null; hasDirectAirport: boolean; notes: string };
    destination: { place: string; nearestAirport: { name: string; iata: string; distanceKm: number } | null; mainRailStation: { name: string } | null; hasDirectAirport: boolean; notes: string };
  };
}

async function fetchLiveRoutes(crisis: TravelCrisis): Promise<SearchResult> {
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ crisis }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<SearchResult>;
}

export const agentService: AgentServiceInterface = {
  startSession(crisis) {
    return Promise.resolve(createSession(crisis));
  },

  async runResearch(sessionId, onStateChange, onActivity, onBrowserEvent) {
    const session = sessionStore.get(sessionId);
    if (!session) throw new Error('Session not found');

    const { crisis } = session;
    const activities    = buildActivities(crisis);
    const browserEvents = buildBrowserEvents(crisis);

    const setState = (state: AgentState) => {
      session.state = state;
      onStateChange(state, { ...session });
    };

    const emit = async (a: AgentActivity, waitMs = 700) => {
      await delay(waitMs);
      session.activities.push(a);
      onActivity(a);
    };

    const emitBrowser = async (e: BrowserAgentEvent, waitMs = 500) => {
      await delay(waitMs);
      session.browserEvents.push(e);
      onBrowserEvent(e);
    };

    setState('UNDERSTANDING');
    await emit(activities[0], 600);
    await emit(activities[1], 400);

    setState('SEARCHING');
    await Promise.all([emit(activities[2], 500), emitBrowser(browserEvents[0], 300)]);
    await Promise.all([emitBrowser(browserEvents[1], 400)]);
    await Promise.all([emit(activities[3], 500), emitBrowser(browserEvents[4], 300)]);
    await Promise.all([emit(activities[4], 500), emitBrowser(browserEvents[7], 400)]);

    setState('EXTRACTING');
    await Promise.all([emit(activities[5], 500), emitBrowser(browserEvents[2], 300)]);
    await Promise.all([emitBrowser(browserEvents[3], 400)]);
    await Promise.all([emit(activities[6], 500), emitBrowser(browserEvents[5], 300)]);
    await Promise.all([emitBrowser(browserEvents[6], 400)]);
    await emitBrowser(browserEvents[8], 400);

    setState('COMPARING');
    await emit(activities[7], 600);
    await emitBrowser(browserEvents[9], 400);
    await emitBrowser(browserEvents[10], 400);

    setState('EVALUATING');
    await emit(activities[8], 500);
    await emit(activities[9], 500);

    setState('RECOMMENDING');
    await emit(activities[10], 500);
    await emit(activities[11], 600);

    let result: SearchResult;
    try {
      result = await fetchLiveRoutes(crisis);
    } catch {
      result = { ...generateRoutes(crisis), source: 'demo' };
    }

    session.routes = result.routes;
    session.stats = {
      totalFound: result.totalFound,
      eliminated: result.eliminated,
      viable: result.viable,
      recommended: result.recommended,
    };
    if (result.hubs) hubStore.set(sessionId, result.hubs);
    // attach source for UI badge
    (session as unknown as Record<string, unknown>)['source'] = result.source;
    session.resolvedAt = new Date().toISOString();
    setState('RESOLVED');

    sessionStore.set(sessionId, session);
    return { ...session };
  },

  async replan(session, trigger, onStateChange, onActivity, onBrowserEvent) {
    session.replanCount += 1;
    session.routes = [];

    const { crisis } = session;

    const setState = (state: AgentState) => {
      session.state = state;
      onStateChange(state, { ...session });
    };

    const emit = async (a: AgentActivity, waitMs = 600) => {
      await delay(waitMs);
      session.activities.push(a);
      onActivity(a);
    };

    const emitBrowser = async (e: BrowserAgentEvent, waitMs = 500) => {
      await delay(waitMs);
      session.browserEvents.push(e);
      onBrowserEvent(e);
    };

    const replanActs: AgentActivity[] = [
      { timestamp: ts(), message: `Replan triggered: ${formatTrigger(trigger)}`, type: 'warning' },
      { timestamp: ts(), message: 'Re-evaluating current plan against new constraints', type: 'info' },
      { timestamp: ts(), message: 'Original route no longer meets deadline', type: 'eliminated' },
      { timestamp: ts(), message: `Re-searching flights: ${crisis.origin} → ${crisis.destination}`, type: 'search' },
      { timestamp: ts(), message: `Re-checking trains: ${crisis.origin} → ${crisis.destination}`, type: 'search' },
      { timestamp: ts(), message: 'Recalculating with updated constraints', type: 'info' },
      { timestamp: ts(), message: `Scoring routes by priority: ${crisis.priority}`, type: 'info' },
      { timestamp: ts(), message: 'New recommendation generated', type: 'selected' },
    ];

    const replanBrowserEvents: BrowserAgentEvent[] = [
      { timestamp: ts(), tab: 'flight', action: `Re-searching flights after change`, status: 'searching' },
      { timestamp: ts(), tab: 'flight', action: `Found alternative routes`, status: 'found' },
      { timestamp: ts(), tab: 'rail',   action: `Re-checking train options`, status: 'searching' },
      { timestamp: ts(), tab: 'rail',   action: `Trains re-evaluated`, status: 'done' },
    ];

    setState('REPLANNING');
    for (const a of replanActs.slice(0, 3)) await emit(a, 500);

    setState('SEARCHING');
    await Promise.all([emit(replanActs[3], 500), emitBrowser(replanBrowserEvents[0], 400)]);
    await Promise.all([emit(replanActs[4], 500), emitBrowser(replanBrowserEvents[1], 400)]);

    setState('COMPARING');
    await emitBrowser(replanBrowserEvents[2], 500);
    await emitBrowser(replanBrowserEvents[3], 500);

    setState('EVALUATING');
    await emit(replanActs[5], 500);
    await emit(replanActs[6], 500);

    setState('RECOMMENDING');
    await emit(replanActs[7], 600);

    let result: SearchResult;
    try {
      result = await fetchLiveRoutes(crisis);
    } catch {
      const mutated: TravelCrisis = {
        ...crisis,
        id: crisis.id + '-replan-' + session.replanCount,
      };
      result = { ...generateRoutes(mutated), source: 'demo' };
    }

    session.routes = result.routes;
    session.stats = {
      totalFound: result.totalFound,
      eliminated: result.eliminated,
      viable: result.viable,
      recommended: result.recommended,
    };
    if (result.hubs) hubStore.set(session.id, result.hubs);
    session.resolvedAt = new Date().toISOString();
    setState('UPDATED');

    sessionStore.set(session.id, session);
    return { ...session };
  },

  getSession(sessionId) {
    return sessionStore.get(sessionId) ?? null;
  },
};

function formatTrigger(t: ReplanTrigger): string {
  switch (t.type) {
    case 'flight_delayed':      return `Flight delayed by ${t.delayMinutes ?? '?'} minutes`;
    case 'train_delayed':       return `Train delayed by ${t.delayMinutes ?? '?'} minutes`;
    case 'option_unavailable':  return 'Selected option became unavailable';
    case 'budget_changed':      return `Budget changed to ${t.newBudget}`;
    case 'deadline_changed':    return `Deadline changed to ${t.newDeadline}`;
    case 'location_changed':    return 'Location changed';
    default:                    return 'User-reported change';
  }
}
