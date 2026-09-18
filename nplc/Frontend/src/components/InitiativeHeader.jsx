import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Plus, Upload, Loader2 } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'
import { getInitiativeConnections, getConnections, getSources, syncInitiative, addDecision } from '../api/client'
import SideSheet from './SideSheet'
import AddSourceSheet from './AddSourceSheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

const TABS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'impact',   label: 'Scope' },
  { id: 'ask',      label: 'Ask' },
  { id: 'brief',    label: 'Brief' },
]

function AddDecisionSheet({ onClose, onAdded }) {
  const { currentId } = useInitiative()
  const [summary, setSummary] = useState('')
  const [decidedBy, setDecidedBy] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const label = 'block text-[11px] font-semibold uppercase tracking-wide mb-1.5 text-muted-foreground'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!summary.trim()) return
    setSubmitting(true); setError(null)
    try {
      await addDecision(currentId, { summary: summary.trim(), decidedBy: decidedBy.trim() || undefined })
      onAdded()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to add decision.')
      setSubmitting(false)
    }
  }

  return (
    <SideSheet title="Add a decision" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 h-full">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={label}>Decision</label>
            <Textarea
              autoFocus
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="e.g. Cap broadcasts at 5/day per workspace"
              rows={4}
            />
          </div>
          <div>
            <label className={label}>Decided by (optional)</label>
            <Input
              value={decidedBy}
              onChange={e => setDecidedBy(e.target.value)}
              placeholder="e.g. Sam"
            />
          </div>
          {error && <p className="text-[12.5px] text-red-500">{error}</p>}
        </div>
        <div className="p-4 border-t border-white/10 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="brand" disabled={!summary.trim() || submitting}>
            {submitting && <Loader2 size={13} className="animate-spin" />}
            Add decision
          </Button>
        </div>
      </form>
    </SideSheet>
  )
}

export default function InitiativeHeader({ activeTab, onTabChange }) {
  const { dark } = useTheme()
  const { current, currentId } = useInitiative()
  const [scopeLabel, setScopeLabel] = useState(null)
  const [ticketCount, setTicketCount] = useState(null)
  const [commitCount, setCommitCount] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [showAddDecision, setShowAddDecision] = useState(false)
  const [showAddSource, setShowAddSource] = useState(false)

  const loadSummary = useCallback(() => {
    if (!currentId) return
    Promise.all([getInitiativeConnections(currentId), getConnections()])
      .then(([bindingsRes, connsRes]) => {
        const bindings = bindingsRes.data || []
        const conns = connsRes.data || []
        const parts = bindings.map(b => {
          const c = conns.find(x => x.id === b.connectionId)
          if (!c) return null
          if (c.provider === 'JIRA') return b.scopeKey || c.label
          return `${c.accountId}/${c.repo}`
        }).filter(Boolean)
        setScopeLabel(parts.join(' · ') || null)
      })
      .catch(() => setScopeLabel(null))

    getSources(currentId)
      .then(res => {
        const sources = res.data || []
        setTicketCount(sources.filter(s => s.type === 'ticket').length)
        setCommitCount(sources.filter(s => s.type === 'commit').length)
      })
      .catch(() => { setTicketCount(null); setCommitCount(null) })
  }, [currentId])

  useEffect(() => { loadSummary() }, [loadSummary])

  async function handleSync() {
    setSyncing(true); setSyncMsg(null)
    try {
      const res = await syncInitiative(currentId)
      const r = res.data
      const parts = []
      if (r.jiraSourcesAdded) parts.push(`${r.jiraSourcesAdded} Jira`)
      if (r.githubSourcesAdded) parts.push(`${r.githubSourcesAdded} GitHub`)
      setSyncMsg(parts.length ? `Synced: ${parts.join(' + ')}` : 'Synced — no new sources')
      loadSummary()
    } catch (err) {
      setSyncMsg(err?.response?.data?.message || err.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const border = dark ? 'border-white/[0.07]' : 'border-gray-200'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const title = dark ? 'text-gray-100' : 'text-gray-900'
  const tabActive = dark ? 'bg-white/[0.08] text-gray-100' : 'bg-gray-900 text-white'
  const tabInactive = dark ? 'text-gray-400 hover:bg-white/[0.04]' : 'text-gray-500 hover:bg-gray-100'

  return (
    <div className={`mb-5 pb-3.5 border-b ${border}`}>
      <div className="flex items-start justify-between gap-4 mb-3.5 flex-wrap">
        <div>
          <h2 className={`text-[17px] font-bold tracking-[-0.2px] ${title}`}>{current?.name || '—'}</h2>
          <p className={`text-[12px] mt-0.5 ${muted}`}>
            {[scopeLabel, ticketCount !== null && `${ticketCount} tickets`, commitCount !== null && `${commitCount} commits`]
              .filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`cursor-pointer ${activeTab === t.id ? 'btn-prototype-tab-active' : 'btn-prototype-tab'}`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setShowAddSource(true)}
            className="btn-prototype-tab cursor-pointer"
          >
            Add source
          </button>
          <button
            onClick={() => setShowAddDecision(true)}
            className="btn-prototype-tab cursor-pointer"
          >
            Add decision
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-prototype-tab flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <p className={`text-[12px] ${muted}`}>{syncMsg}</p>
      )}

      {showAddDecision && (
        <AddDecisionSheet onClose={() => setShowAddDecision(false)} onAdded={loadSummary} />
      )}
      {showAddSource && (
        <AddSourceSheet onClose={() => setShowAddSource(false)} onAdded={loadSummary} />
      )}
    </div>
  )
}
