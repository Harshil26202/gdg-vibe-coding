import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchesApi } from '../api/matches'
import { strategyApi } from '../api/strategy'
import Navbar from '../components/UI/Navbar'
import { colors, gradients, radius } from '../styles/theme'
import type { Match } from '../types'

const CSK_SQUAD = [
  'Ruturaj Gaikwad', 'Devon Conway', 'Ajinkya Rahane', 'Shivam Dube',
  'Ravindra Jadeja', 'MS Dhoni', 'Moeen Ali', 'Deepak Chahar',
  'Tushar Deshpande', 'Maheesh Theekshana', 'Simarjeet Singh',
  'Daryl Mitchell', 'Rachin Ravindra', 'Sameer Rizvi', 'Mustafizur Rahman',
]

const MI_SQUAD = [
  'Rohit Sharma', 'Ishan Kishan', 'Suryakumar Yadav', 'Tilak Varma',
  'Hardik Pandya', 'Tim David', 'Romario Shepherd', 'Jasprit Bumrah',
  'Gerald Coetzee', 'Piyush Chawla', 'Naman Dhir', 'Nehal Wadhera',
  'Vishnu Vinod', 'Akash Madhwal', 'Jason Behrendorff',
]

const BOWLERS = {
  CSK: ['Deepak Chahar', 'Tushar Deshpande', 'Maheesh Theekshana', 'Ravindra Jadeja', 'Moeen Ali', 'Mustafizur Rahman'],
  MI: ['Jasprit Bumrah', 'Gerald Coetzee', 'Piyush Chawla', 'Hardik Pandya', 'Romario Shepherd', 'Jason Behrendorff'],
}

export default function StrategyRoom() {
  const { id } = useParams<{ id: string }>()
  const matchId = parseInt(id || '0')
  const navigate = useNavigate()

  const [match, setMatch] = useState<Match | null>(null)
  const [squad, setSquad] = useState<string[]>(CSK_SQUAD)
  const [xi, setXi] = useState<string[]>([])
  const [openers, setOpeners] = useState<string[]>([])
  const [ppBowler, setPpBowler] = useState('')
  const [deathBowler, setDeathBowler] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    matchesApi.get(matchId).then(r => {
      setMatch(r.data)
      setSquad(r.data.team_a.includes('Chennai') ? CSK_SQUAD : MI_SQUAD)
    })
    strategyApi.get(matchId).then(r => {
      const s = r.data
      setXi(s.playing_xi || [])
      setOpeners(s.opening_pair || [])
      setPpBowler(s.powerplay_bowler || '')
      setDeathBowler(s.death_over_bowler || '')
      setNotes(s.extra_notes || '')
    }).catch(() => {})
  }, [matchId])

  function toggleXI(player: string) {
    if (xi.includes(player)) {
      setXi(xi.filter(p => p !== player))
      setOpeners(openers.filter(p => p !== player))
    } else if (xi.length < 11) {
      setXi([...xi, player])
    }
  }

  function toggleOpener(player: string) {
    if (!xi.includes(player)) return
    if (openers.includes(player)) {
      setOpeners(openers.filter(p => p !== player))
    } else if (openers.length < 2) {
      setOpeners([...openers, player])
    }
  }

  async function save() {
    if (xi.length < 11 || openers.length < 2 || !ppBowler || !deathBowler) return
    setSaving(true)
    try {
      await strategyApi.save({ match_id: matchId, playing_xi: xi, opening_pair: openers, powerplay_bowler: ppBowler, death_over_bowler: deathBowler, extra_notes: notes })
      setSaved(true)
      setTimeout(() => navigate(`/match/${matchId}`), 1200)
    } finally {
      setSaving(false)
    }
  }

  const bowlers = match?.team_a.includes('Chennai') ? BOWLERS.CSK : BOWLERS.MI
  const complete = xi.length === 11 && openers.length === 2 && ppBowler && deathBowler

  return (
    <div style={{ minHeight: '100vh', background: gradients.page }}>
      <Navbar />
      <div style={s.page}>
        <div style={s.header}>
          <button onClick={() => navigate(`/match/${matchId}`)} style={s.backBtn}>← Back to Match</button>
          <div>
            <h1 style={s.title}>Pre-Match Strategy Room</h1>
            <p style={s.sub}>{match?.title || 'Loading...'} — Build your game plan before the toss</p>
          </div>
        </div>

        <div style={s.grid}>
          {/* XI Selector */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.cardTitle}>Playing XI</span>
              <span style={{ ...s.pill, background: xi.length === 11 ? colors.greenDim : colors.orangeDim, color: xi.length === 11 ? colors.green : colors.orange }}>
                {xi.length}/11
              </span>
            </div>
            <p style={s.hint}>Select 11 players from the squad</p>
            <div style={s.playerGrid}>
              {squad.map(p => {
                const inXI = xi.includes(p)
                const isOpener = openers.includes(p)
                return (
                  <button
                    key={p}
                    onClick={() => toggleXI(p)}
                    style={{ ...s.playerBtn, ...(inXI ? s.playerBtnActive : {}), ...(xi.length >= 11 && !inXI ? s.playerBtnDisabled : {}) }}
                  >
                    <span style={s.playerName}>{p}</span>
                    {inXI && <span style={s.playerCheck}>✓</span>}
                    {isOpener && <span style={s.openerBadge}>OP</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right column */}
          <div style={s.rightCol}>
            {/* Opening pair */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.cardTitle}>Opening Pair</span>
                <span style={{ ...s.pill, background: openers.length === 2 ? colors.greenDim : colors.orangeDim, color: openers.length === 2 ? colors.green : colors.orange }}>{openers.length}/2</span>
              </div>
              <p style={s.hint}>Pick 2 openers from your XI</p>
              <div style={s.openerGrid}>
                {xi.map(p => (
                  <button key={p} onClick={() => toggleOpener(p)} style={{ ...s.openerBtn, ...(openers.includes(p) ? s.openerBtnActive : {}) }}>
                    {p}
                  </button>
                ))}
                {xi.length === 0 && <p style={{ color: colors.textFaint, fontSize: 13 }}>Select your XI first</p>}
              </div>
            </div>

            {/* Bowler choices */}
            <div style={s.card}>
              <span style={s.cardTitle}>Key Bowling Roles</span>
              <div style={s.bowlerSection}>
                <div>
                  <p style={s.bowlerLabel}>⚡ Powerplay Bowler (Ov 1–6)</p>
                  <div style={s.bowlerGrid}>
                    {bowlers.map(b => (
                      <button key={b} onClick={() => setPpBowler(b)} style={{ ...s.bowlerBtn, ...(ppBowler === b ? s.bowlerBtnActive : {}) }}>{b}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={s.bowlerLabel}>💀 Death Overs Bowler (Ov 17–20)</p>
                  <div style={s.bowlerGrid}>
                    {bowlers.map(b => (
                      <button key={b} onClick={() => setDeathBowler(b)} style={{ ...s.bowlerBtn, ...(deathBowler === b ? { ...s.bowlerBtnActive, borderColor: colors.red, color: colors.red, background: colors.redDim } : {}) }}>{b}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={s.card}>
              <span style={s.cardTitle}>Tactical Notes</span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Use spin early if pitch is dry. Protect Dhoni for death overs..."
                style={s.textarea}
                rows={3}
              />
            </div>

            {/* Submit */}
            <button
              onClick={save}
              disabled={!complete || saving}
              style={{ ...s.saveBtn, ...(!complete ? s.saveBtnDisabled : {}) }}
            >
              {saved ? '✓ Strategy Saved! Entering match...' : saving ? 'Saving...' : complete ? '🏏 Lock In Strategy & Enter Match' : `Complete strategy (${xi.length}/11 XI, ${openers.length}/2 openers)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
  header: { marginBottom: 32 },
  backBtn: { background: 'none', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '8px 16px', borderRadius: radius.sm, cursor: 'pointer', fontSize: 13, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 900, color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20 },
  card: { background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20, backdropFilter: 'blur(16px)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: colors.text },
  hint: { fontSize: 12, color: colors.textFaint, marginBottom: 12 },
  pill: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  playerGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  playerBtn: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' },
  playerBtnActive: { background: colors.orangeDim, borderColor: 'rgba(249,115,22,0.35)', color: colors.orange },
  playerBtnDisabled: { opacity: 0.3, cursor: 'not-allowed' },
  playerName: { fontSize: 12, fontWeight: 600, color: colors.text },
  playerCheck: { color: colors.green, fontWeight: 800, fontSize: 13 },
  openerBadge: { fontSize: 9, fontWeight: 800, background: colors.blueDim, color: colors.blue, padding: '2px 6px', borderRadius: 4 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 16 },
  openerGrid: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
  openerBtn: { padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer', color: colors.textMuted, fontSize: 13, textAlign: 'left' },
  openerBtnActive: { background: colors.blueDim, borderColor: 'rgba(59,130,246,0.3)', color: colors.blue, fontWeight: 600 },
  bowlerSection: { display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 },
  bowlerLabel: { fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 8 },
  bowlerGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  bowlerBtn: { padding: '6px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, color: colors.textMuted },
  bowlerBtnActive: { background: colors.orangeDim, borderColor: 'rgba(249,115,22,0.3)', color: colors.orange, fontWeight: 600 },
  textarea: { width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radius.sm, color: colors.text, fontSize: 13, padding: '12px', resize: 'vertical', marginTop: 10, fontFamily: 'inherit', lineHeight: 1.6 },
  saveBtn: { padding: '16px', background: gradients.orange, border: 'none', borderRadius: radius.md, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 15, boxShadow: '0 4px 20px rgba(249,115,22,0.35)' },
  saveBtnDisabled: { background: 'rgba(255,255,255,0.06)', color: colors.textFaint, boxShadow: 'none', cursor: 'not-allowed' },
}
