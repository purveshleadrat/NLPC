import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Sources
export const getSources = () => api.get('/sources')
export const ingestSource = (data) => api.post('/sources/ingest', data)

// Events / Timeline
export const getEvents = () => api.get('/events')
export const addEvent = (data) => api.post('/events', data)

// Contradictions
export const getContradictions = () => api.get('/contradictions')

// Ask (context answering)
export const askQuestion = (question) =>
  api.post('/ask', { question })



// kkfkk
// Resume brief
export const getResumeBrief = () => api.get('/resume-brief')

// Jira
export const getJiraProjects = () => api.get('/jira/projects')
export const searchJiraTickets = (jql) =>
  api.get('/jira/tickets', { params: { jql } })
// Exact-key lookup - "CJ-01" never resolves to "CJ-011"
export const getJiraTicket = (key) => api.get(`/jira/tickets/${encodeURIComponent(key)}`)

// GitHub
export const listGitHubBranches = () => api.get('/github/branches')
// Exact-name lookup - "CJ-01" never resolves to "CJ-011"
export const getGitHubBranch = (name) => api.get(`/github/branches/${encodeURIComponent(name)}`)

// Combined Jira ticket + matching GitHub branch, by exact ticket key
export const lookupTicket = (key) => api.get(`/tickets/${encodeURIComponent(key)}`)
