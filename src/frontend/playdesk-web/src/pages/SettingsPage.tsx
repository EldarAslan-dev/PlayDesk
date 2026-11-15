import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'motion/react'
import { Gamepad2, Save, Settings2, ShieldCheck, Wrench, Users, UserPlus, UserRoundCheck, ScrollText } from 'lucide-react'
import { api } from '../lib/api'
import { money } from '../lib/format'
import type { Role } from '../types'
import { EmptyState, ErrorBox, Loading, Modal, PageHeader, StatusBadge } from '../components/UI'

function EditableTable({ id, name, rate, enabled, status }: {
  id: string; name: string; rate: number; enabled: boolean; status: 'Available' | 'Occupied' | 'Overdue' | 'Maintenance'
}) {
  const [hourlyRate, setHourlyRate] = useState(rate.toFixed(2))
  const queryClient = useQueryClient()
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['tables'] }); await queryClient.invalidateQueries({ queryKey: ['dashboard'] }) }
  const save = useMutation({ mutationFn: () => api.changeRate(id, Number(hourlyRate)), onSuccess: refresh })
  const toggle = useMutation({ mutationFn: () => api.changeAvailability(id, !enabled), onSuccess: refresh })
  return <div className="settings-table-row"><div className="settings-table-info"><div className="settings-table-icon"><Gamepad2 size={21}/></div>
    <div><strong>{name}</strong><p>{money(rate)} / saat <span>·</span> <StatusBadge status={status}/></p></div></div>
    <div className="settings-table-actions"><div className="inline-rate"><input className="field" type="number" aria-label={`${name} tarifi`}
      min="0.01" max="10000" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)}/><span>₼ / saat</span></div>
      <button className="btn btn-secondary btn-sm" onClick={() => save.mutate()} disabled={save.isPending || Number(hourlyRate) === rate || !(Number(hourlyRate) > 0)}>
        <Save size={16}/> Saxla</button>
      <button className={`btn btn-sm ${enabled ? 'btn-warning' : 'btn-primary'}`} onClick={() => toggle.mutate()}
        disabled={toggle.isPending || (enabled && (status === 'Occupied' || status === 'Overdue'))}>
        <Wrench size={16}/>{enabled ? 'Deaktiv et' : 'Aktiv et'}</button></div>
    {(save.isError || toggle.isError) && <ErrorBox error={save.error ?? toggle.error}/>}</div>
}

export default function SettingsPage() {
  const user = useQuery({ queryKey: ['auth'], queryFn: api.me })
  const tables = useQuery({ queryKey: ['tables'], queryFn: () => api.tables() })
  if (user.isPending) return <Loading/>
  if (user.isError) return <ErrorBox error={user.error}/>
  if (user.data?.role !== 'Admin') return <EmptyState title="İcazə yoxdur" description="Bu bölmə yalnız administrator üçün əlçatandır." icon={<ShieldCheck size={25}/>}/>
  return <>
    <PageHeader eyebrow="CONFIGURATION / SETTINGS" title="Tənzimləmələr" description="Masa tariflərini və istifadəyə yararlılığını idarə edin."/>
    <div className="panel settings-panel"><div className="panel-head"><div><span className="panel-eyebrow">TABLE CONFIGURATION</span>
      <h3>Masa parametrləri</h3><p>Yeni tarif yalnız gələcək sessiyalara tətbiq olunur.</p></div><Settings2 size={20} className="muted-icon"/></div>
      {tables.isLoading ? <Loading/> : tables.isError ? <ErrorBox error={tables.error}/> : tables.data?.map(t =>
        <EditableTable key={`${t.id}-${t.hourlyRate}`} id={t.id} name={t.name} rate={t.hourlyRate} enabled={t.isEnabled} status={t.status}/>)}
    </div>
    <UserManagement currentUserId={user.data?.id ?? ''}/>
    <AuditHistory/>
    <div className="settings-hint"><ShieldCheck size={20}/><div><strong>Maliyyə məlumatlarının bütövlüyü</strong>
      <p>Aktiv sessiyaların tarif snapshot-ları qorunur. Yekun ödəniş məbləğini yalnız server hesablayır.</p></div></div>
  </>
}


function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('Operator')
  const queryClient = useQueryClient()
  const users = useQuery({ queryKey: ['users'], queryFn: api.users })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] })
  const create = useMutation({ mutationFn: () => api.createUser(email, password, role), onSuccess: async () => {
    await refresh(); setOpen(false); setEmail(''); setPassword(''); setRole('Operator')
  } })
  const toggle = useMutation({ mutationFn: (item: {id: string; active: boolean}) => api.setUserActive(item.id, item.active), onSuccess: refresh })
  return <section className="panel settings-panel">
    <div className="panel-head"><div><span className="panel-eyebrow">ACCESS CONTROL</span><h3>Operatorlar və administratorlar</h3>
      <p>Hesab yaradın və giriş səlahiyyətlərini idarə edin.</p></div>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}><UserPlus size={16}/> İstifadəçi əlavə et</button></div>
    {users.isLoading ? <Loading/> : users.isError ? <ErrorBox error={users.error}/> :
      users.data?.length ? <div className="table-overflow"><table className="data-table"><thead><tr><th>Hesab</th><th>Rol</th><th>Vəziyyət</th><th/></tr></thead>
      <tbody>{users.data.map(u => <tr key={u.id}><td className="strong-cell"><span className="small-avatar">{u.email.slice(0,1).toUpperCase()}</span>{u.email}</td>
        <td>{u.role === 'Admin' ? 'Administrator' : 'Operator'}</td><td><span className={u.isActive ? 'text-active' : 'text-disabled'}>
          <UserRoundCheck size={14}/> {u.isActive ? 'Aktiv' : 'Deaktiv'}</span></td>
        <td><button className="btn btn-secondary btn-sm" disabled={toggle.isPending || (u.id === currentUserId && u.isActive)}
          onClick={() => toggle.mutate({ id: u.id, active: !u.isActive })}>{u.isActive ? 'Deaktiv et' : 'Aktiv et'}</button></td></tr>)}</tbody></table></div> :
      <EmptyState title="İstifadəçi yoxdur" description="İlk operatoru əlavə edin." icon={<Users size={22}/>}/>}
    {toggle.isError && <ErrorBox error={toggle.error}/>}
    <AnimatePresence>{open && <Modal title="Yeni istifadəçi" subtitle="Operator və ya administrator hesabı" onClose={() => setOpen(false)}>
      <form className="modal-body" onSubmit={e => { e.preventDefault(); create.mutate() }}>
        <label className="field-label" htmlFor="userEmail">Email</label><input className="field" id="userEmail" type="email" required
          value={email} onChange={e => setEmail(e.target.value)} placeholder="operator@playdesk.local"/>
        <label className="field-label" htmlFor="userPassword">Şifrə (min. 12 simvol)</label><input className="field" id="userPassword" type="password" minLength={12} required
          autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Təhlükəsiz şifrə"/>
        <label className="field-label" htmlFor="userRole">Rol</label><select className="field" id="userRole" value={role}
          onChange={e => setRole(e.target.value as Role)}><option value="Operator">Operator</option><option value="Admin">Administrator</option></select>
        {create.isError && <ErrorBox error={create.error}/>}
        <button className="btn btn-primary btn-full" disabled={create.isPending} type="submit"><UserPlus size={17}/>
          {create.isPending ? 'Yaradılır...' : 'Hesab yarat'}</button>
      </form></Modal>}</AnimatePresence>
  </section>
}


const auditNames: Record<string, string> = {
  SessionStarted: 'Sessiya başladıldı', PaymentRecorded: 'Ödəniş qeydə alındı',
  TableRateChanged: 'Masa tarifi dəyişdirildi', TableAvailabilityChanged: 'Masa statusu dəyişdirildi',
  UserCreated: 'Hesab yaradıldı', UserEnabled: 'Hesab aktiv edildi', UserDisabled: 'Hesab deaktiv edildi',
}
function AuditHistory() {
  const audit = useQuery({ queryKey: ['audit'], queryFn: api.audit })
  return <section className="panel settings-panel"><div className="panel-head"><div><span className="panel-eyebrow">SECURITY / AUDIT TRAIL</span>
    <h3>Son əməliyyatlar</h3><p>Operator və administrator əməliyyatlarının tarixçəsi.</p></div><ScrollText size={19} className="muted-icon"/></div>
    {audit.isLoading ? <Loading/> : audit.isError ? <ErrorBox error={audit.error}/> : audit.data?.length ?
      <div className="table-overflow"><table className="data-table"><thead><tr><th>Tarix</th><th>Əməliyyat</th><th>İcraçı</th><th>Obyekt</th></tr></thead>
        <tbody>{audit.data.map(item => <tr key={item.id}><td>{new Intl.DateTimeFormat('az-AZ', {
          timeZone: 'Asia/Baku', dateStyle: 'short', timeStyle: 'short',
        }).format(new Date(item.occurredAtUtc))}</td><td className="strong-cell">{auditNames[item.action] ?? item.action}</td>
          <td>{item.actorEmail ?? 'Sistem'}</td><td>{item.entityType} #{item.entityId.slice(0,8)}</td></tr>)}</tbody></table></div> :
      <EmptyState title="Əməliyyat yoxdur" description="Əməliyyatlar burada qeyd olunacaq." icon={<ScrollText size={22}/>}/>}
  </section>
}
