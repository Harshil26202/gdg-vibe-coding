import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchesApi } from '../api/matches'
import { useAuth } from '../hooks/useAuth'
import type { Match } from '../types'

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    matchesApi.list().then(r => setMatches(r.data)).finally(() => setLoading(false))
  }, [])

  const statusColor = { upcoming: '#3b82f6', live: '#22c55e', completed: '#94a3b8' }
  const statusLabel = { upcoming: 'Upcoming', live: '● LIVE', completed: 'Completed' }

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <span style={{ fontSize: 24 }}>🏏</span>
          <span style={styles.navTitle}>IPL Coaching Simulator</span>
        </div>
        <div style={styles.navRight}>
          <button onClick={() => navigate('/leaderboard')} style={styles.navBtn}>Leaderboard</button>
          <span style={styles.navUser}>@{user?.username}</span>
          <span style={styles.navScore}>{Math.round(user?.total_score || 0)} pts</span>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Be the Coach. <span style={{ color: '#f97316' }}>Beat the Captain.</span></h1>
        <p style={styles.heroSub}>Make real-time tactical decisions during live IPL matches. Earn points when your cricket IQ matches or beats the captain's moves.</p>
      </div>

      <div style={styles.content}>
        <h2 style={styles.sectionTitle}>Matches</h2>
        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading matches...</p>
        ) : (
          <div style={styles.grid}>
            {matches.map(m => (
              <div key={m.id} style={styles.matchCard}>
                <div style={styles.matchHeader}>
                  <span style={{ ...styles.badge, color: statusColor[m.status], borderColor: statusColor[m.status] }}>
                    {statusLabel[m.status]}
                  </span>
                  <span style={styles.venue}>{m.venue}</span>
                </div>
                <div style={styles.teams}>
                  <span style={styles.teamName}>{m.team_a}</span>
                  <span style={styles.vs}>vs</span>
                  <span style={styles.teamName}>{m.team_b}</span>
                </div>
                {m.status !== 'upcoming' && (
                  <div style={styles.score}>
                    {m.team_a_score}/{m.team_a_wickets} · {m.team_b_score}/{m.team_b_wickets}
                  </div>
                )}
                <button
                  style={{ ...styles.enterBtn, ...(m.status === 'completed' ? styles.enterBtnDisabled : {}) }}
                  onClick={() => navigate(`/match/${m.id}`)}
                  disabled={m.status === 'completed'}
                >
                  {m.status === 'live' ? 'Join Live Match' : m.status === 'upcoming' ? 'Preview Match' : 'View Summary'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0a0f' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #1e1e2e', background: '#0d0d17' },
  navLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  navTitle: { fontSize: 18, fontWeight: 700, color: '#f97316' },
  navRight: { display: 'flex', alignItems: 'center', gap: 16 },
  navBtn: { padding: '8px 16px', background: '#1e1e2e', border: '1px solid #2d2d3d', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontSize: 14 },
  navUser: { color: '#94a3b8', fontSize: 14 },
  navScore: { color: '#f97316', fontWeight: 700 },
  logoutBtn: { padding: '8px 16px', background: 'transparent', border: '1px solid #3f3f5a', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  hero: { padding: '64px 32px 32px', textAlign: 'center', maxWidth: 700, margin: '0 auto' },
  heroTitle: { fontSize: 42, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.2 },
  heroSub: { fontSize: 17, color: '#94a3b8', marginTop: 16, lineHeight: 1.6 },
  content: { padding: '32px', maxWidth: 1100, margin: '0 auto' },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  matchCard: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  matchHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 12, fontWeight: 700, border: '1px solid', borderRadius: 20, padding: '3px 10px' },
  venue: { fontSize: 12, color: '#94a3b8' },
  teams: { display: 'flex', alignItems: 'center', gap: 12 },
  teamName: { fontSize: 16, fontWeight: 700, color: '#e2e8f0', flex: 1 },
  vs: { color: '#94a3b8', fontSize: 13, fontWeight: 500 },
  score: { fontSize: 20, fontWeight: 700, color: '#f97316' },
  enterBtn: { padding: '12px', background: '#f97316', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  enterBtnDisabled: { background: '#2d2d3d', color: '#64748b', cursor: 'not-allowed' },
}
