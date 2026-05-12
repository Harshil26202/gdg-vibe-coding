import { client } from './client'
import type { Decision, DecisionType } from '../types'

export const decisionsApi = {
  submit: (data: {
    match_id: number
    innings: number
    over_no: number
    ball_no: number
    decision_type: DecisionType
    payload: any
  }) => client.post<Decision>('/decisions', data),

  myDecisions: (matchId: number) => client.get<Decision[]>(`/decisions/my/${matchId}`),
}
