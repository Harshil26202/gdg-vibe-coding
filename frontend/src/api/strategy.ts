import { client } from './client'

export interface StrategyPayload {
  match_id: number
  playing_xi: string[]
  opening_pair: string[]
  powerplay_bowler: string
  death_over_bowler: string
  extra_notes?: string
}

export const strategyApi = {
  save: (data: StrategyPayload) => client.post('/strategy', data),
  get: (matchId: number) => client.get(`/strategy/${matchId}`),
}
