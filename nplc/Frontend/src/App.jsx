import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'sonner'
import Sidebar from './components/Sidebar'
import Initiatives from './pages/Initiatives'
import InitiativeWorkspace from './pages/InitiativeWorkspace'
import GlobalSearch from './pages/GlobalSearch'
import Settings from './pages/Settings'
import Integrations from './pages/Integrations'
import Login from './pages/Login'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { InitiativeProvider, useInitiative } from './context/InitiativeContext'
import { FolderPlus, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import NewInitiativeModal from './components/NewInitiativeModal'
import AppTour, { shouldShowTour } from './components/AppTour'

export function LoadingScreen({ dark, minHeight = '60vh' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 select-none" style={{ minHeight }}>
      <p className="loading-sub" style={{ fontSize: 13, color: dark ? '#6b7280' : '#9ca3af', fontWeight: 500 }}>
        fetching &amp; setting up your data...
      </p>
      <div className="loading-script flex items-center gap-2.5" style={{ marginTop: 4 }}>
        <div className="loading-line" />
        <span style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 24,
          color: '#34d399',
          fontWeight: 700,
          lineHeight: 1,
        }}>loading</span>
      </div>
    </div>
  )
}

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
      <LoadingScreen dark={dark} />
    )
  }
  if (idFromRoute && !routeIdIsValid) {
    return <Navigate to="/" replace />
  }
  if (!currentId) {
    return (
      <>
        <div className={`max-w-md mx-auto text-center py-24 border-2 border-dashed rounded-2xl ${dark ? 'border-white/[0.07] text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          <FolderPlus size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-[15px] mb-4">No initiative yet. Create one to start capturing product memory.</p>
          <button onClick={() => setShowModal(true)} className="btn-prototype-primary cursor-pointer">
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tourDone, setTourDone] = useState(() => !shouldShowTour())

  return (
    <div className="min-h-screen flex" style={{ background: dark ? '#0a0f0d' : '#f3f4f6' }}>
      {/* Subtle mesh background */}
      {dark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.04]"
            style={{ top: '-10%', right: '10%', background: 'radial-gradient(circle, #059669, transparent 70%)' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.03]"
            style={{ bottom: '5%', left: '15%', background: 'radial-gradient(circle, #0d9488, transparent 70%)' }} />
        </div>
      )}

      {/* Mobile sidebar overlay — not dismissible during tour nav steps */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => { if (tourDone) setSidebarOpen(false) }} />
      )}

      {/* Sidebar — z-[999] so it stays above tour backdrop */}
      <div className={`fixed top-0 left-0 h-screen z-[999] transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-[220px] min-w-0 overflow-y-auto relative">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30"
          style={{ background: dark ? '#0a0f0d' : '#f3f4f6', borderBottom: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e5e7eb' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-gray-200 transition-colors">
            <Menu size={20} />
          </button>
          <span className="text-[15px] font-bold" style={{ color: dark ? '#fff' : '#064e3b' }}>NPLC</span>
        </div>

        <div className="nplc-content p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/initiatives" element={<Initiatives />} />
            <Route path="/initiatives/:id" element={<RequireInitiative><InitiativeWorkspace /></RequireInitiative>} />
            <Route path="/search" element={<GlobalSearch />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="*" element={<Navigate to="/initiatives" replace />} />
          </Routes>
        </div>
      </main>

      {/* App Tour */}
      {!tourDone && <AppTour onDone={() => setTourDone(true)} onOpenSidebar={() => setSidebarOpen(true)} onCloseSidebar={() => setSidebarOpen(false)} />}
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
