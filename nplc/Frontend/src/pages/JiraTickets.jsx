import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJiraProjects, searchJiraTickets, listGitHubBranches } from '../api/client'
import { AlertTriangle, Search, Star, ChevronDown, GitCommitHorizontal } from 'lucide-react'
import { LoadingScreen } from '../App'
import { useTheme } from '../context/ThemeContext'

const PROJECT_COLORS = [
  '#22c55e', '#3b82f6', '#a855f7', '#f97316',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444', '#6366f1', '#0ea5e9',
]

const SORT_OPTIONS = ['Recently updated', 'Name (A–Z)', 'Most tickets', 'Most branches']
const FILTERS = ['All', 'Has open questions', 'Recently changed', 'Pinned']

export default function JiraTickets() {
  const { dark } = useTheme()
  const navigate = useNavigate()
  const [projects, setProjects]     = useState([])
  const [ticketData, setTicketData] = useState({})  // { [key]: { total, openCount, hasQuestions, lastUpdated } }
  const [branches, setBranches]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('All')
  const [sort, setSort]             = useState('Recently updated')
  const [showSort, setShowSort]     = useState(false)
  const [pinned, setPinned]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('jira_pinned') || '[]') } catch { return [] }
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [projRes, branchRes] = await Promise.all([getJiraProjects(), listGitHubBranches()])
        // /jira/projects is tenant-scoped and fans out across connections: it returns an
        // array with one entry per Jira connection (each shaped like { data: { values } }
        // or { error }), not the raw single-site Jira response `{ values, total, ... }`.
        const raw = projRes.data
        const list = Array.isArray(raw)
          ? raw.flatMap(entry => entry?.data?.values ?? entry?.values ?? [])
          : raw?.values ?? []
        setBranches(branchRes.data ?? [])
        setProjects(list)

        const data = {}
        await Promise.all(list.map(async (p) => {
          try {
            const r = await searchJiraTickets(`project = "${p.key}" ORDER BY updated DESC`)
            const issues = r.data?.issues ?? []
            const total = r.data?.total ?? 0
            const openCount = issues.filter(i => {
              const s = i.fields?.status?.name
              return s === 'To Do' || s === 'In Progress'
            }).length
            const hasQuestions = issues.some(i =>
              i.fields?.summary?.toLowerCase().includes('question') ||
              i.fields?.issuetype?.name === 'Question'
            )
            const lastUpdated = issues[0]?.fields?.updated ?? null
            data[p.key] = { total, openCount, hasQuestions, lastUpdated, issues }
          } catch {
            data[p.key] = { total: 0, openCount: 0, hasQuestions: false, lastUpdated: null, issues: [] }
          }
        }))
        setTicketData(data)
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Failed to load projects.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function togglePin(key) {
    setPinned(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      localStorage.setItem('jira_pinned', JSON.stringify(next))
      return next
    })
  }

  function branchCount(projectKey) {
    const k = projectKey.toLowerCase()
    return branches.filter(b => b.name.toLowerCase().includes(k)).length
  }

  function isRecentlyChanged(key) {
    const d = ticketData[key]?.lastUpdated
    if (!d) return false
    return (Date.now() - new Date(d).getTime()) < 14 * 24 * 60 * 60 * 1000
  }

  function relativeDate(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const processed = useMemo(() => {
    let list = projects.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.key.toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'Pinned') return pinned.includes(p.key)
      if (filter === 'Has open questions') return ticketData[p.key]?.hasQuestions
      if (filter === 'Recently changed') return isRecentlyChanged(p.key)
      return true
    })

    return [...list].sort((a, b) => {
      if (sort === 'Name (A–Z)') return a.name.localeCompare(b.name)
      if (sort === 'Most tickets') return (ticketData[b.key]?.total ?? 0) - (ticketData[a.key]?.total ?? 0)
      if (sort === 'Most branches') return branchCount(b.key) - branchCount(a.key)
      const ap = pinned.includes(a.key) ? 0 : 1
      const bp = pinned.includes(b.key) ? 0 : 1
      if (ap !== bp) return ap - bp
      const ad = ticketData[a.key]?.lastUpdated ?? ''
      const bd = ticketData[b.key]?.lastUpdated ?? ''
      return bd.localeCompare(ad)
    })
  }, [projects, ticketData, search, filter, sort, pinned, branches])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Initiatives</h2>
        <p className="text-gray-400 text-sm">{projects.length} initiatives</p>
      </div>

      <div className="mb-5 mt-5">
        <h3 className="text-base font-bold text-gray-900 mb-1">All initiatives</h3>
        <p className="text-gray-400 text-sm max-w-xl">
          Search, filter and sort — built to stay usable whether your team owns three initiatives or
          three hundred. Click one to open its memory.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or key..."
            className="pl-8 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white w-52"
          />
        </div>

        {FILTERS.map(f => (
          <FilterPill key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === 'Pinned' ? <><Star size={11} className="inline mr-1" />{f}</> : f}
          </FilterPill>
        ))}

        <div className="relative ml-auto">
          <button
            onClick={() => setShowSort(s => !s)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:border-gray-400 transition-colors"
          >
            Sort: {sort}<ChevronDown size={13} />
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[180px] py-1">
              {SORT_OPTIONS.map(o => (
                <button
                  key={o}
                  onClick={() => { setSort(o); setShowSort(false) }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sort === o ? 'text-emerald-600 font-medium' : 'text-gray-700'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />{error}
        </div>
      )}

      {loading && <LoadingScreen dark={dark} />}

      {!loading && processed.length === 0 && (
        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl text-sm">
          No initiatives found.
        </div>
      )}

      {!loading && processed.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-3">{processed.length} initiatives</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {processed.map((p, i) => {
              const isPinned = pinned.includes(p.key)
              const td       = ticketData[p.key]
              const bc       = branchCount(p.key)
              const changed  = isRecentlyChanged(p.key)
              const updated  = relativeDate(td?.lastUpdated)
              const color    = PROJECT_COLORS[i % PROJECT_COLORS.length]

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/jira/${p.key}`)}
                  className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group relative"
                >
                  <button
                    onClick={e => { e.stopPropagation(); togglePin(p.key) }}
                    className={`absolute top-4 right-4 transition-colors ${isPinned ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                  >
                    <Star size={15} fill={isPinned ? 'currentColor' : 'none'} />
                  </button>

                  <div className="flex items-start gap-2.5 mb-0.5 pr-6">
                    <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                    <p className="font-bold text-gray-900 text-sm leading-tight">{p.name}</p>
                  </div>

                  <p className="text-xs text-gray-400 mb-3 pl-5">
                    {p.key}{updated && <> · updated {updated}</>}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap pl-5">
                    {td !== undefined
                      ? <Chip>{td.total} tickets</Chip>
                      : <span className="text-xs text-gray-300">loading…</span>
                    }
                    {bc > 0 && <Chip icon={<GitCommitHorizontal size={10} />}>{bc} {bc === 1 ? 'branch' : 'branches'}</Chip>}
                    {changed && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                        changed
                      </span>
                    )}
                    {td?.openCount > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">
                        {td.openCount} open
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function FilterPill({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer ${active ? 'btn-prototype-pill-active' : 'btn-prototype-pill'}`}
    >
      {children}
    </button>
  )
}

function Chip({ children, icon }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[5px] border border-white/10 bg-white/[0.03] text-gray-400">
      {icon}{children}
    </span>
  )
}
