import type { User, Customer, ClubTable, GameSession, Payment, PaymentMethod, DailyRevenue, RevenueReport, DashboardStats, ManagedUser, Role, AuditEntry } from '../types'

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message) }
}

let csrfToken: string | null = null
let csrfPromise: Promise<string> | null = null
export function clearCsrf() { csrfToken = null; csrfPromise = null }

async function getCsrf(): Promise<string> {
  if (csrfToken) return csrfToken
  if (!csrfPromise) {
    csrfPromise = fetch('/api/auth/csrf', { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new ApiError('CSRF token yüklənmədi.', r.status)
        const data = (await r.json()) as { token: string }
        csrfToken = data.token
        return data.token
      }).finally(() => { csrfPromise = null })
  }
  return csrfPromise
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-CSRF-TOKEN', await getCsrf())
  const response = await fetch(`/api${path}`, { ...options, method, credentials: 'include', headers })
  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    const error = contentType.includes('json') ? await response.json().catch(() => ({})) : {}
    const message = (error as { detail?: string; message?: string; title?: string }).detail
      ?? (error as { message?: string }).message
      ?? (error as { title?: string }).title
      ?? `HTTP ${response.status}`
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
const json = (data: unknown) => JSON.stringify(data)

export const api = {
  async me(): Promise<User | null> {
    try { return await request<User>('/auth/me') }
    catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error }
  },
  async login(email: string, password: string) {
    const user = await request<User>('/auth/login', { method: 'POST', body: json({ email, password }) })
    clearCsrf() // antiforgery token must be bound to the newly authenticated principal
    return user
  },
  async logout() {
    await request<void>('/auth/logout', { method: 'POST' })
    clearCsrf()
  },
  customers: (search = '') => request<Customer[]>(`/customers?search=${encodeURIComponent(search)}`),
  createCustomer: (name: string) => request<Customer>('/customers', { method: 'POST', body: json({ name }) }),
  tables: (isAvailable?: boolean) => request<ClubTable[]>(`/tables${isAvailable === undefined ? '' : `?isAvailable=${isAvailable}`}`),
  sessions: (activeOnly?: boolean) => request<GameSession[]>(`/sessions${activeOnly === undefined ? '' : `?activeOnly=${activeOnly}`}`),
  session: (id: string) => request<GameSession>(`/sessions/${id}`),
  createSession: (customerId: string, tableId: string, durationMinutes: number) =>
    request<GameSession>('/sessions', { method: 'POST', body: json({ customerId, tableId, durationMinutes }) }),
  pay: (id: string, method: PaymentMethod) =>
    request<Payment>(`/sessions/${id}/payment`, { method: 'POST', body: json({ method }) }),
  dailyRevenue: (date: string) => request<DailyRevenue>(`/reports/daily-revenue?date=${encodeURIComponent(date)}`),
  revenue: (from: string, to: string) => request<RevenueReport>(`/reports/revenue?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  dashboard: () => request<DashboardStats>('/reports/overview'),
  audit: () => request<AuditEntry[]>('/audit?take=20'),
  users: () => request<ManagedUser[]>('/users'),
  createUser: (email: string, password: string, role: Role) =>
    request<ManagedUser>('/users', { method: 'POST', body: json({ email, password, role }) }),
  setUserActive: (id: string, isActive: boolean) =>
    request<ManagedUser>(`/users/${id}/active`, { method: 'PATCH', body: json({ isActive }) }),
  changeRate: (id: string, hourlyRate: number) =>
    request<ClubTable>(`/tables/${id}/rate`, { method: 'PATCH', body: json({ hourlyRate }) }),
  changeAvailability: (id: string, isEnabled: boolean) =>
    request<ClubTable>(`/tables/${id}/availability`, { method: 'PATCH', body: json({ isEnabled }) }),
}
