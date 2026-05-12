import { create } from 'zustand'
import type { MatchState, Ball, Decision } from '../types'

interface MatchStore {
  matchState: MatchState | null
  lastBall: Ball | null
  myDecisions: Decision[]
  pendingDecisionType: string | null
  decisionSecondsLeft: number
  setMatchState: (state: MatchState) => void
  setLastBall: (ball: Ball) => void
  addMyDecision: (decision: Decision) => void
  setMyDecisions: (decisions: Decision[]) => void
  setPendingDecision: (type: string | null, seconds: number) => void
  tickTimer: () => void
}

export const useMatchStore = create<MatchStore>((set) => ({
  matchState: null,
  lastBall: null,
  myDecisions: [],
  pendingDecisionType: null,
  decisionSecondsLeft: 0,

  setMatchState: (state) => set({ matchState: state }),
  setLastBall: (ball) => set({ lastBall: ball }),
  addMyDecision: (decision) => set((s) => ({ myDecisions: [...s.myDecisions, decision] })),
  setMyDecisions: (decisions) => set({ myDecisions: decisions }),
  setPendingDecision: (type, seconds) => set({ pendingDecisionType: type, decisionSecondsLeft: seconds }),
  tickTimer: () => set((s) => ({
    decisionSecondsLeft: Math.max(0, s.decisionSecondsLeft - 1),
    pendingDecisionType: s.decisionSecondsLeft <= 1 ? null : s.pendingDecisionType,
  })),
}))
