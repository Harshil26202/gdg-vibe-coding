import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchesApi } from '../api/matches'
import type { Match } from '../types'
import Navbar from '../components/UI/Navbar'
import { colors, gradients, radius, shadow } from '../styles/theme'

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    matchesApi.list().then(r => setMatches(r.data)).finally(() => setLoading(false))
  }, [])

  const features = [
    { icon: '🧠', title: 'Pre-Match Strategy', desc: 'Build your XI and game plan before the toss', color: colors.purple },
    { icon: '⚡', title: 'Live Decisions', desc: 'Real-time field & bowling calls with 10s timer', color: colors.orange },
    { icon: '🤺', title: 'Head-to-Head', desc: 'Challenge a friend or battle Claude AI', color: colors.green },
    { icon: '🎙️', title: 'AI Commentator', desc: 'Harsha Bhogle-style over summaries by Claude', color: colors.blue },
    { icon: '⏪', title: 'Tactical Replay', desc: 'Rewind any over and try different calls', color: colors.yellow },
    { icon: '📊', title: 'Coach Report', desc: 'Personalised post-match rating and shareable card', color: colors.red },
  ]

  return (
    <div style={{ minHeight: '100vh', background: gradients.page }}>
      <Navbar />

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.heroChip}>🏆 IPL 2024 Season</div>
        <h1 style={s.heroTitle}>
          Be the Coach.<br />
          <span style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Beat the Captain.
          </span>
        </h1>
        <p style={s.heroSub}>
          Make real-time tactical decisions during live IPL simulations. Earn points, get Claude's analysis, and prove you're the sharpest cricket mind in the country.
        </p>
        <div style={s.heroStats}>
          {[['🏏', '5 Matches'], ['⚡', '4 Decision Types'], ['🤖', 'Claude AI'], ['🏆', 'Live Leaderboard']].map(([icon, label]) => (
            <div key={label} style={s.statChip}><span>{icon}</span><span style={s.statLabel}>{label}</span></div>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div style={s.section}>
        <div style={s.featureGrid}>
          {features.map(f => (
            <div key={f.title} style={{ ...s.featureCard, borderColor: `${f.color}22` }}>
              <span style={{ ...s.featureIcon, background: `${f.color}18`, color: f.color }}>{f.icon}</span>
              <div>
                <div style={s.featureTitle}>{f.title}</div>
                <div style={s.featureDesc}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matches */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Matches</h2>
          <div style={s.liveDot} />
        </div>

        {loading ? (
          <div style={s.loadingGrid}>
            {[1, 2, 3].map(i => <div key={i} style={s.skeleton} />)}
          </div>
        ) : (
          <div style={s.matchGrid}>
            {matches.map(m => <MatchCard key={m.id} match={m} onEnter={() => navigate(`/match/${m.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function MatchCard({ match, onEnter }: { match: Match; onEnter: () => void }) {
  const isLive = match.status === 'live'
  const isUpcoming = match.status === 'upcoming'

  return (
    <div style={s.matchCard}>
      <div style={s.matchCardInner}>
        <div style={s.matchTop}>
          <span style={{ ...s.badge, ...(isLive ? s.badgeLive : isUpcoming ? s.badgeUpcoming : s.badgeDone) }}>
            {isLive && <span style={s.pulseDot} />}
            {isLive ? 'LIVE' : isUpcoming ? 'UPCOMING' : 'COMPLETED'}
          </span>
          <span style={s.venue}>{match.venue}</span>
        </div>

        <div style={s.teamsRow}>
          <div style={s.teamBlock}>
            <div style={s.teamLogo}>{match.team_a[0]}</div>
            <span style={s.teamName}>{match.team_a}</span>
            {match.status !== 'upcoming' && <span style={s.teamScore}>{match.team_a_score}/{match.team_a_wickets}</span>}
          </div>
          <span style={s.vs}>vs</span>
          <div style={{ ...s.teamBlock, alignItems: 'flex-end' }}>
            <div style={s.teamLogo}>{match.team_b[0]}</div>
            <span style={s.teamName}>{match.team_b}</span>
            {match.status !== 'upcoming' && <span style={s.teamScore}>{match.team_b_score}/{match.team_b_wickets}</span>}
          </div>
        </div>

        <button
          style={{ ...s.enterBtn, ...(match.status === 'completed' ? s.enterBtnGhost : isLive ? s.enterBtnLive : s.enterBtnDefault) }}
          onClick={onEnter}
        >
          {isLive ? '🔴 Join Live' : isUpcoming ? '🏏 Enter Match' : '📊 View Summary'}
        </button>
      </div>

      {/* glow overlay for live */}
      {isLive && <div style={s.liveGlow} />}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  hero: { textAlign: 'center', padding: '80px 24px 48px', maxWidth: 720, margin: '0 auto' },
  heroChip: { display: 'inline-block', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: colors.orange, fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 20, letterSpacing: 0.5 },
  heroTitle: { fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 900, lineHeight: 1.1, color: colors.text, marginBottom: 20 },
  heroSub: { fontSize: 17, color: colors.textMuted, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 32px' },
  heroStats: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  statChip: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 14px', fontSize: 13 },
  statLabel: { color: colors.textMuted, fontWeight: 500 },
  section: { maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 800, color: colors.text },
  liveDot: { width: 8, height: 8, borderRadius: '50%', background: colors.green, boxShadow: `0 0 8px ${colors.green}` },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 48 },
  featureCard: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'rgba(255,255,255,0.025)', border: '1px solid', borderRadius: radius.md, backdropFilter: 'blur(10px)' },
  featureIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  featureTitle: { fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 2 },
  featureDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 1.5 },
  matchGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  loadingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  skeleton: { height: 180, background: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, animation: 'pulse 1.5s ease-in-out infinite' },
  matchCard: { position: 'relative', borderRadius: radius.lg, overflow: 'hidden' },
  matchCardInner: { background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: radius.lg, padding: 24, backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', zIndex: 1 },
  liveGlow: { position: 'absolute', inset: 0, borderRadius: radius.lg, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)', pointerEvents: 'none' },
  matchTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5, letterSpacing: 0.5 },
  badgeLive: { background: 'rgba(34,197,94,0.15)', color: colors.green, border: '1px solid rgba(34,197,94,0.3)' },
  badgeUpcoming: { background: 'rgba(59,130,246,0.12)', color: colors.blue, border: '1px solid rgba(59,130,246,0.25)' },
  badgeDone: { background: 'rgba(255,255,255,0.06)', color: colors.textMuted, border: '1px solid rgba(255,255,255,0.08)' },
  pulseDot: { width: 7, height: 7, borderRadius: '50%', background: colors.green, animation: 'pulse 1s infinite' },
  venue: { fontSize: 11, color: colors.textFaint },
  teamsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  teamBlock: { display: 'flex', flexDirection: 'column', gap: 4 },
  teamLogo: { width: 36, height: 36, borderRadius: 10, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: colors.orange },
  teamName: { fontSize: 13, fontWeight: 700, color: colors.text },
  teamScore: { fontSize: 22, fontWeight: 900, color: colors.orange },
  vs: { fontSize: 12, color: colors.textFaint, fontWeight: 600 },
  enterBtn: { width: '100%', padding: '13px', border: 'none', borderRadius: radius.md, fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' },
  enterBtnLive: { background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' },
  enterBtnDefault: { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' },
  enterBtnGhost: { background: 'rgba(255,255,255,0.05)', color: colors.textMuted, border: '1px solid rgba(255,255,255,0.08)' },
}
