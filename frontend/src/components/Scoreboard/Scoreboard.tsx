import { useEffect, useRef, useState } from 'react'
import type { Match, Ball } from '../../types'
import { colors, radius } from '../../styles/theme'
import { TrendUp, Activity } from '../UI/Icons'

interface Props {
  match: Match
  recentBalls: Ball[]
}

function runRate(score: number, over: number, ball: number): string {
  const balls = over * 6 + ball
  if (balls < 6) return '—'
  return (score / (balls / 6)).toFixed(2)
}

function projected(score: number, over: number, ball: number): number | null {
  const balls = over * 6 + ball
  if (balls < 12) return null
  return Math.round((score / balls) * 120)
}

/** Smoothly counts from prev value to next over ~600ms */
function useCountUp(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  const raf = useRef<number>(0)

  useEffect(() => {
    const start = prev.current
    const end = target
    if (start === end) return
    prev.current = target
    const t0 = performance.now()

    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return display
}

function Activity2({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

export default function Scoreboard({ match, recentBalls }: Props) {
  const isBattingTeamB = match.batting_team === match.team_b
  const rawScore   = isBattingTeamB ? match.team_b_score    : match.team_a_score
  const wickets    = isBattingTeamB ? match.team_b_wickets  : match.team_a_wickets
  const bowlingScore   = isBattingTeamB ? match.team_a_score   : match.team_b_score
  const bowlingWickets = isBattingTeamB ? match.team_a_wickets : match.team_b_wickets
  const bowlingTeam    = isBattingTeamB ? match.team_a : match.team_b

  const score    = useCountUp(rawScore)
  const rr       = runRate(rawScore, match.current_over, match.current_ball)
  const proj     = projected(rawScore, match.current_over, match.current_ball)
  const overStr  = `${match.current_over}.${match.current_ball}`
  const isLive   = match.status === 'live'
  const lastBall = recentBalls[recentBalls.length - 1]

  /* Score-pop trigger */
  const prevScore = useRef(rawScore)
  const [popping, setPopping]   = useState(false)
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    if (rawScore !== prevScore.current) {
      const isWicket = lastBall?.is_wicket
      prevScore.current = rawScore
      if (isWicket) {
        setFlashing(true)
        setTimeout(() => setFlashing(false), 900)
      } else {
        setPopping(true)
        setTimeout(() => setPopping(false), 550)
      }
    }
  }, [rawScore, lastBall])

  return (
    <div style={{ ...s.container, ...(flashing ? s.containerFlash : {}) }}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.matchTitle}>{match.title}</span>
        {isLive && (
          <span style={{ ...s.liveBadge }} className="anim-glow-badge">
            <span style={s.liveDot} className="anim-live-dot" />
            LIVE
          </span>
        )}
      </div>

      {/* Main score */}
      <div style={s.scoreSection}>
        <div style={s.battingBlock}>
          <span style={s.battingTeam}>{match.batting_team || match.team_a}</span>
          <div style={s.scoreRow}>
            <span
              style={{
                ...s.mainScore,
                animation: popping ? 'scorePop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
              }}
            >
              {score}
            </span>
            <span style={s.slash}>/</span>
            <span style={s.wickets}>{wickets}</span>
          </div>
          <span style={s.overs}>({overStr} ov)</span>
        </div>

        <div style={s.bowlingBlock}>
          <span style={s.bowlingLabel}>Bowling</span>
          <span style={s.bowlingTeam}>{bowlingTeam}</span>
          {match.status !== 'upcoming' && (
            <span style={s.bowlingScore}>{bowlingScore}/{bowlingWickets}</span>
          )}
        </div>
      </div>

      {/* Stats row */}
      {isLive && (
        <div style={s.statsRow}>
          <div style={s.statItem}>
            <Activity2 size={11} color={colors.textFaint} />
            <span style={s.statLabel}>Run Rate</span>
            <span style={s.statVal}>{rr}</span>
          </div>
          {proj !== null && (
            <div style={s.statItem}>
              <TrendUp size={11} color={colors.purple} />
              <span style={s.statLabel}>Projected</span>
              <span style={{ ...s.statVal, color: colors.purple }}>{proj}</span>
            </div>
          )}
          <div style={s.statItem}>
            <Activity size={11} color={colors.textFaint} />
            <span style={s.statLabel}>Innings</span>
            <span style={s.statVal}>{match.current_innings}</span>
          </div>
        </div>
      )}

      {/* Ball-by-ball */}
      {recentBalls.length > 0 && (
        <div style={s.ballsSection}>
          <span style={s.ballsLabel}>This over</span>
          <div style={s.balls}>
            {recentBalls.slice(-6).map((b, i, arr) => {
              const isWicket = b.is_wicket
              const isFour = b.runs === 4
              const isSix  = b.runs === 6
              const isNewest = i === arr.length - 1
              return (
                <div
                  key={i}
                  style={{
                    ...s.ball,
                    ...(isWicket ? s.ballW : isSix ? s.ball6 : isFour ? s.ball4 : b.runs === 0 ? s.ballDot : {}),
                    animation: isNewest
                      ? 'ballIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both'
                      : undefined,
                  }}
                >
                  {isWicket ? 'W' : b.runs === 0 ? '·' : b.runs}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Commentary */}
      {lastBall?.commentary && (
        <div style={s.commentary}>
          <span style={s.commentaryQuote}>"</span>
          {lastBall.commentary}
          <span style={s.commentaryQuote}>"</span>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(160deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.02) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: radius.xl, overflow: 'hidden',
    transition: 'background 0.4s, border-color 0.4s',
  },
  containerFlash: {
    background: 'linear-gradient(160deg,rgba(239,68,68,0.12) 0%,rgba(239,68,68,0.04) 100%)',
    borderColor: 'rgba(239,68,68,0.3)',
    animation: 'wicketFlash 0.9s ease both',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 18px',
    background: 'rgba(255,255,255,0.025)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  matchTitle: { fontSize: 11, color: colors.textFaint, fontWeight: 600, letterSpacing: 0.3 },
  liveBadge: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 10, fontWeight: 800, color: colors.green,
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
    padding: '3px 8px', borderRadius: 20, letterSpacing: 0.5,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: colors.green, boxShadow: `0 0 6px ${colors.green}`,
    display: 'inline-block',
  },
  scoreSection: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: '20px 18px 16px',
  },
  battingBlock: { display: 'flex', flexDirection: 'column', gap: 2 },
  battingTeam: { fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 2 },
  scoreRow: { display: 'flex', alignItems: 'baseline', gap: 1 },
  mainScore: { fontSize: 48, fontWeight: 900, color: colors.orange, lineHeight: 1, display: 'inline-block' },
  slash: { fontSize: 28, color: colors.textFaint, fontWeight: 300, margin: '0 2px' },
  wickets: { fontSize: 32, fontWeight: 700, color: colors.text, lineHeight: 1 },
  overs: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  bowlingBlock: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 },
  bowlingLabel: { fontSize: 10, fontWeight: 700, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  bowlingTeam: { fontSize: 13, fontWeight: 700, color: colors.text },
  bowlingScore: { fontSize: 16, fontWeight: 800, color: colors.textMuted },
  statsRow: {
    display: 'flex', gap: 0,
    borderTop: '1px solid rgba(255,255,255,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  statItem: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 3, padding: '10px 8px',
    borderRight: '1px solid rgba(255,255,255,0.05)',
  },
  statLabel: { fontSize: 10, color: colors.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 },
  statVal: { fontSize: 15, fontWeight: 800, color: colors.text },
  ballsSection: { padding: '14px 18px 10px', display: 'flex', flexDirection: 'column', gap: 8 },
  ballsLabel: { fontSize: 10, color: colors.textFaint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 },
  balls: { display: 'flex', gap: 7, flexWrap: 'wrap' },
  ball: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: colors.textMuted,
  },
  ballDot: { color: colors.textFaint },
  ballW: { background: 'rgba(239,68,68,0.15)', borderColor: colors.red, color: colors.red },
  ball4: { background: 'rgba(59,130,246,0.15)', borderColor: colors.blue, color: colors.blue },
  ball6: { background: 'rgba(249,115,22,0.15)', borderColor: colors.orange, color: colors.orange },
  commentary: {
    padding: '10px 18px 14px',
    fontSize: 12, color: colors.textMuted, fontStyle: 'italic', lineHeight: 1.6,
    borderTop: '1px solid rgba(255,255,255,0.04)',
  },
  commentaryQuote: { color: colors.textFaint, fontSize: 16, lineHeight: 1 },
}
