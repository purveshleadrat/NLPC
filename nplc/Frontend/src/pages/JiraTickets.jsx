import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJiraProjects, searchJiraTickets } from '../api/client'
import { Loader2, AlertTriangle, Search, Star, ChevronRight, Ticket } from 'lucide-react'

const PROJECT_COLORS = [
  'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500',
]

export default function JiraTickets() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [ticketCounts, setTicketCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jira_pinned') || '[]') } catch { return [] }
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await getJiraProjects()
        const list = res.data?.values ?? []
        setProjects(list)

        // fetch ticket counts per project in parallel
        const counts = {}
        await Promise.all(list.map(async (p) => {
          try {
            const r = await searchJiraTickets(`project = "${p.key}"`)
            counts[p.key] = r.data?.total ?? 0
          } catch {
            counts[p.key] = 0
          }
        }))
        setTicketCounts(counts)
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

  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.key.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const ap = pinned.includes(a.key) ? 0 : 1
    const bp = pinned.includes(b.key) ? 0 : 1
    return ap - bp
  })

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Initiatives</h2>
        <p className="text-gray-500 text-sm">{projects.length} projects</p>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or key..."
            className="pl-8 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white w-52"
          />
        </div>
        <FilterPill active>All</FilterPill>
        <FilterPill>Pinned ({pinned.length})</FilterPill>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 py-20 justify-center">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading projects…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sorted.length === 0 && (
        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Ticket size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No projects found.</p>
        </div>
      )}

      {/* Project cards grid */}
      {!loading && sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((project, i) => {
            const color = PROJECT_COLORS[i % PROJECT_COLORS.length]
            const isPinned = pinned.includes(project.key)
            const count = ticketCounts[project.key]

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/jira/${project.key}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group relative"
              >
                {/* Pin button */}
                <button
                  onClick={e => { e.stopPropagation(); togglePin(project.key) }}
                  className={`absolute top-4 right-4 transition-colors ${isPinned ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                >
                  <Star size={15} fill={isPinned ? 'currentColor' : 'none'} />
                </button>

                {/* Color dot + name */}
                <div className="flex items-start gap-3 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${color} mt-1.5 flex-shrink-0`} />
                  <div className="min-w-0 pr-5">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{project.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {project.key} · <span className="text-gray-500">{project.key.toLowerCase()}</span>
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 flex-wrap">
                  {count !== undefined ? (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      {count} tickets
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">loading…</span>
                  )}
                  <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium capitalize">
                    {project.projectTypeKey}
                  </span>
                  {isPinned && (
                    <span className="text-xs bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full font-medium">
                      Pinned
                    </span>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight
                  size={15}
                  className="absolute bottom-4 right-4 text-gray-300 group-hover:text-indigo-400 transition-colors"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterPill({ children, active }) {
  return (
    <button className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
    }`}>
      {children}
    </button>
  )
}
