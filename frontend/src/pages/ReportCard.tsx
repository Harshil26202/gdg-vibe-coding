import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { reportApi } from '../api/report'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/UI/Navbar'
import { colors, gradients, radius } from '../styles/theme'
import { CricketBat, Download, Share2, ChevronLeft, Check, ChevronRight, BarChart } from '../components/UI/Icons'

interface Report {
  headline: string
  strengths: string[]
  weaknesses: string[]
  signature_move: string
  overall_verdict: string
  coach_rating: string
}

interface ReportData {
  user: { id: number; username: string }
  match_title: string
  total_score: number
  decisions_made: number
  rank: number
  report: Report
}

const RATING_COLORS: Record<string, string> = {
  'Rookie': colors.textMuted,
  'Club Pro': colors.blue,
  'State Level': colors.green,
  'National Prospect': colors.purple,
  'Elite Coach': colors.yellow,
}

export default function ReportCard() {
  const { id } = useParams<{ id: string }>()
  const matchId = parseInt(id || '0')
  const navigate = useNavigate()
  const { user } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    reportApi.getCoachReport(matchId)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [matchId])

  async function downloadCard() {
    if (!cardRef.current) return
    setCapturing(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0f0f1a',
        scale: 2,
        useCORS: true,
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `ipl-coach-report-${user?.username}-match${matchId}.png`
      a.click()
    } finally {
      setCapturing(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: gradients.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Navbar />
      <p style={{ color: colors.textMuted }}>Generating your report...</p>
    </div>
  )

  if (!data) return null

  const ratingColor = RATING_COLORS[data.report.coach_rating] || colors.orange
  const ratingStars = { 'Rookie': 1, 'Club Pro': 2, 'State Level': 3, 'National Prospect': 4, 'Elite Coach': 5 }[data.report.coach_rating] || 1

  return (
    <div style={{ minHeight: '100vh', background: gradients.page }}>
      <Navbar />
      <div style={s.page}>
        <button onClick={() => navigate(`/match/${matchId}`)} style={s.back}>
          <ChevronLeft size={14} color={colors.textMuted} />
          Back to Match
        </button>

        <div style={s.actions}>
          <h1 style={s.pageTitle}>Your Coach Report Card</h1>
          <div style={s.actionBtns}>
            <button onClick={downloadCard} disabled={capturing} style={s.downloadBtn}>
              <Download size={14} color="#fff" />
              {capturing ? 'Capturing…' : 'Download Card'}
            </button>
            <button
              onClick={() => navigator.share?.({ title: 'My IPL Coach Report', text: `I scored ${Math.round(data.total_score)} pts and ranked #${data.rank} as a ${data.report.coach_rating}!` })}
              style={s.shareBtn}
            >
              <Share2 size={14} color={colors.text} />
              Share
            </button>
          </div>
        </div>

        {/* Shareable Card */}
        <div ref={cardRef} style={s.card}>
          {/* Header */}
          <div style={s.cardHeader}>
            <div style={s.cardHeaderBg} />
            <div style={s.cardHeaderContent}>
              <span style={s.cardLogo}><CricketBat size={14} color={colors.orange} style={{ marginRight: 6 }} /> IPL Coaching Simulator 2026</span>
              <span style={s.cardMatch}>{data.match_title}</span>
            </div>
          </div>

          {/* Rating */}
          <div style={s.ratingSection}>
            <div style={s.avatarLarge}>{data.user.username[0].toUpperCase()}</div>
            <div style={s.ratingInfo}>
              <p style={s.username}>@{data.user.username}</p>
              <div style={{ ...s.ratingBadge, background: `${ratingColor}18`, border: `1px solid ${ratingColor}33`, color: ratingColor }}>
                {'★'.repeat(ratingStars)}{'☆'.repeat(5 - ratingStars)} {data.report.coach_rating}
              </div>
              <p style={s.headline}>"{data.report.headline}"</p>
            </div>
          </div>

          {/* Stats row */}
          <div style={s.statsRow}>
            {[
              { label: 'Total Score', value: Math.round(data.total_score), unit: 'pts' },
              { label: 'Rank', value: `#${data.rank}`, unit: '' },
              { label: 'Decisions', value: data.decisions_made, unit: 'made' },
            ].map(stat => (
              <div key={stat.label} style={s.statBox}>
                <span style={s.statVal}>{stat.value}<span style={s.statUnit}>{stat.unit}</span></span>
                <span style={s.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Strengths / Weaknesses */}
          <div style={s.swGrid}>
            <div style={s.swCard}>
              <p style={{ ...s.swLabel, color: colors.green }}>Strengths</p>
              {data.report.strengths.map((str, i) => (
                <p key={i} style={s.swItem}>✓ {str}</p>
              ))}
            </div>
            <div style={s.swCard}>
              <p style={{ ...s.swLabel, color: colors.red }}>Areas to Improve</p>
              {data.report.weaknesses.map((w, i) => (
                <p key={i} style={s.swItem}>→ {w}</p>
              ))}
            </div>
          </div>

          {/* Signature move */}
          <div style={s.sigMove}>
            <span style={s.sigLabel}>Signature Move</span>
            <span style={s.sigValue}>{data.report.signature_move}</span>
          </div>

          {/* Verdict */}
          <div style={s.verdict}>
            <p style={s.verdictText}>{data.report.overall_verdict}</p>
          </div>

          <div style={s.cardFooter}>IPL Coach 2026 • Powered by OpenAI</div>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 680, margin: '0 auto', padding: '32px 24px' },
  back: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '8px 16px', borderRadius: radius.sm, cursor: 'pointer', fontSize: 13, marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 900, color: colors.text },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  actionBtns: { display: 'flex', gap: 10 },
  downloadBtn: { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: gradients.orange, border: 'none', borderRadius: radius.md, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  shareBtn: { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.text, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  card: { background: '#0f0f1a', border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' },
  cardHeader: { position: 'relative', padding: '24px 28px 20px', overflow: 'hidden' },
  cardHeaderBg: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(139,92,246,0.1))', zIndex: 0 },
  cardHeaderContent: { position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardLogo: { display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 800, color: colors.orange },
  cardMatch: { fontSize: 12, color: colors.textMuted },
  ratingSection: { display: 'flex', gap: 20, padding: '24px 28px', alignItems: 'flex-start' },
  avatarLarge: { width: 72, height: 72, borderRadius: 20, background: gradients.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', flexShrink: 0 },
  ratingInfo: { display: 'flex', flexDirection: 'column', gap: 8 },
  username: { fontSize: 18, fontWeight: 800, color: colors.text },
  ratingBadge: { fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 20, width: 'fit-content' },
  headline: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic', lineHeight: 1.4 },
  statsRow: { display: 'flex', margin: '0 28px 24px', background: 'rgba(255,255,255,0.04)', borderRadius: radius.md, overflow: 'hidden' },
  statBox: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 8px', borderRight: `1px solid ${colors.border}` },
  statVal: { fontSize: 28, fontWeight: 900, color: colors.orange },
  statUnit: { fontSize: 14, color: colors.textFaint, marginLeft: 2 },
  statLabel: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  swGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 28px 24px' },
  swCard: { background: 'rgba(255,255,255,0.03)', borderRadius: radius.md, padding: 14 },
  swLabel: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  swItem: { fontSize: 12, color: colors.textMuted, lineHeight: 1.7 },
  sigMove: { margin: '0 28px 16px', background: 'rgba(249,115,22,0.06)', border: `1px solid rgba(249,115,22,0.15)`, borderRadius: radius.md, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sigLabel: { fontSize: 11, fontWeight: 700, color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.8 },
  sigValue: { fontSize: 13, fontWeight: 600, color: colors.text },
  verdict: { margin: '0 28px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: radius.md, padding: 16 },
  verdictText: { fontSize: 13, color: colors.textMuted, lineHeight: 1.7, fontStyle: 'italic' },
  cardFooter: { padding: '12px 28px', background: 'rgba(255,255,255,0.02)', borderTop: `1px solid ${colors.border}`, fontSize: 11, color: colors.textFaint, textAlign: 'center' },
}
