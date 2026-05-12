interface Props {
  onSubmit: (payload: { bowler: string; bowler_type: string }) => void
  disabled?: boolean
}

const BOWLERS = [
  { name: 'Deepak Chahar', type: 'pace_swing', team: 'CSK' },
  { name: 'Tushar Deshpande', type: 'pace_fast', team: 'CSK' },
  { name: 'Maheesh Theekshana', type: 'spin_offbreak', team: 'CSK' },
  { name: 'Ravindra Jadeja', type: 'spin_leftharm', team: 'CSK' },
  { name: 'Moeen Ali', type: 'spin_offbreak', team: 'CSK' },
  { name: 'Simarjeet Singh', type: 'pace_medium', team: 'CSK' },
]

const TYPE_COLORS: Record<string, string> = {
  pace_swing: '#f97316', pace_fast: '#ef4444', pace_medium: '#f59e0b',
  spin_offbreak: '#8b5cf6', spin_leftharm: '#6366f1',
}

export default function BowlingPanel({ onSubmit, disabled = false }: Props) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Bowling Change — Who bowls next?</h3>
      <div style={styles.grid}>
        {BOWLERS.map(b => (
          <button
            key={b.name}
            style={{ ...styles.card, ...(disabled ? styles.disabled : {}) }}
            onClick={() => !disabled && onSubmit({ bowler: b.name, bowler_type: b.type })}
            disabled={disabled}
          >
            <span style={{ ...styles.typeBadge, background: TYPE_COLORS[b.type] + '22', color: TYPE_COLORS[b.type] }}>
              {b.type.replace('_', ' ')}
            </span>
            <span style={styles.name}>{b.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, padding: 16 },
  title: { fontWeight: 700, color: '#e2e8f0', fontSize: 15, marginBottom: 12 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  card: { padding: '12px 10px', background: '#1e1e2e', border: '1px solid #2d2d3d', borderRadius: 8, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, transition: 'border-color 0.2s' },
  typeBadge: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, width: 'fit-content' },
  name: { fontSize: 13, fontWeight: 600, color: '#e2e8f0' },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
}
