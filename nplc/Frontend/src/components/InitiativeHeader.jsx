import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Loader2, Mail, Send, CheckCircle } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'
import { getInitiativeConnections, getConnections, getSources, syncInitiative, sendInitiativeMail } from '../api/client'
import SideSheet from './SideSheet'
import AddSourceSheet from './AddSourceSheet'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

const TABS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'ask',      label: 'Ask' },
]

function SendMailSheet({ onClose }) {
  const { currentId } = useInitiative()
  const [recipients, setRecipients] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const label = 'block text-[11px] font-semibold uppercase tracking-wide mb-1.5 text-muted-foreground'

  async function handleSend(e) {
    e.preventDefault()
    const to = recipients.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)
    if (to.length === 0) { setError('Enter at least one email address.'); return }
    setSending(true); setError(null); setResult(null)
    try {
      const res = await sendInitiativeMail(currentId, to)
      setResult(res.data)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  return (
    <SideSheet title="Send progress mail" onClose={onClose}>
      <form onSubmit={handleSend} className="flex flex-col flex-1 min-h-0 h-full">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={label}>Recipients</label>
            <Textarea
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
              rows={3}
              placeholder="alice@team.com, bob@team.com"
              autoFocus
            />
            <p className="text-[11.5px] text-muted-foreground mt-1.5">
              Separate multiple addresses with commas or new lines.
            </p>
          </div>

          <div className="text-[12px] text-muted-foreground rounded-[7px] border border-white/10 bg-background/50 px-3 py-2">
            The email is written by AI from this initiative’s current timeline — a progress update,
            or a release note if the parent ticket is released.
          </div>

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-[7px] px-3 py-2 text-[12.5px]">
                <CheckCircle size={14} /> Sent a {result.mode === 'release' ? 'release note' : 'progress update'} to {result.recipients} recipient(s).
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-1">Subject</div>
                <div className="text-[12.5px] text-foreground">{result.subject}</div>
              </div>
              {result.preview && (
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-1">Preview</div>
                  <div className="text-[12px] text-foreground whitespace-pre-wrap rounded-[7px] border border-white/10 bg-background/50 px-3 py-2 max-h-48 overflow-y-auto">{result.preview}</div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-[7px] px-3 py-2 text-[12.5px]">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{result ? 'Close' : 'Cancel'}</Button>
          {!result && (
            <Button type="submit" variant="brand" disabled={sending}>
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {sending ? 'Generating & sending…' : 'Generate & send'}
            </Button>
          )}
        </div>
      </form>
    </SideSheet>
  )
}

export default function InitiativeHeader({ activeTab, onTabChange, onChanged }) {
  const { dark } = useTheme()
  const { current, currentId } = useInitiative()
  const [scopeLabel, setScopeLabel] = useState(null)
  const [ticketCount, setTicketCount] = useState(null)
  const [commitCount, setCommitCount] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [showAddSource, setShowAddSource] = useState(false)
  const [showSendMail, setShowSendMail] = useState(false)
  const [hasSmtp, setHasSmtp] = useState(false)

  const loadSummary = useCallback(() => {
    if (!currentId) return
    Promise.all([getInitiativeConnections(currentId), getConnections()])
      .then(([bindingsRes, connsRes]) => {
        const bindings = bindingsRes.data || []
        const conns = connsRes.data || []
        setHasSmtp(conns.some(c => c.provider === 'SMTP'))
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
      setSyncMsg(parts.length ? `Synced: ${parts.join(' + ')} refreshed` : 'Synced — no changes')
      loadSummary()
      onChanged?.()
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
          {hasSmtp && (
            <button
              onClick={() => setShowSendMail(true)}
              className="btn-prototype-tab flex items-center gap-1.5 cursor-pointer"
            >
              <Mail size={11} /> Send mail
            </button>
          )}
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

      {showAddSource && (
        <AddSourceSheet
          onClose={() => setShowAddSource(false)}
          onAdded={() => { loadSummary(); onChanged?.(); onTabChange('timeline') }}
        />
      )}
      {showSendMail && (
        <SendMailSheet onClose={() => setShowSendMail(false)} />
      )}
    </div>
  )
}
