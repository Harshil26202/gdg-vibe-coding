/** Inline SVG icon set — no emoji, no external deps. */
import React from 'react'

type IconProps = { size?: number; color?: string; style?: React.CSSProperties }

const mk = (path: React.ReactNode, vb = '0 0 24 24') =>
  ({ size = 20, color = 'currentColor', style }: IconProps) => (
    <svg
      width={size} height={size} viewBox={vb} fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      style={style}
    >{path}</svg>
  )

export const CricketBat = mk(<>
  <path d="M3 21L12 12M15 3l6 6-9 9-6-6z" />
  <path d="M17 5l2 2" />
</>)

export const Trophy = mk(<>
  <path d="M6 9H4a2 2 0 0 1 0-4h2" />
  <path d="M18 9h2a2 2 0 0 0 0-4h-2" />
  <path d="M6 9v3a6 6 0 0 0 12 0V9" />
  <path d="M12 18v3" />
  <path d="M8 21h8" />
</>)

export const Lightning = mk(<>
  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
</>)

export const Brain = mk(<>
  <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
  <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
  <path d="M12 5v13" />
</>)

export const Mic = mk(<>
  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
  <line x1="12" y1="19" x2="12" y2="23" />
  <line x1="8" y1="23" x2="16" y2="23" />
</>)

export const Rewind = mk(<>
  <polygon points="11 19 2 12 11 5 11 19" />
  <polygon points="22 19 13 12 22 5 22 19" />
</>)

export const BarChart = mk(<>
  <line x1="18" y1="20" x2="18" y2="10" />
  <line x1="12" y1="20" x2="12" y2="4" />
  <line x1="6" y1="20" x2="6" y2="14" />
  <line x1="2" y1="20" x2="22" y2="20" />
</>)

export const Swords = mk(<>
  <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
  <line x1="13" y1="19" x2="19" y2="13" />
  <line x1="16" y1="16" x2="20" y2="20" />
  <line x1="19" y1="21" x2="21" y2="19" />
  <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
  <line x1="5" y1="14" x2="9" y2="18" />
  <line x1="7" y1="21" x2="9" y2="19" />
</>)

export const Target = mk(<>
  <circle cx="12" cy="12" r="10" />
  <circle cx="12" cy="12" r="6" />
  <circle cx="12" cy="12" r="2" />
</>)

export const Star = mk(<>
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
</>)

export const Users = mk(<>
  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
  <circle cx="9" cy="7" r="4" />
  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
</>)

export const Medal = mk(<>
  <circle cx="12" cy="8" r="6" />
  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
</>)

export const Shield = mk(<>
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
</>)

export const TrendUp = mk(<>
  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
  <polyline points="17 6 23 6 23 12" />
</>)

export const Home = mk(<>
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  <polyline points="9 22 9 12 15 12 15 22" />
</>)

export const ChevronRight = mk(<>
  <polyline points="9 18 15 12 9 6" />
</>)

export const ChevronLeft = mk(<>
  <polyline points="15 18 9 12 15 6" />
</>)

export const Play = mk(<>
  <polygon points="5 3 19 12 5 21 5 3" />
</>)

export const Calendar = mk(<>
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
  <line x1="16" y1="2" x2="16" y2="6" />
  <line x1="8" y1="2" x2="8" y2="6" />
  <line x1="3" y1="10" x2="21" y2="10" />
</>)

export const Bell = mk(<>
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
</>)

export const LogOut = mk(<>
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
  <polyline points="16 17 21 12 16 7" />
  <line x1="21" y1="12" x2="9" y2="12" />
</>)

export const User = mk(<>
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
  <circle cx="12" cy="7" r="4" />
</>)

export const Volume2 = mk(<>
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
</>)

export const VolumeX = mk(<>
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
  <line x1="23" y1="9" x2="17" y2="15" />
  <line x1="17" y1="9" x2="23" y2="15" />
</>)

export const Download = mk(<>
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
  <polyline points="7 10 12 15 17 10" />
  <line x1="12" y1="15" x2="12" y2="3" />
</>)

export const Share2 = mk(<>
  <circle cx="18" cy="5" r="3" />
  <circle cx="6" cy="12" r="3" />
  <circle cx="18" cy="19" r="3" />
  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
</>)

export const Zap = mk(<>
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
</>)

export const Info = mk(<>
  <circle cx="12" cy="12" r="10" />
  <line x1="12" y1="16" x2="12" y2="12" />
  <line x1="12" y1="8" x2="12.01" y2="8" />
</>)

export const Check = mk(<>
  <polyline points="20 6 9 17 4 12" />
</>)

export const X = mk(<>
  <line x1="18" y1="6" x2="6" y2="18" />
  <line x1="6" y1="6" x2="18" y2="18" />
</>)

export const Lock = mk(<>
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
</>)

export const Sparkles = mk(<>
  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
  <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z" />
  <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z" />
</>)

export const Activity = mk(<>
  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
</>)

export const Eye = mk(<>
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
  <circle cx="12" cy="12" r="3" />
</>)
