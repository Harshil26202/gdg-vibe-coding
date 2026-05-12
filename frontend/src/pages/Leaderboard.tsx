import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { client } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { LeaderboardEntry } from '../types'

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    client.get<LeaderboardEntry[]>('/leaderboard/global')
      .then(r => setEntries(r.data))
      .finally(() => setLoading(false))
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <button onClick={() => navigate('/')} style={styles.back}>← Home</button>
        <h1 style={styles.navTitle}>National Leaderboard</h1>
        <span style={styles.navSub}>Top cricket minds in India</span>
      </nav>

      <div style={styles.content}>
        {user && (() => {
          const myEntry = entries.find(e => e.user_id === user.id)
          if (!myEntry) return null
          return (
            <div style={styles.myRank}>
              <span style={styles.myRankLabel}>Your Rank</span>
              <div style={styles.myRankRow}>
                <span style={styles.myRankNum}>#{myEntry.rank}</span>
                <span style={styles.myRankName}>{myEntry.username}</span>
                <span style={styles.myRankScore}>{myEntry.score} pts</span>
              </div>
            </div>
          )
        })()}

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading...</p>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <span style={styles.colRank}>Rank</span>
              <span style={styles.colName}>Player</span>
              <span style={styles.colScore}>Score</span>
              <span style={styles.colDecisions}>Decisions</span>
            </div>
            {entries.map(entry => (
              <div key={entry.user_id} style={{ ...styles.tableRow, ...(entry.user_id === user?.id ? styles.tableRowSelf : {}) }}>
                <span style={styles.colRank}>
                  {entry.rank <= 3 ? medals[entry.rank - 1] : `#${entry.rank}`}
                </span>
                <span style={styles.colName}>{entry.username}</span>
                <span style={{ ...styles.colScore, color: '#f97316', fontWeight: 700 }}>{entry.score}</span>
                <span style={{ ...styles.colDecisions, color: '#94a3b8' }}>{entry.decisions_made}</span>
              </div>
            ))}
            {entries.length === 0 && (
              <p style={{ color: '#64748b', padding: 24, textAlign: 'center' }}>No scores yet. Start playing to get on the board!</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0a0f' },
  nav: { padding: '20px 32px', borderBottom: '1px solid #1e1e2e', background: '#0d0d17', display: 'flex', alignItems: 'center', gap: 24 },
  back: { padding: '8px 16px', background: 'transparent', border: '1px solid #2d2d3d', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  navTitle: { fontSize: 22, fontWeight: 800, color: '#f97316' },
  navSub: { fontSize: 14, color: '#64748b' },
  content: { maxWidth: 800, margin: '32px auto', padding: '0 24px' },
  myRank: { background: '#f9731615', border: '1px solid #f9731644', borderRadius: 12, padding: 20, marginBottom: 24 },
  myRankLabel: { fontSize: 12, color: '#f97316', fontWeight: 700 },
  myRankRow: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 },
  myRankNum: { fontSize: 32, fontWeight: 800, color: '#f97316' },
  myRankName: { fontSize: 18, fontWeight: 700, color: '#e2e8f0', flex: 1 },
  myRankScore: { fontSize: 20, fontWeight: 700, color: '#e2e8f0' },
  table: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, overflow: 'hidden' },
  tableHeader: { display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px', padding: '12px 20px', background: '#1e1e2e', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' },
  tableRow: { display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px', padding: '14px 20px', borderTop: '1px solid #1e1e2e', alignItems: 'center' },
  tableRowSelf: { background: '#f9731610', borderLeft: '3px solid #f97316' },
  colRank: { fontSize: 15 },
  colName: { fontSize: 14, fontWeight: 600, color: '#e2e8f0' },
  colScore: { fontSize: 14 },
  colDecisions: { fontSize: 13 },
}
