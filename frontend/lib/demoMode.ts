// ============================================================
// TravelOps — Demo Mode Data
// ============================================================

import type { TravelCrisis } from '@/types/travel';

export const DEMO_CRISIS: TravelCrisis = {
  id: 'demo-crisis-001',
  crisisType: 'flight_cancelled',
  origin: 'Kolkata',
  destination: 'Delhi',
  deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow 10:00 AM
  maxBudget: 8000,
  currency: '₹',
  priority: 'balanced',
  preferences: {
    preferDirect: true,
    avoidBus: false,
    preferTrain: false,
    preferFlight: true,
    avoidLongLayovers: true,
    minimizeTransfers: true,
  },
  passengers: {
    adults: 1,
    children: 0,
    infants: 0,
  },
  createdAt: new Date().toISOString(),
};

export const CRISIS_TYPE_LABELS: Record<string, string> = {
  flight_cancelled: 'Flight Cancelled',
  flight_delayed: 'Flight Delayed',
  train_cancelled: 'Train Cancelled',
  train_delayed: 'Train Delayed',
  bus_cancelled: 'Bus Cancelled',
  missed_connection: 'Missed Connection',
  overbooking: 'Overbooking',
  other: 'Other',
};

export const REPLAN_TRIGGER_LABELS: Record<string, string> = {
  flight_delayed: 'My flight is delayed',
  train_delayed: 'My train is delayed',
  option_unavailable: 'This option is unavailable',
  budget_changed: 'My budget changed',
  deadline_changed: 'My deadline changed',
  location_changed: "I'm at a different location",
  other: 'Other',
};
