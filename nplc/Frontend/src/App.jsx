import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Initiatives from './pages/Initiatives'
import InitiativeWorkspace from './pages/InitiativeWorkspace'
import JiraTickets from './pages/JiraTickets'
import JiraTicketDetail from './pages/JiraTicketDetail'
import ImportSources from './pages/ImportSources'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { InitiativeProvider, useInitiative } from './context/InitiativeContext'
import { FolderPlus, Loader2 } from 'lucide-react'
import { useState } from 'react'
import NewInitiativeModal from './components/NewInitiativeModal'

// Pages that read/write the decision graph need an initiative selected first.
function RequireInitiative({ children }) {
  const { dark } = useTheme()
  const { currentId, loading } = useInitiative()
  const [showModal, setShowModal] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={22} className="animate-spin mr-2" /> Loading initiatives…
      </div>
    )
  }
  if (!currentId) {
    return (
      <>
        <div className={`max-w-md mx-auto text-center py-24 border-2 border-dashed rounded-2xl ${dark ? 'border-white/[0.07] text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          <FolderPlus size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-[15px] mb-4">No initiative yet. Create one to start capturing product memory.</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-prototype-primary cursor-pointer"
          >
            Create initiative
          </button>
        </div>
        {showModal && <NewInitiativeModal onClose={() => setShowModal(false)} />}
      </>
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
          <Route path="/initiatives" element={<Initiatives />} />
          <Route path="/" element={<RequireInitiative><InitiativeWorkspace /></RequireInitiative>} />
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
