import type { Decision } from '../../types'
import { colors, radius, shadow, gradients } from '../../styles/theme'
import { Brain, Target, Shield, Star, Sparkles, Check, X, ChevronRight } from '../UI/Icons'

interface Props {
  decision: Decision
  onClose: () => void
}

const GRADES = [
  { min: 85, label: 'Elite', sub: 'World-class tactical mind', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  { min: 70, label: 'Sharp', sub: 'Strong cricket instincts', color: '#22c55e', glow: 'rgba(34,197,94,0.3)' },
  { min: 50, label: 'Decent', sub: 'Solid understanding', color: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
  { min: 30, label: 'Learning', sub: 'Building your game', color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' },
  { min: 0, label: 'Rookie', sub: 'Room to grow', color: '#94a3b8', glow: 'rgba(148,163,184,0.2)' },
]

const SCORE_COMPONENTS = [
  {
    key: 'captain_match_score' as keyof Decision,
    label: 'Captain Alignment',
    max: 40,
    color: colors.orange,
    dimColor: colors.orangeDim,
    Icon: Brain,
    description: 'How closely your decision mirrors what an elite IPL captain would choose in the same situation. Based on expert analysis of captain tendencies and match dynamics.',
    thresholds: [
      { min: 32, text: 'Perfect read of the situation' },
      { min: 20, text: 'Good tactical alignment' },
      { min: 10, text: 'Partially correct approach' },
      { min: 0, text: 'Different from captain\'s call' },
    ],
  },
  {
    key: 'historical_score' as keyof Decision,
    label: 'Historical Merit',
    max: 40,
    color: colors.purple,
    dimColor: colors.purpleDim,
    Icon: Target,
    description: 'How well your decision matches winning strategies from historical IPL data. Decisions that have historically led to better outcomes score higher.',
    thresholds: [
      { min: 32, text: 'Historically proven strategy' },
      { min: 20, text: 'Often leads to success' },
      { min: 10, text: 'Mixed historical results' },
      { min: 0, text: 'Rarely the winning choice' },
    ],
  },
  {
    key: 'rule_score' as keyof Decision,
    label: 'Tactical Rules',
    max: 20,
    color: colors.green,
    dimColor: colors.greenDim,
    Icon: Shield,
    description: 'Adherence to fundamental cricket coaching principles — powerplay aggression, death over bowling, field placements for the pitch conditions, and more.',
    thresholds: [
      { min: 16, text: 'Textbook execution' },
      { min: 10, text: 'Mostly by the book' },
      { min: 5, text: 'Some tactical gaps' },
      { min: 0, text: 'Against the principles' },
    ],
  },
]

function getRatingText(value: number, max: number, thresholds: { min: number; text: string }[]) {
  const pct = (value / max) * max
  return thresholds.find(t => pct >= t.min)?.text ?? thresholds[thresholds.length - 1].text
}

export default function TacticalFeedback({ decision, onClose }: Props) {
  const total = Math.round(decision.total_score)
  const grade = GRADES.find(g => total >= g.min) ?? GRADES[GRADES.length - 1]

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.card}>
        {/* Header */}
        <div style={{ ...s.header, background: `radial-gradient(ellipse at 70% 0%, ${grade.glow} 0%, transparent 70%), #0f0f1a` }}>
          <div style={s.headerLeft}>
            <div style={s.gradeChip}>
              <Star size={11} color={grade.color} />
              <span style={{ ...s.gradeChipText, color: grade.color }}>Decision Scored</span>
            </div>
            <div style={{ ...s.gradeName, color: grade.color }}>{grade.label}</div>
            <div style={s.gradeSub}>{grade.sub}</div>
          </div>
          <div style={s.scoreCircle}>
            <svg width={90} height={90} viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle
                cx="45" cy="45" r="38" fill="none"
                stroke={grade.color} strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - total / 100)}`}
                transform="rotate(-90 45 45)"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div style={s.scoreInner}>
              <span style={{ ...s.scoreNum, color: grade.color }}>{total}</span>
              <span style={s.scoreMax}>/100</span>
            </div>
          </div>
        </div>

        {/* Score components */}
        <div style={s.components}>
          {SCORE_COMPONENTS.map(({ key, label, max, color, dimColor, Icon, description, thresholds }) => {
            const val = Math.round((decision[key] as number) ?? 0)
            const pct = Math.min(100, (val / max) * 100)
            const ratingText = getRatingText(val, max, thresholds)
            const isGood = val / max >= 0.7

            return (
              <div key={key} style={{ ...s.component, borderColor: `${color}22` }}>
                <div style={s.componentTop}>
                  <div style={{ ...s.componentIcon, background: dimColor, borderColor: `${color}33` }}>
                    <Icon size={14} color={color} />
                  </div>
                  <div style={s.componentMeta}>
                    <span style={s.componentLabel}>{label}</span>
                    <span style={{ ...s.componentRating, color: isGood ? colors.green : colors.textFaint }}>
                      {isGood
                        ? <><Check size={10} color={colors.green} /> {ratingText}</>
                        : <><X size={10} color={colors.textFaint} /> {ratingText}</>
                      }
                    </span>
                  </div>
                  <div style={s.componentScore}>
                    <span style={{ ...s.componentVal, color }}>{val}</span>
                    <span style={s.componentMax}>/{max}</span>
                  </div>
                </div>

                <div style={s.barTrack}>
                  <div style={{ ...s.barFill, width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60` }} />
                </div>

                <p style={s.componentDesc}>{description}</p>
              </div>
            )
          })}
        </div>

        {/* AI Explanation */}
        {decision.ai_explanation && (
          <div style={s.analysis}>
            <div style={s.analysisHeader}>
              <Sparkles size={13} color={colors.purple} />
              <span style={s.analysisTitle}>AI Tactical Analysis</span>
              <span style={s.analysisBadge}>OpenAI</span>
            </div>
            <p style={s.analysisText}>{decision.ai_explanation}</p>
          </div>
        )}

        {/* Points legend */}
        <div style={s.legend}>
          <div style={s.legendTitle}>Scoring System</div>
          <div style={s.legendGrid}>
            {[
              { range: '85–100', label: 'Elite', color: '#f59e0b' },
              { range: '70–84', label: 'Sharp', color: '#22c55e' },
              { range: '50–69', label: 'Decent', color: '#3b82f6' },
              { range: '30–49', label: 'Learning', color: '#8b5cf6' },
              { range: '0–29', label: 'Rookie', color: '#94a3b8' },
            ].map(g => (
              <div key={g.label} style={s.legendItem}>
                <div style={{ ...s.legendDot, background: g.color }} />
                <span style={{ ...s.legendRange, color: g.color }}>{g.range}</span>
                <span style={s.legendLabel}>{g.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button style={s.closeBtn} onClick={onClose}>
          Continue Watching
          <ChevronRight size={14} color="#fff" />
        </button>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  card: {
    background: '#0f0f1a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: radius.xl,
    width: '100%', maxWidth: 500,
    boxShadow: shadow.modal,
    overflow: 'hidden',
    maxHeight: '92vh', overflowY: 'auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '24px 24px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
  gradeChip: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 },
  gradeChipText: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 },
  gradeName: { fontSize: 32, fontWeight: 900, lineHeight: 1 },
  gradeSub: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  scoreCircle: { position: 'relative', width: 90, height: 90, flexShrink: 0 },
  scoreInner: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: 26, fontWeight: 900, lineHeight: 1 },
  scoreMax: { fontSize: 11, color: colors.textFaint },

  components: { display: 'flex', flexDirection: 'column', gap: 0 },
  component: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    borderLeft: '3px solid transparent',
  },
  componentTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  componentIcon: {
    width: 30, height: 30, borderRadius: 8,
    border: '1px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  componentMeta: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  componentLabel: { fontSize: 13, fontWeight: 700, color: colors.text },
  componentRating: { fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 },
  componentScore: { display: 'flex', alignItems: 'baseline', gap: 1, flexShrink: 0 },
  componentVal: { fontSize: 22, fontWeight: 900 },
  componentMax: { fontSize: 12, color: colors.textFaint },
  barTrack: {
    height: 6, background: 'rgba(255,255,255,0.05)',
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  barFill: {
    height: '100%', borderRadius: 3,
    transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  componentDesc: { fontSize: 11, color: colors.textFaint, lineHeight: 1.6, margin: 0 },

  analysis: {
    margin: '0 16px 16px',
    background: 'rgba(139,92,246,0.06)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: radius.md,
    padding: '14px 16px',
  },
  analysisHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 },
  analysisTitle: { fontSize: 11, fontWeight: 800, color: colors.purple, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
  analysisBadge: {
    fontSize: 9, fontWeight: 700, color: colors.purple,
    background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)',
    padding: '2px 7px', borderRadius: 20, letterSpacing: 0.5,
  },
  analysisText: { fontSize: 13, color: colors.textMuted, lineHeight: 1.7, margin: 0 },

  legend: {
    margin: '0 16px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: '12px 14px',
  },
  legendTitle: { fontSize: 10, fontWeight: 700, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  legendGrid: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  legendRange: { fontSize: 11, fontWeight: 700 },
  legendLabel: { fontSize: 11, color: colors.textFaint },

  closeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: 'calc(100% - 32px)', margin: '0 16px 16px',
    padding: '13px',
    background: gradients.orange, border: 'none',
    borderRadius: radius.md,
    color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
  },
}
