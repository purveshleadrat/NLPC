import { useState, useCallback } from 'react'
import { Search, Loader2, FileText, Zap, AlertTriangle, GitCommit, Ticket, MessagesSquare, Clock, ChevronRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

import { globalSearch } from '../api/client'
import { useNavigate } from 'react-router-dom'

const TYPE_META = {
  ticket:          { label: 'Ticket',      icon: Ticket,          color: 'text-emerald-400',  bg: 'bg-emerald-500/10 border-emerald-500/20' },
  commit:          { label: 'Commit',       icon: GitCommit,       color: 'text-teal-400',     bg: 'bg-teal-500/10 border-teal-500/20' },
  meeting_note:    { label: 'Meeting',      icon: MessagesSquare,  color: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20' },
  requirement_doc: { label: 'Requirement',  icon: FileText,        color: 'text-sky-400',      bg: 'bg-sky-500/10 border-sky-500/20' },
  design_ref:      { label: 'Design',       icon: FileText,        color: 'text-purple-400',   bg: 'bg-purple-500/10 border-purple-500/20' },
  release_note:    { label: 'Release',      icon: FileText,        color: 'text-orange-400',   bg: 'bg-orange-500/10 border-orange-500/20' },
  transcript:      { label: 'Transcript',   icon: MessagesSquare,  color: 'text-pink-400',     bg: 'bg-pink-500/10 border-pink-500/20' },
  DECISION:        { label: 'Decision',     icon: Zap,             color: 'text-emerald-400',  bg: 'bg-emerald-500/10 border-emerald-500/20' },
  OPEN_QUESTION:   { label: 'Question',     icon: Clock,           color: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20' },
  CONSTRAINT:      { label: 'Constraint',   icon: AlertTriangle,   color: 'text-red-400',      bg: 'bg-red-500/10 border-red-500/20' },
}

function highlight(text, query) {
  if (!query || !text) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(16,185,129,0.3)', color: 'inherit', borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function ResultCard({ item, query, dark, onSelect }) {
  const meta = TYPE_META[item.subtype] || TYPE_META[item.type] || { label: item.type, icon: FileText, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' }
  const Icon = meta.icon
  const title = item.title || item.summary || item.content?.slice(0, 80) || '(untitled)'
  const sub   = item.initiativeName ? `Initiative: ${item.initiativeName}` : ''
  const date  = item.docDate || item.createdAt ? new Date(item.docDate || item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <div
      onClick={() => onSelect(item)}
      className={`flex items-start gap-3 rounded-xl px-4 py-3.5 border cursor-pointer transition-all group ${
        dark
          ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/30'
          : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
      }`}
    >
      <div className={`mt-0.5 p-1.5 rounded-lg border flex-shrink-0 ${meta.bg}`}>
        <Icon size={13} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13.5px] font-semibold truncate ${dark ? 'text-gray-100' : 'text-gray-800'}`}>
          {highlight(title, query)}
        </div>
        {item.rawText && (
          <div className={`text-[12px] mt-0.5 line-clamp-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            {highlight(item.rawText.slice(0, 120), query)}
          </div>
        )}
        {item.content && !item.rawText && (
          <div className={`text-[12px] mt-0.5 line-clamp-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            {highlight(item.content.slice(0, 120), query)}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border ${meta.bg} ${meta.color}`}>{meta.label}</span>
          {sub && <span className={`text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{sub}</span>}
          {date && <span className={`text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{date}</span>}
        </div>
      </div>
      <ChevronRight size={14} className={`flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
    </div>
  )
}

const FILTERS = ['All', 'Decisions', 'Questions', 'Sources', 'Tickets', 'Commits']

export default function GlobalSearch() {
  const { dark } = useTheme()
  const navigate = useNavigate()

  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filter, setFilter]   = useState('All')
  const [error, setError]     = useState(null)

  const head  = dark ? 'text-gray-100' : 'text-gray-800'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const inp   = dark
    ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600 focus:border-emerald-500/60 focus:ring-emerald-500/20'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-400 focus:ring-emerald-100'

  const runSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true); setError(null); setSearched(false)
    try {
      const res = await globalSearch(q)
      setResults(res.data?.results || [])
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Search failed')
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [query])

  const filtered = results.filter(r => {
    if (filter === 'All') return true
    if (filter === 'Decisions')  return r.subtype === 'DECISION'
    if (filter === 'Questions')  return r.subtype === 'OPEN_QUESTION'
    if (filter === 'Tickets')    return r.subtype === 'ticket'
    if (filter === 'Commits')    return r.subtype === 'commit'
    if (filter === 'Sources')    return r.kind === 'source'
    return true
  })

  function handleSelect(_item) {
    navigate('/')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className={`text-[22px] font-bold ${head}`}>Global Search</h2>
        <p className={`text-[14px] ${muted}`}>Search across every initiative, source and decision.</p>
      </div>

      {/* Search bar */}
      <form onSubmit={e => { e.preventDefault(); runSearch() }} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search decisions, sources, questions, commits…"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-[14px] outline-none focus:ring-2 transition-colors ${inp}`}
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{ background: 'linear-gradient(135deg,#059669,#10b981,#14b8a6)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold disabled:opacity-50 transition-all hover:opacity-90"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Search
        </button>
      </form>

      {/* Filter pills */}
      {searched && results.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'btn-prototype-pill-active' : 'btn-prototype-pill'}
            >
              {f}
              {f === 'All'
                ? ` (${results.length})`
                : ` (${results.filter(r => {
                    if (f === 'Decisions') return r.subtype === 'DECISION'
                    if (f === 'Questions') return r.subtype === 'OPEN_QUESTION'
                    if (f === 'Tickets')  return r.subtype === 'ticket'
                    if (f === 'Commits')  return r.subtype === 'commit'
                    if (f === 'Sources')  return r.kind === 'source'
                    return false
                  }).length})`
              }
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-[14px]">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className={`flex items-center justify-center gap-2 py-20 ${muted}`}>
          <Loader2 size={20} className="animate-spin" />
          <span className="text-[14px]">Searching across all initiatives…</span>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        filtered.length === 0 ? (
          <div className={`text-center py-20 border-2 border-dashed rounded-2xl ${dark ? 'border-white/[0.07] text-gray-600' : 'border-gray-200 text-gray-400'}`}>
            <Search size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-[15px]">No results for <strong>"{query}"</strong></p>
            <p className={`text-[13px] mt-1 ${muted}`}>Try different keywords or check a different filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className={`text-[12px] mb-3 ${muted}`}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{query}"</p>
            {filtered.map((item, i) => (
              <ResultCard key={i} item={item} query={query} dark={dark} onSelect={handleSelect} />
            ))}
          </div>
        )
      )}

      {/* Empty state before search */}
      {!loading && !searched && (
        <div className={`text-center py-20 border-2 border-dashed rounded-2xl ${dark ? 'border-white/[0.07] text-gray-600' : 'border-gray-200 text-gray-400'}`}>
          <Search size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-[15px]">Type something and press Search</p>
          <p className={`text-[13px] mt-1 ${muted}`}>Searches across all initiatives — decisions, sources, questions, commits</p>
        </div>
      )}
    </div>
  )
}
