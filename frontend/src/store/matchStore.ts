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
  applyBallDelivered: (ball: Ball, matchScore: Record<string, number>) => void
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

  // Merge ball + live score into matchState without wiping pending decision
  applyBallDelivered: (ball, matchScore) => set((s) => ({
    lastBall: ball,
    pendingDecisionType: null,
    decisionSecondsLeft: 0,
    matchState: s.matchState
      ? {
          ...s.matchState,
          recent_balls: [...s.matchState.recent_balls.slice(-11), ball],
          match: {
            ...s.matchState.match,
            current_over: ball.over_no,
            current_ball: ball.ball_no,
            team_a_score: matchScore.team_a_score ?? s.matchState.match.team_a_score,
            team_a_wickets: matchScore.team_a_wickets ?? s.matchState.match.team_a_wickets,
            team_b_score: matchScore.team_b_score ?? s.matchState.match.team_b_score,
            team_b_wickets: matchScore.team_b_wickets ?? s.matchState.match.team_b_wickets,
          },
        }
      : s.matchState,
  })),
}))
