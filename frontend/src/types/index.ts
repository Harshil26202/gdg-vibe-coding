export interface User {
  id: number
  username: string
  email: string
  avatar_url?: string
  total_score: number
  decisions_made: number
  created_at: string
}

export interface Match {
  id: number
  title: string
  team_a: string
  team_b: string
  venue: string
  status: 'upcoming' | 'live' | 'completed'
  current_innings: number
  current_over: number
  current_ball: number
  team_a_score: number
  team_a_wickets: number
  team_b_score: number
  team_b_wickets: number
  batting_team?: string
  bowling_team?: string
  created_at: string
}

export interface Ball {
  over_no: number
  ball_no: number
  bowler: string
  batsman: string
  runs: number
  is_wicket: boolean
  wicket_type?: string
  commentary?: string
}

export interface MatchState {
  type?: string
  match: Match
  recent_balls: Ball[]
  decision_window_open: boolean
  decision_window_type?: string
  decision_window_seconds_left: number
}

export interface FieldPosition {
  name: string
  label: string
  x: number  // percent
  y: number  // percent
  active: boolean
}

export type DecisionType = 'field_placement' | 'bowling_change' | 'batting_order' | 'powerplay' | 'drs_review'

export interface Decision {
  id: number
  match_id: number
  innings: number
  over_no: number
  ball_no: number
  decision_type: DecisionType
  payload: any
  captain_match_score: number
  historical_score: number
  rule_score: number
  total_score: number
  ai_explanation?: string
  created_at: string
}

export interface LeaderboardEntry {
  rank: number
  user_id: number
  username: string
  avatar_url?: string
  score: number
  decisions_made: number
}

export interface WSMessage {
  type: 'match_state' | 'decision_window_open' | 'ball_delivered' | 'match_completed' | 'pong'
  [key: string]: any
}
