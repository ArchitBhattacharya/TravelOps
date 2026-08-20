// ============================================================
// TravelOps — /api/search
// Flow:
//   1. Gemini resolves real transport hubs for origin/destination
//   2. webcmd browser session → Google Flights → real live data
//   3. Gemini parses + scores the snapshot into TravelRoute[]
//   Falls back to dynamic generation if webcmd unavailable.
// Secrets stay server-side.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateRoutes } from '@/services/routeEngine';
import { isKnownPlace } from '@/services/hubData';
import { searchRailKitRoutes } from '@/services/railKitService';
import type { TravelCrisis, TravelRoute, RouteStatus, RiskLevel, TransportMode } from '@/types/travel';

const execFileAsync = promisify(execFile);

// ── Gemini ────────────────────────────────────────────────────

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-1.5-flash' });
}

async function geminiJSON<T>(prompt: string): Promise<T> {
  const result = await getModel().generateContent(prompt);
  const text = result.response.text().trim()
    .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(text) as T;
}

// ── Hub resolution ────────────────────────────────────────────

export interface TransportHub {
  place: string;
  nearestAirport: { name: string; iata: string; distanceKm: number } | null;
  mainRailStation: { name: string; code?: string } | null;
  nearestBusTerminal: { name: string } | null;
  hasDirectAirport: boolean;
  notes: string;
}

async function resolveHubs(origin: string, destination: string) {
  return geminiJSON<{ origin: TransportHub; destination: TransportHub }>(`
You are a transport geography expert. For each place below return REAL, EXISTING hubs only.

Places: 1) "${origin}"  2) "${destination}"

Return ONLY this JSON (no markdown):
{
  "origin": {
    "place": "${origin}",
    "nearestAirport": { "name": "...", "iata": "...", "distanceKm": <number> } or null,
    "mainRailStation": { "name": "...", "code": "..." } or null,
    "nearestBusTerminal": { "name": "..." } or null,
    "hasDirectAirport": <boolean>,
    "notes": "how to reach hub from the city"
  },
  "destination": {
    "place": "${destination}",
    "nearestAirport": { "name": "...", "iata": "...", "distanceKm": <number> } or null,
    "mainRailStation": { "name": "...", "code": "..." } or null,
    "nearestBusTerminal": { "name": "..." } or null,
    "hasDirectAirport": <boolean>,
    "notes": "how to reach hub from the city"
  }
}`);
}

// ── webcmd helpers ────────────────────────────────────────────

async function runWebcmd(args: string[]): Promise<unknown> {
  const bin = process.env.WEBCMD_PATH ?? 'webcmd';
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (process.env.WEBCMD_WORKSPACE) env.WEBCMD_WORKSPACE = process.env.WEBCMD_WORKSPACE;
  const { stdout } = await execFileAsync(bin, args, { timeout: 45_000, env });
  return JSON.parse(stdout.trim());
}

async function webcmdAvailable(): Promise<boolean> {
  try { await runWebcmd(['--version']); return true; } catch { return false; }
}
async function runWebcmdWithStdin(args: string[], input: string, timeoutMs = 50_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const bin = process.env.WEBCMD_PATH ?? 'webcmd';
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (process.env.WEBCMD_WORKSPACE) env.WEBCMD_WORKSPACE = process.env.WEBCMD_WORKSPACE;

    const child = spawn(bin, args, { env });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('webcmd command timed out'));
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(stderr || `webcmd exited with code ${code}`));
      else resolve(stdout);
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

// ── Google Flights browser scrape ─────────────────────────────

const BROWSER_SCRIPT = (origin: string, destination: string, date: string) => `
const url = 'https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(destination)}+on+${date}&curr=INR';
await page.goto(url);
await page.waitForTimeout(5000);
// Grab the accessibility snapshot which contains full flight data
const snapshot = await page.evaluate(() => {
  const items = [];
  document.querySelectorAll('li[jsname], [data-ved] li').forEach((el) => {
    const text = el.innerText?.trim();
    if (text && text.length > 20) items.push(text);
  });
  return items.slice(0, 30);
});
return { snapshot };
`;

async function scrapeGoogleFlights(
  origin: string,
  destination: string,
  departDate: string,
): Promise<string[]> {
  const session = await runWebcmd(['session', 'create', '-f', 'json']) as { id: string };
  const sid = session.id;
  try {
    const script = BROWSER_SCRIPT(origin, destination, departDate);
    // Write script via stdin
    // NEW:
    const stdout = await runWebcmdWithStdin(
      ['--session', sid, 'browser', 'run', '--stdin', '--timeout', '40'],
      script,
      50_000
    );

    const parsed = JSON.parse(stdout.trim()) as { result?: { snapshot?: string[] } };
    return parsed?.result?.snapshot ?? [];
  } finally {
    await runWebcmd(['session', 'close', sid]).catch(() => {});
  }
}

// ── Gemini: parse snapshot + score routes ─────────────────────

async function parseAndScoreFlights(
  snapshot: string[],
  crisis: TravelCrisis,
  hubs: { origin: TransportHub; destination: TransportHub },
): Promise<TravelRoute[]> {
  const prompt = `
You are TravelOps, an AI travel crisis agent. Parse these raw Google Flights page text snippets and produce structured route options for a traveller.

Crisis:
- Type: ${crisis.crisisType.replace(/_/g, ' ')}
- From: ${crisis.origin} (hub: ${hubs.origin.nearestAirport?.name ?? hubs.origin.mainRailStation?.name ?? crisis.origin}, IATA: ${hubs.origin.nearestAirport?.iata ?? 'N/A'})
- To: ${crisis.destination} (hub: ${hubs.destination.nearestAirport?.name ?? hubs.destination.mainRailStation?.name ?? crisis.destination}, IATA: ${hubs.destination.nearestAirport?.iata ?? 'N/A'})
- Deadline: ${crisis.deadline}
- Max budget: ${crisis.currency}${crisis.maxBudget}
- Priority: ${crisis.priority}
- Passengers: ${crisis.passengers.adults} adult(s), ${crisis.passengers.children} child(ren)
- Origin has direct airport: ${hubs.origin.hasDirectAirport} ${!hubs.origin.hasDirectAirport ? '— add transfer from ' + crisis.origin + ' to ' + hubs.origin.nearestAirport?.name + ' (~' + hubs.origin.nearestAirport?.distanceKm + 'km)' : ''}
- Dest has direct airport: ${hubs.destination.hasDirectAirport} ${!hubs.destination.hasDirectAirport ? '— add onward transfer from ' + hubs.destination.nearestAirport?.name + ' to ' + crisis.destination : ''}

Raw Google Flights text snippets:
${snapshot.map((s, i) => `[${i}] ${s}`).join('\n')}

Extract every distinct flight from the snippets. For each, return a JSON array element:
{
  "id": "gf-<index>",
  "mode": "flight",
  "carrier": "airline name",
  "origin": "departure airport name",
  "destination": "arrival airport name",
  "departure": "HH:MM AM/PM",
  "arrival": "HH:MM AM/PM",
  "duration": "Xh Ym",
  "price": <one-way price in ${crisis.currency} as number — divide round-trip price by 2>,
  "stops": <0 for nonstop>,
  "deadlineMet": <boolean — does arrival time meet the deadline?>,
  "overBudget": <boolean>,
  "riskLevel": "LOW|MEDIUM|HIGH",
  "score": <0-99 based on ${crisis.priority} priority>,
  "status": "recommended|viable|rejected",
  "safetyBuffer": "Xh Ym or -Xh Ym before/after deadline",
  "segments": [
    ${!hubs.origin.hasDirectAirport ? `{"mode":"cab","from":"${crisis.origin}","to":"hub airport","departure":"estimated","arrival":"estimated","duration":"~${Math.ceil((hubs.origin.nearestAirport?.distanceKm ?? 100) / 40)}h","carrier":"Cab/Train"},` : ''}
    {"mode":"flight","from":"...","to":"...","departure":"...","arrival":"...","carrier":"...","duration":"..."},
    ${!hubs.destination.hasDirectAirport ? `{"mode":"cab","from":"hub airport","to":"${crisis.destination}","departure":"estimated","arrival":"estimated","duration":"~${Math.ceil((hubs.destination.nearestAirport?.distanceKm ?? 100) / 40)}h","carrier":"Cab/Train"}` : ''}
  ],
  "rejectionReason": "..." or null,
  "recommendationReasons": ["..."] or null,
  "serviceName": "exact service/flight number when present in the raw text" or null,
  "vehicleType": "exact aircraft/vehicle type when present in the raw text" or null,
  "category": "exact fare or vehicle category when present in the raw text" or null,
  "amenities": ["only amenities explicitly present in raw text"] or [],
  "boardingPoints": ["only points explicitly present in raw text"] or [],
  "droppingPoints": ["only points explicitly present in raw text"] or []
}

Rules:
- recommended: meets deadline AND within budget AND score>=75
- viable: meets deadline AND within budget AND score<75
- rejected: misses deadline OR over budget
- Score higher options that suit "${crisis.priority}" priority
- Do not infer vehicle types, amenities, boarding points, operator details, or provider URLs. Omit a field when it is not in the raw text.
- Return ONLY the JSON array, no markdown.
`;

  const parsed = await geminiJSON<Array<{
    id: string; mode: string; carrier?: string; origin?: string; destination?: string;
    departure?: string; arrival?: string; duration?: string; price?: number; stops?: number;
    deadlineMet?: boolean; overBudget?: boolean; riskLevel?: string; score?: number;
    status?: string; safetyBuffer?: string; rejectionReason?: string | null;
    recommendationReasons?: string[] | null;
    serviceName?: string | null; vehicleType?: string | null; category?: string | null;
    amenities?: string[] | null; boardingPoints?: string[] | null; droppingPoints?: string[] | null;
    segments?: Array<{ mode: string; from: string; to: string; departure: string; arrival: string; carrier?: string; duration: string; transferTime?: string }>;
  }>>(prompt);

  return parsed.map((r) => {
    const mode: TransportMode = r.mode === 'train' ? 'train' : r.mode === 'bus' ? 'bus' : 'flight';
    const status: RouteStatus = r.status === 'recommended' ? 'recommended' : r.status === 'viable' ? 'viable' : 'rejected';
    const riskLevel: RiskLevel = r.riskLevel === 'HIGH' ? 'HIGH' : r.riskLevel === 'MEDIUM' ? 'MEDIUM' : 'LOW';

    const segments = r.segments?.map(s => ({
      mode: (['flight','train','bus','cab','ferry'] as const).includes(s.mode as TransportMode)
        ? s.mode as TransportMode : 'flight' as TransportMode,
      from: s.from, to: s.to,
      departure: s.departure, arrival: s.arrival,
      carrier: s.carrier, duration: s.duration,
      transferTime: s.transferTime ?? undefined,
    })) ?? [{ mode, from: r.origin ?? crisis.origin, to: r.destination ?? crisis.destination, departure: r.departure ?? '', arrival: r.arrival ?? '', carrier: r.carrier, duration: r.duration ?? '' }];

    return {
      id: r.id,
      status, primaryMode: mode, segments,
      totalPrice: r.price ?? 0,
      currency: crisis.currency,
      finalArrival: r.arrival ?? '',
      travelTime: r.duration ?? '',
      riskLevel, score: r.score ?? 50,
      transfers: r.stops ?? 0,
      safetyBuffer: r.safetyBuffer ?? '0m',
      deadlineMet: r.deadlineMet ?? false,
      recommendationReasons: r.recommendationReasons ?? undefined,
      rejectionReason: r.rejectionReason ?? undefined,
      operatorName: r.carrier ?? undefined,
      serviceName: r.serviceName ?? undefined,
      vehicleType: r.vehicleType ?? undefined,
      category: r.category ?? undefined,
      amenities: r.amenities?.filter(Boolean),
      boardingPoints: r.boardingPoints?.filter(Boolean),
      droppingPoints: r.droppingPoints?.filter(Boolean),
      stops: r.stops ?? undefined,
      withinBudget: !(r.overBudget ?? (r.price ?? 0) > crisis.maxBudget),
      researchSource: 'Google Flights',
    } satisfies TravelRoute;
  });
}

function searchStats(routes: TravelRoute[], totalFound = routes.length) {
  return {
    totalFound,
    eliminated: routes.filter((route) => route.status === 'rejected').length,
    viable: routes.filter((route) => route.status === 'viable').length,
    recommended: routes.filter((route) => route.status === 'recommended').length,
  };
}

// ── POST handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { crisis } = await req.json() as { crisis: TravelCrisis };
    if (!crisis?.origin || !crisis?.destination) {
      return NextResponse.json({ error: 'Missing origin or destination' }, { status: 400 });
    }

    const hasGemini = !!process.env.GEMINI_API_KEY;

    // Step 1: resolve real hubs
    let hubs: { origin: TransportHub; destination: TransportHub } | null = null;
    if (hasGemini) {
      try { hubs = await resolveHubs(crisis.origin, crisis.destination); }
      // After: hubs = await resolveHubs(crisis.origin, crisis.destination);

      catch (e) { console.warn('[TravelOps] Hub resolution failed:', (e as Error).message); }
    }
    if (hubs && (!isKnownPlace(crisis.origin) || !isKnownPlace(crisis.destination))) {
      console.warn('[TravelOps] Gemini-resolved hub for an unverified place — treating as unresolved.');
      hubs = null;
    }

    // RailKit is intentionally optional: no key or an unsupported station pair
    // leaves the existing flight/WebCMD search path unchanged.
    const railKitRoutes = await searchRailKitRoutes(crisis).catch((error) => {
      console.warn('[TravelOps] RailKit search failed:', (error as Error).message);
      return [] as TravelRoute[];
    });
    if (hubs && (!isKnownPlace(crisis.origin) || !isKnownPlace(crisis.destination))) {
      console.warn('[TravelOps] Gemini-resolved hub for an unverified place — treating as unresolved.');
      hubs = null;
    }

    // Step 2: webcmd → Google Flights → Gemini parse
    if (hasGemini && hubs && await webcmdAvailable()) {
      try {
        const flightOrigin = hubs.origin.nearestAirport?.name ?? crisis.origin;
        const flightDest   = hubs.destination.nearestAirport?.name ?? crisis.destination;
        const departDate   = new Date(crisis.deadline).toISOString().split('T')[0];

        const snapshot = await scrapeGoogleFlights(flightOrigin, flightDest, departDate);

        if (snapshot.length > 0) {
          const routes = await parseAndScoreFlights(snapshot, crisis, hubs);
          if (routes.length > 0) {
            const order = { recommended: 0, viable: 1, rejected: 2 };
            routes.sort((a, b) => order[a.status] - order[b.status] || b.score - a.score);
            const combinedRoutes = [...routes, ...railKitRoutes];
            return NextResponse.json({
              routes: combinedRoutes, source: 'webcmd+gemini', hubs,
              ...searchStats(combinedRoutes, snapshot.length + railKitRoutes.length),
            });
          }
        }
      } catch (e) {
        console.warn('[TravelOps] webcmd+gemini failed:', (e as Error).message);
      }
    }

    // Step 3: Gemini only — reason over dynamic seed routes
    if (hasGemini && hubs) {
      try {
        const { routes: seed } = generateRoutes(crisis);
        const snapshot = seed.map(r =>
          `${r.segments[0]?.carrier ?? 'Unknown'} | ${r.segments[0]?.from} → ${r.segments[r.segments.length-1]?.to} | ${r.segments[0]?.departure} – ${r.segments[r.segments.length-1]?.arrival} | ${r.travelTime} | ${r.transfers === 0 ? 'Nonstop' : r.transfers + ' stop'} | ${r.currency}${r.totalPrice}`
        );
        const routes = await parseAndScoreFlights(snapshot, crisis, hubs);
        if (routes.length > 0) {
          const order = { recommended: 0, viable: 1, rejected: 2 };
          routes.sort((a, b) => order[a.status] - order[b.status] || b.score - a.score);
          const combinedRoutes = [...routes, ...railKitRoutes];
          return NextResponse.json({
            routes: combinedRoutes, source: 'gemini', hubs,
            ...searchStats(combinedRoutes, routes.length + railKitRoutes.length + 3),
          });
        }
      } catch (e) {
        console.warn('[TravelOps] Gemini-only failed:', (e as Error).message);
      }
    }

    // Step 4: pure dynamic fallback
    const result = generateRoutes(crisis);
    const generatedRoutes = railKitRoutes.length > 0
      ? result.routes.filter((route) => route.primaryMode !== 'train')
      : result.routes;
    const routes = [...generatedRoutes, ...railKitRoutes];
    return NextResponse.json({ ...result, routes, ...searchStats(routes, result.totalFound + railKitRoutes.length), source: 'demo', hubs });

  } catch (err) {
    console.error('[TravelOps] /api/search error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
