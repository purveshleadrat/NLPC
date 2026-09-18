import { useState } from 'react'
import { CheckCircle, AlertCircle, Loader2, Zap, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ingestSource } from '../api/client'
import { useInitiative } from '../context/InitiativeContext'
import SideSheet from './SideSheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Calendar } from './ui/calendar'

const SOURCE_TYPES = [
  { value: 'meeting_note',    label: 'Meeting Note' },
  { value: 'requirement_doc', label: 'Requirement Doc' },
  { value: 'ticket',          label: 'Ticket' },
  { value: 'design_ref',      label: 'Design Reference' },
  { value: 'release_note',    label: 'Release Note' },
  { value: 'transcript',      label: 'Transcript' },
  { value: 'commit',          label: 'Commit Message' },
]

export default function AddSourceSheet({ onClose, onAdded }) {
  const { currentId } = useInitiative()
  const [form, setForm] = useState({
    type: 'meeting_note', title: '', rawText: '', docDate: '', author: '', externalRef: '',
  })
  const [dateOpen, setDateOpen] = useState(false)
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')

  const label = 'block text-[11px] font-semibold uppercase tracking-wide mb-1.5 text-muted-foreground'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.rawText || !form.docDate) {
      setStatus('error'); setMessage('Title, date and content are required.'); return
    }
    setStatus('loading')
    try {
      await ingestSource(currentId, form)
      setStatus('ok')
      setMessage(`"${form.title}" ingested.`)
      onAdded?.()
      setTimeout(onClose, 700)
    } catch (err) {
      setStatus('error')
      setMessage(err?.response?.data?.message || err.message || 'Ingestion failed.')
    }
  }

  return (
    <SideSheet title="Add a source" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 h-full">
        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Type *</label>
              <Select
                value={form.type}
                onValueChange={(val) => setForm({ ...form, type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={label}>Date *</label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center justify-between rounded-[7px] border border-input bg-background/50 px-3 py-1.5 text-[12.5px] font-normal transition-colors hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-left"
                  >
                    <span className={form.docDate ? 'text-foreground' : 'text-muted-foreground'}>
                      {form.docDate
                        ? format(new Date(form.docDate + 'T00:00:00'), 'dd MMM yyyy')
                        : 'Pick a date'}
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
                        const year = date.getFullYear()
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const day = String(date.getDate()).padStart(2, '0')
                        setForm({ ...form, docDate: `${year}-${month}-${day}` })
                        setDateOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <label className={label}>Title *</label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Security Review: Bulk Update Scope Reduction"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Author</label>
              <Input
                type="text"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="e.g. Priya S."
              />
            </div>
            <div>
              <label className={label}>External Ref</label>
              <Input
                type="text"
                value={form.externalRef}
                onChange={(e) => setForm({ ...form, externalRef: e.target.value })}
                placeholder="e.g. NPLC-88, REQ-204"
              />
            </div>
          </div>

          <div>
            <label className={label}>Content *</label>
            <Textarea
              rows={8}
              value={form.rawText}
              onChange={(e) => setForm({ ...form, rawText: e.target.value })}
              placeholder="Paste the full text of the document here…"
              className="font-mono text-[12.5px]"
            />
          </div>

          {status === 'ok' && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-[7px] px-3 py-2 text-[12.5px]">
              <CheckCircle size={14} /> {message}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-[7px] px-3 py-2 text-[12.5px]">
              <AlertCircle size={14} /> {message}
            </div>
          )}
        </div>

        {/* Action Buttons Pinned to Bottom */}
        <div className="p-4 border-t border-white/10 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="brand" disabled={status === 'loading'}>
            {status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            {status === 'loading' ? 'Ingesting…' : 'Ingest source'}
          </Button>
        </div>
      </form>
    </SideSheet>
  )
}
