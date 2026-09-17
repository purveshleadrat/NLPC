import { NavLink } from 'react-router-dom'
import {
  Upload,
  GitCommitHorizontal,
  Zap,
  MessageSquare,
  FileText,
  Ticket,
  Brain,
  Sparkles,
  Sun,
  Moon,
  Plus,
  LogOut,
  Download,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Ingest Sources', icon: Upload },
  { to: '/import', label: 'Import Jira / Git', icon: Download },
  { to: '/timeline', label: 'Decision Timeline', icon: GitCommitHorizontal },
  { to: '/impact', label: 'Change Impact', icon: Zap },
  { to: '/ask', label: 'Ask Context', icon: MessageSquare },
  { to: '/brief', label: 'Resume Brief', icon: FileText },
  { to: '/jira', label: 'Jira Browser', icon: Ticket },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]


const SIDEBAR_DARK = '#131320'

export default function Sidebar() {
  const { dark, toggle } = useTheme()
  const { initiatives, currentId, select, create } = useInitiative()
  const { tenant, logout } = useAuth()

  async function newInitiative() {
    const name = window.prompt('Name your initiative (e.g. "Bulk Update")')
    if (name && name.trim()) {
      try { await create(name.trim()) } catch (e) { alert(e?.response?.data?.message || e.message) }
    }
  }

  const bg          = dark ? SIDEBAR_DARK : '#ffffff'
  const borderColor = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'
  const textMuted   = dark ? '#6b7280' : '#9ca3af'
  const textActive  = '#ffffff'
  const dividerBg   = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'

  return (
    <aside
      style={{ background: bg, borderRight: `1px solid ${borderColor}` }}
      className="fixed top-0 left-0 h-screen w-[220px] flex flex-col z-50"
    >
      {/* ── Brand ── */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="brand-gradient w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '0 0 16px rgba(99,102,241,0.5)' }}
          >
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <div className="text-[16px] font-black leading-none tracking-tight" style={{ color: dark ? '#ffffff' : '#1e1b4b' }}>
              NPLC
            </div>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] gradient-text">
              Hackathon 2K26
            </div>
          </div>
        </div>

        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <Sparkles size={9} style={{ color: '#a5b4fc' }} />
          <span className="text-[10px] font-semibold leading-none" style={{ color: '#a5b4fc' }}>
            Never Lose Product Context
          </span>
        </div>
      </div>

      {/* ── Initiative switcher ── */}
      <div className="px-3 pb-2">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] mb-1.5 px-1" style={{ color: textMuted }}>
          Initiative
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={currentId || ''}
            onChange={(e) => select(e.target.value)}
            className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[12px] font-medium outline-none cursor-pointer"
            style={{
              background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${borderColor}`,
              color: dark ? '#e5e7eb' : '#374151',
            }}
          >
            {initiatives.length === 0 && <option value="">No initiatives yet</option>}
            {initiatives.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <button
            onClick={newInitiative}
            title="New initiative"
            className="rounded-lg p-1.5 flex-shrink-0 transition-colors"
            style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px solid ${borderColor}`, color: textMuted }}
            onMouseEnter={e => { e.currentTarget.style.color = '#a5b4fc' }}
            onMouseLeave={e => { e.currentTarget.style.color = textMuted }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: dividerBg, margin: '0 16px 8px' }} />

      {/* ── Nav links ── */}
      <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <div
                style={isActive ? {
                  background: '#4f46e5',
                  color: textActive,
                  borderRadius: 10,
                } : {
                  color: textMuted,
                  borderRadius: 10,
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e5e7eb' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textMuted } }}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none transition-colors duration-150"
              >
                <Icon
                  size={15}
                  style={{ color: isActive ? '#ffffff' : dark ? '#6b7280' : '#9ca3af', flexShrink: 0 }}
                />
                <span className="text-[13px] font-medium leading-none">{label}</span>
                {isActive && (
                  <span
                    className="ml-auto rounded-full"
                    style={{ width: 6, height: 6, background: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
                  />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: dividerBg, margin: '0 16px' }} />

      {/* ── Footer ── */}
      <div className="px-3 py-3">
        <div
          className="flex items-center justify-between px-2 py-2 rounded-xl"
          style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex" style={{ width: 8, height: 8 }}>
              <span className="status-ping absolute inline-flex rounded-full" style={{ width: '100%', height: '100%', background: '#34d399', opacity: 0.5 }} />
              <span className="relative inline-flex rounded-full" style={{ width: 8, height: 8, background: '#34d399' }} />
            </span>
            <span className="text-[11px] font-medium" style={{ color: textMuted }}>
              API Live · :4000
            </span>
          </div>
          <button
            onClick={toggle}
            className="rounded-md p-1.5 transition-all"
            style={{ color: textMuted }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e5e7eb' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textMuted }}
            title="Toggle theme"
          >
            {dark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        <button
          onClick={logout}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors"
          style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${borderColor}`, color: textMuted }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.color = textMuted }}
          title="Sign out"
        >
          <LogOut size={12} />
          {tenant?.tenantSlug ? `Sign out · ${tenant.tenantSlug}` : 'Sign out'}
        </button>

        <p className="text-center mt-2 text-[9.5px] font-medium" style={{ color: dark ? '#374151' : '#9ca3af' }}>
          v1.0 · Powered by Gemini AI
        </p>
      </div>
    </aside>
  )
}
