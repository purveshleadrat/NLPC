import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// --- Auth token plumbing ------------------------------------------------------
const TOKEN_KEY = 'nplc_token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* ignore */ }
}

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 the token is gone or expired — clear it and let the app fall back to login.
// A callback is registered by AuthContext so we don't hard-reload.
let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      setToken(null)
      if (onUnauthorized) onUnauthorized()
    }
    return Promise.reject(err)
  },
)

// --- Auth ---------------------------------------------------------------------
export const login  = (tenantSlug, password) => api.post('/auth/login', { tenantSlug, password })
export const signup = (tenantName, tenantSlug, password) =>
  api.post('/auth/signup', { tenantName, tenantSlug, password })

// --- Initiatives --------------------------------------------------------------
export const getInitiatives   = () => api.get('/initiatives')
export const getInitiative    = (id) => api.get(`/initiatives/${id}`)
export const createInitiative = (name) => api.post('/initiatives', { name })
export const renameInitiative = (id, name) => api.put(`/initiatives/${id}`, { name })
export const deleteInitiative = (id) => api.delete(`/initiatives/${id}`)

// --- Connections (tenant-owned Jira/GitHub accounts) --------------------------
export const getConnections    = () => api.get('/connections')
export const createConnection  = (data) => api.post('/connections', data)
export const deleteConnection  = (id) => api.delete(`/connections/${id}`)
export const rotateSecret      = (id, secret) => api.post(`/connections/${id}/secret`, { secret })

// --- Initiative <-> connection bindings ---------------------------------------
export const getInitiativeConnections = (initiativeId) => api.get(`/initiatives/${initiativeId}/connections`)
export const bindConnection   = (initiativeId, connectionId, scopeKey) =>
  api.post(`/initiatives/${initiativeId}/connections`, null, { params: { connectionId, ...(scopeKey ? { scopeKey } : {}) } })
export const unbindConnection = (initiativeId, connectionId) =>
  api.delete(`/initiatives/${initiativeId}/connections/${connectionId}`)

// --- Sync + import (read-only connectors -> sources -> extract) ----------------
export const syncInitiative   = (initiativeId) => api.post(`/initiatives/${initiativeId}/sync`)
export const importJira       = (initiativeId, connectionId, key) =>
  api.post(`/initiatives/${initiativeId}/import/jira`, null, { params: { connectionId, key } })
export const importGitBranch  = (initiativeId, connectionId, branch) =>
  api.post(`/initiatives/${initiativeId}/import/github/branch`, null, { params: { connectionId, branch } })
export const importGitCommit  = (initiativeId, connectionId, sha) =>
  api.post(`/initiatives/${initiativeId}/import/github/commit`, null, { params: { connectionId, sha } })

// --- Sources ------------------------------------------------------------------
export const getSources    = (initiativeId, type) =>
  api.get('/sources', { params: { initiativeId, ...(type ? { type } : {}) } })
export const ingestSource  = (initiativeId, data) =>
  api.post('/sources', data, { params: { initiativeId } })
export const deleteSource  = (id) => api.delete(`/sources/${id}`)

// --- Events / Timeline --------------------------------------------------------
export const getEvents = (initiativeId, params = {}) =>
  api.get('/events', { params: { initiativeId, ...params } })
export const addEvent  = (initiativeId, data) =>
  api.post('/events', data, { params: { initiativeId } })

// --- Contradictions -----------------------------------------------------------
export const getContradictions = (initiativeId) =>
  api.get('/contradictions', { params: { initiativeId } })

// --- Extraction (LLM: raw sources -> facts) -----------------------------------
export const extractFacts = (initiativeId) => api.post(`/initiatives/${initiativeId}/extract`)

// --- Ask (LLM answering) ------------------------------------------------------
export const askQuestion = (initiativeId, question) =>
  api.post(`/initiatives/${initiativeId}/ask`, { question })

// --- Scope --------------------------------------------------------------------
export const getScope = (initiativeId) => api.get(`/initiatives/${initiativeId}/scope`)

// --- Resume brief (LLM) -------------------------------------------------------
export const getResumeBrief = (initiativeId) => api.get(`/initiatives/${initiativeId}/brief`)

// --- Decisions (append + supersede/resolve) -----------------------------------
export const addDecision = (initiativeId, data) =>
  api.post(`/initiatives/${initiativeId}/decisions`, data)

// --- Mail (SMTP: AI-written progress / release-note email) --------------------
export const sendInitiativeMail = (initiativeId, to) =>
  api.post(`/initiatives/${initiativeId}/send-mail`, { to })

// --- Jira (tenant-scoped) -----------------------------------------------------
export const getJiraProjects = (connectionId) =>
  api.get('/jira/projects', { params: connectionId ? { connectionId } : {} })
export const searchJiraTickets = (jql, connectionId) =>
  api.get('/jira/tickets', { params: { jql, ...(connectionId ? { connectionId } : {}) } })
// Exact-key lookup - "CJ-01" never resolves to "CJ-011"
export const getJiraTicket = (key) => api.get(`/jira/tickets/${encodeURIComponent(key)}`)

// --- GitHub (tenant-scoped) ---------------------------------------------------
export const listGitHubBranches = (connectionId) =>
  api.get('/github/branches', { params: connectionId ? { connectionId } : {} })
export const getGitHubBranch = (name) => api.get(`/github/branches/${encodeURIComponent(name)}`)

// Combined Jira ticket + matching GitHub branch, by exact ticket key
export const lookupTicket = (key) => api.get(`/tickets/${encodeURIComponent(key)}`)

export default api
