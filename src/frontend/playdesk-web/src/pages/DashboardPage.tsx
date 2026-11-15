import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Banknote, CircleCheck, Clock3, Gamepad2, TrendingUp, Zap, Swords, ShieldCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { actualTableStatus, dateTime, money, offsetDate, remaining, todayBaku, useNow } from '../lib/format'
import { EmptyState, ErrorBox, Loading, PageHeader, StatCard, StatusBadge } from '../components/UI'

export default function DashboardPage() {
  const now = useNow()
  const today = todayBaku()
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 60_000 })
  const tables = useQuery({ queryKey: ['tables'], queryFn: () => api.tables(), refetchInterval: 60_000 })
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.sessions() })
  const revenue = useQuery({ queryKey: ['revenue', offsetDate(today, -6), today], queryFn: () => api.revenue(offsetDate(today, -6), today) })
  const active = tables.data?.filter(t => actualTableStatus(t, now) === 'Occupied' || actualTableStatus(t, now) === 'Overdue') ?? []
  const overdueCount = tables.data?.filter(t => actualTableStatus(t, now) === 'Overdue').length ?? 0
  return <>
    <PageHeader eyebrow="OVERVIEW / COMMAND CENTER" title="Komanda mərkəzi"
      description="Oyun klubunun gücü və bütün əməliyyatlar — tək idarəetmə mərkəzində."
      action={<Link className="btn btn-primary" to="/tables"><Gamepad2 size={18}/> Arenaya keç <ArrowRight size={16}/></Link>}/>
    <section className="welcome-banner" aria-label="PlayDesk arena">
      <div className="hero-top"><span><Swords size={14}/> PLAYDESK / RAGNAROK EDITION</span><span className="hero-id">01 — COMMAND CENTER</span></div>
      <div className="hero-copy"><p className="hero-eyebrow"><Zap size={14}/> YOUR ARENA. YOUR CONTROL.</p>
        <h2>ARENAYA<br/><em>HÖKM ET.</em></h2>
        <p>Hər masa, hər sessiya, hər qərar — hamısı sənin nəzarətində.</p>
        <div className="hero-actions"><Link to="/tables" className="btn btn-primary"><Gamepad2 size={17}/> Masaları aç <ArrowRight size={16}/></Link>
          <span className="hero-secure"><ShieldCheck size={16}/> LIVE OPERATIONS</span></div>
      </div>
      <div className="hero-bottom"><span>THE COMMAND IS YOURS</span><span>BAKU / AZERBAIJAN</span></div>
    </section>
    {dashboard.isError && <ErrorBox error={dashboard.error}/>}
    <div className="stat-grid">
      <StatCard label="Bugünkü gəlir" value={money(dashboard.data?.todayRevenue ?? 0)} subtitle={`${dashboard.data?.todayPayments ?? 0} tamamlanmış ödəniş`} icon={<Banknote size={20}/>} tone="green"/>
      <StatCard label="Aktiv sessiyalar" value={active.length} subtitle="Hazırda işlək masalar" icon={<Activity size={20}/>} tone="blue"/>
      <StatCard label="Boş masalar" value={(tables.data ?? []).filter(t => actualTableStatus(t, now) === 'Available').length} subtitle={`${dashboard.data?.totalTables ?? 0} masadan`} icon={<CircleCheck size={20}/>} tone="violet"/>
      <StatCard label="Vaxtı bitənlər" value={overdueCount} subtitle="Ödəniş gözləyir" icon={<Clock3 size={20}/>} tone="orange"/>
    </div>
    <div className="dashboard-two-col">
      <section className="panel chart-panel"><div className="panel-head"><div><span className="panel-eyebrow">REVENUE INTELLIGENCE</span>
        <h3>Gəlir dinamikası</h3><p>Son 7 günün ödənişləri</p></div><div className="panel-icon"><TrendingUp size={19}/></div></div>
        <div className="chart-box">
          {revenue.isLoading ? <Loading/> : revenue.isError ? <ErrorBox error={revenue.error}/> :
            <ResponsiveContainer width="100%" height="100%"><BarChart data={revenue.data?.days ?? []} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#36323a" strokeDasharray="4 4" vertical={false}/>
              <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fill: '#8f8c94', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#8f8c94', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip cursor={{ fill: '#2f2022' }} formatter={(value) => money(Number(value ?? 0))} labelStyle={{ color: '#f2e6dd' }}
                contentStyle={{ background: '#1e1a22', border: '1px solid #5c4543', borderRadius: 12 }} />
              <Bar dataKey="totalRevenue" fill="#e6a861" radius={[6, 6, 0, 0]} maxBarSize={42} name="Gəlir"/>
            </BarChart></ResponsiveContainer>}
        </div>
      </section>
      <section className="panel live-panel"><div className="panel-head"><div><span className="panel-eyebrow">ARENA / LIVE FEED</span>
        <h3>Aktiv masalar</h3><p>Canlı sessiya məlumatları</p></div><span className="live-indicator"><span/> Live</span></div>
        <div className="live-list">{tables.isLoading ? <Loading/> : tables.isError ? <ErrorBox error={tables.error}/> : active.length === 0 ?
          <EmptyState title="Aktiv sessiya yoxdur" description="Sessiya açdıqda burada görünəcək."/> :
          active.slice(0, 5).map(table => <Link to="/tables" key={table.id} className="live-row">
            <div className="live-table-icon"><Gamepad2 size={18}/></div><div className="live-row-main">
              <strong>{table.name}</strong><span>{table.activeSession?.customerName}</span></div>
            <div className="live-row-end"><StatusBadge status={actualTableStatus(table, now)}/>
              <code>{table.activeSession && remaining(table.activeSession.plannedEndAtUtc, now)}</code></div></Link>)}
        </div><Link to="/tables" className="panel-link">Bütün masaları gör <ArrowRight size={15}/></Link>
      </section>
    </div>
    <section className="panel recent-panel"><div className="panel-head"><div><span className="panel-eyebrow">HISTORY / SESSION LOG</span><h3>Son sessiyalar</h3>
      <p>Klubun ən son oyun tarixçəsi</p></div><Link to="/sessions" className="subtle-link">Hamısı <ArrowRight size={16}/></Link></div>
      {sessions.isLoading ? <Loading/> : sessions.isError ? <ErrorBox error={sessions.error}/> : !sessions.data?.length ?
        <EmptyState title="Hələ sessiya yoxdur" description="İlk sessiya yaradıldıqdan sonra tarixçə burada görünəcək."/> :
        <div className="table-overflow"><table className="data-table"><thead><tr><th>Sessiya</th><th>Müştəri</th><th>Masa</th><th>Başlanğıc</th><th>Məbləğ</th><th>Status</th></tr></thead>
          <tbody>{sessions.data.slice(0, 6).map(s => <tr key={s.id}><td className="id-cell">#{s.id.slice(0,8)}</td>
            <td>{s.customerName}</td><td>{s.tableName}</td><td>{dateTime(s.startedAtUtc)}</td>
            <td className="amount-cell">{money(s.expectedAmount)}</td><td><StatusBadge status={s.closedAtUtc ? 'Completed' : new Date(s.plannedEndAtUtc).getTime() < now ? 'Overdue' : 'Active'}/></td>
          </tr>)}</tbody></table></div>}
    </section>
  </>
}
