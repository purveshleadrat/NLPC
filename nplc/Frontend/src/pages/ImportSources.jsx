import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  getConnections, searchJiraTickets, listGitHubBranches,
  importJira, importGitBranch,
} from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'
import {
  Ticket, Boxes, Search, Loader2, AlertTriangle, Download, GitBranch, Sparkles,
} from 'lucide-react'

// The passthrough endpoints fan out and return one ConnectionCall per connection:
// { connectionId, data, error }. Pick the entry for the connection we asked about.
function pick(list, connectionId) {
  const arr = Array.isArray(list) ? list : []
  return arr.find((e) => e.connectionId === connectionId) || arr[0] || null
}

// A Jira issue key like PRE-9514: project code, a hyphen, then a number.
const JIRA_KEY = /^[A-Za-z][A-Za-z0-9]*-\d+$/

// Build JQL from the search box so it handles both a text search and a ticket key.
// `text ~` searches summary/description/comments but never the key, so typing a key
// alone would find nothing - detect that shape and query by key as well. Empty search
// needs a bounded restriction: Jira's /search/jql rejects an unrestricted "ORDER BY".
function buildJiraJql(raw) {
  const q = (raw || '').trim()
  if (!q) return 'updated >= -90d ORDER BY updated DESC'
  const text = q.replace(/"/g, '\\"')
  if (JIRA_KEY.test(q)) {
    return `key = "${q.toUpperCase()}" OR text ~ "${text}" ORDER BY updated DESC`
  }
  return `text ~ "${text}" ORDER BY updated DESC`
}

export default function ImportSources() {
  const { dark } = useTheme()
  const { currentId } = useInitiative()

  const [tab, setTab] = useState('JIRA')
  const [connections, setConnections] = useState([])
  const [connId, setConnId] = useState('')
  const [items, setItems] = useState([])       // tickets or branches
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [busyKey, setBusyKey] = useState(null)  // which row is importing
  const [toast, setToast] = useState(null)

  const card  = dark ? 'glass-dark' : 'glass-light shadow-sm'
  const head  = dark ? 'text-gray-100' : 'text-gray-800'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const inp   = dark ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'

  const providerConns = connections.filter((c) => c.provider === tab)

  useEffect(() => {
    getConnections().then((r) => setConnections(r.data || [])).catch((e) => setError(e?.response?.data?.message || e.message))
  }, [])

  // Default the selected connection when the tab or connection list changes.
  useEffect(() => {
    const first = connections.find((c) => c.provider === tab)
    setConnId(first ? first.id : '')
    setItems([]); setError(null)
  }, [tab, connections])

  const runJira = useCallback(async () => {
    if (!connId) return
    setLoading(true); setError(null); setItems([])
    try {
      const res = await searchJiraTickets(buildJiraJql(query), connId)
      const entry = pick(res.data, connId)
      if (entry?.error) throw new Error(entry.error)
      setItems(entry?.data?.issues || [])
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [connId, query])

  const runGithub = useCallback(async () => {
    if (!connId) return
    setLoading(true); setError(null); setItems([])
    try {
      const res = await listGitHubBranches(connId)
      const entry = pick(res.data, connId)
      if (entry?.error) throw new Error(entry.error)
      let branches = entry?.data || []
      if (query.trim()) branches = branches.filter((b) => b.name?.toLowerCase().includes(query.trim().toLowerCase()))
      setItems(branches)
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [connId, query])

  async function doImportJira(key) {
    setBusyKey(key); setToast(null); setError(null)
    try {
      const res = await importJira(currentId, connId, key)
      flash(res.data)
    } catch (err) { setError(err?.response?.data?.message || err.message) }
    finally { setBusyKey(null) }
  }

  async function doImportBranch(branch) {
    setBusyKey(branch); setToast(null); setError(null)
    try {
      const res = await importGitBranch(currentId, connId, branch)
      flash(res.data)
    } catch (err) { setError(err?.response?.data?.message || err.message) }
    finally { setBusyKey(null) }
  }

  function flash(r) {
    const ex = r?.extraction
    const extra = ex ? ` → extracted ${ex.eventsCreated} event(s)` : ''
    setToast((r?.message || 'Imported') + extra + '. Open the Timeline to see it.')
  }

  const search = tab === 'JIRA' ? runJira : runGithub

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className={`text-[22px] font-bold ${head}`}>Import from Jira &amp; GitHub</h2>
        <p className={`text-[14px] ${muted}`}>Pick a source, import it, and it's sent to the LLM and added to the timeline.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['JIRA', 'GITHUB'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[14px] font-semibold transition-all ${tab === t
              ? 'brand-gradient text-white' : dark ? 'bg-white/[0.05] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            {t === 'JIRA' ? <Ticket size={14} /> : <Boxes size={14} />} {t === 'JIRA' ? 'Jira' : 'GitHub'}
          </button>
        ))}
      </div>

      {toast && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 text-[14px]">
          <Sparkles size={15} /> {toast}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-[14px]">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {providerConns.length === 0 ? (
        <div className={`rounded-2xl p-6 text-center ${card}`}>
          <p className={`text-[14px] ${muted}`}>
            No {tab === 'JIRA' ? 'Jira' : 'GitHub'} connection yet.{' '}
            <Link to="/settings" className="gradient-text font-semibold hover:underline">Add one in Settings →</Link>
          </p>
        </div>
      ) : (
        <div className={`rounded-2xl p-5 ${card}`}>
          {/* Connection + search row */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="min-w-[200px]">
              <label className={`block text-[12px] font-medium mb-1 ${muted}`}>
                {tab === 'JIRA' ? 'Jira site / org' : 'GitHub account / repo'}
              </label>
              <select value={connId} onChange={(e) => setConnId(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none ${inp}`}>
                {providerConns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} — {c.provider === 'GITHUB' ? `${c.accountId}/${c.repo}` : c.accountId}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className={`block text-[12px] font-medium mb-1 ${muted}`}>
                {tab === 'JIRA' ? 'Search tickets (text)' : 'Filter branches'}
              </label>
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder={tab === 'JIRA' ? 'e.g. bulk update (blank = recent)' : 'e.g. feature/'}
                className={`w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-emerald-500/30 ${inp}`} />
            </div>
            <button onClick={search} disabled={loading || !connId}
              className="flex items-center gap-2 brand-gradient text-white px-4 py-2.5 rounded-xl text-[14px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {tab === 'JIRA' ? 'Search' : 'List branches'}
            </button>
          </div>

          {/* Results */}
          {loading ? (
            <div className={`flex items-center gap-2 py-8 justify-center ${muted}`}><Loader2 size={18} className="animate-spin" /> Loading…</div>
          ) : items.length === 0 ? (
            <p className={`text-[14px] py-6 text-center ${muted}`}>No results yet — run a {tab === 'JIRA' ? 'search' : 'branch list'} above.</p>
          ) : tab === 'JIRA' ? (
            <div className="space-y-2">
              {items.map((it) => {
                const f = it.fields || {}
                return (
                  <Row key={it.id || it.key} dark={dark}
                    icon={<Ticket size={15} className="text-emerald-400" />}
                    title={`${it.key} · ${f.summary || ''}`}
                    sub={`${f.issuetype?.name || ''}${f.status?.name ? ' · ' + f.status.name : ''}`}
                    busy={busyKey === it.key}
                    onImport={() => doImportJira(it.key)} />
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((b) => (
                <Row key={b.name} dark={dark}
                  icon={<GitBranch size={15} className="text-emerald-400" />}
                  title={b.name}
                  sub={b.commit?.sha ? `latest ${String(b.commit.sha).slice(0, 8)}` : ''}
                  busy={busyKey === b.name}
                  onImport={() => doImportBranch(b.name)}
                  importLabel="Import commits" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ icon, title, sub, onImport, busy, dark, importLabel = 'Import' }) {
  const head  = dark ? 'text-gray-100' : 'text-gray-800'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
      <span className="flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] font-semibold truncate ${head}`}>{title}</div>
        {sub && <div className={`text-[12px] truncate ${muted}`}>{sub}</div>}
      </div>
      <button onClick={onImport} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold brand-gradient text-white hover:opacity-90 disabled:opacity-50 transition-all">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} {busy ? 'Importing…' : importLabel}
      </button>
    </div>
  )
}
