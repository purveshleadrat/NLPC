import { NavLink } from 'react-router-dom'
import {
  Upload,
  GitCommitHorizontal,
  Zap,
  MessageSquare,
  FileText,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Ingest Sources', icon: Upload },
  { to: '/timeline', label: 'Decision Timeline', icon: GitCommitHorizontal },
  { to: '/impact', label: 'Change Impact', icon: Zap },
  { to: '/ask', label: 'Ask Context', icon: MessageSquare },
  { to: '/brief', label: 'Resume Brief', icon: FileText },
]

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-gray-900 text-gray-100 flex flex-col">
      <div className="px-5 py-6 border-b border-gray-700">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">
          Hackathon 2K26
        </p>
        <h1 className="text-base font-bold leading-tight text-white">
          Never Lose Product Context
        </h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-gray-700 text-xs text-gray-500">
        Backend @ localhost:4000
      </div>
    </aside>
  )
}
