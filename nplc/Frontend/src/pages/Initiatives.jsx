import { useState, useEffect, useRef, useCallback } from 'react'
import { LoadingScreen } from '../App'
import { useNavigate } from 'react-router-dom'
import { Search, Star, ChevronDown, ChevronLeft, ChevronRight, Plus, GitCommitHorizontal, Ticket, Pencil, Eye, Trash2, Check, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'
import { getInitiativesList } from '../api/client'
import NewInitiativeModal from '../components/NewInitiativeModal'
import EditInitiativeSheet from '../components/EditInitiativeSheet'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'


const PROJECT_COLORS = [
  '#22c55e', '#3b82f6', '#a855f7', '#f97316',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444', '#10b981', '#0ea5e9',
]

const PRIORITY_META = {
  HIGH: { label: 'High', dot: '#f87171', text: 'text-red-400' },
  MEDIUM: { label: 'Medium', dot: '#fbbf24', text: 'text-amber-400' },
  LOW: { label: 'Low', dot: '#60a5fa', text: 'text-blue-400' },
}

const SORT_OPTIONS = [
  { label: 'Recently updated', value: 'updated_desc' },
  { label: 'Name (A–Z)', value: 'name_asc' },
  { label: 'Most tickets', value: 'most_tickets' },
]
const FILTERS = ['All', 'Recently changed', 'Pinned']
const PINNED_KEY = 'nplc_initiative_pinned'
const PAGE_SIZE_OPTIONS = [6, 12, 24, 48]
const CHANGED_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

export default function Initiatives() {
  const { dark } = useTheme()
  const navigate = useNavigate()
  const { select, remove } = useInitiative()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState(SORT_OPTIONS[0])
  const [showSort, setShowSort] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingInitiative, setEditingInitiative] = useState(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1])
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]') } catch { return [] }
  })
  const debounceRef = useRef(null)

  // Debounced so every keystroke doesn't fire a request.
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  // Any filter/search/sort/page-size change starts back at page 0 - staying on page 4 of a
  // now-shorter result set would just show an empty page.
  useEffect(() => { setPage(0) }, [debouncedSearch, filter, sort, pageSize])

  const load = useCallback(() => {
    // Nothing pinned yet - skip the request entirely rather than let an empty ids list
    // collapse into "no ids filter" server-side and show everything.
    if (filter === 'Pinned' && pinned.length === 0) {
      setData({ content: [], totalElements: 0, totalPages: 0 })
      setLoading(false)
      return
    }
    setLoading(true); setError(null)
    getInitiativesList({
      page,
      size: pageSize,
      sort: sort.value,
      search: debouncedSearch,
      filter: filter === 'Recently changed' ? 'changed' : undefined,
      ids: filter === 'Pinned' ? pinned : undefined,
    })
      .then(res => setData(res.data))
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }, [page, pageSize, sort, debouncedSearch, filter, pinned])

  useEffect(() => { load() }, [load])

  async function confirmDelete(id) {
    try {
      await remove(id)
      load()
    } finally {
      setConfirmDeleteId(null)
    }
  }

  function togglePin(id) {
    setPinned(prev => {
      const next = prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
      localStorage.setItem(PINNED_KEY, JSON.stringify(next))
      return next
    })
  }

  function isRecentlyChanged(lastUpdated) {
    if (!lastUpdated) return false
    return (Date.now() - new Date(lastUpdated).getTime()) < CHANGED_WINDOW_MS
  }

  function relativeDate(dateStr) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const items = data.content || []
  const totalPages = data.totalPages || 0

  const card = dark ? 'bg-white/[0.03] border border-white/[0.07] hover:border-emerald-400/40' : 'bg-white border border-gray-200 hover:border-emerald-300'
  const title = dark ? 'text-gray-100' : 'text-gray-900'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const input = dark
    ? 'bg-white/[0.04] border-white/10 text-gray-100 placeholder-gray-600'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'

  return (
    <div className="min-h-full flex flex-col">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className={`text-[19px] font-bold tracking-[-0.3px] mb-[3px] ${title}`}>
            Initiatives <span className={`font-normal text-[13px] ${muted}`}>· {data.totalElements}</span>
          </h2>
          <p className={`text-[13.5px] max-w-[66ch] ${muted}`}>
            Search, filter and sort — built to stay usable whether your team owns three initiatives or
            three hundred. Click one to open its memory.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-prototype-primary cursor-pointer flex-shrink-0"
        >
          <Plus size={12} /> New initiative
        </button>
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
            Sort: {sort.label}<ChevronDown size={11} />
          </button>
          {showSort && (
            <div className={`absolute right-0 top-full mt-1 rounded-[7px] shadow-lg z-10 min-w-[160px] py-1 border ${dark ? 'bg-[#15151f] border-white/10' : 'bg-white border-gray-200'}`}>
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => { setSort(o); setShowSort(false) }}
                  className={`w-full text-left px-3 py-1.5 text-[12px] font-medium cursor-pointer ${sort.value === o.value ? 'text-blue-400' : dark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <LoadingScreen dark={dark} />}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-[13px] mb-4">
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className={`text-center py-20 border-2 border-dashed rounded-xl text-[13px] ${dark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          No initiatives found.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))' }}>
            {items.map((init, i) => {
              const isPinned = pinned.includes(init.id)
              const changed = isRecentlyChanged(init.lastUpdated)
              const updated = relativeDate(init.lastUpdated)
              const color = PROJECT_COLORS[i % PROJECT_COLORS.length]

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
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }}
                          title="Cancel"
                          className={dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setEditingInitiative(init) }}
                          title="Edit"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${dark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); select(init.id); navigate(`/initiatives/${init.id}`) }}
                          title="View"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${dark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(init.id) }}
                          title="Delete"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${dark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); togglePin(init.id) }}
                          className={`transition-colors ${isPinned ? 'text-yellow-400' : dark ? 'text-gray-600 hover:text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                        >
                          <Star size={15} fill={isPinned ? 'currentColor' : 'none'} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-[9px] mb-2 pr-16">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
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
                    {init.scopeLabel || 'No connections'}{updated && <> · updated {updated}</>}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[5px] border ${dark ? 'bg-white/[0.03] border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      <Ticket size={10} className="opacity-70" />{init.ticketCount ?? 0} tickets
                    </span>
                    {init.commitCount > 0 && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[5px] border ${dark ? 'bg-white/[0.03] border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        <GitCommitHorizontal size={10} className="opacity-70" />{init.commitCount} commits
                      </span>
                    )}
                    {changed && (
                      <span className="badge-prototype badge-decision">
                        changed
                      </span>
                    )}
                    {init.openCount > 0 && (
                      <span className="badge-prototype badge-open">
                        {init.openCount} open
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {
            <div className="flex items-center justify-end gap-3 mt-auto pt-6">
              <span className={`text-[12px] ${muted}`}>
                Showing {page * pageSize + 1}–{page * pageSize + items.length} of {data.totalElements}
              </span>
              <div className={`flex items-center gap-1.5 text-[12px] ${muted}`}>
                Per page
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="h-7 w-[68px] px-2 py-1 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-prototype-tab flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={12} /> Prev
              </button>
              <span className={`text-[12px] ${muted}`}>Page {page + 1} of {Math.max(totalPages, 1)}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-prototype-tab flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          }
        </>
      )}

      {showNewModal && <NewInitiativeModal onClose={() => { setShowNewModal(false); load() }} />}
      {editingInitiative && (
        <EditInitiativeSheet initiative={editingInitiative} onClose={() => { setEditingInitiative(null); load() }} />
      )}
    </div>
  )
}
