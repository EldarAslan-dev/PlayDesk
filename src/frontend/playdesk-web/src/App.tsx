import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import {
  ArrowRight, BarChart3, ChevronRight, Clock3, Gamepad2, LayoutDashboard,
  LogOut, Menu, Radio, Settings, ShieldCheck, Swords, Users, X, Zap,
} from 'lucide-react'
import { api } from './lib/api'
import { ErrorBox, Loading } from './components/UI'
import DashboardPage from './pages/DashboardPage'
import TablesPage from './pages/TablesPage'
import SessionsPage from './pages/SessionsPage'
import CustomersPage from './pages/CustomersPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

const links = [
  { label: 'Komanda mərkəzi', to: '/', icon: LayoutDashboard, caption: 'Overview' },
  { label: 'Oyun masaları', to: '/tables', icon: Gamepad2, caption: 'Battle stations' },
  { label: 'Sessiyalar', to: '/sessions', icon: Clock3, caption: 'Live sessions' },
  { label: 'Müştərilər', to: '/customers', icon: Users, caption: 'Players' },
  { label: 'Gəlir hesabatı', to: '/reports', icon: BarChart3, caption: 'Analytics' },
  { label: 'Tənzimləmələr', to: '/settings', icon: Settings, caption: 'Configuration' },
] as const

const titles: Record<string, string> = {
  '/': 'Komanda mərkəzi', '/tables': 'Oyun masaları', '/sessions': 'Sessiyalar',
  '/customers': 'Müştərilər', '/reports': 'Gəlir hesabatı', '/settings': 'Tənzimləmələr',
}

type RealtimeStatus = 'connected' | 'reconnecting' | 'offline'

function useRealtime(): RealtimeStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>('offline')

  useEffect(() => {
    let mounted = true
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/club')
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(LogLevel.Warning)
      .build()

    const refresh = () => {
      for (const key of ['tables', 'sessions', 'session', 'dashboard', 'revenue', 'audit']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
    }

    for (const name of ['SessionStarted', 'SessionClosed', 'PaymentRecorded', 'TableUpdated']) {
      connection.on(name, refresh)
    }
    connection.onreconnecting(() => { if (mounted) setStatus('reconnecting') })
    connection.onreconnected(() => {
      if (mounted) setStatus('connected')
      refresh()
    })
    connection.onclose(() => { if (mounted) setStatus('offline') })
    void connection.start()
      .then(() => {
        if (mounted) {
          setStatus('connected')
          refresh()
        }
      })
      .catch(() => { if (mounted) setStatus('offline') })

    return () => {
      mounted = false
      void connection.stop()
    }
  }, [queryClient])

  return status
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link to="/" className={`brand-link ${compact ? 'brand-link-compact' : ''}`} aria-label="PlayDesk ana səhifə">
    <span className="brand-symbol"><Swords size={24} strokeWidth={1.8}/><span className="brand-symbol-spark"/></span>
    <span className="brand-name">PLAY<span>DESK</span><small>ARENA CONTROL SYSTEM</small></span>
  </Link>
}

function Protected() {
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me, retry: false })
  if (auth.isPending) return <div className="full-loader premium-full-loader"><Brand compact/><Loading/></div>
  if (auth.isError) return <div className="full-loader"><ErrorBox error={auth.error}/></div>
  if (!auth.data) return <Navigate to="/login" replace />
  return <Shell role={auth.data.role} email={auth.data.email} />
}

function Shell({ role, email }: { role: string; email: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const outlet = useOutlet()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const queryClient = useQueryClient()
  const realtimeStatus = useRealtime()
  const logout = useMutation({ mutationFn: api.logout, onSuccess: () => {
    queryClient.clear()
    navigate('/login', { replace: true })
  } })

  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return <div className="app-shell premium-app-shell">
    <div className="global-ambient" aria-hidden="true" />
    {sidebarOpen && <button className="mobile-scrim" aria-label="Menyunu bağla" onClick={() => setSidebarOpen(false)}/>}
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Brand/>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Menyunu bağla"><X size={20}/></button>
      </div>
      <div className="sidebar-rule"><span>WAR ROOM</span><span>EST. 2026</span></div>
      <div className="sidebar-label">NAVIGATION <span>01 / 06</span></div>
      <nav className="sidebar-nav" aria-label="Əsas menyu">
        {links.filter(x => x.to !== '/settings' || role === 'Admin').map(item => {
          const Icon = item.icon
          return <NavLink key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
            {({ isActive }) => <>
              {isActive && <motion.span className="nav-active-panel" layoutId="nav-active" transition={{ type: 'spring', stiffness: 420, damping: 38 }}/>}
              <Icon size={19} strokeWidth={1.8}/>
              <span className="nav-text"><span>{item.label}</span><small>{item.caption}</small></span>
              {isActive && <ChevronRight size={15} className="nav-arrow"/>}
            </>}
          </NavLink>
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-promo">
          <span className="promo-top"><Zap size={16}/> LIVE COMMAND</span>
          <strong>Hər saniyə nəzarətdə.</strong>
          <p>Masalar, ödənişlər və sessiyalar tək mərkəzdə.</p>
          <div className="promo-bars" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
        </div>
        <button className="profile-box" onClick={() => logout.mutate()} disabled={logout.isPending} title="Sistemdən çıx">
          <span className="avatar">{email.charAt(0).toUpperCase()}</span>
          <span className="profile-text"><strong>{email}</strong><small>{role === 'Admin' ? 'Administrator' : 'Operator'}</small></span>
          <LogOut size={18}/>
        </button>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="topbar-left">
          <button className="topbar-menu" onClick={() => setSidebarOpen(true)} aria-label="Menyunu aç"><Menu size={21}/></button>
          <span className="topbar-chapter">CONTROL / <span>PLAYDESK</span></span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{titles[location.pathname] ?? 'PlayDesk'}</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-location">BAKU <span>UTC +04</span></span>
          <span className={`online-pill live-${realtimeStatus}`} title={realtimeStatus === 'connected' ? 'SignalR bağlıdır' : 'SignalR bağlantısı gözlənilir'}>
            <span/>{realtimeStatus === 'connected' ? 'CANLI SİSTEM' : realtimeStatus === 'reconnecting' ? 'YENİDƏN BAĞLANIR' : 'YENİLƏNMƏ GÖZLƏNİLİR'}
          </span>
          <Link className="topbar-quick" to="/tables"><Gamepad2 size={16}/> Masalara keç <ArrowRight size={15}/></Link>
          <span className="top-avatar">{email.charAt(0).toUpperCase()}</span>
        </div>
      </header>
      <main className="content" id="main-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} className="page-stage"
            initial={reduceMotion ? false : { opacity: 0, y: 20, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -9, filter: 'blur(3px)' }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}>
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="footer"><span>PLAYDESK <b>RAGNAROK EDITION</b></span><span>© 2026 • OPERATIONS / BAKU UTC+04</span><span>BUILT FOR THE ARENA</span></footer>
    </div>
  </div>
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reduceMotion = useReducedMotion()
  const login = useMutation({ mutationFn: () => api.login(email, password), onSuccess: user => {
    queryClient.setQueryData(['auth'], user)
    navigate('/', { replace: true })
  } })

  return <div className="login-layout premium-login">
    <div className="login-art" aria-hidden="true" />
    <div className="login-grain" aria-hidden="true"/>
    <motion.div className="login-card" initial={reduceMotion ? false : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, ease: 'easeOut' }}>
      <Brand compact/>
      <div className="login-heading">
        <span><ShieldCheck size={14}/> SECURE OPERATOR ACCESS</span>
        <h1>Arenaya<br/><em>xoş gəldin.</em></h1>
        <p>Klubun bütün əməliyyatlarını real vaxtda idarə et. İdarəetmə sənin əlindədir.</p>
      </div>
      <form onSubmit={e => { e.preventDefault(); login.mutate() }}>
        <label className="field-label" htmlFor="loginEmail">Email ünvanı</label>
        <input id="loginEmail" type="email" className="field" autoComplete="username" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="admin@playdesk.local" required/>
        <label className="field-label" htmlFor="loginPassword">Şifrə</label>
        <input id="loginPassword" type="password" className="field" autoComplete="current-password" value={password}
          onChange={e => setPassword(e.target.value)} placeholder="Şifrənizi daxil edin" required/>
        {login.isError && <ErrorBox error={login.error}/>}
        <button type="submit" className="btn btn-primary btn-full login-submit" disabled={login.isPending}>
          <ShieldCheck size={18}/>{login.isPending ? 'Giriş yoxlanılır...' : 'İdarəetməyə daxil ol'}<ArrowRight size={18}/>
        </button>
      </form>
      <div className="login-footer"><span className="login-safe-dot"/> PROTECTED ACCESS · PLAYDESK SYSTEM</div>
    </motion.div>
    <motion.div className="login-aside" initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.12 }}>
      <div className="login-art-top"><span><Swords size={16}/> PLAYDESK / RAGNAROK</span><span>001 // ARENA</span></div>
      <div className="aside-copy"><div className="mini-tag"><Radio size={14}/> COMMAND CENTER ONLINE</div>
        <h2>OWN THE<br/><span>ARENA.</span></h2>
        <p>Oyun masaları. Aktiv sessiyalar. Gəlir göstəriciləri.<br/>İdarəetmənin yeni səviyyəsi.</p>
        <div className="login-features"><span><Gamepad2 size={16}/> LIVE TABLES</span><span><BarChart3 size={16}/> INTELLIGENCE</span><span><Zap size={16}/> REAL-TIME SYNC</span></div>
      </div>
      <div className="login-art-bottom"><span>THE CONTROL IS YOURS</span><span>BAKU / 2026</span></div>
    </motion.div>
  </div>
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route element={<Protected/>}>
      <Route index element={<DashboardPage/>}/>
      <Route path="tables" element={<TablesPage/>}/>
      <Route path="sessions" element={<SessionsPage/>}/>
      <Route path="customers" element={<CustomersPage/>}/>
      <Route path="reports" element={<ReportsPage/>}/>
      <Route path="settings" element={<SettingsPage/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}
