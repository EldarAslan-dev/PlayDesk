import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Banknote, CircleCheck, Clock3, Gamepad2, Grid2X2, Plus, Wrench } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ClubTable } from '../types'
import { api } from '../lib/api'
import { actualTableStatus, money, remaining, useNow } from '../lib/format'
import { EmptyState, ErrorBox, Loading, PageHeader, StatusBadge } from '../components/UI'
import { NewSessionModal, PaymentModal } from '../components/Modals'

type Filter = 'All' | 'Available' | 'Occupied' | 'Overdue' | 'Maintenance'
const filters: { key: Filter; text: string }[] = [
  { key: 'All', text: 'Hamısı' }, { key: 'Available', text: 'Boş' },
  { key: 'Occupied', text: 'Məşğul' }, { key: 'Overdue', text: 'Vaxtı bitən' },
  { key: 'Maintenance', text: 'Texniki xidmət' },
]
export default function TablesPage() {
  const [filter, setFilter] = useState<Filter>('All')
  const [newSession, setNewSession] = useState<ClubTable | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const now = useNow()
  const reduceMotion = useReducedMotion()
  const tables = useQuery({ queryKey: ['tables'], queryFn: () => api.tables(), refetchInterval: 60_000 })
  const list = (tables.data ?? []).filter(t => filter === 'All' || actualTableStatus(t, now) === filter)
  return <>
    <PageHeader eyebrow="OPERATIONS / TABLES" title="Masa idarəetməsi"
      description="Masa statuslarını izləyin, yeni sessiya açın və ödənişləri təsdiqləyin."
      action={<div className="live-indicator larger"><span/> Real-time bağlantı</div>}/>
    <div className="table-stats">
      <div><Grid2X2 size={19}/><span>Ümumi</span><strong>{tables.data?.length ?? 0}</strong></div>
      <div><CircleCheck size={19}/><span>Boş</span><strong>{tables.data?.filter(t => actualTableStatus(t, now) === 'Available').length ?? 0}</strong></div>
      <div><Clock3 size={19}/><span>Məşğul</span><strong>{tables.data?.filter(t => actualTableStatus(t, now) === 'Occupied').length ?? 0}</strong></div>
      <div><Wrench size={19}/><span>Xidmətdə</span><strong>{tables.data?.filter(t => actualTableStatus(t, now) === 'Maintenance').length ?? 0}</strong></div>
    </div>
    <div className="filter-toolbar"><div className="filter-tabs" role="group" aria-label="Masa filtri">
      {filters.map(f => <button key={f.key} className={filter === f.key ? 'filter-tab filter-active' : 'filter-tab'}
        onClick={() => setFilter(f.key)}>{f.text}</button>)}
    </div><span className="muted-note">{list.length} masa göstərilir</span></div>
    {tables.isLoading ? <Loading/> : tables.isError ? <ErrorBox error={tables.error}/> :
      list.length === 0 ? <EmptyState title="Masa tapılmadı" description="Bu filtr üzrə masa mövcud deyil."/> :
      <div className="tables-grid">{list.map((table, index) => {
        const status = actualTableStatus(table, now)
        const session = table.activeSession
        return <motion.article key={table.id} className={`table-card table-${status.toLowerCase()}`}
          initial={reduceMotion ? false : { opacity: 0, y: 18, scale: .98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={reduceMotion ? undefined : { y: -5, scale: 1.008 }}
          transition={{ duration: reduceMotion ? 0 : .3, delay: reduceMotion ? 0 : Math.min(index * .05, .25) }}>
          <div className="table-card-top"><div className="table-card-number"><Gamepad2 size={22}/></div><StatusBadge status={status}/></div>
          <h3>{table.name}</h3><p className="table-rate">{money(table.hourlyRate)} <span>/ saat</span></p>
          {session ? <div className="table-session-data"><div><span>Müştəri</span><strong>{session.customerName}</strong></div>
            <div><span>{status === 'Overdue' ? 'Gecikmə' : 'Qalan vaxt'}</span><strong className={status === 'Overdue' ? 'timer-overdue' : 'timer'}>
              {remaining(session.plannedEndAtUtc, now)}</strong></div>
            <div><span>Ödəniş</span><strong>{money(session.expectedAmount)}</strong></div></div> :
            <div className="table-available-message"><CircleCheck size={17}/>{status === 'Maintenance' ? 'İstifadəyə bağlıdır' : 'Yeni oyun üçün hazırdır'}</div>}
          {status === 'Available' ? <button className="btn btn-primary btn-full" onClick={() => setNewSession(table)}><Plus size={17}/> Yeni sessiya</button> :
            status === 'Maintenance' ? <button className="btn btn-quiet btn-full" disabled><Wrench size={17}/> Texniki xidmət</button> :
            <button className="btn btn-secondary btn-full" onClick={() => setPaymentId(session?.id ?? null)}><Banknote size={18}/> Ödənişi al</button>}
        </motion.article>
      })}</div>}
    <AnimatePresence>
      {newSession && <NewSessionModal key={newSession.id} table={newSession} onClose={() => setNewSession(null)}/>}
      {paymentId && <PaymentModal key={paymentId} sessionId={paymentId} onClose={() => setPaymentId(null)}/>}
    </AnimatePresence>
  </>
}
