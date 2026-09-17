import { useState, useRef, useEffect } from 'react'
import { askQuestion } from '../api/client'
import { Send, Loader2, MessageSquare, AlertTriangle, User, Bot } from 'lucide-react'

const EXAMPLE_QUESTIONS = [
  'What changed in the bulk update feature and why?',
  'What is the current approved scope of bulk update?',
  'Which requirements were affected by the security review?',
  'Who decided to reduce the bulk update scope?',
  'What open questions remain unresolved?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-600' : 'bg-gray-200'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-gray-600" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
        }`}>
          {msg.content}
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {msg.sources.map((s, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 font-mono">
                {s}
              </span>
            ))}
          </div>
        )}
        {msg.hasContradiction && (
          <div className="flex items-center gap-1 text-xs text-amber-600 px-1 mt-0.5">
            <AlertTriangle size={11} />
            Contradictory evidence found — verify manually
          </div>
        )}
        {msg.uncertainty && (
          <div className="text-xs text-gray-400 px-1 mt-0.5 italic">{msg.uncertainty}</div>
        )}
      </div>
    </div>
  )
}

export default function AskContext() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! Ask me anything about this product initiative. I\'ll answer using only the ingested sources and tell you where each answer comes from.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(question) {
    const q = question || input.trim()
    if (!q) return
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
        {
          role: 'assistant',
          content: `Error: ${err?.response?.data?.message || err.message || 'Something went wrong.'}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Ask Context</h2>
        <p className="text-gray-500 text-sm">
          Ask questions about the product initiative. Answers include source references and flag contradictions.
        </p>
      </div>

      {/* Example questions */}
      <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={loading}
            className="text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-200 min-h-0">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-gray-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
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
          placeholder="Ask a question about this product initiative…"
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  )
}
