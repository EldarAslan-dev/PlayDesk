import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, CalendarDays, Coins, CreditCard, TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { money, offsetDate, todayBaku } from '../lib/format'
import { EmptyState, ErrorBox, Loading, PageHeader, StatCard } from '../components/UI'

export default function ReportsPage() {
  const today = todayBaku()
  const [from, setFrom] = useState(offsetDate(today, -6))
  const [to, setTo] = useState(today)
  const report = useQuery({ queryKey: ['revenue', from, to], queryFn: () => api.revenue(from, to), retry: false })
  const average = (report.data?.days.length ?? 0) > 0 ? (report.data?.totalRevenue ?? 0) / (report.data?.days.length ?? 1) : 0
  return <>
    <PageHeader eyebrow="INSIGHTS / ANALYTICS" title="Gəlir hesabatları"
      description="Ödəniş tarixlərinə əsaslanan analitika. Saat qurşağı: Bakı, UTC+4."/>
    <div className="report-controls panel"><div className="report-date-fields"><div><label className="field-label" htmlFor="dateFrom">Başlanğıc</label><input id="dateFrom" className="field" type="date" value={from} onChange={e => setFrom(e.target.value)}/></div>
      <div><label className="field-label" htmlFor="dateTo">Bitiş</label><input id="dateTo" className="field" type="date" value={to} onChange={e => setTo(e.target.value)}/></div></div>
      <div className="report-presets"><CalendarDays size={17}/><button className="btn btn-secondary btn-sm" onClick={() => { setFrom(today); setTo(today) }}>Bu gün</button>
        <button className="btn btn-secondary btn-sm" onClick={() => { setFrom(offsetDate(today,-6)); setTo(today) }}>7 gün</button>
        <button className="btn btn-secondary btn-sm" onClick={() => { setFrom(offsetDate(today,-29)); setTo(today) }}>30 gün</button></div></div>
    <div className="stat-grid reports-stat-grid">
      <StatCard label="Ümumi gəlir" value={money(report.data?.totalRevenue ?? 0)} subtitle="Seçilmiş dövr" icon={<Coins size={20}/>} tone="green"/>
      <StatCard label="Ödəniş sayı" value={report.data?.paymentCount ?? 0} subtitle="Tamamlanmış əməliyyatlar" icon={<CreditCard size={20}/>} tone="blue"/>
      <StatCard label="Günlük orta" value={money(average)} subtitle="Seçilmiş tarix aralığı" icon={<TrendingUp size={20}/>} tone="violet"/>
      <StatCard label="Hesabat günləri" value={report.data?.days.length ?? 0} subtitle="Təqvim günü" icon={<Activity size={20}/>} tone="orange"/>
    </div>
    {report.isError && <ErrorBox error={report.error}/>}
    <section className="panel chart-panel report-chart"><div className="panel-head"><div><span className="panel-eyebrow">REVENUE BREAKDOWN</span><h3>Gəlir qrafiki</h3>
      <p>Ödənişin alındığı günə əsasən</p></div></div>
      {report.isLoading ? <Loading/> : !report.data?.days.length ? <EmptyState title="Məlumat yoxdur" description="Tarix aralığını yoxlayın."/> :
        <div className="chart-box large"><ResponsiveContainer width="100%" height="100%"><AreaChart data={report.data.days} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#61d9ed" stopOpacity={0.25}/>
            <stop offset="100%" stopColor="#61d9ed" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid stroke="#26314a" strokeDasharray="4 4" vertical={false}/>
          <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fill: '#8491ac', fontSize: 11 }} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fill: '#8491ac', fontSize: 11 }} axisLine={false} tickLine={false}/>
          <Tooltip formatter={value => money(Number(value ?? 0))} contentStyle={{ background: '#151e31', border: '1px solid #2c3a53', borderRadius: 12 }}/>
          <Area type="monotone" dataKey="totalRevenue" name="Gəlir" stroke="#61d9ed" strokeWidth={2.5} fill="url(#areaGradient)"/>
        </AreaChart></ResponsiveContainer></div>}
    </section>
    <section className="panel recent-panel"><div className="panel-head"><div><span className="panel-eyebrow">DAILY REPORT</span><h3>Günlük göstəricilər</h3></div></div>
      {!report.data?.days.length ? <EmptyState title="Hesabat yoxdur" description="Məlumatlar tarix seçildikdən sonra görünəcək."/> :
      <div className="table-overflow"><table className="data-table"><thead><tr><th>Tarix</th><th>Ödəniş sayı</th><th>Gəlir</th></tr></thead>
      <tbody>{report.data.days.map(day => <tr key={day.date}><td className="strong-cell">{day.date}</td>
        <td>{day.paymentCount}</td><td className="amount-cell">{money(day.totalRevenue)}</td></tr>)}</tbody></table></div>}
    </section>
  </>
}
