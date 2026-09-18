import { Search } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

// Placeholder for now - global, cross-initiative search lands here later.
export default function GlobalSearch() {
  const { dark } = useTheme()
  const head  = dark ? 'text-gray-100' : 'text-gray-800'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const border = dark ? 'border-white/[0.07] text-gray-500' : 'border-gray-200 text-gray-400'

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className={`text-[22px] font-bold ${head}`}>Global Search</h2>
        <p className={`text-[14px] ${muted}`}>Search across every initiative, source and decision.</p>
      </div>

      <div className={`border-2 border-dashed rounded-2xl py-24 text-center ${border}`}>
        <Search size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-[15px]">Global search is coming soon.</p>
      </div>
    </div>
  )
}
