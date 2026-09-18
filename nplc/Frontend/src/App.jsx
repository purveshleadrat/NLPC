import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'sonner'
import Sidebar from './components/Sidebar'
import Initiatives from './pages/Initiatives'
import InitiativeWorkspace from './pages/InitiativeWorkspace'
import GlobalSearch from './pages/GlobalSearch'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { InitiativeProvider, useInitiative } from './context/InitiativeContext'
import { FolderPlus, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import NewInitiativeModal from './components/NewInitiativeModal'

// Pages that read/write the decision graph need an initiative selected first. On
// /initiatives/:id this also reconciles the URL's id into context.currentId - the source
// of truth for every child (InitiativeHeader, DecisionTimeline, ...) - so a direct visit or
// refresh selects the right initiative instead of relying on whatever was clicked last.
function RequireInitiative({ children }) {
  const { dark } = useTheme()
  const { id: idFromRoute } = useParams()
  const { currentId, initiatives, loading, select } = useInitiative()
  const [showModal, setShowModal] = useState(false)

  const routeIdIsValid = !idFromRoute || initiatives.some(i => i.id === idFromRoute)

  useEffect(() => {
    if (idFromRoute && routeIdIsValid && idFromRoute !== currentId) select(idFromRoute)
  }, [idFromRoute, routeIdIsValid, currentId, select])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={22} className="animate-spin mr-2" /> Loading initiatives…
      </div>
    )
  }
  if (idFromRoute && !routeIdIsValid) {
    return <Navigate to="/initiatives" replace />
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
    <div className="min-h-screen flex" style={{ background: dark ? '#06060f' : '#f3f4f6', position: 'relative', overflow: 'hidden' }}>
      {dark && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', top: '-20%', left: '-5%', background: 'radial-gradient(circle at center, rgba(16,185,129,0.1) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', bottom: '-18%', right: '-5%', background: 'radial-gradient(circle at center, rgba(20,184,166,0.08) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: '35%', left: '50%', background: 'radial-gradient(circle at center, rgba(5,150,105,0.07) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg,rgba(16,185,129,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>
      )}
      <Sidebar />
      <main className="ml-56 flex-1 p-8 overflow-y-auto" style={{ position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/initiatives" element={<Initiatives />} />
          <Route path="/initiatives/:id" element={<RequireInitiative><InitiativeWorkspace /></RequireInitiative>} />
          <Route path="/search" element={<GlobalSearch />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/sign-in" element={<Navigate to="/initiatives" replace />} />
          <Route path="/sign-up" element={<Navigate to="/initiatives" replace />} />
          <Route path="*" element={<Navigate to="/initiatives" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function AppContent() {
  const { isAuthed } = useAuth()
  const { dark } = useTheme()
  return (
    <>
      <Toaster theme={dark ? 'dark' : 'light'} position="top-center" richColors closeButton />
      {isAuthed ? (
        <InitiativeProvider>
          <Shell />
        </InitiativeProvider>
      ) : (
        <Routes>
          <Route path="/sign-in" element={<Login />} />
          <Route path="/sign-up" element={<Login />} />
          <Route path="*" element={<Navigate to="/sign-in" replace />} />
        </Routes>
      )}
    </>
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
