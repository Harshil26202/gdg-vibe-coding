import { client } from './client'

export const reportApi = {
  getCoachReport: (matchId: number) => client.get(`/report/coach/${matchId}`),
  getCommentary: (matchId: number, innings: number, overNo: number) =>
    client.get(`/report/commentary/${matchId}/${innings}/${overNo}`),
  getReplayOvers: (matchId: number) => client.get(`/replay/${matchId}/overs`),
  getOverBalls: (matchId: number, innings: number, overNo: number) =>
    client.get(`/replay/${matchId}/over/${innings}/${overNo}`),
  tryReplay: (data: {
    match_id: number; innings: number; over_no: number
    decision_type: string; payload: any
  }) => client.post('/replay/try', data),
}
