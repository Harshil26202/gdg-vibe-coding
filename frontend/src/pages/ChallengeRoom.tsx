import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { challengeApi } from '../api/challenge'
import { matchesApi } from '../api/matches'
import Navbar from '../components/UI/Navbar'
import { colors, gradients, radius } from '../styles/theme'
import { Swords, Target, Lightning } from '../components/UI/Icons'
import type { Match } from '../types'

type Phase = 'create' | 'lobby' | 'active' | 'joined'

export default function ChallengeRoom() {
  const { id } = useParams<{ id: string }>()
  const matchId = parseInt(id || '0')
  const navigate = useNavigate()

  const [match, setMatch] = useState<Match | null>(null)
  const [phase, setPhase] = useState<Phase>('create')
  const [challengeId, setChallengeId] = useState<number | null>(null)
  const [joinId, setJoinId] = useState('')
  const [opponentName, setOpponentName] = useState('')
  const [isAI, setIsAI] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    matchesApi.get(matchId).then(r => setMatch(r.data))
  }, [matchId])

  // Countdown when in lobby
  useEffect(() => {
    if (phase !== 'lobby') return
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          setIsAI(true)
          setOpponentName('Claude AI Coach')
          setPhase('active')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  async function createChallenge() {
    setLoading(true)
    try {
      const res = await challengeApi.create(matchId)
      setChallengeId(res.data.id)
      setPhase('lobby')
    } finally {
      setLoading(false)
    }
  }

  async function joinChallenge() {
    if (!joinId) return
    setLoading(true)
    try {
      await challengeApi.join(parseInt(joinId))
      setPhase('joined')
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Could not join challenge')
    } finally {
      setLoading(false)
    }
  }

  function enterMatch() {
    navigate(`/match/${matchId}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: gradients.page }}>
      <Navbar />
      <div style={s.page}>
        <button onClick={() => navigate(`/match/${matchId}`)} style={s.back}>← Back to Match</button>

        <div style={s.center}>
          <div style={s.icon}><Swords size={32} color={colors.green} /></div>
          <h1 style={s.title}>Head-to-Head Challenge</h1>
          <p style={s.sub}>{match?.title}</p>

          {phase === 'create' && (
            <div style={s.card}>
              <div style={s.section}>
                <h3 style={s.sectionTitle}>Create a Challenge</h3>
                <p style={s.sectionDesc}>Get a challenge ID, share with a friend. If they don't join in 30 seconds, an OpenAI coach steps in as your opponent.</p>
                <button onClick={createChallenge} disabled={loading} style={s.primaryBtn}>
                  {loading ? 'Creating...' : 'Create Challenge Room'}
                </button>
              </div>
              <div style={s.divider}><span style={s.dividerText}>or</span></div>
              <div style={s.section}>
                <h3 style={s.sectionTitle}>Join a Challenge</h3>
                <p style={s.sectionDesc}>Enter a challenge ID shared by a friend</p>
                <div style={s.joinRow}>
                  <input
                    value={joinId}
                    onChange={e => setJoinId(e.target.value)}
                    placeholder="Challenge ID"
                    style={s.input}
                  />
                  <button onClick={joinChallenge} disabled={loading || !joinId} style={s.joinBtn}>
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'lobby' && (
            <div style={s.card}>
              <div style={s.lobbyHeader}>
                <div style={s.challengeIdBox}>
                  <span style={s.challengeIdLabel}>Your Challenge ID</span>
                  <span style={s.challengeIdVal}>{challengeId}</span>
                  <button onClick={() => navigator.clipboard.writeText(String(challengeId))} style={s.copyBtn}>Copy</button>
                </div>
              </div>
              <div style={s.countdown}>
                <svg viewBox="0 0 80 80" style={s.countdownSvg}>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={countdown > 10 ? colors.green : colors.red}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${213.6}`}
                    strokeDashoffset={`${213.6 * (1 - countdown / 30)}`}
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                  />
                  <text x="40" y="47" textAnchor="middle" fontSize="22" fontWeight="800" fill={countdown > 10 ? colors.green : colors.red}>
                    {countdown}
                  </text>
                </svg>
                <p style={s.waitText}>Waiting for opponent to join...</p>
                <p style={s.waitSub}>Claude AI will join automatically if no one connects in time</p>
              </div>
            </div>
          )}

          {(phase === 'active' || phase === 'joined') && (
            <div style={s.card}>
              <div style={s.opponentRevealed}>
                <div style={s.vsBox}>
                  <div style={s.vsPlayer}>
                    <div style={s.vsAvatar}>YOU</div>
                    <span style={s.vsName}>You</span>
                  </div>
                  <span style={s.vsBadge}>VS</span>
                  <div style={s.vsPlayer}>
                    <div style={{ ...s.vsAvatar, background: isAI ? gradients.purple : gradients.green }}>
                      {isAI ? 'AI' : opponentName[0] || '?'}
                    </div>
                    <span style={s.vsName}>{opponentName || 'Opponent'}</span>
                    {isAI && <span style={s.aiBadge}>AI Coach</span>}
                  </div>
                </div>
                <p style={s.readyText}>
                  {isAI ? 'OpenAI coach is ready as your opponent. May the best coach win!' : 'Your opponent has joined! Get ready to compete.'}
                </p>
                <button onClick={enterMatch} style={s.primaryBtn}>
                  Enter Match & Compete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 680, margin: '0 auto', padding: '32px 24px' },
  back: { background: 'none', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '8px 16px', borderRadius: radius.sm, cursor: 'pointer', fontSize: 13, marginBottom: 32 },
  center: { textAlign: 'center' },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 900, color: colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 32 },
  card: { background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 32, backdropFilter: 'blur(20px)', textAlign: 'left' },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 1.6, marginBottom: 16 },
  primaryBtn: { width: '100%', padding: '15px', background: gradients.orange, border: 'none', borderRadius: radius.md, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 15, boxShadow: '0 4px 20px rgba(249,115,22,0.35)' },
  divider: { position: 'relative', textAlign: 'center', margin: '24px 0', borderTop: `1px solid ${colors.border}` },
  dividerText: { position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#0f0f1a', padding: '0 12px', color: colors.textFaint, fontSize: 12 },
  joinRow: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, borderRadius: radius.sm, color: colors.text, fontSize: 14 },
  joinBtn: { padding: '12px 24px', background: colors.blueDim, border: `1px solid rgba(59,130,246,0.3)`, borderRadius: radius.sm, color: colors.blue, fontWeight: 700, cursor: 'pointer' },
  lobbyHeader: { marginBottom: 24 },
  challengeIdBox: { background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: radius.md, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  challengeIdLabel: { fontSize: 11, fontWeight: 700, color: colors.orange, letterSpacing: 1, textTransform: 'uppercase' },
  challengeIdVal: { fontSize: 48, fontWeight: 900, color: colors.orange, letterSpacing: 6 },
  copyBtn: { padding: '6px 16px', background: colors.orangeDim, border: `1px solid rgba(249,115,22,0.25)`, borderRadius: 20, color: colors.orange, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  countdown: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  countdownSvg: { width: 120, height: 120 },
  waitText: { fontSize: 16, fontWeight: 700, color: colors.text },
  waitSub: { fontSize: 12, color: colors.textFaint, maxWidth: 280, textAlign: 'center', lineHeight: 1.5 },
  opponentRevealed: { display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' },
  vsBox: { display: 'flex', alignItems: 'center', gap: 24 },
  vsPlayer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  vsAvatar: { width: 64, height: 64, borderRadius: 20, background: gradients.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff' },
  vsName: { fontSize: 13, fontWeight: 700, color: colors.text },
  aiBadge: { fontSize: 10, fontWeight: 700, background: colors.purpleDim, color: colors.purple, padding: '2px 8px', borderRadius: 10 },
  vsBadge: { fontSize: 24, fontWeight: 900, color: colors.textFaint },
  readyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 },
}
