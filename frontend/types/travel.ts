// ============================================================
// TravelOps — Core Type Definitions
// ============================================================

export type CrisisType =
  | 'flight_cancelled'
  | 'flight_delayed'
  | 'train_cancelled'
  | 'train_delayed'
  | 'bus_cancelled'
  | 'missed_connection'
  | 'overbooking'
  | 'other';

export type TransportMode = 'flight' | 'train' | 'bus' | 'ferry' | 'cab';

export type Priority = 'fastest' | 'cheapest' | 'safest' | 'balanced';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RouteStatus = 'recommended' | 'viable' | 'rejected';

export type AgentState =
  | 'IDLE'
  | 'UNDERSTANDING'
  | 'SEARCHING'
  | 'EXTRACTING'
  | 'COMPARING'
  | 'EVALUATING'
  | 'RECOMMENDING'
  | 'RESOLVED'
  | 'REPLANNING'
  | 'UPDATED';

export interface TravelCrisis {
  id: string;
  crisisType: CrisisType;
  origin: string;
  destination: string;
  deadline: string; // ISO datetime string
  maxBudget: number;
  currency: string;
  priority: Priority;
  preferences: TravelPreferences;
  passengers: PassengerCount;
  createdAt: string;
}

export interface TravelPreferences {
  preferDirect: boolean;
  avoidBus: boolean;
  preferTrain: boolean;
  preferFlight: boolean;
  avoidLongLayovers: boolean;
  minimizeTransfers: boolean;
}

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

export interface RouteSegment {
  mode: TransportMode;
  from: string;
  to: string;
  departure: string; // HH:MM AM/PM
  arrival: string;
  carrier?: string;
  duration: string;
  transferTime?: string;
}

/** A provider which returned this exact route. Booking links are optional because
 * the research provider does not always expose a direct checkout URL. */
export interface BookingSource {
  name: string;
  logo?: string;
  rating?: number;
  price?: number;
  bookingUrl?: string;
  timestamp?: string;
}

export interface TravelRoute {
  id: string;
  status: RouteStatus;
  segments: RouteSegment[];
  totalPrice: number;
  currency: string;
  finalArrival: string;
  travelTime: string;
  riskLevel: RiskLevel;
  score: number;
  transfers: number;
  safetyBuffer: string;
  deadlineMet: boolean;
  rejectionReason?: string;
  recommendationReasons?: string[];
  primaryMode: TransportMode;
  // Optional enrichment supplied by a transport search/normalization provider.
  // Keep these optional so existing route engines and older backend responses work.
  operatorName?: string;
  serviceName?: string;
  vehicleType?: string;
  category?: string;
  amenities?: string[];
  boardingPoints?: string[];
  droppingPoints?: string[];
  stops?: number;
  sources?: BookingSource[];
  researchSource?: string;
  withinBudget?: boolean;
  /** False when a provider returned an option but no verified fare. */
  priceAvailable?: boolean;
}

export interface AgentActivity {
  timestamp: string;
  message: string;
  type: 'info' | 'search' | 'found' | 'eliminated' | 'selected' | 'warning';
}

export interface BrowserAgentEvent {
  timestamp: string;
  tab: BrowserTab;
  action: string;
  detail?: string;
  status: 'searching' | 'found' | 'extracting' | 'done';
}

export type BrowserTab = 'flight' | 'rail' | 'bus' | 'maps' | 'weather';

export interface SearchStats {
  totalFound: number;
  eliminated: number;
  viable: number;
  recommended: number;
}

export interface AgentSession {
  id: string;
  crisis: TravelCrisis;
  state: AgentState;
  activities: AgentActivity[];
  browserEvents: BrowserAgentEvent[];
  routes: TravelRoute[];
  stats: SearchStats;
  startedAt: string;
  resolvedAt?: string;
  replanCount: number;
}

export interface ReplanTrigger {
  type:
    | 'flight_delayed'
    | 'train_delayed'
    | 'option_unavailable'
    | 'budget_changed'
    | 'deadline_changed'
    | 'location_changed'
    | 'other';
  detail?: string;
  delayMinutes?: number;
  newBudget?: number;
  newDeadline?: string;
}

export interface TripHistoryItem {
  id: string;
  origin: string;
  destination: string;
  crisisType: CrisisType;
  status: 'resolved' | 'replanned' | 'cancelled';
  finalPrice: number;
  currency: string;
  finalArrival: string;
  date: string;
}
