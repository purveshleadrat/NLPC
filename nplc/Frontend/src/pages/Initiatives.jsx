import { useState, useEffect, useMemo, useCallback } from 'react'
import { LoadingScreen } from '../App'
import { useNavigate } from 'react-router-dom'
import { Search, Star, ChevronDown, Plus, GitCommitHorizontal, Ticket, Pencil, Eye, Trash2, Check, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'
import { getInitiativeConnections, getConnections, getSources, getEvents } from '../api/client'
import NewInitiativeModal from '../components/NewInitiativeModal'
import EditInitiativeSheet from '../components/EditInitiativeSheet'


const PRIORITY_META = {
  HIGH: { label: 'High', dot: '#f87171', text: 'text-red-400' },
  MEDIUM: { label: 'Medium', dot: '#fbbf24', text: 'text-amber-400' },
  LOW: { label: 'Low', dot: '#60a5fa', text: 'text-blue-400' },
}

const SORT_OPTIONS = ['Recently updated', 'Name (A–Z)', 'Most tickets']
const FILTERS = ['All', 'Recently changed', 'Pinned']
const PINNED_KEY = 'nplc_initiative_pinned'

export default function Initiatives() {
  const { dark } = useTheme()
  const navigate = useNavigate()
  const { initiatives, loading: initiativesLoading, select, remove } = useInitiative()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [summaries, setSummaries] = useState({}) // { [id]: { scopeLabel, ticketCount, commitCount, openCount, lastUpdated } }
  const [loadingSummaries, setLoadingSummaries] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('Recently updated')
  const [showSort, setShowSort] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingInitiative, setEditingInitiative] = useState(null)
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

  const card = dark ? 'bg-white/[0.03] border border-white/[0.07] hover:border-emerald-400/40' : 'bg-white border border-gray-200 hover:border-emerald-300'
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
            className={`pl-8 pr-3 py-1.5 border rounded-full text-[12px] focus:outline-none focus:ring-1 focus:ring-emerald-400 w-48 ${input}`}
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

      {loading && <LoadingScreen dark={dark} />}

      {!loading && processed.length === 0 && (
        <div className={`text-center py-20 border-2 border-dashed rounded-xl text-[13px] ${dark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          No initiatives found.
        </div>
      )}

      {!loading && processed.length > 0 && (
        <>
          <p className={`text-[12px] mb-3 ${muted}`}>{processed.length} initiatives</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))' }}>
            {processed.map((init) => {
              const s = summaries[init.id] || {}
              const isPinned = pinned.includes(init.id)
              const changed = isRecentlyChanged(init.id)
              const updated = relativeDate(s.lastUpdated)

              const isConfirmingDelete = confirmDeleteId === init.id

              return (
                <div
                  key={init.id}
                  onClick={() => { select(init.id); navigate(`/initiatives/${init.id}`) }}
                  className={`rounded-xl px-[15px] py-[14px] cursor-pointer transition-all group relative ${card}`}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {isConfirmingDelete ? (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); confirmDelete(init.id) }}
                          title="Confirm delete"
                          className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }}
                          title="Cancel"
                          className={`cursor-pointer ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setEditingInitiative(init) }}
                          title="Edit"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${dark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); select(init.id); navigate(`/initiatives/${init.id}`) }}
                          title="View"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${dark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(init.id) }}
                          title="Delete"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${dark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); togglePin(init.id) }}
                          className={`transition-colors cursor-pointer ${isPinned ? 'text-yellow-400' : dark ? 'text-gray-600 hover:text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                        >
                          <Star size={13} fill={isPinned ? 'currentColor' : 'none'} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-[9px] mb-2 pr-16">
                    <p className={`font-bold text-[14.5px] tracking-[-0.2px] leading-tight truncate ${title}`}>{init.name}</p>
                  </div>

                  {init.priority && PRIORITY_META[init.priority] && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-px" style={{ background: PRIORITY_META[init.priority].dot }} />
                      <span className={`text-[10.5px] leading-none font-semibold uppercase tracking-wide ${PRIORITY_META[init.priority].text}`}>
                        {PRIORITY_META[init.priority].label} priority
                      </span>
                    </div>
                  )}

                  {init.description && (
                    <p title={init.description} className={`text-[12px] mb-2 line-clamp-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {init.description}
                    </p>
                  )}

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
      {editingInitiative && (
        <EditInitiativeSheet initiative={editingInitiative} onClose={() => setEditingInitiative(null)} />
      )}
    </div>
  )
}
