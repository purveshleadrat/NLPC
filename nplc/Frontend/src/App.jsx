import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import IngestSources from './pages/IngestSources'
import DecisionTimeline from './pages/DecisionTimeline'
import ChangeImpact from './pages/ChangeImpact'
import AskContext from './pages/AskContext'
import ResumeBrief from './pages/ResumeBrief'
import Tickets from './pages/Tickets'
import JiraTickets from './pages/JiraTickets'
import JiraTicketDetail from './pages/JiraTicketDetail'

  return (
    <div
      className="min-h-screen flex"
      style={{ background: dark ? '#0d0d1a' : '#f3f4f6' }}
    >
      <Sidebar />
      <main className="ml-56 flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<IngestSources />} />
          <Route path="/timeline" element={<DecisionTimeline />} />
          <Route path="/impact" element={<ChangeImpact />} />
          <Route path="/ask" element={<AskContext />} />
          <Route path="/brief" element={<ResumeBrief />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/jira" element={<JiraTickets />} />
          <Route path="/jira/:key" element={<JiraTicketDetail />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
