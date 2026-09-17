import { useEffect, useState } from 'react'
import { getEvents } from '../api/client'
import { useInitiative } from '../context/InitiativeContext'
import { Loader2, Zap, ChevronDown, ChevronRight, TrendingUp, Activity, RotateCcw } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function groupByAffected(events) {
  const map = {}
  events.forEach((e) => {
    ;(e.affectedItems || []).forEach((item) => {
      if (!map[item]) map[item] = []
      map[item].push(e)
    })
  })
  return map
}

function StatCard({ label, value, icon: Icon, color, dark }) {
  const card = dark ? 'glass-dark' : 'glass-light shadow-sm'
  return (
    <div className={`rounded-2xl p-4 ${card} card-hover`}>
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-[28px] font-bold leading-none mb-1 ${color}`}>{value}</div>
          <div className={`text-[17px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</div>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('400', '400/15').replace('500', '500/15').replace('600', '600/10')}`}>
          <Icon size={16} className={color} />
        </div>
      </div>
    </div>
  )
}

function ImpactGroup({ item, events, open, onToggle, dark }) {
  const card    = dark ? 'glass-dark' : 'glass-light shadow-sm'
  const hdr     = dark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50/80'
  const divider = dark ? 'border-white/[0.05]' : 'border-gray-100'
  const summary = dark ? 'text-gray-200' : 'text-gray-700'
  const muted   = dark ? 'text-gray-500' : 'text-gray-400'
  const badge   = dark ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' : 'bg-indigo-50 text-indigo-700 border-indigo-200'

  const STATUS = dark
    ? { CURRENT: 'bg-emerald-500/15 text-emerald-400', SUPERSEDED: 'bg-gray-500/15 text-gray-500 line-through', UNRESOLVED: 'bg-orange-500/15 text-orange-400' }
    : { CURRENT: 'bg-green-100 text-green-700', SUPERSEDED: 'bg-gray-100 text-gray-400 line-through', UNRESOLVED: 'bg-orange-100 text-orange-700' }

  return (
    <div className={`border rounded-2xl overflow-hidden ${card} ${dark ? 'border-white/[0.07]' : 'border-gray-200'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${hdr}`}
      >
        <div className="flex items-center gap-3">
          <span className={`text-[16.5px] font-semibold px-2.5 py-0.5 rounded-lg border font-mono ${badge}`}>{item}</span>
          <span className={`text-[17px] ${muted}`}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
        </div>
        {open
          ? <ChevronDown size={15} className={muted} />
          : <ChevronRight size={15} className={muted} />}
      </button>

      {open && (
        <div className={`border-t divide-y ${divider}`}>
          {events.map((e) => (
            <div key={e.id} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[16.5px] font-semibold px-2 py-0.5 rounded-full ${STATUS[e.status] || (dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600')}`}>
                      {e.status}
                    </span>
                    <span className={`text-[17px] ${muted}`}>{e.eventType.replace('_', ' ')}</span>
                  </div>
                  <p className={`text-[16px] leading-relaxed ${summary}`}>{e.summary}</p>
                  {e.decidedBy && <p className={`text-[17px] mt-1 ${muted}`}>by {e.decidedBy}</p>}
                </div>
                <span className={`text-[17px] whitespace-nowrap ${muted}`}>{e.eventDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChangeImpact() {
  const { dark } = useTheme()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openItems, setOpenItems] = useState({})
  const [search, setSearch] = useState('')

  const { currentId } = useInitiative()

  useEffect(() => {
    if (!currentId) return
    setLoading(true); setError(null)
    getEvents(currentId)
      .then((r) => {
        const data = r.data || []
        setEvents(data)
        const groups = groupByAffected(data)
        const initial = {}
        Object.keys(groups).forEach((k) => { initial[k] = true })
        setOpenItems(initial)
      })
      .catch((err) => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }, [currentId])

  const grouped  = groupByAffected(events)
  const filtered = Object.entries(grouped).filter(([item]) =>
    item.toLowerCase().includes(search.toLowerCase())
  )

  const inp = dark
    ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600 focus:border-indigo-500/60 focus:ring-indigo-500/20'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:ring-indigo-100'

  return (
    <div className="max-w-3xl mx-auto">

      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4 mb-7">
          <StatCard label="Affected Items"  value={Object.keys(grouped).length} icon={Activity}   color={dark ? 'text-indigo-400' : 'text-indigo-600'} dark={dark} />
          <StatCard label="Current Events"  value={events.filter(e => e.status === 'CURRENT').length} icon={TrendingUp} color={dark ? 'text-emerald-400' : 'text-emerald-600'} dark={dark} />
          <StatCard label="Superseded"      value={events.filter(e => e.status === 'SUPERSEDED').length} icon={RotateCcw}  color={dark ? 'text-gray-400' : 'text-gray-500'} dark={dark} />
        </div>
      )}

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ticket, requirement, test ID…"
          className={`w-full border rounded-xl px-4 py-2.5 text-[16px] focus:outline-none focus:ring-2 transition-colors ${inp} ${dark ? 'bg-[#12121f]' : ''}`}
        />
      </div>

      {loading && (
        <div className={`flex items-center justify-center py-20 gap-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          <Loader2 size={20} className="animate-spin" /> Loading impact map…
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl px-4 py-3 text-[16px]">
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={`text-center py-20 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          <Zap size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-[16px]">
            {Object.keys(grouped).length === 0
              ? 'No affected items yet. Ingest sources to build the impact map.'
              : 'No items match your search.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(([item, evs]) => (
          <ImpactGroup
            key={item} item={item} events={evs}
            open={!!openItems[item]}
            onToggle={() => setOpenItems((prev) => ({ ...prev, [item]: !prev[item] }))}
            dark={dark}
          />
        ))}
      </div>
    </div>
  )
}
