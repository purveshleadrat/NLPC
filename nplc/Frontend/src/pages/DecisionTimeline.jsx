import { useEffect, useState } from 'react'
import { getEvents, getContradictions } from '../api/client'
import { Loader2, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'

const TYPE_META = {
  DECISION:      { label: 'Decision',      color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  PROPOSAL:      { label: 'Proposal',      color: 'bg-blue-100 text-blue-800 border-blue-200' },
  CHANGE:        { label: 'Change',        color: 'bg-amber-100 text-amber-800 border-amber-200' },
  ASSUMPTION:    { label: 'Assumption',    color: 'bg-purple-100 text-purple-800 border-purple-200' },
  DEPENDENCY:    { label: 'Dependency',    color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  OPEN_QUESTION: { label: 'Open Question', color: 'bg-orange-100 text-orange-800 border-orange-200' },
}

const STATUS_ICON = {
  CURRENT:    <CheckCircle2 size={14} className="text-green-500" />,
  SUPERSEDED: <XCircle size={14} className="text-gray-400" />,
  UNRESOLVED: <Clock size={14} className="text-orange-500" />,
}

function EventCard({ event }) {
  const meta = TYPE_META[event.eventType] || { label: event.eventType, color: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <div className={`relative pl-6 pb-6 border-l-2 ${event.status === 'SUPERSEDED' ? 'border-gray-200' : 'border-indigo-300'}`}>
      <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full ${event.status === 'SUPERSEDED' ? 'bg-gray-300' : 'bg-indigo-500'}`} />
      <div className={`bg-white border rounded-xl p-4 shadow-sm ${event.status === 'SUPERSEDED' ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
              {meta.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              {STATUS_ICON[event.status]} {event.status}
            </span>
            {event.confidence === 'LOW' && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <AlertTriangle size={11} /> Low confidence
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">{event.eventDate}</span>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed mb-2">{event.summary}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          {event.decidedBy && <span>by <span className="font-medium text-gray-600">{event.decidedBy}</span></span>}
          {event.affectedItems?.length > 0 && (
            <span>
              affects:{' '}
              {event.affectedItems.map((item) => (
                <span key={item} className="ml-1 bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-mono text-xs">{item}</span>
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DecisionTimeline() {
  const [events, setEvents] = useState([])
  const [contradictions, setContradictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    Promise.all([getEvents(), getContradictions()])
      .then(([evRes, conRes]) => {
        setEvents(evRes.data || [])
        setContradictions(conRes.data || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const typeFilters = ['ALL', ...Object.keys(TYPE_META)]
  const filtered = filter === 'ALL' ? events : events.filter((e) => e.eventType === filter)
  const sorted = [...filtered].sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))

  const unresolvedContradictions = contradictions.filter((c) => !c.resolved)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Decision Timeline</h2>
        <p className="text-gray-500 text-sm">
          Chronological history of decisions, proposals, assumptions, changes and open questions — with source attribution.
        </p>
      </div>

      {unresolvedContradictions.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold text-sm">
            <AlertTriangle size={16} />
            {unresolvedContradictions.length} unresolved contradiction{unresolvedContradictions.length > 1 ? 's' : ''} detected
          </div>
          {unresolvedContradictions.map((c) => (
            <p key={c.id} className="text-xs text-amber-700 leading-relaxed">{c.description}</p>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {typeFilters.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filter === t
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700'
            }`}
          >
            {t === 'ALL' ? 'All' : TYPE_META[t]?.label || t}
            {t !== 'ALL' && (
              <span className="ml-1 opacity-60">
                ({events.filter((e) => e.eventType === t).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Loading timeline…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No events yet. Ingest a source to populate the timeline.</p>
        </div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="mt-2">
          {sorted.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
