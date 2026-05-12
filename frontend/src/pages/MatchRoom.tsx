import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchesApi } from '../api/matches'
import { decisionsApi } from '../api/decisions'
import { client } from '../api/client'
import { useMatchWebSocket } from '../hooks/useMatchWebSocket'
import { useMatchStore } from '../store/matchStore'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/UI/Navbar'
import Scoreboard from '../components/Scoreboard/Scoreboard'
import FieldDiagram from '../components/FieldDiagram/FieldDiagram'
import BowlingPanel from '../components/DecisionPanel/BowlingPanel'
import BattingPanel from '../components/DecisionPanel/BattingPanel'
import PowerplayPanel from '../components/DecisionPanel/PowerplayPanel'
import TacticalFeedback from '../components/TacticalFeedback/TacticalFeedback'
import LeaderboardWidget from '../components/Leaderboard/LeaderboardWidget'
import CommentaryBox from '../components/Commentary/CommentaryBox'
import type { Decision, LeaderboardEntry, FieldPosition } from '../types'
import { colors, gradients, radius } from '../styles/theme'

export default function MatchRoom() {
  const { id } = useParams<{ id: string }>()
  const matchId = parseInt(id || '0')
  const navigate = useNavigate()
  const { user } = useAuth()

  const { matchState, pendingDecisionType, decisionSecondsLeft, myDecisions, setPendingDecision, addMyDecision, setMyDecisions } = useMatchStore()
  const [lastDecision, setLastDecision] = useState<Decision | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [starting, setStarting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useMatchWebSocket(matchId)

  useEffect(() => {
    matchesApi.getState(matchId).then(r => useMatchStore.getState().setMatchState(r.data))
    decisionsApi.myDecisions(matchId).then(r => setMyDecisions(r.data)).catch(() => {})
    client.get<LeaderboardEntry[]>(`/leaderboard/match/${matchId}`).then(r => setLeaderboard(r.data)).catch(() => {})
  }, [matchId])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (pendingDecisionType && decisionSecondsLeft > 0) {
      timerRef.current = setInterval(() => useMatchStore.getState().tickTimer(), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pendingDecisionType])

  useEffect(() => {
    if (myDecisions.length > 0) {
      client.get<LeaderboardEntry[]>(`/leaderboard/match/${matchId}`).then(r => setLeaderboard(r.data)).catch(() => {})
    }
  }, [myDecisions.length])

  async function handleStartMatch() {
    setStarting(true)
    try {
      await matchesApi.start(matchId)
    } catch (e: any) {
      if (!e.response?.data?.detail?.includes('already live')) alert(e.response?.data?.detail || 'Failed to start')
    } finally {
      setStarting(false)
    }
  }

  async function submitDecision(decisionType: string, payload: any) {
    if (!matchState) return
    try {
      const { match, recent_balls } = matchState
      const lastBall = recent_balls[recent_balls.length - 1]
      const res = await decisionsApi.submit({
        match_id: matchId,
        innings: match.current_innings,
        over_no: lastBall?.over_no ?? match.current_over,
        ball_no: lastBall?.ball_no ?? match.current_ball,
        decision_type: decisionType as any,
        payload,
      })
      addMyDecision(res.data)
      setLastDecision(res.data)
      setPendingDecision(null, 0)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to submit decision')
    }
  }

  if (!matchState) {
    return (
      <div style={{ minHeight: '100vh', background: gradients.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Navbar />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏏</div>
          <p style={{ color: colors.textMuted }}>Loading match...</p>
        </div>
      </div>
    )
  }

  const { match, recent_balls } = matchState
  const isLive = match.status === 'live'
  const isUpcoming = match.status === 'upcoming'
  const myTotalScore = myDecisions.reduce((s, d) => s + d.total_score, 0)
  const timerPct = decisionSecondsLeft / 10

  return (
    <div style={{ minHeight: '100vh', background: gradients.page }}>
      <Navbar />

      {/* Decision window alert bar */}
      {pendingDecisionType && decisionSecondsLeft > 0 && (
        <div style={s.alertBar}>
          <div style={{ ...s.alertBarFill, width: `${timerPct * 100}%`, background: decisionSecondsLeft > 5 ? colors.orange : colors.red }} />
          <div style={s.alertContent}>
            <span style={s.alertLabel}>
              ⚡ {pendingDecisionType.replace('_', ' ').toUpperCase()} — Make your call!
            </span>
            <span style={{ ...s.alertTimer, color: decisionSecondsLeft <= 3 ? colors.red : colors.orange }}>
              {decisionSecondsLeft}s
            </span>
          </div>
        </div>
      )}

      {/* Upcoming banner */}
      {isUpcoming && (
        <div style={s.upcomingBar}>
          <span style={s.upcomingText}>Set your pre-match strategy before simulation begins</span>
          <div style={s.upcomingActions}>
            <button onClick={() => navigate(`/match/${matchId}/strategy`)} style={s.stratBtn}>
              🧠 Strategy Room
            </button>
            <button onClick={() => navigate(`/match/${matchId}/challenge`)} style={s.challengeBtn}>
              🤺 Challenge Mode
            </button>
            <button onClick={handleStartMatch} disabled={starting} style={s.startBtn}>
              {starting ? '...' : '▶ Start Match'}
            </button>
          </div>
        </div>
      )}

      <div style={s.layout}>
        {/* Left col */}
        <div style={s.leftCol}>
          <Scoreboard match={match} recentBalls={recent_balls} />

          <CommentaryBox
            matchId={matchId}
            innings={match.current_innings}
            currentOver={match.current_over}
            enabled={isLive}
          />

          {myDecisions.length > 0 && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.cardTitle}>My Decisions</span>
                <span style={s.totalPts}>+{Math.round(myTotalScore)} pts</span>
              </div>
              {myDecisions.slice(-5).reverse().map(d => (
                <div key={d.id} style={s.decRow}>
                  <div>
                    <div style={s.decType}>{d.decision_type.replace('_', ' ')}</div>
                    <div style={s.decOver}>Over {d.over_no}.{d.ball_no}</div>
                  </div>
                  <div style={{ ...s.decScore, color: d.total_score >= 70 ? colors.green : d.total_score >= 45 ? colors.yellow : colors.red }}>
                    {Math.round(d.total_score)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Post-match actions */}
          {match.status === 'completed' && (
            <div style={s.card}>
              <p style={s.cardTitle}>Match Complete</p>
              <div style={s.postActions}>
                <button onClick={() => navigate(`/match/${matchId}/report`)} style={s.reportBtn}>
                  📊 Coach Report Card
                </button>
                <button onClick={() => navigate(`/match/${matchId}/replay`)} style={s.replayBtn}>
                  ⏪ Tactical Replay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center col */}
        <div style={s.centerCol}>
          {pendingDecisionType === 'field_placement' && (
            <FieldDiagram onSubmit={(p: FieldPosition[]) => submitDecision('field_placement', p)} disabled={!isLive} />
          )}
          {pendingDecisionType === 'bowling_change' && (
            <BowlingPanel onSubmit={p => submitDecision('bowling_change', p)} disabled={!isLive} />
          )}
          {pendingDecisionType === 'batting_order' && (
            <BattingPanel onSubmit={p => submitDecision('batting_order', p)} disabled={!isLive} />
          )}
          {(pendingDecisionType === 'powerplay' || pendingDecisionType === 'drs_review') && (
            <PowerplayPanel type={pendingDecisionType as any} onSubmit={p => submitDecision(pendingDecisionType, p)} disabled={!isLive} />
          )}

          {!pendingDecisionType && (
            <div style={s.waiting}>
              <div style={s.waitingPulse}>
                <span style={s.waitingIcon}>{isLive ? '📡' : '🏏'}</span>
              </div>
              <p style={s.waitingTitle}>
                {isLive ? 'Live Match in Progress' : match.status === 'completed' ? 'Match Completed' : 'Waiting to Start'}
              </p>
              <p style={s.waitingDesc}>
                {isLive
                  ? 'Decision panels will appear before bowling changes, field setups, and key match moments.'
                  : match.status === 'completed'
                    ? 'View your Coach Report Card or replay key overs with different decisions.'
                    : 'Start the simulation to begin making live coaching decisions.'}
              </p>
              {isLive && (
                <div style={s.quickLinks}>
                  <button onClick={() => navigate(`/match/${matchId}/challenge`)} style={s.quickBtn}>
                    🤺 Challenge a Friend
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right col */}
        <div style={s.rightCol}>
          <LeaderboardWidget entries={leaderboard} currentUserId={user?.id} title="Match Leaderboard" />

          <div style={s.card}>
            <p style={s.cardTitle}>Quick Actions</p>
            <div style={s.quickActionsGrid}>
              {[
                { icon: '🧠', label: 'Strategy', path: `/match/${matchId}/strategy` },
                { icon: '🤺', label: 'Challenge', path: `/match/${matchId}/challenge` },
                { icon: '⏪', label: 'Replay', path: `/match/${matchId}/replay` },
                { icon: '📊', label: 'Report', path: `/match/${matchId}/report` },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={s.quickActionBtn}>
                  <span style={s.quickActionIcon}>{item.icon}</span>
                  <span style={s.quickActionLabel}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lastDecision && (
        <TacticalFeedback decision={lastDecision} onClose={() => setLastDecision(null)} />
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  alertBar: { position: 'relative', height: 52, overflow: 'hidden', borderBottom: '1px solid rgba(249,115,22,0.3)' },
  alertBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, transition: 'width 1s linear, background 0.5s', opacity: 0.12 },
  alertContent: { position: 'relative', zIndex: 1, height: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' },
  alertLabel: { fontSize: 13, fontWeight: 700, color: colors.orange },
  alertTimer: { fontSize: 28, fontWeight: 900, transition: 'color 0.5s' },
  upcomingBar: { background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${colors.border}`, padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  upcomingText: { fontSize: 13, color: colors.textMuted },
  upcomingActions: { display: 'flex', gap: 8 },
  stratBtn: { padding: '8px 16px', background: colors.purpleDim, border: `1px solid rgba(139,92,246,0.3)`, borderRadius: radius.sm, color: colors.purple, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  challengeBtn: { padding: '8px 16px', background: colors.greenDim, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: radius.sm, color: colors.green, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  startBtn: { padding: '8px 20px', background: gradients.orange, border: 'none', borderRadius: radius.sm, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  layout: { display: 'grid', gridTemplateColumns: '300px 1fr 260px', gap: 16, padding: '20px 24px', maxWidth: 1400, margin: '0 auto' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  centerCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  card: { background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, backdropFilter: 'blur(16px)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 12 },
  totalPts: { fontSize: 16, fontWeight: 800, color: colors.orange },
  decRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` },
  decType: { fontSize: 12, fontWeight: 600, color: colors.text, textTransform: 'capitalize' },
  decOver: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  decScore: { fontSize: 20, fontWeight: 900 },
  postActions: { display: 'flex', flexDirection: 'column', gap: 8 },
  reportBtn: { padding: '11px', background: gradients.orange, border: 'none', borderRadius: radius.sm, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  replayBtn: { padding: '11px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, borderRadius: radius.sm, color: colors.text, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  waiting: { background: 'rgba(255,255,255,0.02)', border: `1px dashed rgba(255,255,255,0.08)`, borderRadius: radius.xl, padding: '64px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flex: 1 },
  waitingPulse: { width: 80, height: 80, borderRadius: '50%', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(249,115,22,0.1)' },
  waitingIcon: { fontSize: 36 },
  waitingTitle: { fontSize: 17, fontWeight: 700, color: colors.text },
  waitingDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 1.6, maxWidth: 320 },
  quickLinks: { marginTop: 8 },
  quickBtn: { padding: '10px 20px', background: colors.greenDim, border: `1px solid rgba(34,197,94,0.25)`, borderRadius: radius.md, color: colors.green, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  quickActionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  quickActionBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: 'pointer', transition: 'all 0.15s' },
  quickActionIcon: { fontSize: 20 },
  quickActionLabel: { fontSize: 11, fontWeight: 600, color: colors.textMuted },
}
