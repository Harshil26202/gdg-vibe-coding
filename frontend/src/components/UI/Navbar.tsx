import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { colors } from '../../styles/theme'
import { CricketBat, Trophy, Home, LogOut, User, Lightning } from './Icons'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()

  const links = [
    { label: 'Matches', path: '/', Icon: Home },
    { label: 'Leaderboard', path: '/leaderboard', Icon: Trophy },
  ]

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        {/* Logo */}
        <button onClick={() => navigate('/')} style={s.logo}>
          <span style={s.logoIconWrap}>
            <CricketBat size={18} color={colors.orange} />
          </span>
          <span style={s.logoText}>IPL Coach</span>
          <span style={s.logoBadge}>2026</span>
        </button>

        {/* Nav links */}
        <div style={s.links}>
          {links.map(({ label, path, Icon }) => {
            const active = loc.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{ ...s.link, ...(active ? s.linkActive : {}) }}
              >
                <Icon size={14} color={active ? colors.text : colors.textMuted} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Right section */}
        {user && (
          <div style={s.right}>
            <div style={s.scoreChip} title="Your cumulative tactical score">
              <Lightning size={13} color={colors.orange} />
              <span style={s.scoreVal}>{Math.round(user.total_score)}</span>
              <span style={s.scorePts}>pts</span>
            </div>
            <button onClick={() => navigate('/')} style={s.avatar} title={user.username}>
              {user.username[0].toUpperCase()}
            </button>
            <button onClick={logout} style={s.logout} title="Sign out">
              <LogOut size={14} color={colors.textFaint} />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

const s: Record<string, React.CSSProperties> = {
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(7,7,15,0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  inner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '0 24px', height: 60,
    maxWidth: 1400, margin: '0 auto',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'none', border: 'none', cursor: 'pointer', marginRight: 16,
  },
  logoIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    background: 'rgba(249,115,22,0.12)',
    border: '1px solid rgba(249,115,22,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 15, fontWeight: 800, color: colors.orange },
  logoBadge: {
    fontSize: 9, fontWeight: 800,
    background: 'rgba(249,115,22,0.15)',
    color: colors.orange,
    padding: '2px 7px', borderRadius: 4, letterSpacing: 1,
    border: '1px solid rgba(249,115,22,0.2)',
  },
  links: { display: 'flex', gap: 4, flex: 1 },
  link: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', background: 'none', border: 'none',
    cursor: 'pointer', color: colors.textMuted,
    fontWeight: 500, fontSize: 13, borderRadius: 8, transition: 'all 0.15s',
  },
  linkActive: { color: colors.text, background: 'rgba(255,255,255,0.07)' },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  scoreChip: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'rgba(249,115,22,0.1)',
    border: '1px solid rgba(249,115,22,0.2)',
    borderRadius: 20, padding: '5px 13px',
  },
  scoreVal: { fontSize: 14, fontWeight: 800, color: colors.orange },
  scorePts: { fontSize: 11, color: colors.textMuted },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 800, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logout: {
    width: 34, height: 34, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'none',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, cursor: 'pointer',
  },
}
