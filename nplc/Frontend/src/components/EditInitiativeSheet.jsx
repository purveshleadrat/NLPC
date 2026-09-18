import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useInitiative } from '../context/InitiativeContext'
import { useLanguage } from '../context/LanguageContext'
import SideSheet from './SideSheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import PrioritySelect from './PrioritySelect'

// Jira/GitHub bindings aren't edited here - those live in Settings and the initiative
// workspace header, which already have their own bind/unbind flows.
export default function EditInitiativeSheet({ initiative, onClose }) {
  const { update } = useInitiative()
  const { t } = useLanguage()

  const [name, setName] = useState(initiative.name)
  const [description, setDescription] = useState(initiative.description || '')
  const [priority, setPriority] = useState(initiative.priority || 'MEDIUM')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const label = 'block text-[11px] font-semibold uppercase tracking-wide mb-1.5 text-muted-foreground'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await update(initiative.id, { name: name.trim(), description: description.trim(), priority })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t('editInit.failedUpdate'))
      setSubmitting(false)
    }
  }

  return (
    <SideSheet title={t('editInit.title')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 h-full">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={label}>{t('editInit.name')}</label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('newInit.namePlaceholder')}
            />
          </div>

          <div>
            <label className={label}>{t('editInit.description')}</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('newInit.descPlaceholder')}
              rows={4}
            />
          </div>

          <div>
            <label className={label}>{t('editInit.priority')}</label>
            <PrioritySelect value={priority} onChange={setPriority} />
          </div>

          {error && (
            <p className="text-[12.5px] text-red-500">{error}</p>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="brand" disabled={!name.trim() || submitting}>
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {t('editInit.saveChanges')}
          </Button>
        </div>
      </form>
    </SideSheet>
  )
}
