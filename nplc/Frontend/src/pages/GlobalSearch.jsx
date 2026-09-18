import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, FileText, CalendarDays, Layers, AlertCircle, ArrowRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import api from '../api/client'

const TYPE_ICON = {
  event: CalendarDays,
  source: FileText,
}
const TYPE_LABEL = {
  DECISION: 'Decision', PROPOSAL: 'Proposal', CHANGE: 'Change',
  ASSUMPTION: 'Assumption', DEPENDENCY: 'Dependency', OPEN_QUESTION: 'Open Question',
  meeting_note: 'Meeting Note', transcript: 'Transcript', requirement_doc: 'Requirement',
  ticket: 'Ticket', commit: 'Commit', design_ref: 'Design', release_note: 'Release Note',
}
const TYPE_COLOR = {
  DECISION: '#34d399', PROPOSAL: '#60a5fa', CHANGE: '#f59e0b',
  ASSUMPTION: '#a78bfa', DEPENDENCY: '#fb923c', OPEN_QUESTION: '#f87171',
  meeting_note: '#94a3b8', transcript: '#94a3b8', requirement_doc: '#94a3b8',
  ticket: '#38bdf8', commit: '#a78bfa', design_ref: '#f472b6', release_note: '#34d399',
}

function ResultCard({ item, dark, t }) {
  const Icon = TYPE_ICON[item.kind] || Layers
  const color = TYPE_COLOR[item.subType] || '#94a3b8'
  const label = TYPE_LABEL[item.subType] || item.subType

  return (
    <div
      className="group flex gap-3 px-4 py-3.5 rounded-xl transition-all cursor-default"
      style={{
        background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
        border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e5e7eb',
      }}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ background: `${color}18`, color }}>
            {label}
          </span>
          {item.initiativeName && (
            <span className="text-[11px] text-gray-500 truncate">
              {t('globalSearch.in')} <span className={dark ? 'text-gray-300' : 'text-gray-700'}>{item.initiativeName}</span>
            </span>
          )}
        </div>
        <p className={`text-[13.5px] font-medium leading-snug truncate ${dark ? 'text-gray-100' : 'text-gray-800'}`}>
          {item.title}
        </p>
        {item.snippet && (
          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
            {item.snippet}
          </p>
        )}
      </div>
    </div>
  )
}

export default function GlobalSearch() {
  const { dark } = useTheme()
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults(null); setError(null); return }
    setLoading(true); setError(null)
    try {
      const res = await api.get('/search', { params: { q } })
      setResults(res.data)
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Search failed')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  // Focus on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  const head  = dark ? 'text-gray-100' : 'text-gray-800'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const inputBg = dark
    ? 'bg-white/[0.05] border-white/[0.1] text-gray-100 placeholder:text-gray-600'
    : 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400'

  const total = results ? (results.totalEvents + results.totalSources) : 0
  const hasResults = results && (results.events?.length > 0 || results.sources?.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-[22px] font-bold ${head}`}>{t('globalSearch.title')}</h2>
        <p className={`text-[14px] ${muted}`}>{t('globalSearch.subtitle')}</p>
      </div>

      {/* Search box */}
      <div className="relative">
        <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${muted}`} />
        {loading && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('globalSearch.placeholder')}
          className={`w-full pl-11 pr-11 py-3.5 rounded-2xl border text-[14px] outline-none transition-all
            focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 ${inputBg}`}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-[13px]"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* Empty state */}
      {!query && !loading && (
        <div className={`border-2 border-dashed rounded-2xl py-20 text-center ${dark ? 'border-white/[0.07] text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          <Search size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-[14px] font-medium">{t('globalSearch.emptyTitle')}</p>
          <p className={`text-[12px] mt-1 ${muted}`}>{t('globalSearch.emptySubtitle')}</p>
        </div>
      )}

      {/* No results */}
      {query && !loading && !error && results && !hasResults && (
        <div className={`border-2 border-dashed rounded-2xl py-16 text-center ${dark ? 'border-white/[0.07] text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          <p className="text-[14px]">{t('globalSearch.noResultsFor')} <span className="font-semibold">"{query}"</span></p>
          <p className={`text-[12px] mt-1 ${muted}`}>{t('globalSearch.noResultsHint')}</p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-5">
          <p className={`text-[12px] ${muted}`}>
            {total} {total !== 1 ? t('globalSearch.resultsForPlural') : t('globalSearch.resultsFor')} {t('globalSearch.in')} <span className="font-semibold">"{query}"</span>
          </p>

          {results.events?.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={13} className="text-emerald-500" />
                <h3 className={`text-[11.5px] font-bold uppercase tracking-wide ${muted}`}>
                  {t('globalSearch.eventsSection')} ({results.totalEvents})
                </h3>
                {results.totalEvents > results.events.length && (
                  <span className={`text-[11px] ml-auto flex items-center gap-0.5 ${muted}`}>
                    {t('globalSearch.showing')} {results.events.length} <ArrowRight size={10} />
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {results.events.map(item => (
                  <ResultCard key={item.id} item={item} dark={dark} t={t} />
                ))}
              </div>
            </section>
          )}

          {results.sources?.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={13} className="text-teal-500" />
                <h3 className={`text-[11.5px] font-bold uppercase tracking-wide ${muted}`}>
                  {t('globalSearch.sourcesSection')} ({results.totalSources})
                </h3>
                {results.totalSources > results.sources.length && (
                  <span className={`text-[11px] ml-auto flex items-center gap-0.5 ${muted}`}>
                    {t('globalSearch.showing')} {results.sources.length} <ArrowRight size={10} />
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {results.sources.map(item => (
                  <ResultCard key={item.id} item={item} dark={dark} t={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
