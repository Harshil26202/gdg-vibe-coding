import { useEffect, useRef } from 'react'
import { useMatchStore } from '../store/matchStore'
import type { WSMessage } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useMatchWebSocket(matchId: number | null) {
  const ws = useRef<WebSocket | null>(null)
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const { setMatchState, setLastBall, setPendingDecision } = useMatchStore()

  useEffect(() => {
    if (!matchId) return

    ws.current = new WebSocket(`${WS_URL}/matches/${matchId}/ws`)

    ws.current.onopen = () => {
      pingInterval.current = setInterval(() => {
        ws.current?.send('ping')
      }, 25000)
    }

    ws.current.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        handleMessage(msg)
      } catch {}
    }

    ws.current.onclose = () => {
      if (pingInterval.current) clearInterval(pingInterval.current)
    }

    return () => {
      ws.current?.close()
      if (pingInterval.current) clearInterval(pingInterval.current)
    }
  }, [matchId])

  function handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case 'match_state':
        setMatchState(msg as any)
        break
      case 'decision_window_open':
        setMatchState(msg as any)
        setPendingDecision(msg.decision_window_type, msg.decision_window_seconds_left || 10)
        break
      case 'ball_delivered':
        setLastBall(msg.ball)
        setPendingDecision(null, 0)
        break
    }
  }
}
