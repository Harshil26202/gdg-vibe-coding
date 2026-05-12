import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { colors, radius, shadow, gradients } from '../styles/theme'
import { CricketBat, User, Lock, Lightning, Trophy, Brain, Shield } from '../components/UI/Icons'

export default function Login() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      {/* Ambient glow blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />

      <div style={s.container}>
        {/* Left panel — branding */}
        <div style={s.brandPanel}>
          <div style={s.brandLogo}>
            <div style={s.brandIcon}>
              <CricketBat size={28} color={colors.orange} />
            </div>
            <div>
              <div style={s.brandName}>IPL Coach</div>
              <div style={s.brandSeason}>2026 Season</div>
            </div>
          </div>

          <h2 style={s.brandHeadline}>Prove you're the best cricket mind in India.</h2>
          <p style={s.brandDesc}>
            Make real-time tactical decisions during live IPL simulations. Compete against thousands of coaches. Powered by OpenAI.
          </p>

          <div style={s.featureList}>
            {[
              { Icon: Lightning, color: colors.orange, text: 'Real-time decision windows' },
              { Icon: Brain, color: colors.purple, text: 'AI-powered tactical scoring' },
              { Icon: Trophy, color: colors.yellow, text: 'National leaderboard rankings' },
              { Icon: Shield, color: colors.green, text: 'Historical IPL data analysis' },
            ].map(({ Icon, color, text }) => (
              <div key={text} style={s.featureItem}>
                <div style={{ ...s.featureIcon, background: `${color}18` }}>
                  <Icon size={13} color={color} />
                </div>
                <span style={s.featureText}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — auth form */}
        <div style={s.formPanel}>
          <div style={s.tabs}>
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
                onClick={() => setTab(t)}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <p style={s.formSubtitle}>
            {tab === 'login'
              ? 'Welcome back, Coach. Your decisions await.'
              : 'Join thousands of IPL coaches competing in 2026.'}
          </p>

          <form onSubmit={handleSubmit} style={s.form}>
            {tab === 'register' && (
              <div style={s.fieldWrap}>
                <div style={s.fieldIcon}><User size={14} color={colors.textFaint} /></div>
                <input
                  style={s.input}
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            )}

            <div style={s.fieldWrap}>
              <div style={s.fieldIcon}><User size={14} color={colors.textFaint} /></div>
              <input
                style={s.input}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div style={s.fieldWrap}>
              <div style={s.fieldIcon}><Lock size={14} color={colors.textFaint} /></div>
              <input
                style={s.input}
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div style={s.errorBox}>
                <span style={s.errorText}>{error}</span>
              </div>
            )}

            <button style={s.submitBtn} type="submit" disabled={loading}>
              {loading
                ? 'Please wait…'
                : tab === 'login' ? 'Sign In to Coach' : 'Create My Account'}
            </button>
          </form>

          <p style={s.switchNote}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              style={s.switchBtn}
              onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError('') }}
            >
              {tab === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at 20% 20%, rgba(249,115,22,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%), #07070f',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px',
    position: 'relative', overflow: 'hidden',
  },
  blob1: { position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)', top: '-100px', left: '-100px', pointerEvents: 'none' },
  blob2: { position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', bottom: '-150px', right: '-100px', pointerEvents: 'none' },

  container: {
    display: 'flex', width: '100%', maxWidth: 900,
    background: 'rgba(15,15,26,0.95)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: radius.xl,
    overflow: 'hidden',
    boxShadow: shadow.modal,
    position: 'relative', zIndex: 1,
  },

  brandPanel: {
    flex: 1, padding: '48px 40px',
    background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(139,92,246,0.06) 100%)',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  brandLogo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 },
  brandIcon: { width: 48, height: 48, borderRadius: 14, background: colors.orangeDim, border: `1px solid rgba(249,115,22,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 20, fontWeight: 900, color: colors.orange },
  brandSeason: { fontSize: 11, color: colors.textFaint, fontWeight: 600, letterSpacing: 1 },
  brandHeadline: { fontSize: 24, fontWeight: 900, color: colors.text, lineHeight: 1.3, marginBottom: 16 },
  brandDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 1.7, marginBottom: 32 },
  featureList: { display: 'flex', flexDirection: 'column', gap: 12 },
  featureItem: { display: 'flex', alignItems: 'center', gap: 10 },
  featureIcon: { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { fontSize: 13, color: colors.textMuted },

  formPanel: { width: 380, padding: '48px 40px', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  tabs: { display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: radius.sm, padding: 3, marginBottom: 20 },
  tab: { flex: 1, padding: '9px 0', border: 'none', background: 'transparent', color: colors.textFaint, cursor: 'pointer', borderRadius: 6, fontSize: 13, fontWeight: 600, transition: 'all 0.2s' },
  tabActive: { background: gradients.orange, color: '#fff' },
  formSubtitle: { fontSize: 13, color: colors.textFaint, marginBottom: 24, lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  fieldWrap: { position: 'relative' },
  fieldIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  input: {
    width: '100%', padding: '12px 16px 12px 42px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: radius.sm, color: colors.text, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
  },
  errorBox: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: radius.sm, padding: '10px 14px' },
  errorText: { fontSize: 13, color: colors.red },
  submitBtn: {
    padding: '13px', background: gradients.orange, border: 'none',
    borderRadius: radius.sm, color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', marginTop: 4, transition: 'opacity 0.2s',
  },
  switchNote: { fontSize: 13, color: colors.textFaint, textAlign: 'center', marginTop: 20 },
  switchBtn: { background: 'none', border: 'none', color: colors.orange, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
}
