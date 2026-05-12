import type { LeaderboardEntry } from '../../types'
import { colors, radius } from '../../styles/theme'
import { Lightning, Trophy } from '../UI/Icons'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId?: number
  title?: string
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#f97316']

export default function LeaderboardWidget({ entries, currentUserId, title = 'Leaderboard' }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Trophy size={13} color={colors.yellow} />
        <h3 style={styles.title}>{title}</h3>
      </div>
      <div style={styles.list}>
        {entries.slice(0, 10).map((entry) => {
          const isSelf = entry.user_id === currentUserId
          const rankColor = entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : colors.textFaint
          return (
            <div
              key={entry.user_id}
              style={{ ...styles.row, ...(isSelf ? styles.rowSelf : {}) }}
            >
              <span style={{ ...styles.rank, color: rankColor, fontWeight: entry.rank <= 3 ? 900 : 600 }}>
                #{entry.rank}
              </span>
              <span style={styles.name}>{entry.username}</span>
              <div style={styles.right}>
                <div style={styles.scoreRow}>
                  <Lightning size={10} color={colors.orange} />
                  <span style={styles.score}>{Math.round(entry.score)}</span>
                </div>
                <span style={styles.decisions}>{entry.decisions_made} moves</span>
              </div>
            </div>
          )
        })}
        {entries.length === 0 && (
          <p style={styles.empty}>No entries yet. Be the first!</p>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg, padding: 16,
  },
  header: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 },
  title: { fontWeight: 700, color: colors.text, fontSize: 13, margin: 0 },
  list: { display: 'flex', flexDirection: 'column', gap: 5 },
  row: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
    background: 'rgba(255,255,255,0.04)', borderRadius: radius.sm,
  },
  rowSelf: { borderLeft: `3px solid ${colors.orange}`, background: `${colors.orangeDim}` },
  rank: { fontSize: 12, width: 26, textAlign: 'center', flexShrink: 0 },
  name: { flex: 1, fontSize: 13, fontWeight: 600, color: colors.text },
  right: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 },
  scoreRow: { display: 'flex', alignItems: 'center', gap: 3 },
  score: { fontSize: 13, fontWeight: 700, color: colors.orange },
  decisions: { fontSize: 10, color: colors.textFaint },
  empty: { color: colors.textFaint, fontSize: 12, padding: '8px 0', margin: 0 },
}
