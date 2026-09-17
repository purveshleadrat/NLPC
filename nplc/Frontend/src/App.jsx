import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import IngestSources from './pages/IngestSources'
import DecisionTimeline from './pages/DecisionTimeline'
import ChangeImpact from './pages/ChangeImpact'
import AskContext from './pages/AskContext'
import ResumeBrief from './pages/ResumeBrief'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<IngestSources />} />
          <Route path="/timeline" element={<DecisionTimeline />} />
          <Route path="/impact" element={<ChangeImpact />} />
          <Route path="/ask" element={<AskContext />} />
          <Route path="/brief" element={<ResumeBrief />} />
        </Routes>
      </main>
    </div>
  )
}
