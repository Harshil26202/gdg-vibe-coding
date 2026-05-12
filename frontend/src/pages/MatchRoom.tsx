import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchesApi } from '../api/matches'
import { decisionsApi } from '../api/decisions'
import { client } from '../api/client'
import { useMatchWebSocket } from '../hooks/useMatchWebSocket'
import { useMatchStore } from '../store/matchStore'
import { useAuth } from '../hooks/useAuth'
import Scoreboard from '../components/Scoreboard/Scoreboard'
import FieldDiagram from '../components/FieldDiagram/FieldDiagram'
import BowlingPanel from '../components/DecisionPanel/BowlingPanel'
import BattingPanel from '../components/DecisionPanel/BattingPanel'
import PowerplayPanel from '../components/DecisionPanel/PowerplayPanel'
import TacticalFeedback from '../components/TacticalFeedback/TacticalFeedback'
import LeaderboardWidget from '../components/Leaderboard/LeaderboardWidget'
import type { Decision, LeaderboardEntry, FieldPosition } from '../types'

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
    matchesApi.getState(matchId).then(r => {
      useMatchStore.getState().setMatchState(r.data)
    })
    decisionsApi.myDecisions(matchId).then(r => setMyDecisions(r.data)).catch(() => {})
    client.get<LeaderboardEntry[]>(`/leaderboard/match/${matchId}`).then(r => setLeaderboard(r.data)).catch(() => {})
  }, [matchId])

  // Countdown timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (pendingDecisionType && decisionSecondsLeft > 0) {
      timerRef.current = setInterval(() => {
        useMatchStore.getState().tickTimer()
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pendingDecisionType])

  // Refresh leaderboard after each decision
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
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading match...</div>
      </div>
    )
  }

  const { match, recent_balls } = matchState
  const isLive = match.status === 'live'
  const isUpcoming = match.status === 'upcoming'

  const myTotalScore = myDecisions.reduce((s, d) => s + d.total_score, 0)

  return (
    <div style={styles.page}>
      {/* Header */}
      <nav style={styles.nav}>
        <button onClick={() => navigate('/')} style={styles.back}>← Back</button>
        <div style={styles.navCenter}>
          <span style={{ ...styles.statusDot, background: isLive ? '#22c55e' : '#3b82f6' }} />
          <span style={styles.matchTitle}>{match.title}</span>
        </div>
        <div style={styles.myScore}>
          <span style={styles.myScoreLabel}>My Score</span>
          <span style={styles.myScoreVal}>{Math.round(myTotalScore)}</span>
        </div>
      </nav>

      {/* Start match banner */}
      {isUpcoming && (
        <div style={styles.banner}>
          <span>Match hasn't started yet.</span>
          <button style={styles.startBtn} onClick={handleStartMatch} disabled={starting}>
            {starting ? 'Starting...' : 'Start Simulation'}
          </button>
        </div>
      )}

      {/* Decision window timer */}
      {pendingDecisionType && decisionSecondsLeft > 0 && (
        <div style={styles.decisionBanner}>
          <span style={styles.decisionLabel}>
            {pendingDecisionType.replace('_', ' ').toUpperCase()} DECISION
          </span>
          <span style={styles.timer}>{decisionSecondsLeft}s</span>
        </div>
      )}

      <div style={styles.layout}>
        {/* Left: Scoreboard + recent decisions */}
        <div style={styles.leftCol}>
          <Scoreboard match={match} recentBalls={recent_balls} />

          {myDecisions.length > 0 && (
            <div style={styles.myDecisions}>
              <h3 style={styles.sectionTitle}>My Decisions</h3>
              {myDecisions.slice(-5).reverse().map((d, i) => (
                <div key={d.id} style={styles.decisionRow}>
                  <span style={styles.decisionType}>{d.decision_type.replace('_', ' ')}</span>
                  <span style={styles.decisionOver}>Over {d.over_no}.{d.ball_no}</span>
                  <span style={{ ...styles.decisionScore, color: d.total_score >= 70 ? '#22c55e' : d.total_score >= 45 ? '#f59e0b' : '#ef4444' }}>
                    {Math.round(d.total_score)}pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center: Decision panel */}
        <div style={styles.centerCol}>
          {pendingDecisionType === 'field_placement' && (
            <FieldDiagram onSubmit={(positions: FieldPosition[]) => submitDecision('field_placement', positions)} disabled={!isLive} />
          )}
          {pendingDecisionType === 'bowling_change' && (
            <BowlingPanel onSubmit={(p) => submitDecision('bowling_change', p)} disabled={!isLive} />
          )}
          {pendingDecisionType === 'batting_order' && (
            <BattingPanel onSubmit={(p) => submitDecision('batting_order', p)} disabled={!isLive} />
          )}
          {(pendingDecisionType === 'powerplay' || pendingDecisionType === 'drs_review') && (
            <PowerplayPanel type={pendingDecisionType as any} onSubmit={(p) => submitDecision(pendingDecisionType, p)} disabled={!isLive} />
          )}
          {!pendingDecisionType && (
            <div style={styles.waiting}>
              <div style={styles.waitingIcon}>{isLive ? '⏳' : '🏏'}</div>
              <p style={styles.waitingText}>
                {isLive ? 'Watching for decision windows...' : 'Waiting for the match to start'}
              </p>
              <p style={styles.waitingSubtext}>
                {isLive ? 'Decision panels appear before bowling changes, field setups, and key moments.' : 'Click "Start Simulation" to begin the ball-by-ball simulation.'}
              </p>
            </div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div style={styles.rightCol}>
          <LeaderboardWidget entries={leaderboard} currentUserId={user?.id} title="Match Leaderboard" />
        </div>
      </div>

      {/* Tactical Feedback Modal */}
      {lastDecision && (
        <TacticalFeedback decision={lastDecision} onClose={() => setLastDecision(null)} />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0a0f' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8', fontSize: 16 },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #1e1e2e', background: '#0d0d17' },
  back: { padding: '8px 16px', background: 'transparent', border: '1px solid #2d2d3d', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  navCenter: { display: 'flex', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  matchTitle: { fontSize: 15, fontWeight: 600, color: '#e2e8f0' },
  myScore: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  myScoreLabel: { fontSize: 11, color: '#64748b' },
  myScoreVal: { fontSize: 20, fontWeight: 800, color: '#f97316' },
  banner: { background: '#1e1e2e', borderBottom: '1px solid #2d2d3d', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  startBtn: { padding: '10px 24px', background: '#f97316', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  decisionBanner: { background: '#f9731622', borderBottom: '1px solid #f9731644', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  decisionLabel: { color: '#f97316', fontWeight: 700, fontSize: 14 },
  timer: { fontSize: 24, fontWeight: 800, color: '#f97316' },
  layout: { display: 'grid', gridTemplateColumns: '300px 1fr 260px', gap: 20, padding: 20, maxWidth: 1400, margin: '0 auto' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 16 },
  centerCol: { display: 'flex', flexDirection: 'column', gap: 16 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 16 },
  waiting: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: 1 },
  waitingIcon: { fontSize: 40 },
  waitingText: { fontSize: 16, fontWeight: 600, color: '#e2e8f0', textAlign: 'center' },
  waitingSubtext: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.6, maxWidth: 300 },
  myDecisions: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 },
  decisionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e1e2e' },
  decisionType: { fontSize: 13, color: '#94a3b8', textTransform: 'capitalize', flex: 1 },
  decisionOver: { fontSize: 12, color: '#64748b' },
  decisionScore: { fontSize: 14, fontWeight: 700, marginLeft: 12 },
}
