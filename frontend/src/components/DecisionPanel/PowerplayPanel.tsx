interface Props {
  type: 'powerplay' | 'drs_review'
  onSubmit: (payload: { use: boolean }) => void
  disabled?: boolean
}

export default function PowerplayPanel({ type, onSubmit, disabled = false }: Props) {
  const title = type === 'powerplay' ? 'Use Batting Powerplay now?' : 'Take DRS Review?'
  const description = type === 'powerplay'
    ? 'An extra fielding restriction will apply for 5 overs. Best used when scoring momentum is high.'
    : 'The ball was given not-out. You believe the umpire made an error. Use your review?'

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.desc}>{description}</p>
      <div style={styles.buttons}>
        <button
          style={{ ...styles.btn, ...styles.yesBtn, ...(disabled ? styles.disabled : {}) }}
          onClick={() => !disabled && onSubmit({ use: true })}
          disabled={disabled}
        >
          YES — {type === 'powerplay' ? 'Take Powerplay' : 'Review It'}
        </button>
        <button
          style={{ ...styles.btn, ...styles.noBtn, ...(disabled ? styles.disabled : {}) }}
          onClick={() => !disabled && onSubmit({ use: false })}
          disabled={disabled}
        >
          NO — {type === 'powerplay' ? 'Save It' : 'Accept Decision'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, padding: 20 },
  title: { fontWeight: 700, color: '#e2e8f0', fontSize: 16, marginBottom: 8 },
  desc: { color: '#94a3b8', fontSize: 13, lineHeight: 1.6, marginBottom: 20 },
  buttons: { display: 'flex', gap: 12 },
  btn: { flex: 1, padding: '14px', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  yesBtn: { background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' },
  noBtn: { background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
}
