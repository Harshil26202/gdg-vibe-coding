import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { authApi } from '../api/auth'

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        const res = await authApi.login(email, password)
        localStorage.setItem('token', res.data.access_token)
        set({ user: res.data.user, token: res.data.access_token })
      },

      register: async (username, email, password) => {
        const res = await authApi.register(username, email, password)
        localStorage.setItem('token', res.data.access_token)
        set({ user: res.data.user, token: res.data.access_token })
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null })
      },

      refreshMe: async () => {
        try {
          const res = await authApi.me()
          set({ user: res.data })
        } catch {
          get().logout()
        }
      },
    }),
    { name: 'ipl-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)
