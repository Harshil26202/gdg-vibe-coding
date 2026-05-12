interface Props {
  onSubmit: (payload: { batsman: string; hand: string }) => void
  disabled?: boolean
}

const BATSMEN = [
  { name: 'Suryakumar Yadav', hand: 'RHB', role: 'Middle order' },
  { name: 'Tilak Varma', hand: 'LHB', role: 'Middle order' },
  { name: 'Hardik Pandya', hand: 'RHB', role: 'All-rounder' },
  { name: 'Tim David', hand: 'RHB', role: 'Finisher' },
  { name: 'Romario Shepherd', hand: 'RHB', role: 'Lower order' },
]

export default function BattingPanel({ onSubmit, disabled = false }: Props) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Batting Order — Who comes in next?</h3>
      <div style={styles.list}>
        {BATSMEN.map(b => (
          <button
            key={b.name}
            style={{ ...styles.row, ...(disabled ? styles.disabled : {}) }}
            onClick={() => !disabled && onSubmit({ batsman: b.name, hand: b.hand })}
            disabled={disabled}
          >
            <div>
              <div style={styles.name}>{b.name}</div>
              <div style={styles.role}>{b.role}</div>
            </div>
            <span style={{ ...styles.hand, background: b.hand === 'LHB' ? '#6366f122' : '#f9731622', color: b.hand === 'LHB' ? '#818cf8' : '#f97316' }}>
              {b.hand}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, padding: 16 },
  title: { fontWeight: 700, color: '#e2e8f0', fontSize: 15, marginBottom: 12 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#1e1e2e', border: '1px solid #2d2d3d', borderRadius: 8, cursor: 'pointer', textAlign: 'left' },
  name: { fontSize: 14, fontWeight: 600, color: '#e2e8f0' },
  role: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  hand: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
}
