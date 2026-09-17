import { useState, useRef, useEffect } from 'react'
import { askQuestion } from '../api/client'
import { Send, AlertTriangle, User, Bot, Sparkles } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const EXAMPLE_QUESTIONS = [
  'What changed in bulk update and why?',
  'What is the current approved scope?',
  'Which requirements were affected by the security review?',
  'Who decided to reduce the scope?',
  'What open questions remain unresolved?',
]

function TypingIndicator({ dark }) {
  return (
    <div className="flex gap-3 items-end">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${dark ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-100'}`}>
        <Bot size={14} className={dark ? 'text-indigo-400' : 'text-indigo-500'} />
      </div>
      <div className={`rounded-2xl rounded-bl-sm px-4 py-3 ${dark ? 'glass-dark' : 'glass-light shadow-sm'}`}>
        <div className="flex gap-1 items-center h-4">
          <span className={`w-1.5 h-1.5 rounded-full dot-1 ${dark ? 'bg-gray-500' : 'bg-gray-400'}`} />
          <span className={`w-1.5 h-1.5 rounded-full dot-2 ${dark ? 'bg-gray-500' : 'bg-gray-400'}`} />
          <span className={`w-1.5 h-1.5 rounded-full dot-3 ${dark ? 'bg-gray-500' : 'bg-gray-400'}`} />
        </div>
      </div>
    </div>
  )
}

function Message({ msg, dark }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} items-end`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'brand-gradient shadow-md shadow-indigo-500/20'
          : dark ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-100'
      }`}>
        {isUser
          ? <User size={13} className="text-white" />
          : <Bot size={14} className={dark ? 'text-indigo-400' : 'text-indigo-500'} />
        }
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1.5 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 text-[16px] leading-relaxed ${
          isUser
            ? 'brand-gradient text-white rounded-br-sm shadow-md shadow-indigo-500/15'
            : dark
              ? 'glass-dark text-gray-200 rounded-bl-sm'
              : 'glass-light shadow-sm text-gray-700 rounded-bl-sm'
        }`}>
          {msg.content}
        </div>

        {msg.sources?.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {msg.sources.map((s, i) => (
              <span key={i} className={`text-[16.5px] rounded-lg px-2 py-0.5 font-mono ${dark ? 'bg-white/[0.05] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                {s}
              </span>
            ))}
          </div>
        )}

        {msg.hasContradiction && (
          <div className="flex items-center gap-1.5 text-[17px] text-amber-400 px-1">
            <AlertTriangle size={11} />
            Contradictory evidence — verify manually
          </div>
        )}

        {msg.uncertainty && (
          <div className={`text-[17px] px-1 italic ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            {msg.uncertainty}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AskContext() {
  const { dark } = useTheme()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! Ask me anything about this product initiative. I'll answer using only the ingested sources and cite where each answer comes from.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(question) {
    const q = question || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await askQuestion(q)
      const data = res.data
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer || data.message || JSON.stringify(data),
          sources: data.sources || [],
          hasContradiction: data.hasContradiction || false,
          uncertainty: data.uncertainty || null,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err?.response?.data?.message || err.message || 'Something went wrong.'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const msgArea = dark ? 'glass-dark' : 'bg-gray-50/60 border border-gray-200'
  const exBtn   = dark
    ? 'bg-white/[0.04] border border-white/[0.07] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 hover:border-indigo-500/30 disabled:opacity-40'
    : 'bg-white border border-gray-200 text-gray-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-40'
  const inp     = dark
    ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600 focus:border-indigo-500/60 focus:ring-indigo-500/20'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:ring-indigo-100'

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>

      {/* Example pills */}
      <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mr-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
          <Sparkles size={10} /> Try asking
        </div>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={loading}
            className={`text-[16px] rounded-full px-3 py-1.5 transition-all ${exBtn}`}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className={`flex-1 min-h-0 overflow-y-auto rounded-2xl p-5 space-y-5 ${msgArea}`}>
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} dark={dark} />
        ))}
        {loading && <TypingIndicator dark={dark} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send() }}
        className="mt-3 flex gap-2 flex-shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about this product initiative…"
          disabled={loading}
          className={`flex-1 border rounded-2xl px-4 py-3 text-[16px] focus:outline-none focus:ring-2 disabled:opacity-60 transition-colors ${inp} ${dark ? 'bg-[#12121f]' : ''}`}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="brand-gradient text-white px-4 py-3 rounded-2xl hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
