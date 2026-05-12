import { colors, radius, shadow } from '../../styles/theme'

interface Props {
  children: React.ReactNode
  style?: React.CSSProperties
  glow?: boolean
  onClick?: () => void
  className?: string
}

export default function GlassCard({ children, style, glow, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        boxShadow: glow ? `${shadow.card}, ${shadow.glow}` : shadow.card,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
