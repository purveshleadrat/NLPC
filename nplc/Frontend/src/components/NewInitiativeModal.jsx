import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useInitiative } from '../context/InitiativeContext'
import { useLanguage } from '../context/LanguageContext'
import { getConnections, getJiraProjects, bindConnection } from '../api/client'

import SideSheet from './SideSheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import PrioritySelect from './PrioritySelect'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select'

// Jira/GitHub fields only ever show up if the tenant already has a matching connection
// configured in Settings - there is nothing to pick from otherwise, and showing an
// empty select is worse than not showing the field at all.
export default function NewInitiativeModal({ onClose }) {
  const { create } = useInitiative()
  const { t } = useLanguage()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [connections, setConnections] = useState(null) // null = still loading
  const [jiraConnectionId, setJiraConnectionId] = useState('')
  const [jiraProjects, setJiraProjects] = useState([])
  const [jiraProjectsLoading, setJiraProjectsLoading] = useState(false)
  const [jiraProjectKey, setJiraProjectKey] = useState('')
  const [githubConnectionId, setGithubConnectionId] = useState('')
  const [branchPrefix, setBranchPrefix] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const jiraConnections = useMemo(
    () => (connections || []).filter(c => c.provider === 'JIRA'),
    [connections],
  )
  const githubConnections = useMemo(
    () => (connections || []).filter(c => c.provider === 'GITHUB'),
    [connections],
  )

  useEffect(() => {
    getConnections()
      .then(res => setConnections(res.data || []))
      .catch(() => setConnections([]))
  }, [])

  // Default to the tenant's only connection of each kind, so the common case (one Jira
  // site, one repo) needs no extra clicks.
  useEffect(() => {
    if (jiraConnections.length === 1) setJiraConnectionId(jiraConnections[0].id)
  }, [jiraConnections])
  useEffect(() => {
    if (githubConnections.length === 1) setGithubConnectionId(githubConnections[0].id)
  }, [githubConnections])

  useEffect(() => {
    if (!jiraConnectionId) { setJiraProjects([]); setJiraProjectKey(''); return }
    setJiraProjectsLoading(true)
    getJiraProjects(jiraConnectionId)
      .then(res => {
        const raw = res.data
        const entry = Array.isArray(raw) ? raw[0] : null
        const values = entry?.data?.values ?? entry?.values ?? []
        setJiraProjects(values)
      })
      .catch(() => setJiraProjects([]))
      .finally(() => setJiraProjectsLoading(false))
  }, [jiraConnectionId])

  const label = 'block text-[11px] font-semibold uppercase tracking-wide mb-1.5 text-muted-foreground'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const initiative = await create(name.trim(), description.trim() || undefined, priority)
      if (jiraConnectionId && jiraProjectKey) {
        await bindConnection(initiative.id, jiraConnectionId, jiraProjectKey)
      }
      if (githubConnectionId) {
        await bindConnection(initiative.id, githubConnectionId, branchPrefix.trim() || undefined)
      }
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to create initiative.')
      setSubmitting(false)
    }
  }

  return (
    <SideSheet title={t('newInit.title')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 h-full">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={label}>{t('newInit.name')}</label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('newInit.namePlaceholder')}
            />
          </div>

          <div>
            <label className={label}>{t('newInit.description')}</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('newInit.descPlaceholder')}
              rows={3}
            />
          </div>

          <div>
            <label className={label}>{t('newInit.priority')}</label>
            <PrioritySelect value={priority} onChange={setPriority} />
          </div>

          {connections === null && (
            <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> {t('newInit.checkingConnections')}
            </div>
          )}

          {jiraConnections.length > 0 && (
            <div>
              <label className={label}>{t('newInit.jiraProject')}</label>
              {jiraConnections.length > 1 && (
                <Select value={jiraConnectionId} onValueChange={setJiraConnectionId}>
                  <SelectTrigger className="mb-2">
                    <SelectValue placeholder={t('newInit.selectJiraConn')} />
                  </SelectTrigger>
                  <SelectContent>
                    {jiraConnections.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative mt-2">
                <Select
                  value={jiraProjectKey}
                  onValueChange={setJiraProjectKey}
                  disabled={!jiraConnectionId || jiraProjectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('newInit.noJiraProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('newInit.noJiraProject')}</SelectItem>
                    {jiraProjects.map(p => (
                      <SelectItem key={p.key} value={p.key}>{p.name} ({p.key})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {jiraProjectsLoading && (
                  <Loader2 size={12} className="animate-spin absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
            </div>
          )}

          {githubConnections.length > 0 && (
            <div className="space-y-2">
              <label className={label}>{t('newInit.githubRepo')}</label>
              <Select value={githubConnectionId} onValueChange={setGithubConnectionId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('newInit.noRepo')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('newInit.noRepo')}</SelectItem>
                  {githubConnections.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.label} ({c.accountId}/{c.repo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {githubConnectionId && (
                <Input
                  value={branchPrefix}
                  onChange={e => setBranchPrefix(e.target.value)}
                  placeholder={t('newInit.branchPrefix')}
                />
              )}
            </div>
          )}

          {connections !== null && jiraConnections.length === 0 && githubConnections.length === 0 && (
            <p className="text-[12.5px] text-muted-foreground">
              {t('newInit.noConnections')}
            </p>
          )}

          {error && (
            <p className="text-[12.5px] text-red-500">{error}</p>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="brand" disabled={!name.trim() || submitting}>
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {t('newInit.createSync')}
          </Button>
        </div>
      </form>
    </SideSheet>
  )
}
