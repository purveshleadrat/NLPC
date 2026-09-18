import { useEffect, useState, useCallback } from 'react'
import {
  getConnections, createConnection, deleteConnection,
  getInitiativeConnections,
} from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'
import {
  Plug, Plus, Trash2, Loader2, AlertTriangle, CheckCircle, Boxes, Ticket, Mail,
} from 'lucide-react'

const BLANK = {
  JIRA:   { provider: 'JIRA',   label: '', baseUrl: 'https://your-domain.atlassian.net', accountId: '', repo: '', secret: '' },
  GITHUB: { provider: 'GITHUB', label: '', baseUrl: 'https://api.github.com', accountId: '', repo: '', secret: '' },
  SMTP:   { provider: 'SMTP',   label: '', baseUrl: 'smtp.gmail.com', accountId: '', port: 587, secret: '' },
}
const PROVIDERS = [
  { id: 'JIRA', label: 'Jira', icon: Ticket },
  { id: 'GITHUB', label: 'GitHub', icon: Boxes },
  { id: 'SMTP', label: 'SMTP', icon: Mail },
]

export default function Integrations() {
  const { dark } = useTheme()
  const { currentId } = useInitiative()

  const [connections, setConnections] = useState([])
  const [bindings, setBindings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(BLANK.JIRA)
  const [saving, setSaving] = useState(false)

  const card  = dark ? 'glass-dark' : 'glass-light shadow-sm'
  const label = dark ? 'text-emerald-400' : 'text-emerald-700'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const head  = dark ? 'text-gray-100' : 'text-gray-800'
  const inp   = dark
    ? 'bg-white/[0.06] border-white/[0.12] text-gray-100 placeholder-gray-600 focus:ring-emerald-500/30 focus:border-emerald-500/40'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-emerald-500/30 focus:border-emerald-400'

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [connRes, bindRes] = await Promise.all([
        getConnections(),
        currentId ? getInitiativeConnections(currentId) : Promise.resolve({ data: [] }),
      ])
      setConnections(connRes.data || [])
      setBindings((bindRes.data || []).map((b) => ({ connectionId: b.connectionId, scopeKey: b.scopeKey })))
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [currentId])

  useEffect(() => { load() }, [load])

  const boundIds = new Set(bindings.map((b) => b.connectionId))

  async function addConnection(e) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const payload = { ...form }
      if (payload.provider !== 'GITHUB') delete payload.repo
      if (payload.provider === 'SMTP') payload.port = Number(payload.port) || 587
      else delete payload.port
      await createConnection(payload)
      setForm(BLANK[form.provider])
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to add connection')
    } finally {
      setSaving(false)
    }
  }

  async function removeConnection(id) {
    if (!window.confirm('Delete this connection? Its stored token is destroyed.')) return
    try { await deleteConnection(id); await load() }
    catch (err) { setError(err?.response?.data?.message || err.message) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`text-[20px] font-bold ${head}`}>Integrations</h2>
        <p className={`text-[13px] ${muted}`}>Connect Jira, GitHub and SMTP — link them to initiatives so Sync can pull from them.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-3 py-2.5 text-[13px]">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {/* Connections list */}
      <div className={`rounded-2xl p-4 ${card}`}>
        <div className="flex items-center gap-2 mb-3">
          <Plug size={14} className="text-emerald-400 flex-shrink-0" />
          <h3 className={`text-[15px] font-semibold ${head}`}>Connections</h3>
          <span className={`text-[11px] ${muted} hidden sm:inline`}>· link one so Sync pulls from it</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-1">
            {[1, 2].map((i) => (
              <div key={i} className={`rounded-xl px-3 py-3 border ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${dark ? 'shimmer bg-white/10' : 'shimmer bg-gray-200'}`} />
                  <div className={`h-3.5 rounded-full flex-1 max-w-[120px] ${dark ? 'shimmer bg-white/10' : 'shimmer bg-gray-200'}`} />
                  <div className={`h-6 w-14 rounded-lg ${dark ? 'shimmer bg-white/10' : 'shimmer bg-gray-200'}`} />
                </div>
                <div className={`h-2.5 rounded-full mt-2 ml-6 max-w-[200px] ${dark ? 'shimmer bg-white/[0.06]' : 'shimmer bg-gray-100'}`} />
              </div>
            ))}
          </div>
        ) : connections.length === 0 ? (
          <p className={`text-[13px] py-3 ${muted}`}>No connections yet. Add one below.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {connections.map((c) => {
              const bound = boundIds.has(c.id)
              const scope = bindings.find((b) => b.connectionId === c.id)?.scopeKey
              return (
                <div key={c.id} className={`rounded-xl px-3 py-3 border ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                  {/* Top row: icon + name + actions */}
                  <div className="flex items-center gap-2">
                    {c.provider === 'JIRA'
                      ? <Ticket size={15} className="text-blue-400 flex-shrink-0" />
                      : c.provider === 'SMTP'
                        ? <Mail size={15} className="text-amber-400 flex-shrink-0" />
                        : <Boxes size={15} className={dark ? 'text-gray-200 flex-shrink-0' : 'text-gray-700 flex-shrink-0'} />}
                    <span className={`text-[13px] font-semibold flex-1 truncate ${head}`}>{c.label}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => removeConnection(c.id)}
                        className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {/* Sub row: url + status */}
                  <div className={`text-[11px] truncate mt-1 pl-[23px] ${muted}`}>
                    {c.provider === 'GITHUB' ? `${c.accountId}/${c.repo}` : c.accountId}
                    {' · '}{c.provider === 'SMTP' ? `${c.baseUrl}:${c.repo}` : c.baseUrl}
                    {' · '}{c.status}{bound && scope ? ` · "${scope}"` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add connection */}
      <div className={`rounded-2xl p-4 ${card}`}>
        <div className="flex items-center gap-2 mb-3">
          <Plus size={14} className="text-emerald-400" />
          <h3 className={`text-[15px] font-semibold ${head}`}>Add a connection</h3>
        </div>

        {/* Provider tabs */}
        <div className="flex gap-2 mb-4">
          {PROVIDERS.map(({ id, label: plabel, icon: Icon }) => (
            <button key={id} onClick={() => setForm(BLANK[id])}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all ${form.provider === id
                ? 'brand-gradient text-white'
                : dark ? 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              <Icon size={12} /> {plabel}
            </button>
          ))}
        </div>

        <form onSubmit={addConnection} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Label" value={form.label} onChange={(v) => setForm({ ...form, label: v })}
              placeholder={form.provider === 'SMTP' ? 'e.g. Team Mailer' : 'e.g. Prod Jira'} inp={inp} labelCls={label} required />
            <Field
              label={form.provider === 'JIRA' ? 'Base URL (your-domain.atlassian.net)' : form.provider === 'SMTP' ? 'SMTP server' : 'Base URL'}
              value={form.baseUrl} onChange={(v) => setForm({ ...form, baseUrl: v })}
              placeholder={form.provider === 'SMTP' ? 'smtp.gmail.com' : undefined}
              inp={inp} labelCls={label} required />
            <Field
              label={form.provider === 'JIRA' ? 'Account email' : form.provider === 'SMTP' ? 'From email' : 'Owner / org'}
              value={form.accountId} onChange={(v) => setForm({ ...form, accountId: v })}
              placeholder={form.provider === 'GITHUB' ? 'octocat' : 'you@example.com'}
              inp={inp} labelCls={label} required />
            {form.provider === 'GITHUB' && (
              <Field label="Repo" value={form.repo} onChange={(v) => setForm({ ...form, repo: v })}
                placeholder="my-repo" inp={inp} labelCls={label} required />
            )}
            {form.provider === 'SMTP' && (
              <Field label="Port" value={form.port} onChange={(v) => setForm({ ...form, port: v })}
                placeholder="587" type="number" inp={inp} labelCls={label} required />
            )}
            <Field
              label={form.provider === 'JIRA' ? 'API token' : form.provider === 'SMTP' ? 'Password' : 'Personal access token'}
              value={form.secret} onChange={(v) => setForm({ ...form, secret: v })}
              placeholder="•••••••• (write-only)" type="password" inp={inp} labelCls={label} required />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="inline-flex items-center justify-center gap-2 brand-gradient text-white px-4 py-2.5 rounded-xl text-[13.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {saving ? 'Saving…' : 'Add connection'}
            </button>
          </div>
        </form>
        <p className={`text-[11px] mt-3 leading-relaxed ${muted}`}>
          Tokens are encrypted at rest and never shown again. Connectors are read-only.
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', inp, labelCls, required, className = '' }) {
  return (
    <div className={className}>
      <label className={`block text-[11.5px] font-semibold mb-1 ${labelCls}`}>{label}</label>
      <input type={type} value={value} required={required} placeholder={placeholder}
        autoCapitalize="none"
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2.5 text-[13.5px] outline-none focus:ring-2 ${inp}`} />
    </div>
  )
}
