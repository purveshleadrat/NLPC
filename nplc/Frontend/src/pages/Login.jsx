import { useState, useEffect, useRef } from 'react'
import { Brain, Loader2, LogIn, UserPlus, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/* Animated line-drawing canvas on the left panel */
function AnimatedCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let t = 0

    function resize() {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Node grid
    const COLS = 8, ROWS = 10
    function node(c, r) {
      return {
        x: (c / (COLS - 1)) * canvas.width,
        y: (r / (ROWS - 1)) * canvas.height,
      }
    }

    // Edges between adjacent nodes
    const edges = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c + 1 < COLS) edges.push([{ r, c }, { r, c: c + 1 }])
        if (r + 1 < ROWS) edges.push([{ r, c }, { r: r + 1, c }])
        if (c + 1 < COLS && r + 1 < ROWS) edges.push([{ r, c }, { r: r + 1, c: c + 1 }])
      }
    }

    // Assign each edge a random phase offset
    const phases = edges.map(() => Math.random() * Math.PI * 2)

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.008

      edges.forEach((edge, i) => {
        const a = node(edge[0].c, edge[0].r)
        const b = node(edge[1].c, edge[1].r)
        const alpha = 0.12 + 0.22 * Math.abs(Math.sin(t + phases[i]))
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`
        ctx.lineWidth = 0.8
        ctx.stroke()
      })

      // Floating dots at nodes
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const { x, y } = node(c, r)
          const a = 0.15 + 0.35 * Math.abs(Math.sin(t * 1.3 + c * 0.7 + r * 0.5))
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(52, 211, 153, ${a})`
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />
}

export default function Login() {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState('login')
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      if (mode === 'signup') await signup(tenantName.trim(), tenantSlug.trim(), password)
      else await login(tenantSlug.trim(), password)
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-[13.5px] outline-none transition-all
    bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400
    focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400`

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0f0d' }}>
      {/* ── Left: animated panel ── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden" style={{ background: '#060d0a' }}>
        <AnimatedCanvas />

        {/* Overlay gradient */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(6,13,10,0.5) 0%, rgba(6,13,10,0.1) 100%)' }} />

        {/* Brand text */}
        <div className="relative z-10 p-10 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3">
            <div className="brand-gradient w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ boxShadow: '0 0 20px rgba(5,150,105,0.6)' }}>
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <div className="text-[20px] font-black text-white tracking-tight">NLPC</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] gradient-text">Never Lose Product Context</div>
            </div>
          </div>

          <div>
            <h1 className="text-[36px] font-black text-white leading-tight tracking-tight mb-3">
              Your product<br />memory,{' '}
              <span className="gradient-text">always intact.</span>
            </h1>
            <p className="text-[13px] text-gray-500 max-w-[34ch] leading-relaxed">
              Capture every decision, ticket, commit and open question — then ask anything, instantly.
            </p>
          </div>

          <p className="text-[10px] text-gray-700">Powered by Gemini AI · Spring Boot 3 · React 18</p>
        </div>
      </div>

      {/* ── Right: form card ── */}
      <div className="autofill-light w-full lg:w-[420px] flex items-center justify-center p-6"
        style={{ background: '#ffffff' }}>
        <div className="w-full max-w-[360px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="brand-gradient w-10 h-10 rounded-xl flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <div className="text-[18px] font-black text-gray-900">NLPC</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] gradient-text">Never Lose Product Context</div>
            </div>
          </div>

          <h2 className="text-[24px] font-black text-gray-900 mb-1">
            {mode === 'signup' ? 'Create workspace' : 'Login'}
          </h2>
          <p className="text-[13px] text-gray-400 mb-7">
            {mode === 'signup' ? 'One workspace, shared by your whole team.' : 'Please enter your workspace slug and password.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Workspace Name</label>
                <input value={tenantName} onChange={e => setTenantName(e.target.value)} required
                  placeholder="Acme Product Team" className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Workspace Slug</label>
              <input value={tenantSlug} onChange={e => setTenantSlug(e.target.value)} required
                placeholder="acme" autoCapitalize="none" className={inputCls} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  minLength={mode === 'signup' ? 8 : undefined} className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {mode === 'signup' && <p className="text-[11px] mt-1 text-gray-400">At least 8 characters.</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px]"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertTriangle size={14} className="flex-shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white px-5 py-3 rounded-lg text-[14px] font-bold disabled:opacity-50 transition-all cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 4px 20px rgba(5,150,105,0.4)' }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : mode === 'signup' ? <UserPlus size={15} /> : <LogIn size={15} />}
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create workspace' : 'Login'}
            </button>
          </form>

          <div className="text-center mt-6 text-[13px] text-gray-400">
            {mode === 'signup' ? 'Already have a workspace?' : "Don't have a workspace?"}{' '}
            <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null) }}
              className="font-bold gradient-text hover:underline cursor-pointer">
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
