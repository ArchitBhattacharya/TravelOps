// ============================================================
// TravelOps — Browser Agent Service Interface
// WebCMD replaces this mock implementation later
// ============================================================

export interface BrowserAgentServiceInterface {
  startBrowserSession(): Promise<string>;
  navigateToSite(sessionId: string, url: string): Promise<void>;
  searchTravel(sessionId: string, params: TravelSearchParams): Promise<RawSearchResult[]>;
  extractResults(sessionId: string): Promise<RawSearchResult[]>;
  closeBrowserSession(sessionId: string): Promise<void>;
}

export interface TravelSearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  mode: 'flight' | 'train' | 'bus';
}

export interface RawSearchResult {
  provider: string;
  mode: string;
  departure: string;
  arrival: string;
  price: number;
  currency: string;
  carrier?: string;
  transfers: number;
  rawData: Record<string, unknown>;
}

// Mock implementation — WebCMD plugs in here
export const browserAgentService: BrowserAgentServiceInterface = {
  async startBrowserSession() {
    return `browser-session-${Date.now()}`;
  },

  async navigateToSite(_sessionId, url) {
    console.log(`[BrowserAgent] Navigating to: ${url}`);
  },

  async searchTravel(_sessionId, params) {
    console.log('[BrowserAgent] Searching:', params);
    // Real WebCMD call goes here
    return [];
  },

  async extractResults(_sessionId) {
    console.log('[BrowserAgent] Extracting results');
    return [];
  },

  async closeBrowserSession(sessionId) {
    console.log(`[BrowserAgent] Closing session: ${sessionId}`);
  },
};
