'use client';
// ============================================================
// TravelOps — Global Crisis Store (React Context)
// ============================================================

import React, { createContext, useContext, useReducer } from 'react';
import type {
  TravelCrisis,
  AgentSession,
  AgentState,
  AgentActivity,
  BrowserAgentEvent,
} from '@/types/travel';

interface CrisisState {
  currentCrisis: TravelCrisis | null;
  session: AgentSession | null;
  agentState: AgentState;
  isDemoMode: boolean;
}

type CrisisAction =
  | { type: 'SET_CRISIS'; crisis: TravelCrisis }
  | { type: 'SET_SESSION'; session: AgentSession }
  | { type: 'SET_AGENT_STATE'; state: AgentState }
  | { type: 'ADD_ACTIVITY'; activity: AgentActivity }
  | { type: 'ADD_BROWSER_EVENT'; event: BrowserAgentEvent }
  | { type: 'UPDATE_SESSION'; session: AgentSession }
  | { type: 'SET_DEMO_MODE'; enabled: boolean }
  | { type: 'RESET' };

function reducer(state: CrisisState, action: CrisisAction): CrisisState {
  switch (action.type) {
    case 'SET_CRISIS':
      return { ...state, currentCrisis: action.crisis };
    case 'SET_SESSION':
      return { ...state, session: action.session };
    case 'SET_AGENT_STATE':
      return { ...state, agentState: action.state };
    case 'ADD_ACTIVITY':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          activities: [...state.session.activities, action.activity],
        },
      };
    case 'ADD_BROWSER_EVENT':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          browserEvents: [...state.session.browserEvents, action.event],
        },
      };
    case 'UPDATE_SESSION':
      return { ...state, session: action.session, agentState: action.session.state };
    case 'SET_DEMO_MODE':
      return { ...state, isDemoMode: action.enabled };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const initialState: CrisisState = {
  currentCrisis: null,
  session: null,
  agentState: 'IDLE',
  isDemoMode: false,
};

const CrisisContext = createContext<{
  state: CrisisState;
  dispatch: React.Dispatch<CrisisAction>;
} | null>(null);

export function CrisisProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <CrisisContext.Provider value={{ state, dispatch }}>
      {children}
    </CrisisContext.Provider>
  );
}

export function useCrisis() {
  const ctx = useContext(CrisisContext);
  if (!ctx) throw new Error('useCrisis must be used inside CrisisProvider');
  return ctx;
}
