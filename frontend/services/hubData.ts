// ============================================================
// TravelOps — Real Transport Hub Lookup
// A small, curated table of REAL airports/stations for major
// Indian cities. This is the single source of truth for place
// names anywhere in the app — nothing should string-concatenate
// "<city> Airport" ever again.
// ============================================================

export interface HubInfo {
    city: string;
    airport: { name: string; iata: string } | null;
    railStation: { name: string; code: string } | null;
    busStand: { name: string } | null;
}

// Extend this table as needed -- keep it to places you've verified are real.
const HUBS: Record<string, HubInfo> = {
    kolkata: {
        city: 'Kolkata',
        airport: { name: 'Netaji Subhas Chandra Bose International Airport', iata: 'CCU' },
        railStation: { name: 'Howrah Junction', code: 'HWH' },
        busStand: { name: 'Esplanade Bus Terminus' },
    },
    delhi: {
        city: 'Delhi',
        airport: { name: 'Indira Gandhi International Airport', iata: 'DEL' },
        railStation: { name: 'New Delhi Railway Station', code: 'NDLS' },
        busStand: { name: 'Kashmere Gate ISBT' },
    },
    mumbai: {
        city: 'Mumbai',
        airport: { name: 'Chhatrapati Shivaji Maharaj International Airport', iata: 'BOM' },
        railStation: { name: 'Chhatrapati Shivaji Maharaj Terminus', code: 'CSTM' },
        busStand: { name: 'Mumbai Central Bus Depot' },
    },
    bengaluru: {
        city: 'Bengaluru',
        airport: { name: 'Kempegowda International Airport', iata: 'BLR' },
        railStation: { name: 'Krantivira Sangolli Rayanna Railway Station', code: 'SBC' },
        busStand: { name: 'Kempegowda Bus Station (Majestic)' },
    },
    chennai: {
        city: 'Chennai',
        airport: { name: 'Chennai International Airport', iata: 'MAA' },
        railStation: { name: 'Chennai Central', code: 'MAS' },
        busStand: { name: 'Chennai Mofussil Bus Terminus (CMBT)' },
    },
    hyderabad: {
        city: 'Hyderabad',
        airport: { name: 'Rajiv Gandhi International Airport', iata: 'HYD' },
        railStation: { name: 'Secunderabad Junction', code: 'SC' },
        busStand: { name: 'Mahatma Gandhi Bus Station (MGBS)' },
    },
    pune: {
        city: 'Pune',
        airport: { name: 'Pune Airport (Lohegaon)', iata: 'PNQ' },
        railStation: { name: 'Pune Junction', code: 'PUNE' },
        busStand: { name: 'Swargate Bus Stand' },
    },
    jaipur: {
        city: 'Jaipur',
        airport: { name: 'Jaipur International Airport', iata: 'JAI' },
        railStation: { name: 'Jaipur Junction', code: 'JP' },
        busStand: { name: 'Sindhi Camp Bus Stand' },
    },
    durgapur: {
        city: 'Durgapur',
        airport: { name: 'Kazi Nazrul Islam Airport', iata: 'RDP' },
        railStation: { name: 'Durgapur Railway Station', code: 'DGR' },
        busStand: { name: 'Durgapur Bus Stand (City Centre)' },
    },
    asansol: {
        city: 'Asansol',
        airport: null,
        railStation: { name: 'Asansol Junction', code: 'ASN' },
        busStand: { name: 'Asansol Bus Stand' },
    },
    varanasi: {
        city: 'Varanasi',
        airport: { name: 'Lal Bahadur Shastri International Airport', iata: 'VNS' },
        railStation: { name: 'Varanasi Junction (Manduadih)', code: 'BSB' },
        busStand: { name: 'Varanasi Bus Stand (Cantt)' },
    },
};

function normalize(place: string): string {
    return place.trim().toLowerCase();
}

/**
 * Returns real hub info for a known city, or null if we don't have
 * verified data for it. Callers MUST handle the null case explicitly
 * rather than falling back to string concatenation.
 */
export function lookupHub(place: string): HubInfo | null {
    return HUBS[normalize(place)] ?? null;
}

export function isKnownPlace(place: string): boolean {
    return normalize(place) in HUBS;
}

/** All city keys currently supported -- useful for an autocomplete/dropdown */
export function knownCities(): string[] {
    return Object.values(HUBS).map((h) => h.city);
}
