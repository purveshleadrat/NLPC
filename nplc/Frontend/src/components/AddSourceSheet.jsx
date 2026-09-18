import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle, AlertCircle, Loader2, Zap, Download,
  Calendar as CalendarIcon, ChevronDown, Search as SearchIcon,
  FileText, Ticket, Boxes,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  ingestSource, getConnections, getJiraProjects, searchJiraTickets,
  importJira, listGitHubBranches, importGitBranch,
} from '../api/client'
import { useInitiative } from '../context/InitiativeContext'
import SideSheet from './SideSheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Calendar } from './ui/calendar'

const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide mb-1.5 text-muted-foreground'

// The fan-out endpoints return one { connectionId, data, error } per connection; pull ours.
function pick(list, connectionId) {
  const arr = Array.isArray(list) ? list : []
  return arr.find((e) => e.connectionId === connectionId) || arr[0] || null
}

const JIRA_KEY = /^[A-Za-z][A-Za-z0-9]*-\d+$/

// JQL scoped to one project. `text ~` never matches an issue key, so detect a key and OR it in.
function projectTicketJql(projectKey, raw) {
  const q = (raw || '').trim()
  if (!q) return `project = "${projectKey}" ORDER BY updated DESC`
  const esc = q.replace(/"/g, '\\"')
  if (JIRA_KEY.test(q)) {
    return `project = "${projectKey}" AND (key = "${q.toUpperCase()}" OR text ~ "${esc}") ORDER BY updated DESC`
  }
  return `project = "${projectKey}" AND text ~ "${esc}" ORDER BY updated DESC`
}

// A dropdown with a search box that shows the top 10 matches. `onQueryChange` lets the parent
// either filter locally (projects, branches) or re-query the server (tickets).
function SearchableSelect({
  placeholder, valueLabel, items, loading, disabled, onQueryChange, onSelect, emptyText = 'No results',
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const shown = items.slice(0, 10)

  return (
    <Popover
      open={open}
      onOpenChange={(o) => { setOpen(o); if (o) { setQ(''); onQueryChange?.('') } }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-9 w-full items-center justify-between rounded-[7px] border border-input bg-background/50 px-3 py-1.5 text-[12.5px] transition-colors hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-left"
        >
          <span className={valueLabel ? 'text-foreground truncate' : 'text-muted-foreground'}>
            {valueLabel || placeholder}
          </span>
          <ChevronDown className="size-3.5 opacity-50 ml-2 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <div className="p-2 border-b border-white/10">
          <div className="flex items-center gap-2 rounded-[6px] bg-background/50 px-2 border border-white/10">
            <SearchIcon className="size-3.5 opacity-50 flex-shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); onQueryChange?.(e.target.value) }}
              placeholder="Search…"
              className="h-8 w-full bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-[12.5px] text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Loading…
            </div>
          ) : shown.length === 0 ? (
            <div className="px-3 py-3 text-[12.5px] text-muted-foreground">{emptyText}</div>
          ) : (
            shown.map((it) => (
              <button
                key={it.value}
                type="button"
                onClick={() => { onSelect(it); setOpen(false) }}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span className="text-[12.5px] text-foreground truncate w-full">{it.label}</span>
                {it.sub && <span className="text-[11px] text-muted-foreground truncate w-full">{it.sub}</span>}
              </button>
            ))
          )}
          {!loading && items.length > 10 && (
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-white/10">
              Showing 10 of {items.length} — refine your search
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function AddSourceSheet({ onClose, onAdded }) {
  const { currentId } = useInitiative()

  const [connections, setConnections] = useState([])
  const [kind, setKind] = useState('note') // note | jira | git
  const [status, setStatus] = useState(null) // null | loading | ok | error
  const [message, setMessage] = useState('')

  const jiraConns = connections.filter((c) => c.provider === 'JIRA')
  const gitConns = connections.filter((c) => c.provider === 'GITHUB')

  useEffect(() => {
    getConnections().then((r) => setConnections(r.data || [])).catch(() => {})
  }, [])

  const TYPES = [
    { id: 'note', label: 'Notes', icon: FileText, show: true },
    { id: 'jira', label: 'Jira', icon: Ticket, show: jiraConns.length > 0 },
    { id: 'git', label: 'Git', icon: Boxes, show: gitConns.length > 0 },
  ].filter((t) => t.show)

  function finishImport(r) {
    const ex = r?.extraction
    const extra = ex ? ` — extracted ${ex.eventsCreated} event(s)` : ''
    setStatus('ok')
    setMessage((r?.message || 'Imported') + extra + '.')
    onAdded?.()
    setTimeout(onClose, 900)
  }

  return (
    <SideSheet title="Add a source" onClose={onClose}>
      <div className="flex flex-col flex-1 min-h-0 h-full">
        {/* Source type picker */}
        <div className="px-5 pt-5">
          <label className={labelCls}>Source type</label>
          <div className="flex gap-2">
            {TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setKind(id); setStatus(null); setMessage('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-[7px] border px-3 py-2 text-[12.5px] font-medium transition-colors cursor-pointer ${
                  kind === id
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/10 text-muted-foreground hover:bg-white/5'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        {kind === 'note' && (
          <NotesForm
            currentId={currentId}
            status={status} message={message}
            setStatus={setStatus} setMessage={setMessage}
            onAdded={onAdded} onClose={onClose}
          />
        )}
        {kind === 'jira' && (
          <JiraForm
            currentId={currentId} conns={jiraConns}
            status={status} message={message}
            setStatus={setStatus} setMessage={setMessage}
            onDone={finishImport} onClose={onClose}
          />
        )}
        {kind === 'git' && (
          <GitForm
            currentId={currentId} conns={gitConns}
            status={status} message={message}
            setStatus={setStatus} setMessage={setMessage}
            onDone={finishImport} onClose={onClose}
          />
        )}
      </div>
    </SideSheet>
  )
}

// ── Notes: manual source ingest ────────────────────────────────────────────────
function NotesForm({ currentId, status, message, setStatus, setMessage, onAdded, onClose }) {
  const [form, setForm] = useState({ title: '', rawText: '', docDate: '', author: '', externalRef: '' })
  const [dateOpen, setDateOpen] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.rawText || !form.docDate) {
      setStatus('error'); setMessage('Title, date and content are required.'); return
    }
    setStatus('loading')
    try {
      await ingestSource(currentId, { ...form, type: 'note' })
      setStatus('ok'); setMessage(`"${form.title}" ingested.`)
      onAdded?.(); setTimeout(onClose, 700)
    } catch (err) {
      setStatus('error'); setMessage(err?.response?.data?.message || err.message || 'Ingestion failed.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className={labelCls}>Date *</label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-full items-center justify-between rounded-[7px] border border-input bg-background/50 px-3 py-1.5 text-[12.5px] font-normal transition-colors hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-left"
              >
                <span className={form.docDate ? 'text-foreground' : 'text-muted-foreground'}>
                  {form.docDate ? format(new Date(form.docDate + 'T00:00:00'), 'dd MMM yyyy') : 'Pick a date'}
                </span>
                <CalendarIcon className="size-3.5 opacity-50 ml-2 flex-shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-white/10 shadow-2xl" align="start">
              <Calendar
                mode="single"
                selected={form.docDate ? new Date(form.docDate + 'T00:00:00') : undefined}
                onSelect={(date) => {
                  if (date) {
                    const y = date.getFullYear()
                    const m = String(date.getMonth() + 1).padStart(2, '0')
                    const d = String(date.getDate()).padStart(2, '0')
                    setForm((f) => ({ ...f, docDate: `${y}-${m}-${d}` }))
                    setDateOpen(false)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className={labelCls}>Title *</label>
          <Input
            type="text" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Security Review: Bulk Update Scope Reduction"
          />
        </div>

        <div>
          <label className={labelCls}>Author</label>
          <Input
            type="text" value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="e.g. Priya S."
          />
        </div>

        <div>
          <label className={labelCls}>External Ref</label>
          <Input
            type="text" value={form.externalRef}
            onChange={(e) => setForm({ ...form, externalRef: e.target.value })}
            placeholder="e.g. NLPC-88, REQ-204"
          />
        </div>

        <div>
          <label className={labelCls}>Content *</label>
          <Textarea
            rows={8} value={form.rawText}
            onChange={(e) => setForm({ ...form, rawText: e.target.value })}
            placeholder="Paste the full text of the note here…"
            className="font-mono text-[12.5px]"
          />
        </div>

        <StatusNote status={status} message={message} />
      </div>

      <FooterBar onClose={onClose}>
        <Button type="submit" variant="brand" disabled={status === 'loading'}>
          {status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
          {status === 'loading' ? 'Ingesting…' : 'Ingest source'}
        </Button>
      </FooterBar>
    </form>
  )
}

// ── Jira: connection → project → ticket → import ───────────────────────────────
function JiraForm({ currentId, conns, status, message, setStatus, setMessage, onDone, onClose }) {
  const [connId, setConnId] = useState(conns.length === 1 ? conns[0].id : '')
  const [projects, setProjects] = useState([])
  const [projectQuery, setProjectQuery] = useState('')
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [project, setProject] = useState(null) // { value, label }

  const [tickets, setTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticket, setTicket] = useState(null)

  // Load the connection's projects when it changes.
  useEffect(() => {
    setProjects([]); setProject(null); setTickets([]); setTicket(null)
    if (!connId) return
    setProjectsLoading(true)
    getJiraProjects(connId)
      .then((res) => {
        const entry = pick(res.data, connId)
        if (entry?.error) throw new Error(entry.error)
        const values = entry?.data?.values || []
        setProjects(values.map((p) => ({ value: p.key, label: `${p.key} · ${p.name}`, sub: null })))
      })
      .catch((err) => { setStatus('error'); setMessage(err?.response?.data?.message || err.message) })
      .finally(() => setProjectsLoading(false))
  }, [connId, setStatus, setMessage])

  // Load / search tickets when a project is picked or the ticket query changes (debounced).
  const debounce = useRef(null)
  const loadTickets = useCallback((projectKey, q) => {
    if (!projectKey || !connId) return
    setTicketsLoading(true)
    searchJiraTickets(projectTicketJql(projectKey, q), connId)
      .then((res) => {
        const entry = pick(res.data, connId)
        if (entry?.error) throw new Error(entry.error)
        const issues = entry?.data?.issues || []
        setTickets(issues.map((i) => ({
          value: i.key,
          label: `${i.key} · ${i.fields?.summary || ''}`,
          sub: i.fields?.status?.name || null,
        })))
      })
      .catch((err) => { setStatus('error'); setMessage(err?.response?.data?.message || err.message) })
      .finally(() => setTicketsLoading(false))
  }, [connId, setStatus, setMessage])

  function onProjectSelect(it) {
    setProject(it); setTicket(null); setTickets([])
    loadTickets(it.value, '')
  }
  function onTicketQuery(q) {
    if (!project) return
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => loadTickets(project.value, q), 300)
  }

  const filteredProjects = projectQuery
    ? projects.filter((p) => p.label.toLowerCase().includes(projectQuery.toLowerCase()))
    : projects

  async function handleImport() {
    if (!ticket) return
    setStatus('loading'); setMessage('')
    try {
      const res = await importJira(currentId, connId, ticket.value)
      onDone(res.data)
    } catch (err) {
      setStatus('error'); setMessage(err?.response?.data?.message || err.message || 'Import failed.')
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <ConnectionField conns={conns} connId={connId} onChange={setConnId} noun="Jira site" />

        <div>
          <label className={labelCls}>Project</label>
          <SearchableSelect
            placeholder="Select a project"
            valueLabel={project?.label}
            items={filteredProjects}
            loading={projectsLoading}
            disabled={!connId}
            onQueryChange={setProjectQuery}
            onSelect={onProjectSelect}
            emptyText="No projects"
          />
        </div>

        <div>
          <label className={labelCls}>Ticket</label>
          <SearchableSelect
            placeholder={project ? 'Select a ticket' : 'Pick a project first'}
            valueLabel={ticket?.label}
            items={tickets}
            loading={ticketsLoading}
            disabled={!project}
            onQueryChange={onTicketQuery}
            onSelect={setTicket}
            emptyText="No tickets"
          />
        </div>

        <StatusNote status={status} message={message} />
      </div>

      <FooterBar onClose={onClose}>
        <Button type="button" variant="brand" onClick={handleImport} disabled={!ticket || status === 'loading'}>
          {status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {status === 'loading' ? 'Importing…' : 'Import ticket'}
        </Button>
      </FooterBar>
    </div>
  )
}

// ── Git: connection → branch → import ──────────────────────────────────────────
function GitForm({ currentId, conns, status, message, setStatus, setMessage, onDone, onClose }) {
  const [connId, setConnId] = useState(conns.length === 1 ? conns[0].id : '')
  const [branches, setBranches] = useState([])
  const [branchQuery, setBranchQuery] = useState('')
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [branch, setBranch] = useState(null)

  useEffect(() => {
    setBranches([]); setBranch(null)
    if (!connId) return
    setBranchesLoading(true)
    listGitHubBranches(connId)
      .then((res) => {
        const entry = pick(res.data, connId)
        if (entry?.error) throw new Error(entry.error)
        const list = entry?.data || []
        setBranches(list.map((b) => ({ value: b.name, label: b.name })))
      })
      .catch((err) => { setStatus('error'); setMessage(err?.response?.data?.message || err.message) })
      .finally(() => setBranchesLoading(false))
  }, [connId, setStatus, setMessage])

  const filtered = branchQuery
    ? branches.filter((b) => b.label.toLowerCase().includes(branchQuery.toLowerCase()))
    : branches

  async function handleImport() {
    if (!branch) return
    setStatus('loading'); setMessage('')
    try {
      const res = await importGitBranch(currentId, connId, branch.value)
      onDone(res.data)
    } catch (err) {
      setStatus('error'); setMessage(err?.response?.data?.message || err.message || 'Import failed.')
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <ConnectionField conns={conns} connId={connId} onChange={setConnId} noun="GitHub repo" isGit />

        <div>
          <label className={labelCls}>Branch</label>
          <SearchableSelect
            placeholder="Select a branch"
            valueLabel={branch?.label}
            items={filtered}
            loading={branchesLoading}
            disabled={!connId}
            onQueryChange={setBranchQuery}
            onSelect={setBranch}
            emptyText="No branches"
          />
        </div>

        <StatusNote status={status} message={message} />
      </div>

      <FooterBar onClose={onClose}>
        <Button type="button" variant="brand" onClick={handleImport} disabled={!branch || status === 'loading'}>
          {status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {status === 'loading' ? 'Importing…' : 'Import branch'}
        </Button>
      </FooterBar>
    </div>
  )
}

// ── Shared bits ────────────────────────────────────────────────────────────────
function ConnectionField({ conns, connId, onChange, noun, isGit }) {
  const labelFor = (c) => (isGit ? `${c.label} — ${c.accountId}/${c.repo}` : `${c.label} — ${c.accountId}`)
  if (conns.length === 1) {
    return (
      <div>
        <label className={labelCls}>{noun}</label>
        <p className="text-[12.5px] text-foreground rounded-[7px] border border-white/10 bg-background/50 px-3 py-2">
          {labelFor(conns[0])}
        </p>
      </div>
    )
  }
  return (
    <div>
      <label className={labelCls}>{noun} *</label>
      <Select value={connId} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Choose a ${noun}`} /></SelectTrigger>
        <SelectContent>
          {conns.map((c) => (
            <SelectItem key={c.id} value={c.id}>{labelFor(c)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function StatusNote({ status, message }) {
  if (status === 'ok') {
    return (
      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-[7px] px-3 py-2 text-[12.5px]">
        <CheckCircle size={14} /> {message}
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-[7px] px-3 py-2 text-[12.5px]">
        <AlertCircle size={14} /> {message}
      </div>
    )
  }
  return null
}

function FooterBar({ onClose, children }) {
  return (
    <div className="p-4 border-t border-white/10 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
      {children}
    </div>
  )
}
