import { useEffect, useState } from 'react'
import { client } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/UI/Navbar'
import type { LeaderboardEntry } from '../types'
import { colors, gradients, radius, shadow } from '../styles/theme'
import { Trophy, Medal, Lightning, Users, Star, Activity } from '../components/UI/Icons'

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    client.get<LeaderboardEntry[]>('/leaderboard/global')
      .then(r => setEntries(r.data))
      .finally(() => setLoading(false))
  }, [])

  const myEntry = entries.find(e => e.user_id === user?.id)

  const podium = entries.slice(0, 3)
  const rest = entries.slice(3)

  const rankColor = (rank: number) =>
    rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#f97316' : colors.textFaint

  return (
    <div style={{ minHeight: '100vh', background: gradients.page }}>
      <Navbar />

      {/* Hero header */}
      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroIcon}>
            <Trophy size={28} color={colors.yellow} />
          </div>
          <div>
            <h1 style={s.heroTitle}>National Leaderboard</h1>
            <p style={s.heroSub}>IPL 2026 — Top tactical minds across India</p>
          </div>
          <div style={s.heroStats}>
            <div style={s.heroStat}>
              <Users size={13} color={colors.textFaint} />
              <span style={s.heroStatVal}>{entries.length}</span>
              <span style={s.heroStatLabel}>Coaches</span>
            </div>
            <div style={s.heroStatDivider} />
            <div style={s.heroStat}>
              <Activity size={13} color={colors.textFaint} />
              <span style={s.heroStatVal}>{entries.reduce((a, e) => a + e.decisions_made, 0)}</span>
              <span style={s.heroStatLabel}>Decisions</span>
            </div>
          </div>
        </div>
      </div>

      <div style={s.content}>
        {/* My rank card */}
        {myEntry && (
          <div style={s.myRankCard}>
            <div style={s.myRankLeft}>
              <div style={s.myAvatar}>{myEntry.username[0].toUpperCase()}</div>
              <div>
                <div style={s.myRankLabel}>Your Rank</div>
                <div style={s.myRankName}>{myEntry.username}</div>
              </div>
            </div>
            <div style={s.myRankRight}>
              <div style={s.myRankNum}>#{myEntry.rank}</div>
              <div style={s.myRankScore}>
                <Lightning size={14} color={colors.orange} />
                <span style={s.myRankPts}>{Math.round(myEntry.score)}</span>
                <span style={s.myRankPtsLabel}>pts</span>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={s.loadingRow}>
            <Activity size={20} color={colors.orange} />
            <span style={{ color: colors.textMuted, fontSize: 14 }}>Loading rankings…</span>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {podium.length > 0 && (
              <div style={s.podiumRow}>
                {podium.map((entry, i) => {
                  const rank = i + 1
                  const rc = rankColor(rank)
                  const height = rank === 1 ? 110 : rank === 2 ? 85 : 70
                  return (
                    <div key={entry.user_id} style={{ ...s.podiumItem, order: rank === 2 ? 0 : rank === 1 ? 1 : 2 }}>
                      <div style={s.podiumAvatar}>
                        <div style={{ ...s.podiumAvatarInner, background: `linear-gradient(135deg, ${rc}cc, ${rc}88)` }}>
                          {entry.username[0].toUpperCase()}
                        </div>
                        <div style={{ ...s.podiumBadge, background: rc }}>
                          {rank === 1 ? <Star size={10} color="#000" /> : rank}
                        </div>
                      </div>
                      <div style={s.podiumName}>{entry.username}</div>
                      <div style={{ ...s.podiumScore, color: rc }}>{Math.round(entry.score)} pts</div>
                      <div style={{ ...s.podiumBase, height, background: `linear-gradient(180deg, ${rc}20 0%, transparent 100%)`, borderColor: `${rc}30` }}>
                        <span style={{ ...s.podiumRankLabel, color: rc }}>#{rank}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Table header */}
            <div style={s.tableWrap}>
              <div style={s.tableHead}>
                <span style={{ ...s.col, ...s.colRank }}>Rank</span>
                <span style={{ ...s.col, ...s.colName }}>Coach</span>
                <span style={{ ...s.col, ...s.colScore }}>Score</span>
                <span style={{ ...s.col, ...s.colDec }}>Decisions</span>
                <span style={{ ...s.col, ...s.colAvg }}>Avg/Dec</span>
              </div>

              {rest.map(entry => {
                const isSelf = entry.user_id === user?.id
                const avgPts = entry.decisions_made > 0 ? Math.round(entry.score / entry.decisions_made) : 0
                return (
                  <div
                    key={entry.user_id}
                    style={{ ...s.tableRow, ...(isSelf ? s.tableRowSelf : {}) }}
                  >
                    <span style={{ ...s.col, ...s.colRank, color: colors.textFaint, fontWeight: 700 }}>#{entry.rank}</span>
                    <span style={{ ...s.col, ...s.colName }}>
                      <div style={s.rowAvatar}>{entry.username[0].toUpperCase()}</div>
                      <span style={s.rowName}>{entry.username}</span>
                      {isSelf && <span style={s.youBadge}>You</span>}
                    </span>
                    <span style={{ ...s.col, ...s.colScore }}>
                      <Lightning size={11} color={colors.orange} />
                      <span style={s.scoreVal}>{Math.round(entry.score)}</span>
                    </span>
                    <span style={{ ...s.col, ...s.colDec, color: colors.textMuted }}>{entry.decisions_made}</span>
                    <span style={{ ...s.col, ...s.colAvg, color: avgPts >= 70 ? colors.green : avgPts >= 50 ? colors.yellow : colors.textMuted }}>{avgPts}</span>
                  </div>
                )
              })}

              {entries.length === 0 && (
                <div style={s.emptyRow}>
                  <Medal size={32} color={colors.textFaint} />
                  <p style={s.emptyText}>No coaches ranked yet. Start playing to claim the top spot!</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  hero: { background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  heroInner: { maxWidth: 900, margin: '0 auto', padding: '28px 24px', display: 'flex', alignItems: 'center', gap: 16 },
  heroIcon: { width: 52, height: 52, borderRadius: 14, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroTitle: { fontSize: 22, fontWeight: 900, color: colors.text, margin: 0 },
  heroSub: { fontSize: 13, color: colors.textFaint, marginTop: 4 },
  heroStats: { display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' },
  heroStat: { display: 'flex', alignItems: 'center', gap: 6 },
  heroStatVal: { fontSize: 18, fontWeight: 800, color: colors.text },
  heroStatLabel: { fontSize: 11, color: colors.textFaint },
  heroStatDivider: { width: 1, height: 24, background: 'rgba(255,255,255,0.08)' },

  content: { maxWidth: 900, margin: '0 auto', padding: '24px 24px' },

  myRankCard: { background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: radius.lg, padding: '16px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  myRankLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  myAvatar: { width: 44, height: 44, borderRadius: '50%', background: gradients.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: '#fff' },
  myRankLabel: { fontSize: 10, fontWeight: 700, color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  myRankName: { fontSize: 15, fontWeight: 700, color: colors.text },
  myRankRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  myRankNum: { fontSize: 28, fontWeight: 900, color: colors.orange },
  myRankScore: { display: 'flex', alignItems: 'center', gap: 5 },
  myRankPts: { fontSize: 16, fontWeight: 800, color: colors.text },
  myRankPtsLabel: { fontSize: 12, color: colors.textFaint },

  loadingRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 48 },

  podiumRow: { display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, marginBottom: 32, padding: '0 16px' },
  podiumItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 140px' },
  podiumAvatar: { position: 'relative', marginBottom: 4 },
  podiumAvatarInner: { width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff' },
  podiumBadge: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#000', border: '2px solid #07070f' },
  podiumName: { fontSize: 13, fontWeight: 700, color: colors.text, textAlign: 'center' },
  podiumScore: { fontSize: 13, fontWeight: 800 },
  podiumBase: { width: '100%', border: '1px solid', borderRadius: `${radius.sm}px ${radius.sm}px 0 0`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8 },
  podiumRankLabel: { fontSize: 20, fontWeight: 900 },

  tableWrap: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: radius.lg, overflow: 'hidden' },
  tableHead: { display: 'grid', gridTemplateColumns: '64px 1fr 110px 110px 90px', padding: '11px 20px', background: 'rgba(255,255,255,0.04)', fontSize: 10, color: colors.textFaint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  col: { display: 'flex', alignItems: 'center' },
  colRank: { justifyContent: 'center' },
  colName: { gap: 10 },
  colScore: { gap: 5 },
  colDec: { justifyContent: 'center' },
  colAvg: { justifyContent: 'center', fontSize: 13, fontWeight: 700 },

  tableRow: { display: 'grid', gridTemplateColumns: '64px 1fr 110px 110px 90px', padding: '13px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.15s' },
  tableRowSelf: { background: 'rgba(249,115,22,0.06)', borderLeft: `3px solid ${colors.orange}` },
  rowAvatar: { width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: colors.text, flexShrink: 0 },
  rowName: { fontSize: 14, fontWeight: 600, color: colors.text },
  youBadge: { fontSize: 9, fontWeight: 800, background: colors.orangeDim, border: `1px solid rgba(249,115,22,0.2)`, color: colors.orange, padding: '2px 7px', borderRadius: 20, letterSpacing: 0.5 },
  scoreVal: { fontSize: 14, fontWeight: 700, color: colors.orange },

  emptyRow: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 24px' },
  emptyText: { fontSize: 14, color: colors.textFaint, textAlign: 'center' },
}
