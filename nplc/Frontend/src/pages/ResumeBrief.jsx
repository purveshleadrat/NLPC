import { useState } from 'react'
import { getResumeBrief } from '../api/client'
import { FileText, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react'

function Section({ title, icon: Icon, color, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 ${color}`}>
        <Icon size={16} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

export default function ResumeBrief() {
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await getResumeBrief()
      setBrief(res.data)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to generate brief.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Resume Brief</h2>
        <p className="text-gray-500 text-sm">
          A one-page catch-up for a returning or newly assigned team member: current state, recent changes, open questions and next steps.
        </p>
      </div>

      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors mb-6"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        {loading ? 'Generating brief…' : brief ? 'Regenerate Brief' : 'Generate Brief'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {!brief && !loading && !error && (
        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click "Generate Brief" to create a one-page pick-up-where-you-left-off summary.</p>
        </div>
      )}

      {brief && (
        <div className="space-y-4">
          {/* Initiative header */}
          <div className="bg-indigo-600 text-white rounded-xl px-6 py-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-1">
              Resume Brief — {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h3 className="text-xl font-bold">{brief.initiativeTitle || 'Product Initiative'}</h3>
            {brief.overview && <p className="text-sm text-indigo-100 mt-2 leading-relaxed">{brief.overview}</p>}
          </div>

          {/* Current approved scope */}
          {brief.currentScope && (
            <Section title="Current Approved Scope" icon={CheckCircle} color="bg-green-50 text-green-800">
              <p className="text-sm text-gray-700 leading-relaxed">{brief.currentScope}</p>
            </Section>
          )}

          {/* Recent changes */}
          {brief.recentChanges && brief.recentChanges.length > 0 && (
            <Section title="Recent Changes" icon={RefreshCw} color="bg-amber-50 text-amber-800">
              <ul className="space-y-2">
                {brief.recentChanges.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <ArrowRight size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Superseded decisions */}
          {brief.supersededDecisions && brief.supersededDecisions.length > 0 && (
            <Section title="Superseded Decisions (Do Not Act On)" icon={AlertTriangle} color="bg-red-50 text-red-800">
              <ul className="space-y-2">
                {brief.supersededDecisions.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-500 line-through decoration-red-300">
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Open questions */}
          {brief.openQuestions && brief.openQuestions.length > 0 && (
            <Section title="Open Questions" icon={Clock} color="bg-orange-50 text-orange-800">
              <ul className="space-y-2">
                {brief.openQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-400 font-bold flex-shrink-0">?</span>
                    {q}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Risks */}
          {brief.risks && brief.risks.length > 0 && (
            <Section title="Risks & Dependencies" icon={AlertTriangle} color="bg-purple-50 text-purple-800">
              <ul className="space-y-2">
                {brief.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <AlertTriangle size={13} className="text-purple-400 mt-0.5 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Recommended next step */}
          {brief.recommendedNextStep && (
            <div className="bg-gray-900 text-white rounded-xl px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Recommended First Action</div>
              <p className="text-sm leading-relaxed">{brief.recommendedNextStep}</p>
            </div>
          )}

          {/* Sources */}
          {brief.sourcesReferenced && brief.sourcesReferenced.length > 0 && (
            <div className="text-xs text-gray-400 pt-2">
              Sources: {brief.sourcesReferenced.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
