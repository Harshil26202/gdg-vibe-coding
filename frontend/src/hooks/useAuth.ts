import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { user, token, login, register, logout, refreshMe } = useAuthStore()
  return { user, token, isAuthenticated: !!token, login, register, logout, refreshMe }
}
