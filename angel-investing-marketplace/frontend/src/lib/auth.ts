import { createAuthClient } from 'better-auth/client'
import { getRuntimeConfig } from '@/config/runtime'

const config = getRuntimeConfig()

export const authClient = createAuthClient({
  baseURL: config.betterAuthUrl,
  fetchOptions: {
    onRequest: (context) => {
      // Add any request interceptors here
      return context
    },
    onResponse: (context) => {
      // Add any response interceptors here
      return context
    },
  },
})

// Auth helper functions
export const authHelpers = {
  signIn: async (email: string, password: string) => {
    return await authClient.signIn.email({
      email,
      password,
    })
  },

  signUp: async (email: string, password: string, name: string, role: 'investor' | 'founder') => {
    return await authClient.signUp.email({
      email,
      password,
      name,
      role,
    })
  },

  signOut: async () => {
    return await authClient.signOut()
  },

  getSession: async () => {
    return await authClient.getSession()
  },

  forgotPassword: async (email: string) => {
    return await authClient.forgetPassword({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
  },

  resetPassword: async (token: string, password: string) => {
    return await authClient.resetPassword({
      token,
      password,
    })
  },

  // Social sign-in (if configured)
  signInWithGoogle: async () => {
    return await authClient.signIn.social({
      provider: 'google',
    })
  },

  signInWithGitHub: async () => {
    return await authClient.signIn.social({
      provider: 'github',
    })
  },
}