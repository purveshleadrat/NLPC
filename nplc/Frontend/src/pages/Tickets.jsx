import { useEffect, useState } from 'react'
import { searchJiraTickets } from '../api/client'
import { ExternalLink } from 'lucide-react'
import { LoadingScreen } from '../App'
import { useTheme } from '../context/ThemeContext'

const STATUS_COLOR = {
  'To Do':       'bg-gray-100 text-gray-700',
  'In Progress': 'bg-emerald-100 text-emerald-700',
  'Done':        'bg-green-100 text-green-700',
}

export default function Tickets() {
  const { dark } = useTheme()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    searchJiraTickets('')
      .then((res) => setTickets(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Tickets</h2>
        <p className="text-gray-500 text-sm">Jira tickets linked to your product context.</p>
      </div>

      {loading && <LoadingScreen dark={dark} />}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          Failed to load tickets: {error}
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No tickets found.
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id || ticket.key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-emerald-600 font-semibold">{ticket.key}</span>
                    {ticket.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ticket.status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{ticket.summary || ticket.title}</p>
                  {ticket.assignee && (
                    <p className="text-xs text-gray-400 mt-1">Assignee: {ticket.assignee}</p>
                  )}
                </div>
                {ticket.url && (
                  <a href={ticket.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-emerald-600">
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
