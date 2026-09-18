import { NavLink, useLocation } from 'react-router-dom'
import {
  Brain,
  LogOut,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Boxes,
  Plug,
  X,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/initiatives', label: 'Initiatives', icon: Boxes, tourId: 'tour-initiatives' },
  { to: '/search', label: 'Global Search', icon: SearchIcon, tourId: 'tour-search' },
  { to: '/integrations', label: 'Integrations', icon: Plug, tourId: 'tour-integrations' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, tourId: 'tour-settings' },
]

// Paths that should keep the Initiatives nav item active
const INITIATIVE_PATHS = ['/', '/workspace']

const SIDEBAR_DARK = '#0d1410'

export default function Sidebar({ onClose }) {
  const { dark } = useTheme()
  const { tenant, logout } = useAuth()
  const location = useLocation()

  const bg          = dark ? SIDEBAR_DARK : '#ffffff'
  const borderColor = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'
  const textMuted   = dark ? '#6b7280' : '#9ca3af'
  const dividerBg   = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'

  function isLinkActive(to) {
    if (to === '/') return INITIATIVE_PATHS.includes(location.pathname)
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  return (
    <aside
      style={{ background: bg, borderRight: `1px solid ${borderColor}` }}
      className="h-screen w-[220px] flex flex-col"
    >
      {/* ── Brand ── */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="brand-gradient w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '0 0 16px rgba(5,150,105,0.5)' }}
          >
            <Brain size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-black leading-none tracking-tight" style={{ color: dark ? '#ffffff' : '#064e3b' }}>
              NLPC
            </div>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] gradient-text">
              Hackathon 2K26
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
              style={{ color: textMuted }}
              onMouseEnter={e => { e.currentTarget.style.color = dark ? '#e5e7eb' : '#111827' }}
              onMouseLeave={e => { e.currentTarget.style.color = textMuted }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon, tourId }) => {
          const isActive = isLinkActive(to)
          return (
            <NavLink key={to} to={to} onClick={onClose} className={() => ''}>
              <div id={tourId}
                style={isActive ? {
                  background: dark ? '#0d2b1e' : '#ecfdf5',
                  color: dark ? '#6ee7b7' : '#059669',
                  border: dark ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid #a7f3d0',
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
                <Icon size={14} style={{ color: isActive ? (dark ? '#34d399' : '#059669') : dark ? '#6b7280' : '#9ca3af', flexShrink: 0 }} />
                <span className="text-[12.5px] font-medium leading-none">{label}</span>
                {isActive && (
                  <span className="ml-auto rounded-full" style={{ width: 5, height: 5, background: dark ? '#34d399' : '#059669', flexShrink: 0 }} />
                )}
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: dividerBg, margin: '0 16px' }} />

      {/* ── Footer ── */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[7px] mb-2"
          style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}>
          <span className="relative flex" style={{ width: 7, height: 7 }}>
            <span className="status-ping absolute inline-flex rounded-full" style={{ width: '100%', height: '100%', background: '#34d399', opacity: 0.5 }} />
            <span className="relative inline-flex rounded-full" style={{ width: 7, height: 7, background: '#34d399' }} />
          </span>
          <span className="text-[11px] font-medium" style={{ color: textMuted }}>API Live · :4000</span>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-1.5 rounded-[7px] px-2 py-1.5 text-[11px] font-medium transition-colors cursor-pointer"
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
