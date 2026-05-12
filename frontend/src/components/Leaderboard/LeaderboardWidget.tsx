import type { LeaderboardEntry } from '../../types'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId?: number
  title?: string
}

export default function LeaderboardWidget({ entries, currentUserId, title = 'Leaderboard' }: Props) {
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>
      <div style={styles.list}>
        {entries.slice(0, 10).map((entry) => (
          <div
            key={entry.user_id}
            style={{ ...styles.row, ...(entry.user_id === currentUserId ? styles.rowSelf : {}) }}
          >
            <span style={styles.rank}>
              {entry.rank <= 3 ? medals[entry.rank - 1] : `#${entry.rank}`}
            </span>
            <span style={styles.name}>{entry.username}</span>
            <div style={styles.right}>
              <span style={styles.score}>{entry.score}</span>
              <span style={styles.decisions}>{entry.decisions_made} moves</span>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p style={styles.empty}>No entries yet. Be the first!</p>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, padding: 16 },
  title: { fontWeight: 700, color: '#e2e8f0', fontSize: 15, marginBottom: 12 },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#1e1e2e', borderRadius: 8 },
  rowSelf: { borderLeft: '3px solid #f97316', background: '#f9731610' },
  rank: { fontSize: 14, width: 28, textAlign: 'center' },
  name: { flex: 1, fontSize: 14, fontWeight: 600, color: '#e2e8f0' },
  right: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  score: { fontSize: 14, fontWeight: 700, color: '#f97316' },
  decisions: { fontSize: 11, color: '#64748b' },
  empty: { color: '#64748b', fontSize: 13, padding: '8px 0' },
}
