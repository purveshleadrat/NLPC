import { useEffect, useState, useCallback } from 'react'
import { getEvents, getContradictions, syncInitiative } from '../api/client'
import { useInitiative } from '../context/InitiativeContext'
import { Loader2, AlertTriangle, CheckCircle2, Clock, XCircle, GitCommitHorizontal, RefreshCw } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const TYPE_META = {
  DECISION:      { label: 'Decision',      dot: 'bg-indigo-500',  badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
  PROPOSAL:      { label: 'Proposal',      dot: 'bg-blue-500',    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  CHANGE:        { label: 'Change',        dot: 'bg-amber-500',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  ASSUMPTION:    { label: 'Assumption',    dot: 'bg-violet-500',  badge: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
  DEPENDENCY:    { label: 'Dependency',    dot: 'bg-cyan-500',    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
  OPEN_QUESTION: { label: 'Open Question', dot: 'bg-orange-500',  badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
}

const TYPE_META_LIGHT = {
  DECISION:      { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PROPOSAL:      { badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  CHANGE:        { badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  ASSUMPTION:    { badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  DEPENDENCY:    { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  OPEN_QUESTION: { badge: 'bg-orange-50 text-orange-700 border-orange-200' },
}

function EventCard({ event, dark }) {
  const meta = TYPE_META[event.eventType] || { label: event.eventType, dot: 'bg-gray-500', badge: 'bg-gray-500/15 text-gray-400 border-gray-500/25' }
  const metaLight = TYPE_META_LIGHT[event.eventType] || { badge: 'bg-gray-100 text-gray-600 border-gray-200' }
  const badge = dark ? meta.badge : metaLight.badge
  const superseded = event.status === 'SUPERSEDED'

  const card = dark
    ? `glass-dark rounded-2xl p-4 ${superseded ? 'opacity-45' : ''}`
    : `glass-light shadow-sm rounded-2xl p-4 ${superseded ? 'opacity-50' : ''}`
  const summary = dark ? 'text-gray-200' : 'text-gray-700'
  const muted   = dark ? 'text-gray-500' : 'text-gray-400'
  const tag     = dark ? 'bg-white/[0.05] text-gray-400 font-mono' : 'bg-gray-100 text-gray-500 font-mono'

  return (
    <div className="flex gap-4 mb-4 timeline-line last:mb-0">
      {/* Dot */}
      <div className="flex flex-col items-center pt-1 flex-shrink-0" style={{ width: 24 }}>
        <div className={`w-3 h-3 rounded-full border-2 ${superseded ? 'border-gray-500 bg-transparent' : `${meta.dot} border-transparent`} shadow-sm`} />
      </div>

      {/* Card */}
      <div className={`flex-1 ${card} card-hover`}>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[17px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
              {meta.label}
            </span>
            {event.status === 'CURRENT' && (
              <span className="flex items-center gap-1 text-[16.5px] text-emerald-500">
                <CheckCircle2 size={11} /> Live
              </span>
            )}
            {event.status === 'SUPERSEDED' && (
              <span className="flex items-center gap-1 text-[16.5px] text-gray-500">
                <XCircle size={11} /> Superseded
              </span>
            )}
            {event.status === 'UNRESOLVED' && (
              <span className="flex items-center gap-1 text-[16.5px] text-orange-400">
                <Clock size={11} /> Unresolved
              </span>
            )}
            {event.confidence === 'LOW' && (
              <span className="flex items-center gap-1 text-[16.5px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                <AlertTriangle size={10} /> Low confidence
              </span>
            )}
          </div>
          <span className={`text-[17px] whitespace-nowrap ${muted}`}>{event.eventDate}</span>
        </div>

        <p className={`text-[16px] leading-relaxed mb-2.5 ${summary}`}>{event.summary}</p>

        <div className={`flex items-center gap-3 text-[17px] flex-wrap ${muted}`}>
          {event.decidedBy && (
            <span>by <span className={dark ? 'text-gray-300 font-medium' : 'text-gray-600 font-medium'}>{event.decidedBy}</span></span>
          )}
          {event.affectedItems?.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span>affects:</span>
              {event.affectedItems.map((item) => (
                <span key={item} className={`rounded-md px-1.5 py-0.5 text-[16.5px] ${tag}`}>{item}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DecisionTimeline() {
  const { dark } = useTheme()
  const [events, setEvents] = useState([])
  const [contradictions, setContradictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const { currentId } = useInitiative()

  const load = useCallback(() => {
    if (!currentId) return Promise.resolve()
    setLoading(true); setError(null)
    return Promise.all([getEvents(currentId), getContradictions(currentId)])
      .then(([evRes, conRes]) => {
        setEvents(evRes.data || [])
        setContradictions(conRes.data || [])
      })
      .catch((err) => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }, [currentId])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    setSyncing(true); setSyncMsg(null); setError(null)
    try {
      const res = await syncInitiative(currentId)
      const r = res.data
      const parts = []
      if (r.jiraSourcesAdded) parts.push(`${r.jiraSourcesAdded} Jira`)
      if (r.githubSourcesAdded) parts.push(`${r.githubSourcesAdded} GitHub`)
      const added = parts.length ? parts.join(' + ') + ' source(s)' : 'no new sources'
      const ev = r.extraction ? `, ${r.extraction.eventsCreated} new event(s)` : ''
      setSyncMsg(`Synced ${r.connectionsSynced} connection(s): ${added}${ev}.` +
        (r.warnings?.length ? ` (${r.warnings.length} warning)` : ''))
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const typeFilters = ['ALL', ...Object.keys(TYPE_META)]
  const filtered = filter === 'ALL' ? events : events.filter((e) => e.eventType === filter)
  const sorted = [...filtered].sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
  const unresolved = contradictions.filter((c) => !c.resolved)

  const filterBtn = (active) => dark
    ? active ? 'brand-gradient text-white shadow-md shadow-indigo-500/20' : 'bg-white/[0.04] text-gray-400 border border-white/[0.07] hover:bg-white/[0.08] hover:text-gray-200'
    : active ? 'brand-gradient text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-700'

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header + Sync */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h2 className={`text-[22px] font-bold ${dark ? 'text-gray-100' : 'text-gray-800'}`}>Decision Timeline</h2>
          <p className={`text-[13px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Every decision, change and open question — newest first.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          title="Pull the latest Jira tickets and GitHub commits for this initiative and extract them"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all border ${dark ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'} disabled:opacity-50`}
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {syncMsg && (
        <div className="mb-5 flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
          <RefreshCw size={14} /> {syncMsg}
        </div>
      )}

      {/* Contradiction banner */}
      {unresolved.length > 0 && (
        <div className="mb-6 rounded-2xl p-4 bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2 text-amber-400 font-semibold text-[17px]">
            <AlertTriangle size={14} />
            {unresolved.length} unresolved contradiction{unresolved.length > 1 ? 's' : ''} detected
          </div>
          {unresolved.map((c) => (
            <p key={c.id} className="text-[16.5px] text-amber-500/80 leading-relaxed">{c.description}</p>
          ))}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {typeFilters.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-[16px] font-semibold px-3 py-1.5 rounded-full transition-all duration-150 ${filterBtn(filter === t)}`}
          >
            {t === 'ALL' ? 'All' : TYPE_META[t]?.label || t}
            {t !== 'ALL' && (
              <span className="ml-1.5 opacity-60">
                {events.filter((e) => e.eventType === t).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className={`flex items-center justify-center py-20 gap-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          <Loader2 size={20} className="animate-spin" /> Loading timeline…
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl px-4 py-3 text-[16px]">
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className={`text-center py-20 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          <GitCommitHorizontal size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-[16px]">No events yet. Ingest a source to populate the timeline.</p>
        </div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="pl-0">
          {sorted.map((event) => (
            <EventCard key={event.id} event={event} dark={dark} />
          ))}
        </div>
      )}
    </div>
  )
}
