import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getInitiatives, createInitiative, renameInitiative, updateInitiative, deleteInitiative } from '../api/client'
import { useAuth } from './AuthContext'

const InitiativeContext = createContext(null)

const SELECTED_KEY = 'nplc_initiative'

function persistSelected(id) {
  try {
    if (id) localStorage.setItem(SELECTED_KEY, id)
    else localStorage.removeItem(SELECTED_KEY)
  } catch { /* ignore */ }
}

export function InitiativeProvider({ children }) {
  const { isAuthed } = useAuth()
  const [initiatives, setInitiatives] = useState([])
  const [currentId, setCurrentId] = useState(() => {
    try { return localStorage.getItem(SELECTED_KEY) } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const select = useCallback((id) => {
    setCurrentId(id)
    persistSelected(id)
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthed) return
    setLoading(true); setError(null)
    try {
      const res = await getInitiatives()
      const list = res.data || []
      setInitiatives(list)
      // Keep the current selection if it still exists, else pick the newest.
      setCurrentId((prev) => {
        const stillThere = prev && list.some((i) => i.id === prev)
        const next = stillThere ? prev : (list[0]?.id ?? null)
        persistSelected(next)
        return next
      })
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [isAuthed])

  useEffect(() => {
    if (isAuthed) refresh()
    else { setInitiatives([]); setCurrentId(null) }
  }, [isAuthed, refresh])

  async function create(name, description, priority) {
    const res = await createInitiative(name, description, priority)
    await refresh()
    select(res.data.id)
    return res.data
  }

  async function rename(id, name) {
    await renameInitiative(id, name)
    await refresh()
  }

  async function update(id, changes) {
    await updateInitiative(id, changes)
    await refresh()
  }

  async function remove(id) {
    await deleteInitiative(id)
    if (id === currentId) select(null)
    await refresh()
  }

  const current = initiatives.find((i) => i.id === currentId) || null

  return (
    <InitiativeContext.Provider
      value={{ initiatives, currentId, current, loading, error, select, refresh, create, rename, update, remove }}
    >
      {children}
    </InitiativeContext.Provider>
  )
}

export function useInitiative() {
  const ctx = useContext(InitiativeContext)
  if (!ctx) throw new Error('useInitiative must be used within InitiativeProvider')
  return ctx
}
