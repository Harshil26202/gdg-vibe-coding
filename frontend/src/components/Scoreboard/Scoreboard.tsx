import type { Match, Ball } from '../../types'

interface Props {
  match: Match
  recentBalls: Ball[]
}

export default function Scoreboard({ match, recentBalls }: Props) {
  const battingScore = match.batting_team === match.team_b
    ? `${match.team_b_score}/${match.team_b_wickets}`
    : `${match.team_a_score}/${match.team_a_wickets}`

  const overStr = `${match.current_over}.${match.current_ball}`

  return (
    <div style={styles.container}>
      <div style={styles.top}>
        <div style={styles.teams}>
          <span style={styles.battingTeam}>{match.batting_team || match.team_a}</span>
          <span style={styles.inning}>Innings {match.current_innings}</span>
        </div>
        <div style={styles.scoreBlock}>
          <span style={styles.mainScore}>{battingScore}</span>
          <span style={styles.overs}>({overStr} ov)</span>
        </div>
      </div>

      <div style={styles.matchTitle}>{match.title}</div>

      <div style={styles.balls}>
        {recentBalls.slice(-6).map((b, i) => (
          <div key={i} style={{ ...styles.ball, ...(b.is_wicket ? styles.ballWicket : b.runs === 4 ? styles.ball4 : b.runs === 6 ? styles.ball6 : {}) }}>
            {b.is_wicket ? 'W' : b.runs === 0 ? '•' : b.runs}
          </div>
        ))}
      </div>

      {recentBalls.length > 0 && (
        <div style={styles.commentary}>
          {recentBalls[recentBalls.length - 1].commentary}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, padding: 20 },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  teams: { display: 'flex', flexDirection: 'column', gap: 4 },
  battingTeam: { fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  inning: { fontSize: 12, color: '#94a3b8' },
  scoreBlock: { textAlign: 'right' },
  mainScore: { fontSize: 36, fontWeight: 800, color: '#f97316', display: 'block' },
  overs: { fontSize: 13, color: '#94a3b8' },
  matchTitle: { fontSize: 12, color: '#64748b', marginTop: 8, marginBottom: 12 },
  balls: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  ball: { width: 32, height: 32, borderRadius: '50%', background: '#1e1e2e', border: '1px solid #2d2d3d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#e2e8f0' },
  ballWicket: { background: '#ef444422', borderColor: '#ef4444', color: '#ef4444' },
  ball4: { background: '#3b82f622', borderColor: '#3b82f6', color: '#60a5fa' },
  ball6: { background: '#f9731622', borderColor: '#f97316', color: '#f97316' },
  commentary: { marginTop: 12, fontSize: 13, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5 },
}
