import { useState } from 'react'
import type { FieldPosition } from '../../types'

const DEFAULT_POSITIONS: FieldPosition[] = [
  { name: 'slip', label: 'Slip', x: 62, y: 36, active: true },
  { name: 'gully', label: 'Gully', x: 68, y: 42, active: true },
  { name: 'cover_point', label: 'Cover Pt', x: 72, y: 55, active: true },
  { name: 'mid_off', label: 'Mid Off', x: 58, y: 72, active: true },
  { name: 'mid_on', label: 'Mid On', x: 42, y: 72, active: true },
  { name: 'square_leg', label: 'Sq. Leg', x: 30, y: 55, active: true },
  { name: 'fine_leg', label: 'Fine Leg', x: 36, y: 36, active: true },
  { name: 'third_man', label: 'Third Man', x: 64, y: 28, active: true },
  { name: 'deep_midwicket', label: 'Deep MW', x: 22, y: 62, active: false },
]

interface Props {
  onSubmit: (positions: FieldPosition[]) => void
  disabled?: boolean
}

export default function FieldDiagram({ onSubmit, disabled = false }: Props) {
  const [positions, setPositions] = useState<FieldPosition[]>(DEFAULT_POSITIONS)
  const [dragging, setDragging] = useState<string | null>(null)
  const [svgRef, setSvgRef] = useState<SVGSVGElement | null>(null)

  function togglePosition(name: string) {
    if (disabled) return
    setPositions(prev => prev.map(p => p.name === name ? { ...p, active: !p.active } : p))
  }

  function onMouseDown(name: string) {
    if (!disabled) setDragging(name)
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragging || !svgRef || disabled) return
    const rect = svgRef.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPositions(prev => prev.map(p => p.name === dragging ? { ...p, x: Math.min(95, Math.max(5, x)), y: Math.min(95, Math.max(5, y)) } : p))
  }

  function onMouseUp() {
    setDragging(null)
  }

  const activeCount = positions.filter(p => p.active).length

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Field Placement</span>
        <span style={styles.hint}>Click to toggle · Drag to move · {activeCount}/9 active</span>
      </div>

      <svg
        ref={setSvgRef}
        viewBox="0 0 100 100"
        style={{ ...styles.svg, cursor: dragging ? 'grabbing' : 'default' }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Oval boundary */}
        <ellipse cx="50" cy="50" rx="46" ry="46" fill="#1a3d1a" stroke="#2d5a2d" strokeWidth="0.5" />
        {/* 30-yard circle */}
        <ellipse cx="50" cy="50" rx="27" ry="27" fill="none" stroke="#2d5a2d" strokeWidth="0.4" strokeDasharray="2,2" />
        {/* Pitch */}
        <rect x="47" y="35" width="6" height="30" fill="#4a3520" stroke="#5a4530" strokeWidth="0.3" rx="0.5" />
        {/* Crease lines */}
        <line x1="45" y1="40" x2="55" y2="40" stroke="#c8b896" strokeWidth="0.4" />
        <line x1="45" y1="60" x2="55" y2="60" stroke="#c8b896" strokeWidth="0.4" />
        {/* Stumps batting end */}
        <line x1="49" y1="60" x2="49" y2="63" stroke="#e2e8f0" strokeWidth="0.5" />
        <line x1="50" y1="60" x2="50" y2="63" stroke="#e2e8f0" strokeWidth="0.5" />
        <line x1="51" y1="60" x2="51" y2="63" stroke="#e2e8f0" strokeWidth="0.5" />
        {/* Stumps bowling end */}
        <line x1="49" y1="40" x2="49" y2="37" stroke="#e2e8f0" strokeWidth="0.5" />
        <line x1="50" y1="40" x2="50" y2="37" stroke="#e2e8f0" strokeWidth="0.5" />
        <line x1="51" y1="40" x2="51" y2="37" stroke="#e2e8f0" strokeWidth="0.5" />
        {/* Batsman */}
        <circle cx="50" cy="58" r="1.5" fill="#f97316" />
        {/* Keeper */}
        <circle cx="50" cy="44" r="1.2" fill="#f59e0b" />

        {/* Fielders */}
        {positions.map(pos => (
          <g key={pos.name} onMouseDown={() => onMouseDown(pos.name)} onClick={() => togglePosition(pos.name)} style={{ cursor: disabled ? 'default' : 'grab' }}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="3.2"
              fill={pos.active ? '#3b82f6' : '#1e1e2e'}
              stroke={pos.active ? '#60a5fa' : '#3f3f5a'}
              strokeWidth="0.5"
              opacity={pos.active ? 1 : 0.5}
            />
            <text
              x={pos.x}
              y={pos.y + 6}
              textAnchor="middle"
              fontSize="2.8"
              fill={pos.active ? '#93c5fd' : '#64748b'}
            >
              {pos.label}
            </text>
          </g>
        ))}
      </svg>

      <button
        style={{ ...styles.submitBtn, ...(disabled ? styles.submitDisabled : {}) }}
        onClick={() => !disabled && onSubmit(positions)}
        disabled={disabled}
      >
        Submit Field Placement
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 12, padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontWeight: 700, color: '#e2e8f0', fontSize: 15 },
  hint: { fontSize: 12, color: '#64748b' },
  svg: { width: '100%', aspectRatio: '1 / 1', borderRadius: 8, userSelect: 'none' },
  submitBtn: { width: '100%', marginTop: 12, padding: '12px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  submitDisabled: { background: '#1e1e2e', color: '#64748b', cursor: 'not-allowed' },
}
