import { NavLink } from 'react-router-dom'
import {
  Brain,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Boxes,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

// Everything a single initiative needs - Timeline/Scope/Ask/Brief, plus adding sources
// from Jira/GitHub - now lives inside the initiative workspace itself. The sidebar is just
// the three top-level destinations.
const links = [
  { to: '/', label: 'Initiatives', icon: Boxes },
  { to: '/search', label: 'Global Search', icon: SearchIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]


const SIDEBAR_DARK = '#131320'

export default function Sidebar() {
  const { dark, toggle } = useTheme()
  const { tenant, logout } = useAuth()

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
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border"
          style={{
            background: dark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(37, 99, 235, 0.08)',
            borderColor: dark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(37, 99, 235, 0.2)',
          }}
        >
          <Sparkles size={9} style={{ color: dark ? '#38bdf8' : '#2563eb' }} />
          <span className="text-[10px] font-semibold leading-none" style={{ color: dark ? '#38bdf8' : '#2563eb' }}>
            Never Lose Product Context
          </span>
        </div>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <div
                style={isActive ? {
                  background: dark ? '#1d293d' : '#eff6ff',
                  color: dark ? '#93c5fd' : '#2563eb',
                  border: dark ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid #bfdbfe',
                  borderRadius: 7,
                } : {
                  color: textMuted,
                  border: '1px solid transparent',
                  borderRadius: 7,
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; e.currentTarget.style.color = dark ? '#e5e7eb' : '#111827' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textMuted } }}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none transition-colors duration-150 text-[12.5px] font-medium"
              >
                <Icon
                  size={14}
                  style={{ color: isActive ? (dark ? '#93c5fd' : '#2563eb') : dark ? '#6b7280' : '#9ca3af', flexShrink: 0 }}
                />
                <span className="text-[12.5px] font-medium leading-none">{label}</span>
                {isActive && (
                  <span
                    className="ml-auto rounded-full"
                    style={{ width: 5, height: 5, background: dark ? '#60a5fa' : '#2563eb', flexShrink: 0 }}
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
          className="flex items-center justify-between px-2.5 py-1.5 rounded-[7px]"
          style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex" style={{ width: 7, height: 7 }}>
              <span className="status-ping absolute inline-flex rounded-full" style={{ width: '100%', height: '100%', background: '#34d399', opacity: 0.5 }} />
              <span className="relative inline-flex rounded-full" style={{ width: 7, height: 7, background: '#34d399' }} />
            </span>
            <span className="text-[11px] font-medium" style={{ color: textMuted }}>
              API Live · :4000
            </span>
          </div>
          <button
            onClick={toggle}
            className="rounded-[6px] p-1.5 transition-all"
            style={{ color: textMuted }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e5e7eb' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textMuted }}
            title="Toggle theme"
          >
            {dark ? <Sun size={12} /> : <Moon size={12} />}
          </button>
        </div>

        <button
          onClick={logout}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-[7px] px-2 py-1.5 text-[11px] font-medium transition-colors"
          style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}`, color: textMuted }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.color = textMuted }}
          title="Sign out"
        >
          <LogOut size={11} />
          {tenant?.tenantSlug ? `Sign out · ${tenant.tenantSlug}` : 'Sign out'}
        </button>

        <p className="text-center mt-2 text-[9.5px] font-medium" style={{ color: dark ? '#374151' : '#9ca3af' }}>
          v1.0 · Powered by Gemini AI
        </p>
      </div>
    </aside>
  )
}
