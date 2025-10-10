import { QueryClient } from '@tanstack/react-query'
import { getRuntimeConfig } from '@/config/runtime'

interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

interface ApiError {
  message: string
  status: number
  code?: string
}

class ApiClient {
  private baseURL: string
  private queryClient: QueryClient

  constructor(queryClient: QueryClient) {
    const config = getRuntimeConfig()
    this.baseURL = config.apiUrl
    this.queryClient = queryClient
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    // Get auth token from localStorage or auth store
    const token = localStorage.getItem('auth_token')

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw {
          message: data.message || `HTTP error! status: ${response.status}`,
          status: response.status,
          code: data.code,
        } as ApiError
      }

      return data
    } catch (error: any) {
      if (error.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem('auth_token')
        window.location.href = '/auth/login'
      }

      throw error
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const searchParams = params ? new URLSearchParams(params).toString() : ''
    const url = searchParams ? `${endpoint}?${searchParams}` : endpoint
    return this.request<T>(url)
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  // File upload helper
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const token = localStorage.getItem('auth_token')

    const formData = new FormData()
    formData.append('file', file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value as string)
      })
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw {
        message: data.message || `HTTP error! status: ${response.status}`,
        status: response.status,
        code: data.code,
      } as ApiError
    }

    return data
  }
}

export const apiClient = new ApiClient(queryClient)