import type { Action, CognitiveState } from "../types";

export function createInitialState(goal: string, availableTools: string[], constraints: string[]): CognitiveState {
  return {
    goal,
    currentStep: "initialized",
    knownFacts: [],
    assumptions: [],
    uncertainties: [],
    constraints: [...constraints],
    availableTools: [...availableTools],
    observations: [],
    previousActions: [],
    nextActions: [],
    confidence: 0.3,
    updatedAt: Date.now(),
  };
}

export function applyAction(state: CognitiveState, action: Action, observation?: string): CognitiveState {
  const previousActions = [...state.previousActions, action];
  const observations = observation ? [...state.observations, observation].slice(-50) : state.observations;
  return {
    ...state,
    previousActions,
    observations,
    currentStep: action.name,
    confidence: action.status === "succeeded" ? Math.min(0.95, state.confidence + 0.08) : Math.max(0.05, state.confidence - 0.12),
    updatedAt: Date.now(),
  };
}

export function addFacts(state: CognitiveState, facts: string[], uncertainties: string[] = []): CognitiveState {
  return {
    ...state,
    knownFacts: [...state.knownFacts, ...facts].slice(-100),
    uncertainties: [...state.uncertainties, ...uncertainties].slice(-50),
    updatedAt: Date.now(),
  };
}
