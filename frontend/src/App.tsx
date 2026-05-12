import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Home from './pages/Home'
import MatchRoom from './pages/MatchRoom'
import Leaderboard from './pages/Leaderboard'
import StrategyRoom from './pages/StrategyRoom'
import ChallengeRoom from './pages/ChallengeRoom'
import ReplayRoom from './pages/ReplayRoom'
import ReportCard from './pages/ReportCard'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/match/:id" element={<RequireAuth><MatchRoom /></RequireAuth>} />
        <Route path="/match/:id/strategy" element={<RequireAuth><StrategyRoom /></RequireAuth>} />
        <Route path="/match/:id/challenge" element={<RequireAuth><ChallengeRoom /></RequireAuth>} />
        <Route path="/match/:id/replay" element={<RequireAuth><ReplayRoom /></RequireAuth>} />
        <Route path="/match/:id/report" element={<RequireAuth><ReportCard /></RequireAuth>} />
        <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
