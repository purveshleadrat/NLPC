import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { searchJiraTickets, listGitHubBranches } from '../api/client'
import { ArrowLeft, RefreshCw, AlertTriangle, Search } from 'lucide-react'
import { LoadingScreen } from '../App'
import { useTheme } from '../context/ThemeContext'

const TABS    = ['Timeline', 'Scope', 'Ask', 'Brief', 'Add source', 'Add decision']
const FILTERS = ['All', 'Decisions', 'Tickets', 'Commits', 'Questions', 'Requirements']

const TYPE_STYLE = {
  Jira:     { dot: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)',  text: '#93c5fd' },
  Commit:   { dot: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',   text: '#86efac' },
}

const STATUS_STYLE = {
  'In Progress': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'Done':        'bg-green-500/20 text-green-300 border border-green-500/30',
  'To Do':       'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  'Blocked':     'bg-red-500/20 text-red-300 border border-red-500/30',
}

function buildTimelineItems(issues, branches, projectKey) {
  const items = []

  // Jira tickets as timeline entries
  issues.forEach(issue => {
    const f = issue.fields ?? {}
    items.push({
      id:      issue.id,
      date:    formatDate(f.updated || f.created),
      type:    'Jira',
      label:   issue.key,
      title:   `${issue.key} · ${f.summary ?? ''}`,
      desc:    f.description?.content?.[0]?.content?.[0]?.text ?? (f.status?.name ?? ''),
      status:  f.status?.name ?? null,
      rawDate: f.updated || f.created,
    })
  })

  // GitHub branches that match this project key
  const key = projectKey.toLowerCase()
  branches
    .filter(b => b.name.toLowerCase().includes(key))
    .forEach(b => {
      items.push({
        id:      `branch-${b.name}`,
        date:    '17 Sep · 2026',
        type:    'Commit',
        label:   b.name,
        title:   `Branch: ${b.name}`,
        desc:    `SHA ${b.commit.sha.slice(0, 8)} — purveshleadrat/NLPC`,
        status:  null,
        rawDate: '',
      })
    })

  return items.sort((a, b) => (a.rawDate < b.rawDate ? 1 : -1))
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function filterMatch(item, f) {
  if (f === 'All')     return true
  if (f === 'Tickets') return item.type === 'Jira'
  if (f === 'Commits') return item.type === 'Commit'
  return true
}

export default function JiraTicketDetail() {
  const { dark } = useTheme()
  const { key } = useParams()
  const navigate = useNavigate()
  const [issues, setIssues]         = useState([])
  const [branches, setBranches]     = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [activeTab, setActiveTab]   = useState('Timeline')
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch]         = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [ticketRes, branchRes] = await Promise.all([
        searchJiraTickets(`project = "${key}" ORDER BY updated DESC`),
        listGitHubBranches(),
      ])
      setIssues(ticketRes.data?.issues ?? [])
      setTotal(ticketRes.data?.total ?? 0)
      setBranches(branchRes.data ?? [])
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [key])

  const allItems = buildTimelineItems(issues, branches, key)

  const filtered = allItems.filter(item => {
    if (!filterMatch(item, activeFilter)) return false
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const projectName = issues[0]?.fields?.project?.name ?? key

  return (
    <div className="min-h-screen bg-[#0d1117] text-white -m-8 p-0">
      {/* Top bar */}
      <div className="border-b border-[#21262d] px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/jira')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">{projectName}</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {key} · purveshleadrat/NLPC
              {total > 0 && <> · {total} tickets</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer ${activeTab === tab ? 'btn-prototype-tab-active' : 'btn-prototype-tab'}`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={load}
            className="btn-prototype-tab flex items-center gap-1.5 cursor-pointer ml-1"
          >
            <RefreshCw size={11} /> Sync
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {activeTab === 'Timeline' ? (
          <>
            <div className="mb-5">
              <h2 className="text-white font-bold text-xl mb-1">Timeline</h2>
              <p className="text-gray-500 text-sm">
                Everything that happened to this initiative, in order. Filter by type or search when it gets long.
              </p>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <div className="relative">
                <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search timeline..."
                  className="bg-[#161b22] border border-[#30363d] rounded-full pl-8 pr-3 py-1.5 text-[12px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-44"
                />
              </div>
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`cursor-pointer ${activeFilter === f ? 'btn-prototype-pill-active' : 'btn-prototype-pill'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading && <LoadingScreen dark={dark} />}

            {error && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-6">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />{error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="text-center py-24 text-gray-600 border border-dashed border-[#30363d] rounded-xl text-sm">
                No items found for this filter.
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="max-w-3xl">
                {filtered.map((item, i) => {
                  const ts     = TYPE_STYLE[item.type] ?? TYPE_STYLE.Jira
                  const isLast = i === filtered.length - 1
                  return (
                    <div key={item.id} className="relative flex gap-4">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div
                          className="w-3 h-3 rounded-full border-2 mt-1.5 z-10"
                          style={{ borderColor: ts.dot, background: '#0d1117' }}
                        />
                        {!isLast && <div className="w-px flex-1 bg-[#21262d] mt-1" />}
                      </div>

                      <div className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl px-5 py-4 mb-4 hover:border-indigo-500/40 transition-colors">
                        <div className="text-xs text-gray-500 mb-1.5">{item.date}</div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-white font-semibold text-sm">{item.title}</span>
                          {item.status && (
                            <span className="badge-prototype badge-decision">
                              {item.status}
                            </span>
                          )}
                        </div>
                        {item.desc && (
                          <p className="text-gray-400 text-sm mb-3 leading-relaxed">{item.desc}</p>
                        )}
                        <span className="badge-source-tag">
                          <span className="w-1.5 h-1.5 rounded-full inline-block mr-1 flex-shrink-0" style={{ background: ts.dot }} />
                          <span className="font-medium text-gray-300 mr-1">{item.type}</span>
                          {item.label && <span className="font-mono text-gray-400 text-[10.5px]">{item.label}</span>}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24 text-gray-600 border border-dashed border-[#30363d] rounded-xl text-sm">
            {activeTab} — coming soon.
          </div>
        )}
      </div>
    </div>
  )
}
