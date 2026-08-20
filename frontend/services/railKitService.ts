// Server-side RailKit normalization. No API key or provider response reaches the browser.
import 'server-only';

import { configure, searchTrainBetweenStations } from 'railkit';
import { lookupHub } from '@/services/hubData';
import type { TravelCrisis, TravelRoute } from '@/types/travel';

type RailKitTrain = {
  train_no?: string;
  train_name?: string;
  from_stn_name?: string;
  from_stn_code?: string;
  to_stn_name?: string;
  to_stn_code?: string;
  from_time?: string;
  to_time?: string;
  travel_time?: string;
  halts?: number;
};

function timeToMinutes(value?: string) {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function durationToMinutes(value?: string) {
  const match = value?.match(/(\d+)\s*[:h]\s*(\d+)/i);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatBuffer(minutes: number) {
  const absolute = Math.abs(minutes);
  return `${minutes < 0 ? '-' : ''}${Math.floor(absolute / 60)}h ${absolute % 60}m`;
}

function nextDeparture(time: string, duration: number) {
  const minutes = timeToMinutes(time);
  if (minutes === null) return null;
  const departure = new Date();
  departure.setSeconds(0, 0);
  departure.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  if (departure.getTime() < Date.now()) departure.setDate(departure.getDate() + 1);
  return { departure, arrival: new Date(departure.getTime() + duration * 60_000) };
}

/**
 * Retrieves direct trains for cities with a verified station code in hubData.
 * RailKit's search response does not include fare data, so priceAvailable is
 * deliberately false rather than showing a fabricated price or budget verdict.
 */
export async function searchRailKitRoutes(crisis: TravelCrisis): Promise<TravelRoute[]> {
  const apiKey = process.env.RAILKIT_API_KEY;
  const origin = lookupHub(crisis.origin);
  const destination = lookupHub(crisis.destination);
  const originStation = origin?.railStation;
  const destinationStation = destination?.railStation;
  if (!apiKey || !originStation || !destinationStation) return [];

  configure(apiKey);
  const result = await searchTrainBetweenStations(originStation.code, destinationStation.code) as { success?: boolean; data?: RailKitTrain[] };
  if (!result?.success || !Array.isArray(result.data)) return [];

  const deadline = new Date(crisis.deadline);
  return result.data.flatMap((train, index) => {
    const duration = durationToMinutes(train.travel_time);
    const journey = duration !== null ? nextDeparture(train.from_time ?? '', duration) : null;
    const deadlineMet = journey ? journey.arrival <= deadline : false;
    const safetyBuffer = journey ? formatBuffer(Math.round((deadline.getTime() - journey.arrival.getTime()) / 60_000)) : 'Timing unavailable';
    const originName = train.from_stn_name ?? originStation.name;
    const destinationName = train.to_stn_name ?? destinationStation.name;
    const departure = train.from_time ?? 'Unavailable';
    const arrival = train.to_time ?? 'Unavailable';
    const travelTime = train.travel_time ?? 'Unavailable';

    return [{
      id: `railkit-${train.train_no ?? index}`,
      status: deadlineMet ? 'viable' : 'rejected',
      primaryMode: 'train',
      segments: [{ mode: 'train', from: originName, to: destinationName, departure, arrival, carrier: 'Indian Railways', duration: travelTime }],
      totalPrice: 0,
      priceAvailable: false,
      currency: crisis.currency,
      finalArrival: arrival,
      travelTime,
      riskLevel: 'LOW',
      score: deadlineMet ? 65 : 20,
      transfers: 0,
      stops: typeof train.halts === 'number' ? train.halts : undefined,
      safetyBuffer,
      deadlineMet,
      rejectionReason: deadlineMet ? undefined : journey ? `Arrives ${formatBuffer(Math.abs(Math.round((journey.arrival.getTime() - deadline.getTime()) / 60_000)))} after your deadline.` : 'The provider did not return enough timing data to evaluate the deadline.',
      operatorName: 'Indian Railways',
      serviceName: [train.train_name, train.train_no].filter(Boolean).join(' · ') || undefined,
      sources: [{ name: 'RailKit' }],
      researchSource: 'RailKit',
    } satisfies TravelRoute];
  });
}
