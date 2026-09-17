import { useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { ingestSource } from '../api/client'

const SOURCE_TYPES = [
  { value: 'meeting_note', label: 'Meeting Note' },
  { value: 'requirement_doc', label: 'Requirement Doc' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'design_ref', label: 'Design Reference' },
  { value: 'release_note', label: 'Release Note' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'commit', label: 'Commit Message' },
]

const SAMPLES = [
  {
    label: 'Meeting note — Bulk Update scope reduction',
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
    label: 'Requirement doc — Bulk Contact Update v2',
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
    label: 'Ticket — NPLC-88 Audit trail',
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

This ticket was created as a direct outcome of the 2025-08-12 security review that reduced the bulk-update scope to contacts only (see MEET-2025-0812 and REQ-204 v2).

Sub-tasks:
- [ ] Schema migration for audit_log table
- [ ] Hook into bulk update service
- [ ] Expose via Activity Feed API
- [ ] Unit tests (minimum 90% coverage)

Blocked by: NPLC-72 (Activity Feed API)`,
  },
]

export default function IngestSources() {
  const [form, setForm] = useState({
    type: 'meeting_note',
    title: '',
    rawText: '',
    docDate: '',
    author: '',
    externalRef: '',
  })
  const [status, setStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [message, setMessage] = useState('')

  function loadSample(sample) {
    setForm({
      type: sample.type,
      title: sample.title,
      rawText: sample.rawText,
      docDate: sample.docDate,
      author: sample.author,
      externalRef: sample.externalRef,
    })
    setStatus(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.rawText || !form.docDate) {
      setStatus('error')
      setMessage('Title, date and content are required.')
      return
    }
    setStatus('loading')
    try {
      await ingestSource(form)
      setStatus('ok')
      setMessage(`"${form.title}" ingested successfully.`)
      setForm({ type: 'meeting_note', title: '', rawText: '', docDate: '', author: '', externalRef: '' })
    } catch (err) {
      setStatus('error')
      setMessage(err?.response?.data?.message || err.message || 'Ingestion failed.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Ingest Sources</h2>
        <p className="text-gray-500 text-sm">
          Add meeting notes, requirements, tickets, design references or release notes. The system extracts decisions, changes and open questions automatically.
        </p>
      </div>

      {/* Sample loaders */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Load a sample</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.externalRef}
              onClick={() => loadSample(s)}
              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md px-3 py-1.5 hover:bg-indigo-100 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Source type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Document date *</label>
            <input
              type="date"
              value={form.docDate}
              onChange={(e) => setForm({ ...form, docDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Security Review: Bulk Update Scope Reduction"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Author / Owner</label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="e.g. Priya S."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">External ref</label>
            <input
              type="text"
              value={form.externalRef}
              onChange={(e) => setForm({ ...form, externalRef: e.target.value })}
              placeholder="e.g. NPLC-88, REQ-204"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Content *</label>
          <textarea
            rows={10}
            value={form.rawText}
            onChange={(e) => setForm({ ...form, rawText: e.target.value })}
            placeholder="Paste the full text of the document here…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        </div>

        {status === 'ok' && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
            <CheckCircle size={16} />
            {message}
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            <AlertCircle size={16} />
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {status === 'loading' ? 'Ingesting…' : 'Ingest Source'}
        </button>
      </form>
    </div>
  )
}
