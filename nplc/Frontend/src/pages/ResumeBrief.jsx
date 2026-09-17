import { useState } from 'react'
import { getResumeBrief } from '../api/client'
import { FileText, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock, ArrowRight, Sparkles } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const SECTIONS = [
  {
    key: 'currentScope',
    title: 'Current Approved Scope',
    icon: CheckCircle,
    darkColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    lightColor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    single: true,
  },
  {
    key: 'recentChanges',
    title: 'Recent Changes',
    icon: RefreshCw,
    darkColor: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    lightColor: 'bg-amber-50 border-amber-200 text-amber-700',
    bullet: ArrowRight,
    bulletColor: 'text-amber-500',
  },
  {
    key: 'supersededDecisions',
    title: 'Superseded — Do Not Act On',
    icon: AlertTriangle,
    darkColor: 'bg-red-500/10 border-red-500/20 text-red-400',
    lightColor: 'bg-red-50 border-red-200 text-red-700',
    strikethrough: true,
  },
  {
    key: 'openQuestions',
    title: 'Open Questions',
    icon: Clock,
    darkColor: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    lightColor: 'bg-orange-50 border-orange-200 text-orange-700',
    qmark: true,
  },
  {
    key: 'risks',
    title: 'Risks & Dependencies',
    icon: AlertTriangle,
    darkColor: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    lightColor: 'bg-violet-50 border-violet-200 text-violet-700',
    bullet: AlertTriangle,
    bulletColor: 'text-violet-400',
  },
]

function BriefSection({ section, value, dark }) {
  const { title, icon: Icon, darkColor, lightColor, single, bullet: Bullet, bulletColor, strikethrough, qmark } = section
  const color = dark ? darkColor : lightColor
  const card = dark ? 'glass-dark' : 'glass-light shadow-sm'
  const body = dark ? 'text-gray-300' : 'text-gray-700'

  const content = single ? (
    <p className={`text-[16px] leading-relaxed ${body}`}>{value}</p>
  ) : (
    <ul className="space-y-2">
      {value.map((item, i) => (
        <li key={i} className={`flex items-start gap-2.5 text-[16px] leading-relaxed ${body} ${strikethrough ? 'line-through opacity-60' : ''}`}>
          {Bullet && <Bullet size={12} className={`${bulletColor} mt-0.5 flex-shrink-0`} />}
          {qmark && <span className="text-orange-400 font-bold text-[16.5px] leading-none flex-shrink-0 mt-0.5">?</span>}
          {!Bullet && !qmark && <span className={`w-1 h-1 rounded-full mt-2 flex-shrink-0 ${dark ? 'bg-gray-500' : 'bg-gray-400'}`} />}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )

  return (
    <div className={`border rounded-2xl overflow-hidden ${card} ${dark ? 'border-white/[0.07]' : 'border-gray-200'}`}>
      <div className={`flex items-center gap-2 px-5 py-3 border-b ${color} ${dark ? 'border-white/[0.05]' : 'border-current/10'}`}>
        <Icon size={14} />
        <span className="text-[16.5px] font-semibold">{title}</span>
      </div>
      <div className="px-5 py-4">{content}</div>
    </div>
  )
}

export default function ResumeBrief() {
  const { dark } = useTheme()
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await getResumeBrief()
      setBrief(res.data)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to generate brief.')
    } finally {
      setLoading(false)
    }
  }

  const emptyBorder = dark ? 'border-white/[0.07] text-gray-600' : 'border-gray-200 text-gray-400'

  return (
    <div className="max-w-3xl mx-auto">

      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-2 brand-gradient text-white px-5 py-2.5 rounded-xl text-[16px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 mb-6"
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : <Sparkles size={14} />}
        {loading ? 'Generating brief…' : brief ? 'Regenerate Brief' : 'Generate Brief'}
      </button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl px-4 py-3 text-[16px] mb-6">
          {error}
        </div>
      )}

      {!brief && !loading && !error && (
        <div className={`text-center py-24 border-2 border-dashed rounded-2xl ${emptyBorder}`}>
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-[16px]">Click "Generate Brief" to create a one-page catch-up summary.</p>
          <p className={`text-[16px] mt-1 ${dark ? 'text-gray-700' : 'text-gray-300'}`}>
            Powered by ingested sources & AI extraction
          </p>
        </div>
      )}

      {brief && (
        <div className="space-y-4">

          {/* Hero header */}
          <div className="brand-gradient rounded-2xl px-6 py-6 shadow-xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={12} className="text-indigo-200" />
                <span className="text-[16px] font-bold uppercase tracking-[0.15em] text-indigo-200">
                  Resume Brief · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-[24px] font-bold text-white leading-snug">
                {brief.initiativeTitle || 'Product Initiative'}
              </h2>
              {brief.overview && (
                <p className="text-[16px] text-indigo-100 mt-2 leading-relaxed max-w-xl">{brief.overview}</p>
              )}
            </div>
          </div>

          {/* Dynamic sections */}
          {SECTIONS.map((section) => {
            const value = brief[section.key]
            if (!value || (Array.isArray(value) && value.length === 0)) return null
            return <BriefSection key={section.key} section={section} value={value} dark={dark} />
          })}

          {/* Recommended next step */}
          {brief.recommendedNextStep && (
            <div className={`rounded-2xl px-6 py-5 border ${dark ? 'glass-dark border-white/[0.07]' : 'glass-light shadow-sm border-gray-200'}`}>
              <div className={`text-[16px] font-bold uppercase tracking-[0.12em] mb-2 ${dark ? 'text-indigo-400' : 'text-indigo-500'}`}>
                Recommended First Action
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight size={15} className={`mt-0.5 flex-shrink-0 ${dark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                <p className={`text-[16px] leading-relaxed font-medium ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {brief.recommendedNextStep}
                </p>
              </div>
            </div>
          )}

          {/* Sources */}
          {brief.sourcesReferenced?.length > 0 && (
            <p className={`text-[17px] pt-1 ${dark ? 'text-gray-700' : 'text-gray-400'}`}>
              Sources: {brief.sourcesReferenced.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
