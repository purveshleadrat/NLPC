import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { searchJiraTickets } from '../api/client'
import { ArrowLeft, Loader2, RefreshCw, AlertTriangle, Search } from 'lucide-react'

const FILTERS = ['All', 'Tickets', 'In Progress', 'Done', 'To Do']
const TABS = ['Timeline', 'Scope', 'Ask', 'Brief']

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(' ', ' · ')
}

function StatusBadge({ status }) {
  const map = {
    'In Progress': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    'Done':        'bg-green-500/20 text-green-300 border border-green-500/30',
    'To Do':       'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    'Blocked':     'bg-red-500/20 text-red-300 border border-red-500/30',
  }
  const cls = map[status] ?? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${cls}`}>
      {status}
    </span>
  )
}

function JiraChip({ issueKey }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#1e2a3a] border border-[#2d3f55] text-xs px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
      <span className="text-gray-300 font-medium">Jira</span>
      <span className="text-gray-500">{issueKey}</span>
    </span>
  )
}

function TimelineItem({ issue, isLast }) {
  const f = issue.fields ?? {}
  const status  = f.status?.name ?? 'To Do'
  const type    = f.issuetype?.name ?? 'Issue'
  const date    = formatDate(f.updated || f.created)
  const summary = f.summary ?? 'No summary'
  const desc    = f.description?.content?.[0]?.content?.[0]?.text ?? ''

  return (
    <div className="relative flex gap-4">
      {/* Dot + line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-3 h-3 rounded-full border-2 border-indigo-500 bg-[#0d1117] mt-1.5 z-10" />
        {!isLast && <div className="w-px flex-1 bg-indigo-900/40 mt-1" />}
      </div>

      {/* Card */}
      <div className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl px-5 py-4 mb-4 hover:border-indigo-500/40 transition-colors">
        <div className="text-xs text-gray-500 mb-1.5">{date}</div>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-white font-semibold text-sm">
            {issue.key} · {summary}
          </span>
          <StatusBadge status={status} />
        </div>
        {desc ? (
          <p className="text-gray-400 text-sm mb-3 leading-relaxed">{desc}</p>
        ) : (
          <p className="text-gray-500 text-sm mb-3">{status}.</p>
        )}
        <div className="flex gap-2 flex-wrap">
          <JiraChip issueKey={issue.key} />
          {type && type !== 'Story' && (
            <span className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
              {type}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function JiraTicketDetail() {
  const { key } = useParams()   // project key e.g. "BM", "HAC"
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Timeline')
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await searchJiraTickets(`project = "${key}" ORDER BY created ASC`)
        setTickets(res.data?.issues ?? [])
        setTotal(res.data?.total ?? 0)
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Failed to load tickets.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [key])

  const filtered = tickets.filter(t => {
    const f = t.fields ?? {}
    if (search && !f.summary?.toLowerCase().includes(search.toLowerCase()) && !t.key.toLowerCase().includes(search.toLowerCase())) return false
    if (activeFilter === 'Tickets') return true
    if (activeFilter === 'All') return true
    return f.status?.name === activeFilter
  })

  // derive project name from first ticket or fallback to key
  const projectName = tickets[0]?.fields?.project?.name ?? key

  return (
    <div className="min-h-screen bg-[#0d1117] text-white -m-8 p-0">
      {/* Top bar */}
      <div className="border-b border-[#21262d] px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/jira')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm flex-shrink-0"
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">{projectName}</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {key} · <span className="text-gray-400">{key.toLowerCase()}</span>
              {total > 0 && <> · {total} tickets</>}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-gray-400 border border-[#30363d] hover:text-white hover:border-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={() => { setLoading(true); location.reload() }}
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 border border-[#30363d] hover:border-gray-500 transition-colors"
          >
            <RefreshCw size={13} />
            Sync
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search timeline..."
              className="bg-[#161b22] border border-[#30363d] rounded-lg pl-7 pr-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 w-44"
            />
          </div>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeFilter === f
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 border border-[#30363d] hover:border-gray-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 py-24 justify-center">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading timeline…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-6">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24 text-gray-600 border border-dashed border-[#30363d] rounded-xl">
            <p className="text-sm">No tickets found for this filter.</p>
          </div>
        )}

        {/* Timeline */}
        {!loading && !error && filtered.length > 0 && (
          <div className="max-w-3xl">
            {filtered.map((issue, i) => (
              <TimelineItem key={issue.id} issue={issue} isLast={i === filtered.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
