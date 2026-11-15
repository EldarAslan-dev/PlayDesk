import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CircleCheck, Clock3, Wrench, Inbox, X, MoveUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

export type BadgeStatus = 'Available' | 'Occupied' | 'Overdue' | 'Maintenance' | 'Active' | 'Completed'
const names: Record<BadgeStatus, string> = {
  Available: 'Boş masa', Occupied: 'Məşğul', Overdue: 'Vaxt bitib',
  Maintenance: 'Texniki xidmət', Active: 'Aktiv', Completed: 'Tamamlanıb',
}
const icons = {
  Available: CircleCheck, Occupied: Clock3, Overdue: AlertCircle,
  Maintenance: Wrench, Active: Clock3, Completed: CircleCheck,
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const Icon = icons[status]
  return <span className={`status status-${status.toLowerCase()}`}><Icon size={13}/>{names[status]}</span>
}

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string; title: string; description?: string; action?: ReactNode
}) {
  return <div className="page-header">
    <div className="page-header-copy"><p className="eyebrow"><span className="eyebrow-dash"/>{eyebrow ?? 'PLAYDESK / COMMAND CENTER'}</p>
      <h1>{title}<span className="title-marker">.</span></h1>{description && <p className="page-description">{description}</p>}</div>
    {action && <div className="page-header-action">{action}</div>}
  </div>
}

export function StatCard({ label, value, subtitle, icon, tone = 'blue' }: {
  label: string; value: string | number; subtitle: string; icon: ReactNode; tone?: 'blue' | 'violet' | 'green' | 'orange'
}) {
  const reducedMotion = useReducedMotion()
  return <motion.div className={`stat-card stat-card-${tone}`} whileHover={reducedMotion ? undefined : { y: -5 }}
    transition={{ type: 'spring', stiffness: 340, damping: 28 }}>
    <div className="stat-card-head"><span>{label}</span><div className={`stat-icon tone-${tone}`}>{icon}</div></div>
    <strong>{value}</strong><div className="stat-card-footer"><small>{subtitle}</small><MoveUpRight size={15}/></div>
  </motion.div>
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon ?? <Inbox size={24}/>}</div>
    <strong>{title}</strong><p>{description}</p></div>
}

export function Loading() {
  return <div className="loading-state" role="status"><span className="loader"/> Məlumatlar yüklənir...</div>
}

export function ErrorBox({ error }: { error: unknown }) {
  return <div className="error-box" role="alert"><AlertCircle size={18}/><span>{error instanceof Error ? error.message : 'Sorğu zamanı xəta baş verdi.'}</span></div>
}

export function Modal({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode
}) {
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKeyDown) }
  }, [onClose])
  return createPortal(<motion.div className="modal-overlay" role="presentation"
    initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <motion.section role="dialog" aria-modal="true" aria-label={title} className="modal-panel"
      initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 28 }}
      animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
      transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}>
      <div className="modal-head"><div><p className="modal-kicker">PLAYDESK / ACTION</p><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button className="icon-button" onClick={onClose} aria-label="Bağla"><X size={18}/></button></div>
      {children}
    </motion.section>
  </motion.div>, document.body)
}
