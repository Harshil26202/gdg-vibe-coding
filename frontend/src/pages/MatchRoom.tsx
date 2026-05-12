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
import { colors, gradients, radius, shadow } from '../styles/theme'
import {
  Brain, Swords, Rewind, BarChart, Lightning, Play,
  Home, ChevronRight, Target, Shield, Info, Activity,
} from '../components/UI/Icons'

export default function MatchRoom() {
  const { id } = useParams<{ id: string }>()
  const matchId = parseInt(id || '0')
  const navigate = useNavigate()
  const { user } = useAuth()

  const { matchState, pendingDecisionType, decisionSecondsLeft, myDecisions,
    setPendingDecision, addMyDecision, setMyDecisions } = useMatchStore()
  const [lastDecision, setLastDecision] = useState<Decision | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [starting, setStarting] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
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
      <div style={{ minHeight: '100vh', background: gradients.page }}>
        <Navbar />
        <div style={s.loadingCenter}>
          <div style={s.loadingSpinner}>
            <Activity size={28} color={colors.orange} />
          </div>
          <p style={s.loadingText}>Loading match data...</p>
        </div>
      </div>
    )
  }

  const { match, recent_balls } = matchState
  const isLive = match.status === 'live'
  const isUpcoming = match.status === 'upcoming'
  const isCompleted = match.status === 'completed'
  const myTotalScore = myDecisions.reduce((s, d) => s + d.total_score, 0)
  const timerPct = decisionSecondsLeft / 10

  return (
    <div style={{ minHeight: '100vh', background: gradients.page }}>
      <Navbar />

      {/* Breadcrumb + match title bar */}
      <div style={s.topBar}>
        <div style={s.breadcrumb}>
          <button onClick={() => navigate('/')} style={s.breadcrumbBtn}>
            <Home size={12} color={colors.textFaint} />
            <span>Matches</span>
          </button>
          <ChevronRight size={12} color={colors.textFaint} />
          <span style={s.breadcrumbCurrent}>{match.title}</span>
          {isLive && <span style={s.livePill}><span style={s.liveDot} />LIVE</span>}
          {isCompleted && <span style={s.completedPill}>COMPLETED</span>}
        </div>
        <button onClick={() => setShowGuide(g => !g)} style={s.guideBtn}>
          <Info size={13} color={colors.textMuted} />
          <span>How to play</span>
        </button>
      </div>

      {/* How-to-play guide panel */}
      {showGuide && (
        <div style={s.guidePanel}>
          <div style={s.guidePanelInner}>
            <div style={s.guideSteps}>
              {[
                { Icon: Activity, color: colors.orange, title: 'Watch the live match', desc: 'The scoreboard updates ball-by-ball in real time.' },
                { Icon: Brain, color: colors.purple, title: 'Decision windows open', desc: 'Before bowling changes & field setups, a panel appears with a countdown timer.' },
                { Icon: Target, color: colors.blue, title: 'Make your call', desc: 'Choose field placements, bowling changes, batting order, or DRS within the time limit.' },
                { Icon: Shield, color: colors.green, title: 'Score is calculated', desc: 'Each decision scores up to 100 pts — Captain Alignment (40), Historical Merit (40), Tactical Rules (20).' },
                { Icon: Lightning, color: colors.yellow, title: 'Climb the leaderboard', desc: 'Your cumulative score is shown in the Navbar. Top coaches win each match.' },
              ].map(({ Icon, color, title, desc }, i) => (
                <div key={i} style={s.guideStep}>
                  <div style={{ ...s.guideStepIcon, background: `${color}18`, borderColor: `${color}30` }}>
                    <Icon size={14} color={color} />
                  </div>
                  <div>
                    <div style={s.guideStepTitle}>{title}</div>
                    <div style={s.guideStepDesc}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowGuide(false)} style={s.guideClose}>Got it</button>
          </div>
        </div>
      )}

      {/* Decision window alert bar */}
      {pendingDecisionType && decisionSecondsLeft > 0 && (
        <div style={s.alertBar}>
          <div style={{ ...s.alertBarFill, width: `${timerPct * 100}%`, background: decisionSecondsLeft > 5 ? colors.orange : colors.red }} />
          <div style={s.alertContent}>
            <div style={s.alertLeft}>
              <Lightning size={14} color={colors.orange} />
              <span style={s.alertLabel}>
                {pendingDecisionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} — Make your call!
              </span>
            </div>
            <span style={{ ...s.alertTimer, color: decisionSecondsLeft <= 3 ? colors.red : colors.orange }}>
              {decisionSecondsLeft}s
            </span>
          </div>
        </div>
      )}

      {/* Upcoming match banner */}
      {isUpcoming && (
        <div style={s.upcomingBar}>
          <div style={s.upcomingLeft}>
            <Info size={14} color={colors.blue} />
            <span style={s.upcomingText}>Set your pre-match strategy before the simulation begins</span>
          </div>
          <div style={s.upcomingActions}>
            <button onClick={() => navigate(`/match/${matchId}/strategy`)} style={s.stratBtn}>
              <Brain size={13} color={colors.purple} />
              Strategy Room
            </button>
            <button onClick={() => navigate(`/match/${matchId}/challenge`)} style={s.challengeBtn}>
              <Swords size={13} color={colors.green} />
              Challenge Mode
            </button>
            <button onClick={handleStartMatch} disabled={starting} style={s.startBtn}>
              <Play size={13} color="#fff" />
              {starting ? 'Starting…' : 'Start Match'}
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
                <div style={s.cardTitleRow}>
                  <BarChart size={14} color={colors.orange} />
                  <span style={s.cardTitle}>My Decisions</span>
                </div>
                <span style={s.totalPts}>+{Math.round(myTotalScore)} pts</span>
              </div>
              {myDecisions.slice(-5).reverse().map(d => {
                const scoreColor = d.total_score >= 70 ? colors.green : d.total_score >= 45 ? colors.yellow : colors.red
                return (
                  <div key={d.id} style={s.decRow}>
                    <div>
                      <div style={s.decType}>{d.decision_type.replace(/_/g, ' ')}</div>
                      <div style={s.decOver}>Over {d.over_no}.{d.ball_no}</div>
                    </div>
                    <div style={{ ...s.decScore, color: scoreColor }}>{Math.round(d.total_score)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {isCompleted && (
            <div style={s.card}>
              <div style={{ ...s.cardTitleRow, marginBottom: 12 }}>
                <Activity size={14} color={colors.orange} />
                <span style={s.cardTitle}>Match Complete</span>
              </div>
              <div style={s.postActions}>
                <button onClick={() => navigate(`/match/${matchId}/report`)} style={s.reportBtn}>
                  <BarChart size={14} color="#fff" />
                  Coach Report Card
                </button>
                <button onClick={() => navigate(`/match/${matchId}/replay`)} style={s.replayBtn}>
                  <Rewind size={14} color={colors.text} />
                  Tactical Replay
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
              <div style={s.waitingOrb}>
                {isLive
                  ? <Activity size={32} color={colors.orange} />
                  : isCompleted
                    ? <BarChart size={32} color={colors.purple} />
                    : <Play size={32} color={colors.orange} />
                }
              </div>
              <p style={s.waitingTitle}>
                {isLive ? 'Live Match in Progress' : isCompleted ? 'Match Completed' : 'Waiting to Start'}
              </p>
              <p style={s.waitingDesc}>
                {isLive
                  ? 'Decision panels appear at bowling changes, field setups, and key moments. Watch the scoreboard — be ready!'
                  : isCompleted
                    ? 'Great game! View your personalised Coach Report Card or replay key overs with alternate decisions.'
                    : 'Press Start Match to begin the simulation. Set your pre-match strategy first for bonus context.'}
              </p>

              {isLive && (
                <div style={s.waitingHint}>
                  <div style={s.waitingHintRow}>
                    <Brain size={12} color={colors.purple} />
                    <span style={s.waitingHintText}>Captain Alignment up to 40 pts</span>
                  </div>
                  <div style={s.waitingHintRow}>
                    <Target size={12} color={colors.blue} />
                    <span style={s.waitingHintText}>Historical Merit up to 40 pts</span>
                  </div>
                  <div style={s.waitingHintRow}>
                    <Shield size={12} color={colors.green} />
                    <span style={s.waitingHintText}>Tactical Rules up to 20 pts</span>
                  </div>
                </div>
              )}

              {isLive && (
                <button onClick={() => navigate(`/match/${matchId}/challenge`)} style={s.challengeLiveBtn}>
                  <Swords size={13} color={colors.green} />
                  Challenge a Friend
                </button>
              )}
              {isUpcoming && (
                <button onClick={handleStartMatch} disabled={starting} style={s.startBtnCenter}>
                  <Play size={14} color="#fff" />
                  {starting ? 'Starting…' : 'Start Match'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right col */}
        <div style={s.rightCol}>
          <LeaderboardWidget entries={leaderboard} currentUserId={user?.id} title="Match Leaderboard" />

          {/* Scoring guide card */}
          <div style={s.card}>
            <div style={{ ...s.cardTitleRow, marginBottom: 14 }}>
              <Info size={14} color={colors.blue} />
              <span style={s.cardTitle}>Points Breakdown</span>
            </div>
            {[
              { Icon: Brain, color: colors.orange, label: 'Captain Alignment', pts: '40 pts', desc: "Match expert captain's call" },
              { Icon: Target, color: colors.purple, label: 'Historical Merit', pts: '40 pts', desc: 'Backed by IPL data' },
              { Icon: Shield, color: colors.green, label: 'Tactical Rules', pts: '20 pts', desc: 'Follow coaching principles' },
            ].map(({ Icon, color, label, pts, desc }) => (
              <div key={label} style={s.ptRow}>
                <div style={{ ...s.ptIcon, background: `${color}18` }}>
                  <Icon size={12} color={color} />
                </div>
                <div style={s.ptMeta}>
                  <span style={s.ptLabel}>{label}</span>
                  <span style={s.ptDesc}>{desc}</span>
                </div>
                <span style={{ ...s.ptVal, color }}>{pts}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={s.card}>
            <div style={{ ...s.cardTitleRow, marginBottom: 12 }}>
              <Lightning size={14} color={colors.orange} />
              <span style={s.cardTitle}>Quick Actions</span>
            </div>
            <div style={s.quickGrid}>
              {[
                { Icon: Brain, label: 'Strategy', path: `/match/${matchId}/strategy`, color: colors.purple },
                { Icon: Swords, label: 'Challenge', path: `/match/${matchId}/challenge`, color: colors.green },
                { Icon: Rewind, label: 'Replay', path: `/match/${matchId}/replay`, color: colors.blue },
                { Icon: BarChart, label: 'Report', path: `/match/${matchId}/report`, color: colors.orange },
              ].map(({ Icon, label, path, color }) => (
                <button key={label} onClick={() => navigate(path)} style={s.quickBtn}>
                  <div style={{ ...s.quickBtnIcon, background: `${color}15` }}>
                    <Icon size={16} color={color} />
                  </div>
                  <span style={s.quickBtnLabel}>{label}</span>
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
  loadingCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', gap: 16 },
  loadingSpinner: { width: 56, height: 56, borderRadius: '50%', background: colors.orangeDim, border: `1px solid rgba(249,115,22,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: colors.textMuted },

  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6 },
  breadcrumbBtn: { display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: colors.textFaint, fontSize: 12, padding: 0 },
  breadcrumbCurrent: { fontSize: 12, color: colors.textMuted, fontWeight: 600 },
  livePill: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: colors.green, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 },
  liveDot: { width: 5, height: 5, borderRadius: '50%', background: colors.green, boxShadow: `0 0 5px ${colors.green}` },
  completedPill: { fontSize: 10, fontWeight: 800, color: colors.purple, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 },
  guideBtn: { display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: radius.sm, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: colors.textMuted },

  guidePanel: { background: 'rgba(7,7,15,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  guidePanelInner: { maxWidth: 1400, margin: '0 auto', padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' },
  guideSteps: { display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' },
  guideStep: { display: 'flex', gap: 10, alignItems: 'flex-start', flex: '1 1 200px', minWidth: 160, padding: '10px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: radius.md },
  guideStepIcon: { width: 28, height: 28, borderRadius: 7, border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  guideStepTitle: { fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 3 },
  guideStepDesc: { fontSize: 11, color: colors.textFaint, lineHeight: 1.5 },
  guideClose: { padding: '8px 16px', background: colors.orangeDim, border: `1px solid rgba(249,115,22,0.25)`, borderRadius: radius.sm, color: colors.orange, fontWeight: 700, cursor: 'pointer', fontSize: 12, flexShrink: 0, alignSelf: 'flex-end' },

  alertBar: { position: 'relative', height: 52, overflow: 'hidden', borderBottom: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.03)' },
  alertBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, transition: 'width 1s linear, background 0.5s', opacity: 0.15 },
  alertContent: { position: 'relative', zIndex: 1, height: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' },
  alertLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  alertLabel: { fontSize: 13, fontWeight: 700, color: colors.orange },
  alertTimer: { fontSize: 28, fontWeight: 900, transition: 'color 0.5s', fontVariantNumeric: 'tabular-nums' },

  upcomingBar: { background: 'rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.15)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  upcomingLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  upcomingText: { fontSize: 13, color: colors.textMuted },
  upcomingActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  stratBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: colors.purpleDim, border: `1px solid rgba(139,92,246,0.3)`, borderRadius: radius.sm, color: colors.purple, fontWeight: 600, cursor: 'pointer', fontSize: 12 },
  challengeBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: colors.greenDim, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: radius.sm, color: colors.green, fontWeight: 600, cursor: 'pointer', fontSize: 12 },
  startBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', background: gradients.orange, border: 'none', borderRadius: radius.sm, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 },

  layout: { display: 'grid', gridTemplateColumns: '300px 1fr 260px', gap: 16, padding: '20px 24px', maxWidth: 1400, margin: '0 auto' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  centerCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 14 },

  card: { background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '16px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: 7 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: colors.text },
  totalPts: { fontSize: 16, fontWeight: 800, color: colors.orange },

  decRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` },
  decType: { fontSize: 12, fontWeight: 600, color: colors.text, textTransform: 'capitalize' },
  decOver: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  decScore: { fontSize: 20, fontWeight: 900 },

  postActions: { display: 'flex', flexDirection: 'column', gap: 8 },
  reportBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', background: gradients.orange, border: 'none', borderRadius: radius.sm, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  replayBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, borderRadius: radius.sm, color: colors.text, fontWeight: 600, cursor: 'pointer', fontSize: 13 },

  waiting: { background: 'rgba(255,255,255,0.02)', border: `1px dashed rgba(255,255,255,0.08)`, borderRadius: radius.xl, padding: '60px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flex: 1, minHeight: 340 },
  waitingOrb: { width: 80, height: 80, borderRadius: '50%', background: colors.orangeDim, border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(249,115,22,0.1)' },
  waitingTitle: { fontSize: 17, fontWeight: 700, color: colors.text, margin: 0 },
  waitingDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 1.65, maxWidth: 340, margin: 0 },
  waitingHint: { display: 'flex', flexDirection: 'column', gap: 7, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: radius.md, width: '100%', maxWidth: 280 },
  waitingHintRow: { display: 'flex', alignItems: 'center', gap: 8 },
  waitingHintText: { fontSize: 12, color: colors.textMuted },
  challengeLiveBtn: { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: colors.greenDim, border: `1px solid rgba(34,197,94,0.25)`, borderRadius: radius.md, color: colors.green, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  startBtnCenter: { display: 'flex', alignItems: 'center', gap: 7, padding: '12px 28px', background: gradients.orange, border: 'none', borderRadius: radius.md, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },

  ptRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` },
  ptIcon: { width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ptMeta: { display: 'flex', flexDirection: 'column', gap: 1, flex: 1 },
  ptLabel: { fontSize: 12, fontWeight: 600, color: colors.text },
  ptDesc: { fontSize: 10, color: colors.textFaint },
  ptVal: { fontSize: 12, fontWeight: 800, flexShrink: 0 },

  quickGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  quickBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: 'pointer', transition: 'all 0.15s' },
  quickBtnIcon: { width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  quickBtnLabel: { fontSize: 11, fontWeight: 600, color: colors.textMuted },
}
