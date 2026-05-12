import { client } from './client'
import type { User } from '../types'

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export const authApi = {
  register: (username: string, email: string, password: string) =>
    client.post<TokenResponse>('/auth/register', { username, email, password }),

  login: (email: string, password: string) =>
    client.post<TokenResponse>('/auth/login', { email, password }),

  me: () => client.get<User>('/auth/me'),
}
