export type Role = 'Admin' | 'Operator'
export interface User { id: string; email: string; role: Role }
export interface Customer { id: string; name: string; createdAtUtc: string }
export type TableStatus = 'Available' | 'Occupied' | 'Overdue' | 'Maintenance'
export type SessionStatus = 'Active' | 'Overdue' | 'Completed'
export type PaymentMethod = 'Cash' | 'Card'
export interface ActiveSession {
  id: string; customerName: string; startedAtUtc: string
  plannedEndAtUtc: string; durationMinutes: number; expectedAmount: number
}
export interface ClubTable {
  id: string; name: string; hourlyRate: number; isEnabled: boolean
  status: TableStatus; activeSession: ActiveSession | null
}
export interface Payment {
  id: string; gameSessionId: string; amount: number; method: PaymentMethod
  paidAtUtc: string; localPaymentDate: string
}
export interface GameSession {
  id: string; customerId: string; customerName: string
  tableId: string; tableName: string; startedAtUtc: string
  plannedEndAtUtc: string; durationMinutes: number
  hourlyRateSnapshot: number; expectedAmount: number
  closedAtUtc: string | null; status: SessionStatus
  isPaid: boolean; payment: Payment | null
}
export interface DailyRevenue { date: string; paymentCount: number; totalRevenue: number }
export interface RevenueReport {
  from: string; to: string; paymentCount: number
  totalRevenue: number; days: DailyRevenue[]
}
export interface DashboardStats {
  totalTables: number; availableTables: number; occupiedTables: number
  overdueTables: number; todayRevenue: number; todayPayments: number
  activeSessions: number
}

export interface ManagedUser { id: string; email: string; role: Role; isActive: boolean; createdAtUtc: string }

export interface AuditEntry {
  id: string; action: string; entityType: string; entityId: string
  occurredAtUtc: string; actorEmail: string | null; dataJson: string | null
}
