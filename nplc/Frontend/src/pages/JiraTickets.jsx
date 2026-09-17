import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchJiraTickets } from '../api/client'
import { Ticket, Loader2, RefreshCw, AlertTriangle, Search, ChevronRight } from 'lucide-react'

const STATUS_COLORS = {
  'To Do':       'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Done':        'bg-green-100 text-green-700',
  'Blocked':     'bg-red-100 text-red-700',
}

const PRIORITY_COLORS = {
  Highest: 'text-red-600',
  High:    'text-orange-500',
  Medium:  'text-yellow-500',
  Low:     'text-blue-400',
  Lowest:  'text-gray-400',
}

function statusClass(status) {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
}

function priorityClass(priority) {
  return PRIORITY_COLORS[priority] ?? 'text-gray-400'
}

export default function JiraTickets() {
  const navigate = useNavigate()
  const [jql, setJql] = useState('ORDER BY created DESC')
  const [inputJql, setInputJql] = useState('ORDER BY created DESC')
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load(query) {
    setLoading(true)
    setError(null)
    try {
      const res = await searchJiraTickets(query)
      const data = res.data
      setTickets(data.issues ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch tickets.')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(jql) }, [])

  function handleSearch(e) {
    e.preventDefault()
    setJql(inputJql)
    load(inputJql)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Jira Tickets</h2>
        <p className="text-gray-500 text-sm">Search and browse tickets from your Jira project using JQL.</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={inputJql}
            onChange={e => setInputJql(e.target.value)}
            placeholder='e.g. project = "HAC" ORDER BY created DESC'
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {loading ? 'Loading…' : 'Search'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Results count */}
      {!loading && !error && tickets.length > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          Showing <span className="font-semibold text-gray-700">{tickets.length}</span> of {total} tickets
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && tickets.length === 0 && (
        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Ticket size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tickets found. Try adjusting your JQL query.</p>
        </div>
      )}

      {/* Ticket cards */}
      {tickets.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {tickets.map(issue => {
            const f = issue.fields ?? {}
            const status   = f.status?.name ?? '—'
            const priority = f.priority?.name ?? '—'
            const assignee = f.assignee?.displayName ?? 'Unassigned'
            const updated  = f.updated ? new Date(f.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

            return (
              <div
                key={issue.id}
                onClick={() => navigate(`/jira/${issue.key}`)}
                className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
              >
                {/* Key + Summary */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{issue.key}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass(status)}`}>{status}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{f.summary ?? 'No summary'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {f.issuetype?.name ?? 'Issue'} · Assignee: {assignee} · Updated: {updated}
                  </p>
                </div>

                {/* Priority + arrow */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className={`text-xs font-semibold ${priorityClass(priority)}`}>↑ {priority}</span>
                  <ChevronRight size={15} className="text-gray-300" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
