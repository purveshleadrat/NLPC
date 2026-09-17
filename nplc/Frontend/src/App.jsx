import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import IngestSources from './pages/IngestSources'
import DecisionTimeline from './pages/DecisionTimeline'
import ChangeImpact from './pages/ChangeImpact'
import AskContext from './pages/AskContext'
import ResumeBrief from './pages/ResumeBrief'
import JiraTickets from './pages/JiraTickets'
import JiraTicketDetail from './pages/JiraTicketDetail'
import ImportSources from './pages/ImportSources'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { InitiativeProvider, useInitiative } from './context/InitiativeContext'
import { FolderPlus, Loader2 } from 'lucide-react'

// Pages that read/write the decision graph need an initiative selected first.
function RequireInitiative({ children }) {
  const { dark } = useTheme()
  const { currentId, loading, create } = useInitiative()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={22} className="animate-spin mr-2" /> Loading initiatives…
      </div>
    )
  }
  if (!currentId) {
    return (
      <div className={`max-w-md mx-auto text-center py-24 border-2 border-dashed rounded-2xl ${dark ? 'border-white/[0.07] text-gray-500' : 'border-gray-200 text-gray-400'}`}>
        <FolderPlus size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-[15px] mb-4">No initiative yet. Create one to start capturing product memory.</p>
        <button
          onClick={async () => {
            const name = window.prompt('Name your initiative (e.g. "Bulk Update")')
            if (name && name.trim()) { try { await create(name.trim()) } catch (e) { alert(e?.response?.data?.message || e.message) } }
          }}
          className="brand-gradient text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20">
          Create initiative
        </button>
      </div>
    )
  }
  return children
}

function Shell() {
  const { dark } = useTheme()
  return (
    <div className="min-h-screen flex" style={{ background: dark ? '#0d0d1a' : '#f3f4f6' }}>
      <Sidebar />
      <main className="ml-56 flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<RequireInitiative><IngestSources /></RequireInitiative>} />
          <Route path="/timeline" element={<RequireInitiative><DecisionTimeline /></RequireInitiative>} />
          <Route path="/impact" element={<RequireInitiative><ChangeImpact /></RequireInitiative>} />
          <Route path="/ask" element={<RequireInitiative><AskContext /></RequireInitiative>} />
          <Route path="/brief" element={<RequireInitiative><ResumeBrief /></RequireInitiative>} />
          <Route path="/import" element={<RequireInitiative><ImportSources /></RequireInitiative>} />
          <Route path="/settings" element={<RequireInitiative><Settings /></RequireInitiative>} />
          <Route path="/jira" element={<JiraTickets />} />
          <Route path="/jira/:key" element={<JiraTicketDetail />} />
        </Routes>
      </main>
    </div>
  )
}

function AppContent() {
  const { isAuthed } = useAuth()
  if (!isAuthed) return <Login />
  return (
    <InitiativeProvider>
      <Shell />
    </InitiativeProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}
