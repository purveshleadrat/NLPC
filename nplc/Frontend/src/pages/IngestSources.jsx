import { useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2, Zap, Clipboard, Sparkles } from 'lucide-react'
import { ingestSource, extractFacts } from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { useInitiative } from '../context/InitiativeContext'

const SOURCE_TYPES = [
  { value: 'meeting_note',    label: 'Meeting Note' },
  { value: 'requirement_doc', label: 'Requirement Doc' },
  { value: 'ticket',          label: 'Ticket' },
  { value: 'design_ref',      label: 'Design Reference' },
  { value: 'release_note',    label: 'Release Note' },
  { value: 'transcript',      label: 'Transcript' },
  { value: 'commit',          label: 'Commit Message' },
]

const SAMPLES = [
  {
    label: 'Meeting Note',
    sub: 'Bulk Update scope reduction',
    icon: '🗣️',
    type: 'meeting_note',
    title: 'Security Review: Bulk Update Scope Reduction — 2025-08-12',
    docDate: '2025-08-12',
    author: 'Priya S.',
    externalRef: 'MEET-2025-0812',
    rawText: `Attendees: Priya S. (PM), Arjun K. (Security Lead), Dev team (Karan, Meera)

DECISION: Bulk-update feature scope reduced from "all record types" to "contacts only" following customer-security review on 2025-08-12.

Reason: The original requirement (REQ-204) allowed bulk-update across contacts, deals, and companies. Security review identified that bulk-editing deals without per-field audit trails violates compliance policy CP-7.

Action items:
- Update REQ-204 to contacts-only scope (Owner: Priya)
- Create ticket NPLC-88 to track per-field audit trail work (Owner: Karan)
- QA test cases TC-44 through TC-51 for deals bulk-update are now superseded

Open question: Will the deals bulk-update be revisited in Q4? No decision yet.`,
  },
  {
    label: 'Requirement Doc',
    sub: 'Bulk Contact Update v2',
    icon: '📋',
    type: 'requirement_doc',
    title: 'REQ-204: Bulk Contact Update (v2, post security review)',
    docDate: '2025-08-14',
    author: 'Priya S.',
    externalRef: 'REQ-204',
    rawText: `REQ-204: Bulk Contact Update
Version: 2 (supersedes v1 dated 2025-07-01)
Status: APPROVED

Scope: Users can select up to 500 contact records and apply a single field-value change in one action.
Excluded from scope: Deals and company records (deferred to future release pending audit trail implementation).

Acceptance criteria:
AC-1: Selection supports up to 500 contacts.
AC-2: A confirmation dialog shows count and affected field before committing.
AC-3: Every change is logged in the activity feed with user, timestamp and old/new values.
AC-4: Undo is available for 60 seconds after commit.

Dependencies: NPLC-88 (audit trail), NPLC-72 (activity feed).`,
  },
  {
    label: 'Ticket',
    sub: 'NPLC-88 Audit trail',
    icon: '🎫',
    type: 'ticket',
    title: 'NPLC-88: Add per-field audit trail for bulk contact update',
    docDate: '2025-08-13',
    author: 'Karan M.',
    externalRef: 'NPLC-88',
    rawText: `Title: Add per-field audit trail for bulk contact update
Status: IN PROGRESS
Assignee: Karan M.
Priority: HIGH

Description:
Implement per-field change logging for the bulk contact update feature. Each field change must record: userId, contactId, fieldName, oldValue, newValue, timestamp.

Sub-tasks:
- [ ] Schema migration for audit_log table
- [ ] Hook into bulk update service
- [ ] Expose via Activity Feed API
- [ ] Unit tests (minimum 90% coverage)

Blocked by: NPLC-72 (Activity Feed API)`,
  },
]

export default function IngestSources() {
  const { dark } = useTheme()
  const { currentId } = useInitiative()
  const [form, setForm] = useState({
    type: 'meeting_note', title: '', rawText: '', docDate: '', author: '', externalRef: '',
  })
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractMsg, setExtractMsg] = useState('')

  function loadSample(sample) {
    setForm({ type: sample.type, title: sample.title, rawText: sample.rawText,
      docDate: sample.docDate, author: sample.author, externalRef: sample.externalRef })
    setStatus(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.rawText || !form.docDate) {
      setStatus('error'); setMessage('Title, date and content are required.'); return
    }
    setStatus('loading')
    try {
      await ingestSource(currentId, form)
      setStatus('ok')
      setMessage(`"${form.title}" ingested. Click "Extract facts" to turn sources into decisions.`)
      setForm({ type: 'meeting_note', title: '', rawText: '', docDate: '', author: '', externalRef: '' })
    } catch (err) {
      setStatus('error')
      setMessage(err?.response?.data?.message || err.message || 'Ingestion failed.')
    }
  }

  async function handleExtract() {
    setExtracting(true); setExtractMsg('')
    try {
      const res = await extractFacts(currentId)
      const r = res.data
      setExtractMsg(
        r.sourcesProcessed === 0
          ? 'Nothing new to extract — every source already has facts.'
          : `Extracted ${r.eventsCreated} event(s) from ${r.sourcesProcessed} source(s)` +
            `${r.eventsSuperseded ? `, superseded ${r.eventsSuperseded}` : ''}` +
            `${r.constraintsCreated ? `, ${r.constraintsCreated} constraint(s)` : ''}` +
            `${r.contradictionsCreated ? `, ${r.contradictionsCreated} contradiction(s)` : ''}. See the Timeline.`,
      )
    } catch (err) {
      setExtractMsg('Extraction failed: ' + (err?.response?.data?.message || err.message))
    } finally {
      setExtracting(false)
    }
  }

  // Theme tokens
  const card   = dark ? 'glass-dark' : 'glass-light shadow-sm'
  const label  = dark ? 'text-gray-400' : 'text-gray-500'
  const inp    = dark
    ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600 focus:border-emerald-500/60 focus:ring-emerald-500/20'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-400 focus:ring-emerald-100'
  const sampleCard = dark
    ? 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.07] hover:border-emerald-500/30'
    : 'bg-gray-50 border-gray-200 hover:bg-emerald-50 hover:border-emerald-200'

  return (
    <div className="max-w-4xl">

      {/* Sample cards */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {SAMPLES.map((s) => (
          <button
            key={s.externalRef}
            onClick={() => loadSample(s)}
            className={`text-left border rounded-2xl p-4 transition-all duration-150 card-hover group ${sampleCard}`}
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`text-[17px] font-semibold mb-0.5 ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{s.label}</div>
            <div className={`text-[17px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{s.sub}</div>
            <div className={`mt-3 text-[16.5px] font-medium flex items-center gap-1 ${dark ? 'text-emerald-400' : 'text-emerald-500'}`}>
              <Clipboard size={10} /> Load sample
            </div>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className={`rounded-2xl p-6 ${card}`}>
        <div className="flex items-center gap-2 mb-5">
          <div className="brand-gradient w-7 h-7 rounded-lg flex items-center justify-center">
            <Upload size={13} className="text-white" />
          </div>
          <h3 className={`text-[17px] font-semibold ${dark ? 'text-white' : 'text-gray-800'}`}>New Source</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-[17px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 transition-colors ${inp} ${dark ? 'bg-[#12121f]' : ''}`}
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-[17px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>Date *</label>
              <input
                type="date"
                value={form.docDate}
                onChange={(e) => setForm({ ...form, docDate: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 transition-colors ${inp} ${dark ? 'bg-[#12121f]' : ''}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-[17px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Security Review: Bulk Update Scope Reduction"
              className={`w-full border rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 transition-colors ${inp} ${dark ? 'bg-[#12121f]' : ''}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-[17px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>Author</label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="e.g. Priya S."
                className={`w-full border rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 transition-colors ${inp} ${dark ? 'bg-[#12121f]' : ''}`}
              />
            </div>
            <div>
              <label className={`block text-[17px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>External Ref</label>
              <input
                type="text"
                value={form.externalRef}
                onChange={(e) => setForm({ ...form, externalRef: e.target.value })}
                placeholder="e.g. NPLC-88, REQ-204"
                className={`w-full border rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 transition-colors ${inp} ${dark ? 'bg-[#12121f]' : ''}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-[17px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>Content *</label>
            <textarea
              rows={9}
              value={form.rawText}
              onChange={(e) => setForm({ ...form, rawText: e.target.value })}
              placeholder="Paste the full text of the document here…"
              className={`w-full border rounded-xl px-3 py-2.5 text-[16px] font-mono focus:outline-none focus:ring-2 resize-y transition-colors ${inp} ${dark ? 'bg-[#12121f]' : ''}`}
            />
          </div>

          {status === 'ok' && (
            <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3 text-[17px]">
              <CheckCircle size={15} /> {message}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2.5 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-[17px]">
              <AlertCircle size={15} /> {message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex items-center gap-2 brand-gradient text-white px-5 py-2.5 rounded-xl text-[16px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
            >
              {status === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              {status === 'loading' ? 'Ingesting…' : 'Ingest Source'}
            </button>

            <button
              type="button"
              onClick={handleExtract}
              disabled={extracting}
              title="Send every not-yet-processed source to the LLM and turn it into decisions, constraints and contradictions"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[16px] font-semibold transition-all border ${dark ? 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'} disabled:opacity-50`}
            >
              {extracting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {extracting ? 'Extracting…' : 'Extract facts'}
            </button>
          </div>

          {extractMsg && (
            <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-[15px] ${dark ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'}`}>
              <Sparkles size={15} /> {extractMsg}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
