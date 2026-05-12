import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { colors } from '../../styles/theme'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()

  const links = [
    { label: 'Matches', path: '/' },
    { label: 'Leaderboard', path: '/leaderboard' },
  ]

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        <button onClick={() => navigate('/')} style={s.logo}>
          <span style={s.logoIcon}>🏏</span>
          <span style={s.logoText}>IPL Coach</span>
          <span style={s.logoBadge}>BETA</span>
        </button>

        <div style={s.links}>
          {links.map(l => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              style={{ ...s.link, ...(loc.pathname === l.path ? s.linkActive : {}) }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {user && (
          <div style={s.right}>
            <div style={s.scoreChip}>
              <span style={s.scoreIcon}>⚡</span>
              <span style={s.scoreVal}>{Math.round(user.total_score)}</span>
              <span style={s.scorePts}>pts</span>
            </div>
            <button onClick={() => navigate('/profile')} style={s.avatar}>
              {user.username[0].toUpperCase()}
            </button>
            <button onClick={logout} style={s.logout}>Sign out</button>
          </div>
        )}
      </div>
    </nav>
  )
}

const s: Record<string, React.CSSProperties> = {
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(7,7,15,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: `1px solid rgba(255,255,255,0.06)`,
  },
  inner: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', height: 60, maxWidth: 1400, margin: '0 auto' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', marginRight: 16 },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: 16, fontWeight: 800, color: colors.orange },
  logoBadge: { fontSize: 9, fontWeight: 800, background: colors.orangeDim, color: colors.orange, padding: '2px 6px', borderRadius: 4, letterSpacing: 1 },
  links: { display: 'flex', gap: 4, flex: 1 },
  link: { padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, fontWeight: 500, fontSize: 14, borderRadius: 8, transition: 'all 0.15s' },
  linkActive: { color: colors.text, background: 'rgba(255,255,255,0.07)' },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  scoreChip: { display: 'flex', alignItems: 'center', gap: 4, background: colors.orangeDim, border: `1px solid rgba(249,115,22,0.2)`, borderRadius: 20, padding: '4px 12px' },
  scoreIcon: { fontSize: 12 },
  scoreVal: { fontSize: 14, fontWeight: 800, color: colors.orange },
  scorePts: { fontSize: 11, color: colors.textMuted },
  avatar: { width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.orange}, #ea580c)`, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logout: { padding: '6px 12px', background: 'none', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, color: colors.textFaint, cursor: 'pointer', fontSize: 12 },
}
