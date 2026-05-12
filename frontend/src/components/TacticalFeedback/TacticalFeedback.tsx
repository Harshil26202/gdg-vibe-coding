import type { Decision } from '../../types'

interface Props {
  decision: Decision
  onClose: () => void
}

export default function TacticalFeedback({ decision, onClose }: Props) {
  const total = Math.round(decision.total_score)
  const grade = total >= 80 ? { label: 'Elite', color: '#f59e0b' } :
                total >= 60 ? { label: 'Sharp', color: '#22c55e' } :
                total >= 40 ? { label: 'Decent', color: '#3b82f6' } :
                              { label: 'Learning', color: '#94a3b8' }

  const bars = [
    { label: 'Captain Alignment', value: decision.captain_match_score, max: 40, color: '#f97316' },
    { label: 'Historical Merit', value: decision.historical_score, max: 40, color: '#8b5cf6' },
    { label: 'Tactical Rules', value: decision.rule_score, max: 20, color: '#22c55e' },
  ]

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.gradeLabel}>Decision Scored</div>
            <div style={{ ...styles.grade, color: grade.color }}>{grade.label}</div>
          </div>
          <div style={styles.totalScore}>
            <span style={styles.totalNum}>{total}</span>
            <span style={styles.totalMax}>/100</span>
          </div>
        </div>

        <div style={styles.bars}>
          {bars.map(bar => (
            <div key={bar.label} style={styles.barRow}>
              <div style={styles.barMeta}>
                <span style={styles.barLabel}>{bar.label}</span>
                <span style={styles.barVal}>{Math.round(bar.value)}/{bar.max}</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${(bar.value / bar.max) * 100}%`, background: bar.color }} />
              </div>
            </div>
          ))}
        </div>

        {decision.ai_explanation && (
          <div style={styles.explanation}>
            <div style={styles.expLabel}>Tactical Analysis</div>
            <p style={styles.expText}>{decision.ai_explanation}</p>
          </div>
        )}

        <button style={styles.closeBtn} onClick={onClose}>Continue Watching</button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  card: { background: '#12121a', border: '1px solid #2d2d3d', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  gradeLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  grade: { fontSize: 28, fontWeight: 800 },
  totalScore: { display: 'flex', alignItems: 'baseline', gap: 2 },
  totalNum: { fontSize: 52, fontWeight: 800, color: '#f97316' },
  totalMax: { fontSize: 18, color: '#64748b' },
  bars: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 },
  barRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  barMeta: { display: 'flex', justifyContent: 'space-between' },
  barLabel: { fontSize: 13, color: '#e2e8f0' },
  barVal: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  barTrack: { height: 8, background: '#1e1e2e', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, transition: 'width 0.8s ease-out' },
  explanation: { background: '#1e1e2e', borderRadius: 10, padding: 16, marginBottom: 20 },
  expLabel: { fontSize: 12, fontWeight: 700, color: '#f97316', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  expText: { fontSize: 14, color: '#cbd5e1', lineHeight: 1.65 },
  closeBtn: { width: '100%', padding: '13px', background: '#f97316', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
}
