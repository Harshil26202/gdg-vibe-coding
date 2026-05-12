import { useEffect, useRef, useState } from 'react'
import type { Decision } from '../../types'
import { colors, radius, shadow, gradients } from '../../styles/theme'
import { Brain, Target, Shield, Star, Sparkles, Check, X, ChevronRight } from '../UI/Icons'

interface Props {
  decision: Decision
  onClose: () => void
}

const GRADES = [
  { min: 85, label: 'Elite',    sub: 'World-class tactical mind',  color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  { min: 70, label: 'Sharp',    sub: 'Strong cricket instincts',    color: '#22c55e', glow: 'rgba(34,197,94,0.35)' },
  { min: 50, label: 'Decent',   sub: 'Solid understanding',         color: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
  { min: 30, label: 'Learning', sub: 'Building your game',          color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' },
  { min: 0,  label: 'Rookie',   sub: 'Room to grow',                color: '#94a3b8', glow: 'rgba(148,163,184,0.2)' },
]

const COMPONENTS = [
  { key: 'captain_match_score' as keyof Decision, label: 'Captain Alignment', max: 40, color: colors.orange, dimColor: colors.orangeDim, Icon: Brain,   description: 'How closely your decision mirrors what an elite IPL captain would choose in the same situation.', },
  { key: 'historical_score'    as keyof Decision, label: 'Historical Merit',  max: 40, color: colors.purple, dimColor: colors.purpleDim, Icon: Target,  description: 'How well your decision matches winning strategies from historical IPL data.', },
  { key: 'rule_score'          as keyof Decision, label: 'Tactical Rules',    max: 20, color: colors.green,  dimColor: colors.greenDim,  Icon: Shield,  description: 'Adherence to fundamental cricket coaching principles across powerplay, death overs, and field setup.', },
]

const THRESHOLD_LABELS = [
  [32, 20, 10, 0],
  ['Perfect read', 'Good alignment', 'Partially correct', "Different from captain's call"],
  ['Proven strategy', 'Often succeeds', 'Mixed results', 'Rarely the winner'],
  ['Textbook', 'Mostly by the book', 'Some gaps', 'Against principles'],
]

/** Confetti particle for Elite grade */
function Confetti({ color }: { color: string }) {
  const particles = Array.from({ length: 22 }, (_, i) => ({
    left: `${5 + Math.random() * 90}%`,
    delay: `${i * 55}ms`,
    size: 5 + Math.floor(Math.random() * 7),
    rotate: Math.floor(Math.random() * 360),
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: radius.xl }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '30%',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: i % 3 === 0 ? '50%' : 2,
            background: i % 4 === 0 ? color : i % 4 === 1 ? '#fff' : i % 4 === 2 ? colors.purple : colors.blue,
            animation: `confettiFly ${0.8 + Math.random() * 0.6}s ease-out ${p.delay} both`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}

/** Animated SVG arc that draws itself on mount */
function ScoreArc({ total, color }: { total: number; color: string }) {
  const R = 38
  const C = 2 * Math.PI * R
  const offset = C * (1 - total / 100)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle
        cx="45" cy="45" r={R} fill="none"
        stroke={color} strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={drawn ? offset : C}
        transform="rotate(-90 45 45)"
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.2,0.64,1)' }}
      />
    </svg>
  )
}

export default function TacticalFeedback({ decision, onClose }: Props) {
  const total = Math.round(decision.total_score)
  const grade = GRADES.find(g => total >= g.min) ?? GRADES[GRADES.length - 1]
  const isElite = total >= 85

  /* Stagger bar fills */
  const [barsVisible, setBarsVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setBarsVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.card} className="anim-panel-in">
        {isElite && <Confetti color={grade.color} />}

        {/* Header */}
        <div style={{ ...s.header, background: `radial-gradient(ellipse at 70% 0%, ${grade.glow} 0%, transparent 70%), #0f0f1a` }}>
          <div style={s.headerLeft}>
            <div style={s.gradeChip}>
              <Star size={11} color={grade.color} />
              <span style={{ ...s.gradeChipText, color: grade.color }}>Decision Scored</span>
            </div>
            <div
              style={{ ...s.gradeName, color: grade.color }}
              className={isElite ? '' : ''}
              /* bounceIn only on Elite so it feels earned */
            >
              <span style={{ display: 'inline-block', animation: 'bounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
                {grade.label}
              </span>
            </div>
            <div style={s.gradeSub}>{grade.sub}</div>
          </div>
          <div style={s.scoreCircle}>
            <ScoreArc total={total} color={grade.color} />
            <div style={s.scoreInner}>
              <span style={{ ...s.scoreNum, color: grade.color }}>{total}</span>
              <span style={s.scoreMax}>/100</span>
            </div>
          </div>
        </div>

        {/* Score components */}
        <div style={s.components}>
          {COMPONENTS.map(({ key, label, max, color, dimColor, Icon, description }, ci) => {
            const val  = Math.round((decision[key] as number) ?? 0)
            const pct  = Math.min(100, (val / max) * 100)
            const good = val / max >= 0.7
            const thresholds = [
              ['Perfect read', 'Good alignment', 'Partially correct', "Different from captain's call"],
              ['Proven strategy', 'Often succeeds', 'Mixed results', 'Rarely the winner'],
              ['Textbook', 'Mostly by book', 'Some gaps', 'Against principles'],
            ][ci]
            const ratingText = val / max >= 0.8 ? thresholds[0] : val / max >= 0.5 ? thresholds[1] : val / max >= 0.25 ? thresholds[2] : thresholds[3]
            return (
              <div
                key={key}
                style={{ ...s.component, borderColor: `${color}22`, animationDelay: `${ci * 80}ms` }}
                className="anim-panel-in"
              >
                <div style={s.componentTop}>
                  <div style={{ ...s.componentIcon, background: dimColor, borderColor: `${color}33` }}>
                    <Icon size={14} color={color} />
                  </div>
                  <div style={s.componentMeta}>
                    <span style={s.componentLabel}>{label}</span>
                    <span style={{ ...s.componentRating, color: good ? colors.green : colors.textFaint }}>
                      {good ? <Check size={10} color={colors.green} /> : <X size={10} color={colors.textFaint} />}
                      {ratingText}
                    </span>
                  </div>
                  <div style={s.componentScore}>
                    <span style={{ ...s.componentVal, color }}>{val}</span>
                    <span style={s.componentMax}>/{max}</span>
                  </div>
                </div>

                <div style={s.barTrack}>
                  <div style={{
                    ...s.barFill,
                    width: barsVisible ? `${pct}%` : '0%',
                    background: color,
                    boxShadow: barsVisible ? `0 0 10px ${color}70` : 'none',
                  }} />
                </div>

                <p style={s.componentDesc}>{description}</p>
              </div>
            )
          })}
        </div>

        {/* AI Analysis */}
        {decision.ai_explanation && (
          <div className="anim-panel-in" style={{ ...s.analysis, animationDelay: '280ms' }}>
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
              { range: '85-100', label: 'Elite',    color: '#f59e0b' },
              { range: '70-84',  label: 'Sharp',    color: '#22c55e' },
              { range: '50-69',  label: 'Decent',   color: '#3b82f6' },
              { range: '30-49',  label: 'Learning', color: '#8b5cf6' },
              { range: '0-29',   label: 'Rookie',   color: '#94a3b8' },
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
    background: 'rgba(0,0,0,0.88)',
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
    animation: 'pageFade 0.2s ease both',
  },
  card: {
    background: '#0f0f1a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: radius.xl,
    width: '100%', maxWidth: 500,
    boxShadow: shadow.modal,
    overflow: 'hidden',
    maxHeight: '92vh', overflowY: 'auto',
    position: 'relative',
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
  scoreNum: { fontSize: 26, fontWeight: 900, lineHeight: 1, animation: 'bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.5s both' },
  scoreMax: { fontSize: 11, color: colors.textFaint },

  components: { display: 'flex', flexDirection: 'column', gap: 0 },
  component: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    borderLeft: '3px solid transparent',
  },
  componentTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  componentIcon: {
    width: 30, height: 30, borderRadius: 8, border: '1px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  componentMeta: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  componentLabel: { fontSize: 13, fontWeight: 700, color: colors.text },
  componentRating: { fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 },
  componentScore: { display: 'flex', alignItems: 'baseline', gap: 1, flexShrink: 0 },
  componentVal: { fontSize: 22, fontWeight: 900 },
  componentMax: { fontSize: 12, color: colors.textFaint },
  barTrack: { height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.9s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.9s ease' },
  componentDesc: { fontSize: 11, color: colors.textFaint, lineHeight: 1.6, margin: 0 },

  analysis: {
    margin: '0 16px 16px',
    background: 'rgba(139,92,246,0.06)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: radius.md, padding: '14px 16px',
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
    borderRadius: radius.md, padding: '12px 14px',
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
    borderRadius: radius.md, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
}
