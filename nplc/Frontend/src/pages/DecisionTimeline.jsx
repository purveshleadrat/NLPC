import { useEffect, useState, useCallback, useMemo } from 'react'
import { getEvents, getContradictions, getSources } from '../api/client'
import { useInitiative } from '../context/InitiativeContext'
import { AlertTriangle, Search, GitCommit, Ticket, MessagesSquare, FileText } from 'lucide-react'
import { LoadingScreen } from '../App'
import { useTheme } from '../context/ThemeContext'
import { Badge } from '../components/ui/badge'

// Maps a Source's raw type to how it's tagged/labelled in the unified feed.
const SOURCE_TAG = {
  ticket:          { label: 'Jira',        icon: Ticket,          dot: '#10b981' },
  commit:          { label: 'Git',         icon: GitCommit,       dot: '#22c55e' },
  meeting_note:    { label: 'Meeting',     icon: MessagesSquare,  dot: '#ef4444' },
  requirement_doc: { label: 'Requirement', icon: FileText,        dot: '#14b8a6' },
  design_ref:      { label: 'Design',      icon: FileText,        dot: '#0ea5e9' },
  release_note:    { label: 'Release',     icon: FileText,        dot: '#f97316' },
  transcript:      { label: 'Transcript',  icon: MessagesSquare,  dot: '#eab308' },
}

const CATEGORIES = ['All', 'Tickets', 'Commits']

function categoryOf(item) {
  if (item.kind === 'event') {
    if (item.event.eventType === 'DECISION') return 'Decisions'
    if (item.event.eventType === 'OPEN_QUESTION') return 'Questions'
  }
  const type = item.source?.type
  if (type === 'ticket') return 'Tickets'
  if (type === 'commit') return 'Commits'
  if (type === 'requirement_doc') return 'Requirements'
  return null
}

function TimelineItem({ item, dark }) {
  const superseded = item.kind === 'event' && item.event.status === 'SUPERSEDED'
  const open = item.kind === 'event' && item.event.eventType === 'OPEN_QUESTION' && item.event.status === 'UNRESOLVED'
  const isDecision = item.kind === 'event' && item.event.eventType === 'DECISION'

  const card = dark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-white border border-gray-200'
  const title = dark ? 'text-gray-100' : 'text-gray-900'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const body = dark ? 'text-gray-400' : 'text-gray-500'

  const tag = item.source ? SOURCE_TAG[item.source.type] : null
  const TagIcon = tag?.icon

  const dotColor = superseded ? '#64748b' : (open ? '#f59e0b' : (isDecision ? '#38bdf8' : '#22c55e'))

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
        <div
          className="w-3 h-3 rounded-full border-2 mt-1"
          style={{
            borderColor: dotColor,
            background: 'transparent',
          }}
        />
        <div className={`w-px flex-1 mt-1 ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
      </div>

      <div className={`flex-1 rounded-xl px-[15px] py-3 mb-3 ${card} ${superseded ? 'opacity-50' : ''}`}>
        <p className={`text-[11px] font-semibold mb-0.5 ${muted}`}>
          {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
        </p>
        <p className={`font-semibold text-[13.5px] flex items-center gap-2 flex-wrap ${title} ${superseded ? 'line-through' : ''}`}>
          {item.title}
          {superseded && (
            <span className="badge-prototype badge-superseded">SUPERSEDED</span>
          )}
          {isDecision && (
            <span className="badge-prototype badge-decision">DECISION</span>
          )}
          {open && (
            <span className="badge-prototype badge-open">OPEN</span>
          )}
        </p>
        <p className={`text-[12.5px] my-1 ${body}`}>{item.description}</p>
        {tag && (
          <span className="badge-source-tag mt-1">
            <span
              className="w-1.5 h-1.5 rounded-full inline-block mr-1.5 flex-shrink-0"
              style={{ background: tag.dot }}
            />
            <span className="font-medium text-gray-300 mr-1">{tag.label}</span>
            {item.source?.externalRef && (
              <span className="font-mono text-gray-400 text-[10.5px]">{item.source.externalRef}</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

export default function DecisionTimeline({ refreshTick = 0 }) {
  const { dark } = useTheme()
  const [events, setEvents] = useState([])
  const [sources, setSources] = useState([])
  const [contradictions, setContradictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const { currentId } = useInitiative()

  const load = useCallback(() => {
    if (!currentId) return Promise.resolve()
    setLoading(true); setError(null)
    return Promise.all([getEvents(currentId), getContradictions(currentId), getSources(currentId)])
      .then(([evRes, conRes, srcRes]) => {
        setEvents(evRes.data || [])
        setContradictions(conRes.data || [])
        setSources(srcRes.data || [])
      })
      .catch((err) => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }, [currentId, refreshTick])

  useEffect(() => { load() }, [load])

  const items = useMemo(() => {
    const sourceById = Object.fromEntries(sources.map(s => [s.id, s]))
    const eventSourceIds = new Set(events.map(e => e.sourceId))

    const eventItems = events.map(e => ({
      kind: 'event',
      key: `e-${e.id}`,
      date: e.eventDate,
      title: e.summary,
      description: e.decidedBy ? `Decided by ${e.decidedBy}` : (e.affectedItems?.length ? `Affects: ${e.affectedItems.join(', ')}` : ''),
      source: sourceById[e.sourceId] || null,
      event: e,
    }))

    // Sources with no extracted event yet still show up, so ingestion is visible even
    // before/without AI extraction succeeding.
    const rawSourceItems = sources
      .filter(s => !eventSourceIds.has(s.id))
      .map(s => ({
        kind: 'source',
        key: `s-${s.id}`,
        date: s.docDate,
        title: s.title,
        description: s.author ? `by ${s.author}` : '',
        source: s,
      }))

    return [...eventItems, ...rawSourceItems].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [events, sources])

  const filtered = items
    .filter(i => category === 'All' || categoryOf(i) === category)
    .filter(i => !search || i.title?.toLowerCase().includes(search.toLowerCase()))

  const countFor = (cat) => cat === 'All' ? items.length : items.filter(i => categoryOf(i) === cat).length
  const unresolved = contradictions.filter((c) => !c.resolved)

  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const title = dark ? 'text-gray-100' : 'text-gray-800'
  const input = dark
    ? 'bg-white/[0.04] border-white/10 text-gray-100 placeholder-gray-600'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'

  return (
    <div className="w-full">

      <div className="mb-4 max-w-4xl">
        <h2 className={`text-[19px] font-bold tracking-[-0.3px] ${title}`}>Timeline</h2>
        <p className={`text-[13.5px] max-w-[66ch] ${muted}`}>
          Everything that happened to this initiative, in order. Filter by type or search when it gets
          long — superseded items stay visible, struck through.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative">
          <Search size={11} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search timeline..."
            className={`pl-8 pr-3 py-1.5 border rounded-full text-[12px] focus:outline-none focus:ring-1 focus:ring-emerald-400 w-48 ${input}`}
          />
        </div>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`cursor-pointer ${category === c ? 'btn-prototype-pill-active' : 'btn-prototype-pill'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {unresolved.length > 0 && (
        <div className="mb-5 rounded-xl p-3.5 bg-amber-500/10 border border-amber-500/20 max-w-4xl">
          <div className="flex items-center gap-2 mb-1.5 text-amber-400 font-semibold text-[13px]">
            <AlertTriangle size={13} />
            {unresolved.length} unresolved contradiction{unresolved.length > 1 ? 's' : ''} detected
          </div>
          {unresolved.map((c) => (
            <p key={c.id} className="text-[12.5px] text-amber-500/80 leading-relaxed">{c.description}</p>
          ))}
        </div>
      )}

      {loading && <LoadingScreen dark={dark} />}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-[13px] max-w-4xl">
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={`w-full flex flex-col items-center justify-center min-h-[360px] text-center ${muted}`}>
          <p className="text-[13.5px]">No events yet. Ingest a source to populate the timeline.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="max-w-4xl">
          {filtered.map((item) => (
            <TimelineItem key={item.key} item={item} dark={dark} />
          ))}
        </div>
      )}
    </div>
  )
}
