import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'motion/react'
import { Banknote, ChevronRight, Clock3, Search } from 'lucide-react'
import { api } from '../lib/api'
import { dateTime, money, remaining, sessionStatus, useNow, shortId } from '../lib/format'
import { EmptyState, ErrorBox, Loading, PageHeader, StatusBadge } from '../components/UI'
import { PaymentModal } from '../components/Modals'

export default function SessionsPage() {
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed'>('All')
  const [search, setSearch] = useState('')
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const now = useNow()
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.sessions(), refetchInterval: 60_000 })
  const filtered = (sessions.data ?? []).filter(s =>
    (filter === 'All' || (filter === 'Completed' ? s.closedAtUtc !== null : s.closedAtUtc === null)) &&
    (!search || `${s.customerName} ${s.tableName} ${s.id}`.toLowerCase().includes(search.toLowerCase())))
  return <>
    <PageHeader eyebrow="OPERATIONS / SESSIONS" title="Oyun sessiyaları"
      description="Aktiv oyunları, tamamlanmış sessiyaları və ödəniş vəziyyətlərini izləyin."/>
    <div className="panel"><div className="filter-toolbar inside-panel"><div className="filter-tabs">
      {([{ key: 'All', text: 'Bütün sessiyalar' }, { key: 'Active', text: 'Aktiv' }, { key: 'Completed', text: 'Tamamlanmış' }] as const)
        .map(f => <button key={f.key} onClick={() => setFilter(f.key)} className={`filter-tab ${filter === f.key ? 'filter-active' : ''}`}>{f.text}</button>)}
    </div><div className="search-box"><Search size={17}/><input aria-label="Sessiya axtar" placeholder="Müştəri və ya masa axtar..." value={search}
      onChange={e => setSearch(e.target.value)}/></div></div>
    {sessions.isLoading ? <Loading/> : sessions.isError ? <ErrorBox error={sessions.error}/> : filtered.length === 0 ?
      <EmptyState title="Sessiya tapılmadı" description="Axtarışa uyğun məlumat yoxdur." icon={<Clock3 size={24}/>}/> :
      <div className="table-overflow"><table className="data-table"><thead><tr><th>Sessiya ID</th><th>Müştəri</th><th>Masa</th><th>Başlanğıc</th><th>Vaxt / müddət</th><th>Məbləğ</th><th>Status</th><th/></tr></thead>
        <tbody>{filtered.map(s => <tr key={s.id}><td className="id-cell">#{shortId(s.id)}</td><td className="strong-cell">{s.customerName}</td>
          <td>{s.tableName}</td><td>{dateTime(s.startedAtUtc)}</td>
          <td className="timer-cell">{s.closedAtUtc ? `${s.durationMinutes} dəq.` : remaining(s.plannedEndAtUtc, now)}</td>
          <td className="amount-cell">{money(s.expectedAmount)}</td><td><StatusBadge status={sessionStatus(s, now)}/></td>
          <td>{!s.closedAtUtc && <button className="table-action" onClick={() => setPaymentId(s.id)}>Ödəniş <ChevronRight size={15}/></button>}
            {s.closedAtUtc && <span className="muted-note"><Banknote size={14}/> Ödənilib</span>}</td>
        </tr>)}</tbody></table></div>}
    </div>
    <AnimatePresence>
      {paymentId && <PaymentModal key={paymentId} sessionId={paymentId} onClose={() => setPaymentId(null)}/>}
    </AnimatePresence>
  </>
}
