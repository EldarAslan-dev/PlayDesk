import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Banknote, UserPlus, Timer, Gamepad2 } from 'lucide-react'
import type { ClubTable, PaymentMethod } from '../types'
import { api } from '../lib/api'
import { money, dateTime } from '../lib/format'
import { ErrorBox, Loading, Modal } from './UI'

function useRefresh() {
  const queryClient = useQueryClient()
  return () => Promise.all(['tables', 'sessions', 'dashboard', 'revenue', 'customers']
    .map(key => queryClient.invalidateQueries({ queryKey: [key] })))
}

export function NewSessionModal({ table, onClose }: { table: ClubTable; onClose: () => void }) {
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [duration, setDuration] = useState(90)
  const customers = useQuery({ queryKey: ['customers', ''], queryFn: () => api.customers('') })
  const refresh = useRefresh()
  const create = useMutation({
    mutationFn: async () => {
      let id = customerId
      if (customerName.trim()) id = (await api.createCustomer(customerName.trim())).id
      if (!id) throw new Error('Müştəri seçin və ya yeni müştəri adı yazın.')
      return api.createSession(id, table.id, duration)
    },
    onSuccess: async () => { await refresh(); onClose() },
  })
  return <Modal title="Yeni oyun sessiyası" subtitle={`${table.name} · ${money(table.hourlyRate)} / saat`} onClose={onClose}>
    <form className="modal-body" onSubmit={event => { event.preventDefault(); create.mutate() }}>
      <label className="field-label" htmlFor="sessionCustomer">Mövcud müştəri</label>
      <select id="sessionCustomer" className="field" value={customerId} onChange={e => { setCustomerId(e.target.value); setCustomerName('') }}>
        <option value="">Müştəri seçin</option>
        {customers.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="form-divider"><span>və ya yeni müştəri yaradın</span></div>
      <label className="field-label" htmlFor="newCustomer">Müştəri adı</label>
      <div className="input-icon"><UserPlus size={18}/><input id="newCustomer" className="field" maxLength={120}
        value={customerName} placeholder="Ad, soyad" onChange={e => { setCustomerName(e.target.value); setCustomerId('') }} /></div>
      <label className="field-label" htmlFor="sessionDuration">Oyun müddəti</label>
      <div className="input-icon"><Timer size={18}/><select id="sessionDuration" className="field" value={duration}
        onChange={e => setDuration(Number(e.target.value))}>
        {[30, 60, 90, 120, 150, 180, 240, 300, 360].map(minutes =>
          <option key={minutes} value={minutes}>{minutes} dəqiqə</option>)}</select></div>
      <div className="payment-summary"><div><span>Hesablanmış məbləğ</span><strong>{money(table.hourlyRate * duration / 60)}</strong></div>
        <p>Məbləğ server tərəfindən tarif snapshot-ı ilə hesablanacaq.</p></div>
      {create.isError && <ErrorBox error={create.error}/>}
      <button type="submit" className="btn btn-primary btn-full" disabled={create.isPending}>
        <Gamepad2 size={18}/>{create.isPending ? 'Sessiya açılır...' : 'Sessiyanı başlat'}</button>
    </form>
  </Modal>
}

export function PaymentModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>('Cash')
  const session = useQuery({ queryKey: ['session', sessionId], queryFn: () => api.session(sessionId) })
  const refresh = useRefresh()
  const pay = useMutation({
    mutationFn: () => api.pay(sessionId, method),
    onSuccess: async () => { await refresh(); onClose() },
  })
  return <Modal title="Ödənişi təsdiqlə" subtitle="Sessiyanın bağlanması və masanın boşaldılması" onClose={onClose}>
    {session.isLoading ? <Loading/> : session.isError ? <ErrorBox error={session.error}/> : session.data && <form className="modal-body" onSubmit={e => { e.preventDefault(); pay.mutate() }}>
      <div className="session-summary-grid">
        <div><span>Müştəri</span><strong>{session.data.customerName}</strong></div>
        <div><span>Masa</span><strong>{session.data.tableName}</strong></div>
        <div><span>Başlanğıc</span><strong>{dateTime(session.data.startedAtUtc)}</strong></div>
        <div><span>Müddət</span><strong>{session.data.durationMinutes} dəq.</strong></div>
      </div>
      <div className="payment-total"><span>Ödəniləcək məbləğ</span><strong>{money(session.data.expectedAmount)}</strong></div>
      <label className="field-label">Ödəniş üsulu</label>
      <div className="payment-methods">
        <button type="button" className={`payment-method ${method === 'Cash' ? 'selected' : ''}`} onClick={() => setMethod('Cash')}>
          <Banknote size={20}/> Nağd</button>
        <button type="button" className={`payment-method ${method === 'Card' ? 'selected' : ''}`} onClick={() => setMethod('Card')}>
          <CreditCard size={20}/> Kart (POS)</button>
      </div>
      {session.data.isPaid && <div className="notice">Bu sessiyanın ödənişi artıq qeydə alınıb.</div>}
      {pay.isError && <ErrorBox error={pay.error}/>}
      <button className="btn btn-primary btn-full" type="submit" disabled={pay.isPending || session.data.isPaid}>
        {pay.isPending ? 'Təsdiqlənir...' : `${money(session.data.expectedAmount)} ödənişi təsdiqlə`}</button>
    </form>}
  </Modal>
}
