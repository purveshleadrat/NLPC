import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import IngestSources from './pages/IngestSources'
import DecisionTimeline from './pages/DecisionTimeline'
import ChangeImpact from './pages/ChangeImpact'
import AskContext from './pages/AskContext'
import ResumeBrief from './pages/ResumeBrief'
import { ThemeProvider, useTheme } from './context/ThemeContext'

const PAGE_META = {
  '/':         { title: 'Ingest Sources',    sub: 'Feed documents into the knowledge base' },
  '/timeline': { title: 'Decision Timeline', sub: 'Chronological history of decisions & changes' },
  '/impact':   { title: 'Change Impact',     sub: 'Which items are affected by each decision' },
  '/ask':      { title: 'Ask AI',            sub: 'Query your product context with natural language' },
  '/brief':    { title: 'Resume Brief',      sub: 'One-page catch-up for any team member' },
}

function TopBar() {
  const { dark } = useTheme()
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] || PAGE_META['/']

  return (
    <header
      className="fixed top-0 left-[220px] right-0 h-[52px] flex items-center px-7 border-b z-40"
      style={{
        background: dark ? '#131320' : '#ffffff',
        borderColor: dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb',
      }}
    >
      <div className="flex-1">
        <h1 className={`text-[14.5px] font-bold leading-none ${dark ? 'text-white' : 'text-gray-900'}`}>
          {meta.title}
        </h1>
        <p className={`text-[11px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          {meta.sub}
        </p>
      </div>
    </header>
  )
}

function AppContent() {
  const { dark } = useTheme()

  return (
    <div
      className="min-h-screen flex"
      style={{ background: dark ? '#0d0d1a' : '#f3f4f6' }}
    >
      <Sidebar />
      <div className="flex-1 ml-[220px] flex flex-col">
        <TopBar />
        <main className="flex-1 pt-[52px] overflow-y-auto">
          <div className="p-7 max-w-[1100px]">
            <Routes>
              <Route path="/"         element={<IngestSources />} />
              <Route path="/timeline" element={<DecisionTimeline />} />
              <Route path="/impact"   element={<ChangeImpact />} />
              <Route path="/ask"      element={<AskContext />} />
              <Route path="/brief"    element={<ResumeBrief />} />
            </Routes>
          </div>
        </main>
      </div>
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
