import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, Star, ChevronDown, Plus, GitCommitHorizontal, Ticket, Pencil, Trash2, Check, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'
import { getInitiativeConnections, getConnections, getSources, getEvents } from '../api/client'
import NewInitiativeModal from '../components/NewInitiativeModal'

const PROJECT_COLORS = [
  '#22c55e', '#3b82f6', '#a855f7', '#f97316',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444', '#6366f1', '#0ea5e9',
]

const SORT_OPTIONS = ['Recently updated', 'Name (A–Z)', 'Most tickets']
const FILTERS = ['All', 'Has open questions', 'Recently changed', 'Pinned']
const PINNED_KEY = 'nplc_initiative_pinned'

export default function Initiatives() {
  const { dark } = useTheme()
  const navigate = useNavigate()
  const { initiatives, loading: initiativesLoading, select, rename, remove } = useInitiative()
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [summaries, setSummaries] = useState({}) // { [id]: { scopeLabel, ticketCount, commitCount, openCount, lastUpdated } }
  const [loadingSummaries, setLoadingSummaries] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('Recently updated')
  const [showSort, setShowSort] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]') } catch { return [] }
  })

  const loadSummaries = useCallback(async () => {
    if (initiatives.length === 0) { setLoadingSummaries(false); return }
    setLoadingSummaries(true)
    const conns = await getConnections().then(r => r.data || []).catch(() => [])

    const entries = await Promise.all(initiatives.map(async (init) => {
      try {
        const [bindingsRes, sourcesRes, eventsRes] = await Promise.all([
          getInitiativeConnections(init.id).catch(() => ({ data: [] })),
          getSources(init.id).catch(() => ({ data: [] })),
          getEvents(init.id).catch(() => ({ data: [] })),
        ])
        const bindings = bindingsRes.data || []
        const sources = sourcesRes.data || []
        const events = eventsRes.data || []

        const scopeLabel = bindings.map(b => {
          const c = conns.find(x => x.id === b.connectionId)
          if (!c) return null
          return c.provider === 'JIRA' ? (b.scopeKey || c.label) : `${c.accountId}/${c.repo}`
        }).filter(Boolean).join(' · ')

        const ticketCount = sources.filter(s => s.type === 'ticket').length
        const commitCount = sources.filter(s => s.type === 'commit').length
        const openCount = events.filter(e => e.eventType === 'OPEN_QUESTION' && e.status === 'UNRESOLVED').length
        const dates = [...sources.map(s => s.createdAt), ...events.map(e => e.createdAt), init.createdAt].filter(Boolean)
        const lastUpdated = dates.sort().at(-1) || init.createdAt

        return [init.id, { scopeLabel, ticketCount, commitCount, openCount, lastUpdated }]
      } catch {
        return [init.id, { scopeLabel: '', ticketCount: 0, commitCount: 0, openCount: 0, lastUpdated: init.createdAt }]
      }
    }))
    setSummaries(Object.fromEntries(entries))
    setLoadingSummaries(false)
  }, [initiatives])

  useEffect(() => { loadSummaries() }, [loadSummaries])

  function startRename(init) {
    setRenamingId(init.id)
    setRenameValue(init.name)
    setConfirmDeleteId(null)
  }

  async function commitRename(id) {
    const value = renameValue.trim()
    setRenamingId(null)
    if (!value) return
    const current = initiatives.find(i => i.id === id)
    if (value === current?.name) return
    try { await rename(id, value) } catch { /* keep old name displayed on failure */ }
  }

  async function confirmDelete(id) {
    try { await remove(id) } finally { setConfirmDeleteId(null) }
  }

  function togglePin(id) {
    setPinned(prev => {
      const next = prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
      localStorage.setItem(PINNED_KEY, JSON.stringify(next))
      return next
    })
  }

  function isRecentlyChanged(id) {
    const d = summaries[id]?.lastUpdated
    if (!d) return false
    return (Date.now() - new Date(d).getTime()) < 14 * 24 * 60 * 60 * 1000
  }

  function relativeDate(dateStr) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const processed = useMemo(() => {
    let list = initiatives.filter(i => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'Pinned') return pinned.includes(i.id)
      if (filter === 'Has open questions') return (summaries[i.id]?.openCount ?? 0) > 0
      if (filter === 'Recently changed') return isRecentlyChanged(i.id)
      return true
    })

    return [...list].sort((a, b) => {
      if (sort === 'Name (A–Z)') return a.name.localeCompare(b.name)
      if (sort === 'Most tickets') return (summaries[b.id]?.ticketCount ?? 0) - (summaries[a.id]?.ticketCount ?? 0)
      const ap = pinned.includes(a.id) ? 0 : 1
      const bp = pinned.includes(b.id) ? 0 : 1
      if (ap !== bp) return ap - bp
      const ad = summaries[a.id]?.lastUpdated ?? ''
      const bd = summaries[b.id]?.lastUpdated ?? ''
      return bd.localeCompare(ad)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initiatives, summaries, search, filter, sort, pinned])

  const loading = initiativesLoading || loadingSummaries

  const card = dark ? 'bg-white/[0.03] border border-white/[0.07] hover:border-indigo-400/40' : 'bg-white border border-gray-200 hover:border-indigo-300'
  const title = dark ? 'text-gray-100' : 'text-gray-900'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const input = dark
    ? 'bg-white/[0.04] border-white/10 text-gray-100 placeholder-gray-600'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'

  return (
    <div>
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h2 className={`text-[18px] font-bold tracking-[-0.3px] ${title}`}>Initiatives</h2>
          <p className={`text-[12px] ${muted}`}>{initiatives.length} initiatives</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-prototype-primary cursor-pointer"
        >
          <Plus size={12} /> New initiative
        </button>
      </div>

      <div className="mb-4 mt-5">
        <h3 className={`text-[19px] font-bold mb-[3px] tracking-[-0.3px] ${title}`}>All initiatives</h3>
        <p className={`text-[13.5px] max-w-[66ch] ${muted}`}>
          Search, filter and sort — built to stay usable whether your team owns three initiatives or
          three hundred. Click one to open its memory.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative">
          <Search size={11} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className={`pl-8 pr-3 py-1.5 border rounded-full text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400 w-48 ${input}`}
          />
        </div>

        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`cursor-pointer ${filter === f ? 'btn-prototype-pill-active' : 'btn-prototype-pill'}`}
          >
            {f === 'Pinned' ? <><Star size={10} className="inline mr-1" />{f}</> : f}
          </button>
        ))}

        <div className="relative ml-auto">
          <button
            onClick={() => setShowSort(s => !s)}
            className="btn-prototype-tab flex items-center gap-1.5 cursor-pointer"
          >
            Sort: {sort}<ChevronDown size={11} />
          </button>
          {showSort && (
            <div className={`absolute right-0 top-full mt-1 rounded-[7px] shadow-lg z-10 min-w-[160px] py-1 border ${dark ? 'bg-[#15151f] border-white/10' : 'bg-white border-gray-200'}`}>
              {SORT_OPTIONS.map(o => (
                <button
                  key={o}
                  onClick={() => { setSort(o); setShowSort(false) }}
                  className={`w-full text-left px-3 py-1.5 text-[12px] font-medium cursor-pointer ${sort === o ? 'text-blue-400' : dark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className={`flex items-center gap-2 py-20 justify-center ${muted}`}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading initiatives…</span>
        </div>
      )}

      {!loading && processed.length === 0 && (
        <div className={`text-center py-20 border-2 border-dashed rounded-xl text-[13px] ${dark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          No initiatives found.
        </div>
      )}

      {!loading && processed.length > 0 && (
        <>
          <p className={`text-[12px] mb-3 ${muted}`}>{processed.length} initiatives</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))' }}>
            {processed.map((init, i) => {
              const s = summaries[init.id] || {}
              const isPinned = pinned.includes(init.id)
              const changed = isRecentlyChanged(init.id)
              const updated = relativeDate(s.lastUpdated)
              const color = PROJECT_COLORS[i % PROJECT_COLORS.length]

              const isRenaming = renamingId === init.id
              const isConfirmingDelete = confirmDeleteId === init.id

              return (
                <div
                  key={init.id}
                  onClick={() => { if (!isRenaming) { select(init.id); navigate('/workspace') } }}
                  className={`rounded-xl px-[15px] py-[14px] cursor-pointer transition-all group relative ${card}`}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {isConfirmingDelete ? (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); confirmDelete(init.id) }}
                          title="Confirm delete"
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }}
                          title="Cancel"
                          className={dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); startRename(init) }}
                          title="Rename"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${dark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(init.id) }}
                          title="Delete"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${dark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); togglePin(init.id) }}
                          className={`transition-colors ${isPinned ? 'text-yellow-400' : dark ? 'text-gray-600 hover:text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                        >
                          <Star size={13} fill={isPinned ? 'currentColor' : 'none'} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-[9px] mb-2 pr-16">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(init.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename(init.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        className={`w-full font-bold text-[14.5px] tracking-[-0.2px] rounded px-1 -mx-1 outline-none ring-1 ring-blue-400 ${dark ? 'bg-white/[0.06] text-gray-100' : 'bg-white text-gray-900'}`}
                      />
                    ) : (
                      <p className={`font-bold text-[14.5px] tracking-[-0.2px] leading-tight truncate ${title}`}>{init.name}</p>
                    )}
                  </div>

                  <p className={`text-[11.5px] mb-2.5 ${muted}`}>
                    {s.scopeLabel || 'No connections'}{updated && <> · updated {updated}</>}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[5px] border ${dark ? 'bg-white/[0.03] border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      <Ticket size={10} className="opacity-70" />{s.ticketCount ?? 0} tickets
                    </span>
                    {s.commitCount > 0 && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[5px] border ${dark ? 'bg-white/[0.03] border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        <GitCommitHorizontal size={10} className="opacity-70" />{s.commitCount} commits
                      </span>
                    )}
                    {changed && (
                      <span className="badge-prototype badge-decision">
                        changed
                      </span>
                    )}
                    {s.openCount > 0 && (
                      <span className="badge-prototype badge-open">
                        {s.openCount} open
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {showNewModal && <NewInitiativeModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}
