import { client } from './client'

export const challengeApi = {
  create: (matchId: number) => client.post(`/challenge/create?match_id=${matchId}`),
  join: (challengeId: number) => client.post(`/challenge/${challengeId}/join`),
  get: (challengeId: number) => client.get(`/challenge/${challengeId}`),
}
