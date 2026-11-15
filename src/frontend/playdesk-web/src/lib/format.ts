import { useEffect, useState } from 'react'
import type { ClubTable, GameSession, TableStatus } from '../types'

const az = new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const money = (value: number) => `${az.format(value)} ₼`
export const dateTime = (iso: string) => new Intl.DateTimeFormat('az-AZ', {
  timeZone: 'Asia/Baku', day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}).format(new Date(iso))

export function todayBaku() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Baku', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function offsetDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(timer)
  }, [interval])
  return now
}

export function remaining(end: string, now: number) {
  const diff = new Date(end).getTime() - now
  const total = Math.floor(Math.abs(diff) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor(total % 3600 / 60)
  const s = total % 60
  return `${diff < 0 ? '+' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function actualTableStatus(table: ClubTable, now: number): TableStatus {
  if (!table.activeSession) return table.isEnabled ? 'Available' : 'Maintenance'
  return new Date(table.activeSession.plannedEndAtUtc).getTime() <= now ? 'Overdue' : 'Occupied'
}
export function sessionStatus(session: GameSession, now: number) {
  if (session.closedAtUtc) return 'Completed' as const
  return new Date(session.plannedEndAtUtc).getTime() <= now ? 'Overdue' as const : 'Active' as const
}
export const shortId = (id: string) => id.slice(0, 8).toUpperCase()
