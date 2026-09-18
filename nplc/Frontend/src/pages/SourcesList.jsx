import { useState, useEffect, useCallback } from 'react'
import {
  Trash2, FileText, Ticket, GitCommitHorizontal, AlertTriangle, Boxes, Unlink,
} from 'lucide-react'
import { LoadingScreen } from '../App'
import {
  getSources, deleteSource, getInitiativeConnections, getConnections, unbindConnection,
} from '../api/client'
import { useInitiative } from '../context/InitiativeContext'
import { useTheme } from '../context/ThemeContext'

function typeIcon(type) {
  if (type === 'ticket') return Ticket
  if (type === 'commit') return GitCommitHorizontal
  return FileText
}

export default function SourcesList({ refreshTick = 0 }) {
  const { dark } = useTheme()
  const { currentId } = useInitiative()
  const [sources, setSources] = useState([])
  const [bindings, setBindings] = useState([])   // [{ connectionId, scopeKey }]
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [disconnectId, setDisconnectId] = useState(null)
  const [unbinding, setUnbinding] = useState(null)

  const card  = dark ? 'glass-dark' : 'glass-light shadow-sm'
  const head  = dark ? 'text-gray-100' : 'text-gray-800'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const rowBorder = dark ? 'border-white/[0.06]' : 'border-gray-200'

  const load = useCallback(() => {
    if (!currentId) return
    setLoading(true); setError(null)
    Promise.all([getSources(currentId), getInitiativeConnections(currentId), getConnections()])
      .then(([srcRes, bindRes, connRes]) => {
        setSources(srcRes.data || [])
        setBindings((bindRes.data || []).map((b) => ({ connectionId: b.connectionId, scopeKey: b.scopeKey })))
        setConnections(connRes.data || [])
      })
      .catch((e) => setError(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false))
  }, [currentId, refreshTick])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    setBusyId(id); setError(null)
    try {
      await deleteSource(id)
      setConfirmId(null)
      load()
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Delete failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDisconnect(connectionId) {
    setUnbinding(connectionId); setError(null)
    try {
      await unbindConnection(currentId, connectionId)
      setDisconnectId(null)
      load()
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Disconnect failed.')
    } finally {
      setUnbinding(null)
    }
  }

  if (loading) return <LoadingScreen dark={dark} />

  // Resolve each binding to its connection so we can label the source.
  const connected = bindings.map((b) => {
    const c = connections.find((x) => x.id === b.connectionId)
    return { ...b, conn: c }
  }).filter((b) => b.conn)

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-[13px]">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* ── Connected sources (per-initiative bindings) ── */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className={`text-[15px] font-semibold ${head}`}>Connected sources</h3>
          <span className={`text-[12px] ${muted}`}>{connected.length} linked</span>
        </div>

        {connected.length === 0 ? (
          <div className={`border-2 border-dashed rounded-2xl py-8 text-center ${dark ? 'border-white/[0.07] text-gray-500' : 'border-gray-200 text-gray-400'}`}>
            <p className="text-[13px]">No Jira/GitHub source linked to this initiative. Link one in Settings.</p>
          </div>
        ) : (
          <div className={`rounded-2xl overflow-hidden ${card}`}>
            {connected.map(({ connectionId, scopeKey, conn }) => {
              const isJira = conn.provider === 'JIRA'
              const Icon = isJira ? Ticket : Boxes
              const scope = isJira
                ? (scopeKey || 'whole site')
                : `${conn.accountId}/${conn.repo}${scopeKey ? ` · ${scopeKey}` : ''}`
              const confirming = disconnectId === connectionId
              return (
                <div key={connectionId} className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 ${rowBorder}`}>
                  <Icon size={15} className={muted} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[13px] font-medium truncate ${head}`}>{conn.label}</div>
                    <div className={`text-[11.5px] truncate ${muted}`}>{conn.provider} · {scope}</div>
                  </div>
                  {confirming ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[11.5px] ${muted}`}>Disconnect from this initiative?</span>
                      <button
                        onClick={() => handleDisconnect(connectionId)}
                        disabled={unbinding === connectionId}
                        className="rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      >
                        {unbinding === connectionId && <Loader2 size={11} className="animate-spin" />} Disconnect
                      </button>
                      <button
                        onClick={() => setDisconnectId(null)}
                        disabled={unbinding === connectionId}
                        className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium hover:bg-white/5 transition-colors cursor-pointer ${muted}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDisconnectId(connectionId)}
                      title="Disconnect from this initiative"
                      className="shrink-0 flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[11.5px] font-medium transition-colors hover:bg-amber-500/10 hover:text-amber-400 cursor-pointer border border-white/10 text-gray-400"
                    >
                      <Unlink size={13} /> Disconnect
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <p className={`text-[11.5px] ${muted}`}>
          Disconnecting unlinks the source from <b>this initiative only</b> — the connection stays,
          and other initiatives using it are unaffected. Already-imported items remain below; remove
          them individually if you want them gone.
        </p>
      </div>

      {/* ── Imported items ── */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className={`text-[15px] font-semibold ${head}`}>Imported items</h3>
          <span className={`text-[12px] ${muted}`}>{sources.length} total</span>
        </div>

        {sources.length === 0 ? (
          <div className={`border-2 border-dashed rounded-2xl py-12 text-center ${dark ? 'border-white/[0.07] text-gray-500' : 'border-gray-200 text-gray-400'}`}>
            <p className="text-[13px]">No items yet. Use “Add source” to import a ticket, branch, or note.</p>
          </div>
        ) : (
          <div className={`rounded-2xl overflow-hidden ${card}`}>
            {sources.map((s) => {
              const Icon = typeIcon(s.type)
              const confirming = confirmId === s.id
              return (
                <div key={s.id} className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 ${rowBorder}`}>
                  <Icon size={15} className={muted} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[13px] font-medium truncate ${head}`}>{s.title || '(untitled)'}</div>
                    <div className={`text-[11.5px] truncate ${muted}`}>
                      {[s.type, s.docDate, s.author, s.externalRef].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {confirming ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[11.5px] ${muted}`}>Remove &amp; its extracted facts?</span>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={busyId === s.id}
                        className="rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      >
                        {busyId === s.id && <Loader2 size={11} className="animate-spin" />} Remove
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={busyId === s.id}
                        className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium hover:bg-white/5 transition-colors cursor-pointer ${muted}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(s.id)}
                      title="Remove source"
                      className={`shrink-0 rounded-[6px] p-1.5 transition-colors hover:bg-red-500/10 hover:text-red-400 cursor-pointer ${muted}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <p className={`text-[11.5px] ${muted}`}>
          Removing an item also deletes the decisions the extractor derived from it, and restores any
          decision it had superseded.
        </p>
      </div>
    </div>
  )
}
