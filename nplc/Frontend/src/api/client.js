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
