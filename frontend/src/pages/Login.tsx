import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

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
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏏</span>
          <h1 style={styles.logoText}>IPL Coaching Simulator</h1>
          <p style={styles.logoSub}>Prove you're the best cricket mind in the country</p>
        </div>

        <div style={styles.tabs}>
          {(['login', 'register'] as const).map((t) => (
            <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {tab === 'register' && (
            <input style={styles.input} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          )}
          <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Loading...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)' },
  card: { background: '#12121a', border: '1px solid #2d2d3d', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' },
  logo: { textAlign: 'center', marginBottom: 32 },
  logoIcon: { fontSize: 48 },
  logoText: { fontSize: 24, fontWeight: 700, color: '#f97316', marginTop: 8 },
  logoSub: { color: '#94a3b8', fontSize: 14, marginTop: 6 },
  tabs: { display: 'flex', marginBottom: 24, background: '#1e1e2e', borderRadius: 8, padding: 4 },
  tab: { flex: 1, padding: '10px 0', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', borderRadius: 6, fontSize: 14, fontWeight: 500, transition: 'all 0.2s' },
  tabActive: { background: '#f97316', color: '#fff' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '12px 16px', background: '#1e1e2e', border: '1px solid #2d2d3d', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none' },
  error: { color: '#ef4444', fontSize: 13 },
  btn: { padding: '14px', background: '#f97316', border: 'none', borderRadius: 8, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
}
