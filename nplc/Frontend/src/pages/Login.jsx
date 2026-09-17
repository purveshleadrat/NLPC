import { useState } from 'react'
import { Brain, Loader2, LogIn, UserPlus, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Login() {
  const { login, signup } = useAuth()
  const { dark } = useTheme()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const card  = dark ? 'glass-dark' : 'glass-light shadow-sm'
  const label = dark ? 'text-gray-400' : 'text-gray-500'
  const inputCls = dark
    ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder:text-gray-600'
    : 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400'

  async function submit(e) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      if (mode === 'signup') await signup(tenantName.trim(), tenantSlug.trim(), password)
      else await login(tenantSlug.trim(), password)
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: dark ? '#0d0d1a' : '#f3f4f6' }}>
      <div className={`w-full max-w-md rounded-2xl p-8 ${card}`}>
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="brand-gradient w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ boxShadow: '0 0 16px rgba(99,102,241,0.5)' }}>
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <div className="text-[18px] font-black tracking-tight" style={{ color: dark ? '#fff' : '#1e1b4b' }}>NPLC</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] gradient-text">Never Lose Product Context</div>
          </div>
        </div>

        <h1 className={`text-[20px] font-bold mb-1 ${dark ? 'text-gray-100' : 'text-gray-800'}`}>
          {mode === 'signup' ? 'Create a workspace' : 'Sign in'}
        </h1>
        <p className={`text-[13px] mb-6 ${label}`}>
          {mode === 'signup'
            ? 'A workspace (tenant) has one shared password for everyone on it.'
            : 'Enter your workspace slug and shared password.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className={`block text-[12px] font-medium mb-1 ${label}`}>Workspace name</label>
              <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} required
                placeholder="Acme Product Team"
                className={`w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-indigo-500/40 ${inputCls}`} />
            </div>
          )}
          <div>
            <label className={`block text-[12px] font-medium mb-1 ${label}`}>Workspace slug</label>
            <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} required
              placeholder="acme" autoCapitalize="none"
              className={`w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-indigo-500/40 ${inputCls}`} />
          </div>
          <div>
            <label className={`block text-[12px] font-medium mb-1 ${label}`}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              placeholder="••••••••" minLength={mode === 'signup' ? 8 : undefined}
              className={`w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-indigo-500/40 ${inputCls}`} />
            {mode === 'signup' && <p className={`text-[11px] mt-1 ${label}`}>At least 8 characters.</p>}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-3 py-2.5 text-[13px]">
              <AlertTriangle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 brand-gradient text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20">
            {loading ? <Loader2 size={15} className="animate-spin" /> : mode === 'signup' ? <UserPlus size={15} /> : <LogIn size={15} />}
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create workspace' : 'Sign in'}
          </button>
        </form>

        <div className={`text-center mt-5 text-[13px] ${label}`}>
          {mode === 'signup' ? 'Already have a workspace?' : "Don't have a workspace?"}{' '}
          <button
            onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null) }}
            className="font-semibold gradient-text hover:underline">
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  )
}
