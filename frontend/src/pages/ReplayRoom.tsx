import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { reportApi } from '../api/report'
import Navbar from '../components/UI/Navbar'
import { colors, gradients, radius } from '../styles/theme'

interface OverMeta { innings: number; over_no: number }
interface BallData {
  ball_no: number; bowler: string; batsman: string; runs: number
  is_wicket: boolean; wicket_type?: string; commentary: string
  captain_field?: any; captain_bowl?: string; captain_bat?: string
}
interface ReplayResult {
  captain_match_score: number; historical_score: number
  rule_score: number; total_score: number
  captain_actual: any; ai_explanation: string; outcome_hint: string
}

export default function ReplayRoom() {
  const { id } = useParams<{ id: string }>()
  const matchId = parseInt(id || '0')
  const navigate = useNavigate()

  const [overs, setOvers] = useState<OverMeta[]>([])
  const [selected, setSelected] = useState<OverMeta | null>(null)
  const [balls, setBalls] = useState<BallData[]>([])
  const [decisionType, setDecisionType] = useState('field_placement')
  const [bowlerChoice, setBowlerChoice] = useState('')
  const [result, setResult] = useState<ReplayResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    reportApi.getReplayOvers(matchId).then(r => setOvers(r.data))
  }, [matchId])

  async function selectOver(over: OverMeta) {
    setSelected(over)
    setResult(null)
    const res = await reportApi.getOverBalls(matchId, over.innings, over.over_no)
    setBalls(res.data)
  }

  async function tryDecision() {
    if (!selected) return
    setLoading(true)
    try {
      const payload = decisionType === 'bowling_change'
        ? { bowler: bowlerChoice, bowler_type: 'pace_swing' }
        : decisionType === 'field_placement'
          ? { slip: true, gully: true, cover_point: true, mid_off: true, mid_on: true, fine_leg: true, square_leg: true, third_man: true, deep_midwicket: false }
          : { batsman: 'Suryakumar Yadav' }

      const res = await reportApi.tryReplay({
        match_id: matchId,
        innings: selected.innings,
        over_no: selected.over_no,
        decision_type: decisionType,
        payload,
      })
      setResult(res.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: gradients.page }}>
      <Navbar />
      <div style={s.page}>
        <button onClick={() => navigate(`/match/${matchId}`)} style={s.back}>← Back to Match</button>

        <h1 style={s.title}>⏪ Tactical Replay Room</h1>
        <p style={s.sub}>Rewind any over from this match and try different coaching decisions. See how your call compares to the captain's.</p>

        <div style={s.layout}>
          {/* Over selector */}
          <div style={s.sidebar}>
            <h3 style={s.sideTitle}>Select an Over</h3>
            <div style={s.overList}>
              {overs.map(o => (
                <button
                  key={`${o.innings}-${o.over_no}`}
                  onClick={() => selectOver(o)}
                  style={{ ...s.overBtn, ...(selected?.over_no === o.over_no && selected?.innings === o.innings ? s.overBtnActive : {}) }}
                >
                  <span style={s.overNum}>Over {o.over_no + 1}</span>
                  <span style={s.overInn}>Inn {o.innings}</span>
                </button>
              ))}
              {overs.length === 0 && <p style={s.empty}>Match hasn't started yet</p>}
            </div>
          </div>

          {/* Main content */}
          <div style={s.main}>
            {!selected && (
              <div style={s.placeholder}>
                <span style={s.placeholderIcon}>⏪</span>
                <p style={s.placeholderText}>Select an over from the left to replay it</p>
              </div>
            )}

            {selected && balls.length > 0 && (
              <>
                <div style={s.overCard}>
                  <h3 style={s.overCardTitle}>Over {selected.over_no + 1} — Ball by Ball</h3>
                  <div style={s.ballsRow}>
                    {balls.map(b => (
                      <div key={b.ball_no} style={{ ...s.ballChip, ...(b.is_wicket ? s.ballW : b.runs === 6 ? s.ball6 : b.runs === 4 ? s.ball4 : {}) }}>
                        <span style={s.ballNum}>{b.ball_no}</span>
                        <span style={s.ballRuns}>{b.is_wicket ? 'W' : b.runs === 0 ? '•' : b.runs}</span>
                      </div>
                    ))}
                  </div>
                  {balls.map(b => (
                    <div key={b.ball_no} style={s.ballRow}>
                      <span style={s.ballMeta}>{b.over_no !== undefined ? '' : ''}{b.bowler} → {b.batsman}</span>
                      <span style={s.ballComm}>{b.commentary}</span>
                    </div>
                  ))}
                </div>

                <div style={s.tryCard}>
                  <h3 style={s.tryTitle}>Try Your Decision</h3>
                  <div style={s.decTypeRow}>
                    {['field_placement', 'bowling_change', 'batting_order'].map(dt => (
                      <button
                        key={dt}
                        onClick={() => setDecisionType(dt)}
                        style={{ ...s.dtBtn, ...(decisionType === dt ? s.dtBtnActive : {}) }}
                      >
                        {dt.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {decisionType === 'bowling_change' && (
                    <input
                      value={bowlerChoice}
                      onChange={e => setBowlerChoice(e.target.value)}
                      placeholder="Enter bowler name (e.g. Deepak Chahar)"
                      style={s.input}
                    />
                  )}

                  <button onClick={tryDecision} disabled={loading} style={s.tryBtn}>
                    {loading ? 'Analysing...' : '🔬 Analyse My Decision'}
                  </button>
                </div>

                {result && (
                  <div style={s.resultCard}>
                    <div style={s.resultHeader}>
                      <div>
                        <p style={s.resultScoreLabel}>Your Tactical Score</p>
                        <p style={s.resultScore}>{Math.round(result.total_score)}<span style={s.resultMax}>/100</span></p>
                      </div>
                      <div style={s.resultBars}>
                        {[
                          { label: 'Captain', val: result.captain_match_score, max: 40, c: colors.orange },
                          { label: 'Historical', val: result.historical_score, max: 40, c: colors.purple },
                          { label: 'Rules', val: result.rule_score, max: 20, c: colors.green },
                        ].map(bar => (
                          <div key={bar.label} style={s.miniBar}>
                            <span style={s.miniBarLabel}>{bar.label}</span>
                            <div style={s.miniBarTrack}>
                              <div style={{ ...s.miniBarFill, width: `${(bar.val / bar.max) * 100}%`, background: bar.c }} />
                            </div>
                            <span style={s.miniBarVal}>{Math.round(bar.val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={s.explanation}>
                      <p style={s.expLabel}>Claude's Analysis</p>
                      <p style={s.expText}>{result.ai_explanation}</p>
                    </div>
                    <div style={s.outcomeHint}>{result.outcome_hint}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  back: { background: 'none', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '8px 16px', borderRadius: radius.sm, cursor: 'pointer', fontSize: 13, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 900, color: colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 32, lineHeight: 1.6 },
  layout: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 },
  sidebar: { background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16 },
  sideTitle: { fontSize: 13, fontWeight: 700, color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  overList: { display: 'flex', flexDirection: 'column', gap: 6 },
  overBtn: { display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer' },
  overBtnActive: { background: colors.orangeDim, borderColor: 'rgba(249,115,22,0.35)' },
  overNum: { fontSize: 13, fontWeight: 600, color: colors.text },
  overInn: { fontSize: 11, color: colors.textFaint },
  empty: { fontSize: 12, color: colors.textFaint },
  main: { display: 'flex', flexDirection: 'column', gap: 16 },
  placeholder: { background: 'rgba(255,255,255,0.02)', border: `1px dashed ${colors.border}`, borderRadius: radius.lg, padding: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  placeholderIcon: { fontSize: 40 },
  placeholderText: { fontSize: 14, color: colors.textFaint },
  overCard: { background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20 },
  overCardTitle: { fontSize: 15, fontWeight: 700, color: colors.text, marginBottom: 16 },
  ballsRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  ballChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 12px', minWidth: 44 },
  ballW: { background: colors.redDim, borderColor: 'rgba(239,68,68,0.3)' },
  ball6: { background: colors.orangeDim, borderColor: 'rgba(249,115,22,0.3)' },
  ball4: { background: colors.blueDim, borderColor: 'rgba(59,130,246,0.3)' },
  ballNum: { fontSize: 10, color: colors.textFaint },
  ballRuns: { fontSize: 16, fontWeight: 800, color: colors.text },
  ballRow: { padding: '6px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` },
  ballMeta: { fontSize: 11, color: colors.textFaint, display: 'block', marginBottom: 2 },
  ballComm: { fontSize: 13, color: colors.textMuted },
  tryCard: { background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20 },
  tryTitle: { fontSize: 15, fontWeight: 700, color: colors.text, marginBottom: 14 },
  decTypeRow: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  dtBtn: { padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  dtBtnActive: { background: colors.orangeDim, borderColor: 'rgba(249,115,22,0.3)', color: colors.orange, fontWeight: 600 },
  input: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, borderRadius: radius.sm, color: colors.text, fontSize: 14, marginBottom: 12, fontFamily: 'inherit' },
  tryBtn: { width: '100%', padding: '13px', background: gradients.orange, border: 'none', borderRadius: radius.md, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  resultCard: { background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(249,115,22,0.15)`, borderRadius: radius.lg, padding: 20, boxShadow: '0 0 30px rgba(249,115,22,0.08)' },
  resultHeader: { display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 16 },
  resultScoreLabel: { fontSize: 11, color: colors.textFaint, marginBottom: 4 },
  resultScore: { fontSize: 48, fontWeight: 900, color: colors.orange },
  resultMax: { fontSize: 18, color: colors.textFaint },
  resultBars: { flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 },
  miniBar: { display: 'flex', alignItems: 'center', gap: 8 },
  miniBarLabel: { fontSize: 11, color: colors.textMuted, width: 60 },
  miniBarTrack: { flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.8s ease' },
  miniBarVal: { fontSize: 12, fontWeight: 700, color: colors.text, width: 24, textAlign: 'right' },
  explanation: { background: 'rgba(255,255,255,0.03)', borderRadius: radius.sm, padding: 14, marginBottom: 12 },
  expLabel: { fontSize: 11, fontWeight: 700, color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  expText: { fontSize: 13, color: colors.textMuted, lineHeight: 1.65 },
  outcomeHint: { fontSize: 13, color: colors.textFaint, fontStyle: 'italic' },
}
