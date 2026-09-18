import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

const TOUR_KEY = 'nplc_tour_done'

const STEPS = [
  {
    title: 'Welcome to NLPC!',
    desc: 'Your AI-powered product memory. Never lose context again. Let\'s take a quick tour — it\'ll take under 2 minutes.',
    emoji: '🧠',
    target: null,
  },
  {
    title: 'Initiatives',
    desc: 'An initiative is a product feature or project. Create one here. Everything — tickets, commits, decisions — lives inside an initiative.',
    emoji: '📁',
    target: 'tour-initiatives',
  },
  {
    title: 'Global Search',
    desc: 'Search across every initiative, decision, and document in your workspace instantly with AI-powered semantic search.',
    emoji: '🔍',
    target: 'tour-search',
  },
  {
    title: 'Integrations',
    desc: 'Connect your Jira, GitHub and SMTP accounts here. Once linked, NLPC syncs tickets and commits automatically.',
    emoji: '🔌',
    target: 'tour-integrations',
  },
  {
    title: 'Settings',
    desc: 'Customise the app appearance — switch between dark and light mode, and adjust font size to your preference.',
    emoji: '⚙️',
    target: 'tour-settings',
  },
  {
    title: 'Workspace Tabs',
    desc: 'Inside each initiative: Timeline shows decisions, Ask lets you question your data with AI, Brief generates an executive summary, and Sources holds raw documents.',
    emoji: '🗂️',
    target: null,
  },
  {
    title: 'You\'re all set!',
    desc: 'Create your first initiative, connect Jira, sync — then ask "What was decided about auth?" and watch the magic.',
    emoji: '🚀',
    target: null,
  },
]

const SIDEBAR_TARGETS = new Set(['tour-initiatives', 'tour-search', 'tour-integrations', 'tour-settings'])

export default function AppTour({ onDone, onOpenSidebar, onCloseSidebar }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [cardTop, setCardTop] = useState(null)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isSidebarStep = current.target && SIDEBAR_TARGETS.has(current.target)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  function finish() {
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* ignore */ }
    onCloseSidebar?.()
    onDone()
    navigate('/integrations')
  }

  function next() { isLast ? finish() : setStep(s => s + 1) }
  function prev() { setStep(s => Math.max(0, s - 1)) }

  useEffect(() => {
    if (isSidebarStep) {
      onOpenSidebar?.()
    } else {
      onCloseSidebar?.()
      setCardTop(null)
    }

    if (!current.target) return
    const timer = setTimeout(() => {
      const el = document.getElementById(current.target)
      if (el) {
        el.style.boxShadow = '0 0 0 2px #34d399, 0 0 16px rgba(52,211,153,0.5)'
        el.style.borderRadius = '8px'
        el.style.transition = 'box-shadow 0.3s ease'
        const rect = el.getBoundingClientRect()
        const cardH = 240
        const top = Math.min(
          Math.max(rect.top + rect.height / 2 - cardH / 2, 16),
          window.innerHeight - cardH - 16
        )
        setCardTop(top)
      }
    }, 360)

    return () => {
      clearTimeout(timer)
      const el = document.getElementById(current.target)
      if (el) { el.style.boxShadow = ''; el.style.borderRadius = ''; el.style.transition = '' }
    }
  }, [current.target])

  // Card positioning — on mobile always center; on desktop offset next to sidebar
  const cardStyle = isSidebarStep && cardTop !== null && !isMobile
    ? { left: 232, top: cardTop, transform: 'none' }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <>
      {/* Backdrop — excludes sidebar area on desktop sidebar steps */}
      <div className="fixed z-[998] pointer-events-none"
        style={{
          top: 0, bottom: 0,
          left: isSidebarStep && !isMobile ? 220 : 0,
          right: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
        }} />

      {/* Arrow pointing to sidebar (desktop sidebar steps only) */}
      {isSidebarStep && cardTop !== null && !isMobile && (
        <div className="fixed z-[1000]" style={{ left: 224, top: cardTop + 100, transform: 'translateY(-50%)' }}>
          <div style={{
            width: 0, height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '8px solid rgba(52,211,153,0.4)',
          }} />
        </div>
      )}

      {/* Tour card */}
      <div className="fixed z-[1000] w-[90%] max-w-[380px] rounded-2xl p-5 shadow-2xl transition-all duration-300"
        style={{ background: '#0d1410', border: '1px solid rgba(52,211,153,0.25)', ...cardStyle }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              App Tour · {step + 1}/{STEPS.length}
            </span>
          </div>
          <button type="button" onClick={finish} className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: 'linear-gradient(90deg, #059669, #0d9488)' }} />
        </div>

        {/* Content */}
        <div className="flex items-start gap-3 mb-5">
          <span className="text-2xl flex-shrink-0">{current.emoji}</span>
          <div>
            <h3 className="text-[15px] font-bold text-white mb-1">{current.title}</h3>
            <p className="text-[13px] text-gray-400 leading-relaxed">{current.desc}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>

          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button type="button" key={i} onClick={() => setStep(i)}
                className="rounded-full transition-all cursor-pointer"
                style={{
                  width: i === step ? 16 : 6, height: 6,
                  background: i === step ? '#34d399' : 'rgba(255,255,255,0.15)',
                }} />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 2px 8px rgba(5,150,105,0.4)' }}
          >
            {isLast ? 'Get started' : 'Next'} {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </>
  )
}

export function shouldShowTour() {
  try { return !localStorage.getItem(TOUR_KEY) } catch { return false }
}
