import { client } from './client'
import type { Match, MatchState } from '../types'

export const matchesApi = {
  list: () => client.get<Match[]>('/matches'),
  get: (id: number) => client.get<Match>(`/matches/${id}`),
  start: (id: number) => client.post(`/matches/${id}/start`),
  getState: (id: number) => client.get<MatchState>(`/matches/${id}/state`),
}
