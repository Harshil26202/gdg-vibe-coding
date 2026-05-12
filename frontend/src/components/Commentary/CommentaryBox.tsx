import { useEffect, useRef, useState } from 'react'
import { reportApi } from '../../api/report'
import { colors, radius } from '../../styles/theme'
import { Mic, Volume2, VolumeX, Play } from '../UI/Icons'

interface Props {
  matchId: number
  innings: number
  currentOver: number
  enabled: boolean
}

export default function CommentaryBox({ matchId, innings, currentOver, enabled }: Props) {
  const [text, setText] = useState<string>('')
  const [speaking, setSpeaking] = useState(false)
  const [muted, setMuted] = useState(false)
  const lastOver = useRef(-1)

  useEffect(() => {
    if (!enabled || currentOver <= 0 || currentOver === lastOver.current) return
    lastOver.current = currentOver

    reportApi.getCommentary(matchId, innings, currentOver - 1)
      .then(r => {
        setText(r.data.text)
        if (!muted) speakText(r.data.text)
      })
      .catch(() => {})
  }, [currentOver, enabled])

  function speakText(t: string) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(t)
    utterance.rate = 1.05
    utterance.pitch = 1.0
    utterance.volume = 0.9
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
                   || voices.find(v => v.lang.startsWith('en'))
    if (preferred) utterance.voice = preferred
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  function toggleMute() {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
    setMuted(m => !m)
  }

  if (!text) return null

  return (
    <div style={s.box}>
      <div style={s.header}>
        <div style={s.labelRow}>
          <div style={{ ...s.micIcon, background: speaking ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.12)' }}>
            <Mic size={12} color={speaking ? colors.red : colors.blue} />
          </div>
          <span style={s.label}>AI Commentator</span>
          {speaking && <span style={s.livePill}>LIVE</span>}
        </div>
        <button onClick={toggleMute} style={s.muteBtn} title={muted ? 'Unmute' : 'Mute'}>
          {muted
            ? <VolumeX size={15} color={colors.textFaint} />
            : <Volume2 size={15} color={colors.blue} />
          }
        </button>
      </div>
      <p style={s.text}>{text}</p>
      {!muted && (
        <button onClick={() => speakText(text)} style={s.replayBtn}>
          <Play size={10} color={colors.blue} />
          Replay
        </button>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  box: {
    background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.04))',
    border: '1px solid rgba(59,130,246,0.18)',
    borderRadius: radius.md, padding: '14px 16px',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  labelRow: { display: 'flex', alignItems: 'center', gap: 8 },
  micIcon: { width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: 800, color: colors.blue, textTransform: 'uppercase', letterSpacing: 0.8 },
  livePill: { fontSize: 9, fontWeight: 800, background: colors.red, color: '#fff', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 },
  muteBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 },
  text: { fontSize: 13, color: colors.text, lineHeight: 1.7, fontStyle: 'italic', margin: 0 },
  replayBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    marginTop: 10, background: 'none',
    border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 20,
    color: colors.blue, fontSize: 11, padding: '4px 12px', cursor: 'pointer',
  },
}
