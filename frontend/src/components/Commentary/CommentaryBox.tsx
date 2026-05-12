import { useEffect, useRef, useState } from 'react'
import { reportApi } from '../../api/report'
import { colors, radius } from '../../styles/theme'

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

    // Fetch AI commentary for the over that just ended
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
    // Prefer an English voice
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
          <span style={s.mic}>{speaking ? '🎙️' : '📻'}</span>
          <span style={s.label}>AI Commentator</span>
          {speaking && <span style={s.live}>LIVE</span>}
        </div>
        <button onClick={toggleMute} style={s.muteBtn} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      <p style={s.text}>{text}</p>
      {!muted && (
        <button onClick={() => speakText(text)} style={s.replayBtn}>▶ Replay</button>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  box: { background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: radius.md, padding: '14px 16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  labelRow: { display: 'flex', alignItems: 'center', gap: 8 },
  mic: { fontSize: 16 },
  label: { fontSize: 12, fontWeight: 700, color: colors.blue, textTransform: 'uppercase', letterSpacing: 0.8 },
  live: { fontSize: 9, fontWeight: 800, background: colors.red, color: '#fff', padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5, animation: 'pulse 1s infinite' },
  muteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.7 },
  text: { fontSize: 14, color: colors.text, lineHeight: 1.65, fontStyle: 'italic' },
  replayBtn: { marginTop: 8, background: 'none', border: `1px solid rgba(59,130,246,0.25)`, borderRadius: 20, color: colors.blue, fontSize: 11, padding: '4px 12px', cursor: 'pointer' },
}
