import { useEffect, useState, useCallback } from 'react'
import {
  getConnections, createConnection, deleteConnection,
  getInitiativeConnections, bindConnection, unbindConnection,
} from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'
import {
  Plug, Plus, Trash2, Loader2, AlertTriangle, CheckCircle, Link2, Unlink, Boxes, Ticket, Edit3,
} from 'lucide-react'

const BLANK_JIRA = { provider: 'JIRA', label: '', baseUrl: 'https://your-domain.atlassian.net', accountId: '', repo: '', secret: '' }
const BLANK_GH   = { provider: 'GITHUB', label: '', baseUrl: 'https://api.github.com', accountId: '', repo: '', secret: '' }

export default function Settings() {
  const { dark } = useTheme()
  const { current, currentId, rename, remove } = useInitiative()

  const [connections, setConnections] = useState([])
  const [bindings, setBindings] = useState([])   // [{connectionId, scopeKey}]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(BLANK_JIRA)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(current?.name || '')

  const card  = dark ? 'glass-dark' : 'glass-light shadow-sm'
  const label = dark ? 'text-gray-400' : 'text-gray-500'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const head  = dark ? 'text-gray-100' : 'text-gray-800'
  const inp   = dark
    ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'

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
  useEffect(() => { setName(current?.name || '') }, [current])

  const boundIds = new Set(bindings.map((b) => b.connectionId))

  async function addConnection(e) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const payload = { ...form }
      if (payload.provider === 'JIRA') delete payload.repo
      await createConnection(payload)
      setForm(form.provider === 'JIRA' ? BLANK_JIRA : BLANK_GH)
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

  async function toggleBind(conn) {
    try {
      if (boundIds.has(conn.id)) {
        await unbindConnection(currentId, conn.id)
      } else {
        const scopeKey = window.prompt(
          conn.provider === 'JIRA'
            ? 'Jira project key to scope this initiative to (blank = whole site), e.g. CJ'
            : 'GitHub branch prefix/substring to scope to (blank = whole repo), e.g. feature/bulk',
          '',
        )
        if (scopeKey === null) return
        await bindConnection(currentId, conn.id, scopeKey.trim())
      }
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    }
  }

  async function saveRename() {
    if (!name.trim() || name.trim() === current?.name) return
    try { await rename(currentId, name.trim()) }
    catch (err) { setError(err?.response?.data?.message || err.message) }
  }

  async function deleteInit() {
    if (!window.confirm(`Delete initiative "${current?.name}" and ALL its sources, events and history? This cannot be undone.`)) return
    try { await remove(currentId) }
    catch (err) { setError(err?.response?.data?.message || err.message) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className={`text-[22px] font-bold ${head}`}>Settings</h2>
        <p className={`text-[14px] ${muted}`}>Manage this initiative and the Jira / GitHub accounts it pulls from.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-[14px]">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Initiative */}
      <div className={`rounded-2xl p-5 ${card}`}>
        <div className="flex items-center gap-2 mb-4">
          <Edit3 size={15} className="text-indigo-400" />
          <h3 className={`text-[16px] font-semibold ${head}`}>Initiative</h3>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className={`block text-[12px] font-medium mb-1 ${label}`}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-indigo-500/30 ${inp}`} />
          </div>
          <button onClick={saveRename} disabled={!name.trim() || name.trim() === current?.name}
            className="brand-gradient text-white px-4 py-2.5 rounded-xl text-[14px] font-semibold hover:opacity-90 disabled:opacity-40 transition-all">
            Rename
          </button>
          <button onClick={deleteInit}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[14px] font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Connections list */}
      <div className={`rounded-2xl p-5 ${card}`}>
        <div className="flex items-center gap-2 mb-4">
          <Plug size={15} className="text-indigo-400" />
          <h3 className={`text-[16px] font-semibold ${head}`}>Connections</h3>
          <span className={`text-[12px] ${muted}`}>· link one to this initiative so Sync pulls from it</span>
        </div>

        {loading ? (
          <div className={`flex items-center gap-2 py-6 ${muted}`}><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : connections.length === 0 ? (
          <p className={`text-[14px] py-4 ${muted}`}>No connections yet. Add one below.</p>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => {
              const bound = boundIds.has(c.id)
              const scope = bindings.find((b) => b.connectionId === c.id)?.scopeKey
              return (
                <div key={c.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                  {c.provider === 'JIRA' ? <Ticket size={16} className="text-blue-400 flex-shrink-0" /> : <Boxes size={16} className={dark ? 'text-gray-200 flex-shrink-0' : 'text-gray-700 flex-shrink-0'} />}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[14px] font-semibold truncate ${head}`}>
                      {c.label} <span className={`text-[12px] font-normal ${muted}`}>· {c.provider === 'GITHUB' ? `${c.accountId}/${c.repo}` : c.accountId}</span>
                    </div>
                    <div className={`text-[12px] truncate ${muted}`}>
                      {c.baseUrl} · status {c.status}{bound && scope ? ` · scope "${scope}"` : ''}
                    </div>
                  </div>
                  <button onClick={() => toggleBind(c)} disabled={!currentId}
                    title={bound ? 'Unlink from this initiative' : 'Link to this initiative'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all ${bound
                      ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                      : dark ? 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.1]' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                    {bound ? <><Unlink size={13} /> Linked</> : <><Link2 size={13} /> Link</>}
                  </button>
                  <button onClick={() => removeConnection(c.id)} title="Delete connection"
                    className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add connection */}
      <div className={`rounded-2xl p-5 ${card}`}>
        <div className="flex items-center gap-2 mb-4">
          <Plus size={15} className="text-indigo-400" />
          <h3 className={`text-[16px] font-semibold ${head}`}>Add a connection</h3>
        </div>

        <div className="flex gap-2 mb-4">
          {['JIRA', 'GITHUB'].map((p) => (
            <button key={p} onClick={() => setForm(p === 'JIRA' ? BLANK_JIRA : BLANK_GH)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${form.provider === p
                ? 'brand-gradient text-white'
                : dark ? 'bg-white/[0.05] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              {p === 'JIRA' ? <Ticket size={13} /> : <Boxes size={13} />} {p === 'JIRA' ? 'Jira' : 'GitHub'}
            </button>
          ))}
        </div>

        <form onSubmit={addConnection} className="grid grid-cols-2 gap-3">
          <Field label="Label" value={form.label} onChange={(v) => setForm({ ...form, label: v })} placeholder="e.g. Prod Jira" inp={inp} labelCls={label} required />
          <Field label={form.provider === 'JIRA' ? 'Base URL (your-domain.atlassian.net)' : 'Base URL'} value={form.baseUrl} onChange={(v) => setForm({ ...form, baseUrl: v })} inp={inp} labelCls={label} required />
          <Field label={form.provider === 'JIRA' ? 'Account email' : 'Owner / org'} value={form.accountId} onChange={(v) => setForm({ ...form, accountId: v })} placeholder={form.provider === 'JIRA' ? 'you@example.com' : 'octocat'} inp={inp} labelCls={label} required />
          {form.provider === 'GITHUB' && (
            <Field label="Repo" value={form.repo} onChange={(v) => setForm({ ...form, repo: v })} placeholder="my-repo" inp={inp} labelCls={label} required />
          )}
          <Field label={form.provider === 'JIRA' ? 'API token' : 'Personal access token'} value={form.secret} onChange={(v) => setForm({ ...form, secret: v })} placeholder="•••••••• (write-only)" type="password" inp={inp} labelCls={label} required />
          <div className="col-span-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 brand-gradient text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {saving ? 'Saving…' : 'Add connection'}
            </button>
          </div>
        </form>
        <p className={`text-[11.5px] mt-3 ${muted}`}>
          Tokens are encrypted at rest and never shown again. Connectors are read-only — nothing is written back to Jira or GitHub.
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', inp, labelCls, required }) {
  return (
    <div>
      <label className={`block text-[12px] font-medium mb-1 ${labelCls}`}>{label}</label>
      <input type={type} value={value} required={required} placeholder={placeholder}
        autoCapitalize="none"
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-indigo-500/30 ${inp}`} />
    </div>
  )
}
