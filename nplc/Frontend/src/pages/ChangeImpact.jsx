import { useEffect, useState } from 'react'
import { getEvents } from '../api/client'
import { Loader2, Zap, ChevronDown, ChevronRight } from 'lucide-react'

function groupByAffected(events) {
  const map = {}
  events.forEach((e) => {
    if (e.affectedItems && e.affectedItems.length > 0) {
      e.affectedItems.forEach((item) => {
        if (!map[item]) map[item] = []
        map[item].push(e)
      })
    }
  })
  return map
}

const STATUS_COLOR = {
  CURRENT: 'bg-green-100 text-green-700',
  SUPERSEDED: 'bg-gray-100 text-gray-500 line-through',
  UNRESOLVED: 'bg-orange-100 text-orange-700',
}

function ImpactGroup({ item, events, open, onToggle }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
            {item}
          </span>
          <span className="text-xs text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {events.map((e) => (
            <div key={e.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[e.status] || 'bg-gray-100 text-gray-700'}`}>
                      {e.status}
                    </span>
                    <span className="text-xs text-gray-500">{e.eventType.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{e.summary}</p>
                  {e.decidedBy && (
                    <p className="text-xs text-gray-400 mt-1">by {e.decidedBy}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{e.eventDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChangeImpact() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openItems, setOpenItems] = useState({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    getEvents()
      .then((r) => {
        setEvents(r.data || [])
        // Open all by default
        const groups = groupByAffected(r.data || {})
        const initial = {}
        Object.keys(groups).forEach((k) => { initial[k] = true })
        setOpenItems(initial)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const grouped = groupByAffected(events)
  const filtered = Object.entries(grouped).filter(([item]) =>
    item.toLowerCase().includes(search.toLowerCase())
  )

  const affectedCount = Object.keys(grouped).length
  const supersededCount = events.filter((e) => e.status === 'SUPERSEDED').length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Change Impact</h2>
        <p className="text-gray-500 text-sm">
          See which requirements, tickets, tests and designs are affected by each decision or change.
        </p>
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-indigo-600">{affectedCount}</div>
            <div className="text-xs text-gray-500 mt-1">Affected items</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">{events.filter((e) => e.status === 'CURRENT').length}</div>
            <div className="text-xs text-gray-500 mt-1">Current events</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-500">{supersededCount}</div>
            <div className="text-xs text-gray-500 mt-1">Superseded</div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ticket, requirement, test ID…"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Loading impact map…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Zap size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {Object.keys(grouped).length === 0
              ? 'No affected items yet. Ingest sources to build the impact map.'
              : 'No items match your search.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(([item, evs]) => (
          <ImpactGroup
            key={item}
            item={item}
            events={evs}
            open={!!openItems[item]}
            onToggle={() => setOpenItems((prev) => ({ ...prev, [item]: !prev[item] }))}
          />
        ))}
      </div>
    </div>
  )
}
