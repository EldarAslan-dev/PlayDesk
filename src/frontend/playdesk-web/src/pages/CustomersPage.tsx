import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'motion/react'
import { CalendarClock, Search, UserPlus, Users } from 'lucide-react'
import { api } from '../lib/api'
import { dateTime, shortId } from '../lib/format'
import { EmptyState, ErrorBox, Loading, Modal, PageHeader } from '../components/UI'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const queryClient = useQueryClient()
  const customers = useQuery({ queryKey: ['customers', search], queryFn: () => api.customers(search) })
  const create = useMutation({ mutationFn: () => api.createCustomer(name), onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['customers'] }); setOpen(false); setName('')
  } })
  return <>
    <PageHeader eyebrow="CRM / CUSTOMERS" title="Müştərilər"
      description="Klub üzvlərini qeydiyyata alın və müştəri bazasını idarə edin."
      action={<button className="btn btn-primary" onClick={() => setOpen(true)}><UserPlus size={18}/> Yeni müştəri</button>}/>
    <div className="panel"><div className="filter-toolbar inside-panel"><div className="search-box wide"><Search size={18}/><input
      value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad ilə müştəri axtar..." aria-label="Müştəri axtar" /></div>
      <span className="muted-note">{customers.data?.length ?? 0} nəticə (maks. 100)</span></div>
      {customers.isLoading ? <Loading/> : customers.isError ? <ErrorBox error={customers.error}/> : !customers.data?.length ?
        <EmptyState title="Müştəri tapılmadı" description="Yeni müştəri yaratmaq üçün yuxarıdakı düymədən istifadə edin." icon={<Users size={24}/>}/> :
        <div className="table-overflow"><table className="data-table"><thead><tr><th>Müştəri ID</th><th>Ad soyad</th><th>Qeydiyyat tarixi</th><th>Status</th></tr></thead>
          <tbody>{customers.data.map(c => <tr key={c.id}><td className="id-cell">#{shortId(c.id)}</td><td className="strong-cell"><span className="small-avatar">{c.name.slice(0,1).toUpperCase()}</span>{c.name}</td>
            <td>{dateTime(c.createdAtUtc)}</td><td><span className="muted-note"><CalendarClock size={14}/> Qeydiyyatda</span></td></tr>)}</tbody></table></div>}
    </div>
    <AnimatePresence>{open && <Modal title="Müştəri qeydiyyatı" subtitle="Yeni müştəri məlumatları" onClose={() => setOpen(false)}>
      <form className="modal-body" onSubmit={e => { e.preventDefault(); create.mutate() }}><label className="field-label" htmlFor="customerName">Ad, soyad</label>
        <input autoFocus id="customerName" className="field" value={name} onChange={e => setName(e.target.value)} maxLength={120}
          placeholder="Müştərinin adı" required/>
        {create.isError && <ErrorBox error={create.error}/>}
        <button className="btn btn-primary btn-full" disabled={create.isPending} type="submit"><UserPlus size={17}/>
          {create.isPending ? 'Yaradılır...' : 'Müştərini qeydiyyata al'}</button></form></Modal>}</AnimatePresence>
  </>
}
