import { useEffect, useRef } from 'react'
import { useMatchStore } from '../store/matchStore'
import type { WSMessage } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useMatchWebSocket(matchId: number | null) {
  const ws = useRef<WebSocket | null>(null)
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { setMatchState, setPendingDecision, applyBallDelivered } = useMatchStore()

  useEffect(() => {
    if (!matchId) return
    let destroyed = false

    function connect() {
      if (destroyed) return
      ws.current = new WebSocket(`${WS_URL}/matches/${matchId}/ws`)

      ws.current.onopen = () => {
        pingInterval.current = setInterval(() => ws.current?.send('ping'), 25000)
      }

      ws.current.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          handleMessage(msg)
        } catch {}
      }

      ws.current.onclose = () => {
        if (pingInterval.current) clearInterval(pingInterval.current)
        // Auto-reconnect after 3 s when the match is still active
        if (!destroyed) {
          reconnectTimeout.current = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      ws.current?.close()
      if (pingInterval.current) clearInterval(pingInterval.current)
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
    }
  }, [matchId])

  function handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case 'match_state':
        setMatchState(msg as any)
        break

      case 'decision_window_open':
        // Update full state AND open the decision window
        setMatchState(msg as any)
        setPendingDecision(
          msg.decision_window_type ?? msg.decision_window_type,
          msg.decision_window_seconds_left || 10,
        )
        break

      case 'ball_delivered':
        // Merge live score into matchState without a full state replace
        // This keeps the scoreboard accurate without blanking the screen
        applyBallDelivered(msg.ball, msg.match_score ?? {})
        break

      case 'match_completed':
        setMatchState({ ...(useMatchStore.getState().matchState as any), match: { ...useMatchStore.getState().matchState?.match, status: 'completed' } } as any)
        break
    }
  }
}
