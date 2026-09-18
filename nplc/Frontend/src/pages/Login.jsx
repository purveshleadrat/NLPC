import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Brain, Loader2, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Lowercase letters, digits and single internal hyphens, 2-32 chars, no leading/trailing
// hyphen - matches how the backend normalises and stores the slug.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/i

export default function Login() {
  const { login, signup } = useAuth()
  const location = useLocation()
  const mode = location.pathname === '/sign-up' ? 'signup' : 'login'
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ mode: 'onBlur' })

  useEffect(() => { reset() }, [mode, reset])

  async function submit(data) {
    setLoading(true)
    try {
      if (mode === 'signup') await signup(data.tenantName.trim(), data.tenantSlug.trim(), data.password)
      else await login(data.tenantSlug.trim(), data.password)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#06060f',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes move1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,-50px)} }
        @keyframes move2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,40px)} }
        @keyframes move3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,30px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .nplc-input {
          width: 100%; box-sizing: border-box;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 12px; padding: 12px 14px;
          font-size: 14px; color: #f1f5f9;
          outline: none; transition: border-color .18s, box-shadow .18s;
        }
        .nplc-input::placeholder { color: rgba(255,255,255,0.2); }
        .nplc-input:focus {
          border-color: rgba(16,185,129,0.7);
          box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
        }
        .nplc-btn {
          width: 100%; padding: 13px;
          background: linear-gradient(135deg, #059669, #10b981, #14b8a6);
          color: #fff; border: none; border-radius: 12px;
          font-size: 14px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity .18s, transform .1s;
          box-shadow: 0 8px 32px rgba(16,185,129,0.35);
        }
        .nplc-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); box-shadow: 0 12px 40px rgba(16,185,129,0.45); }
        .nplc-btn:active:not(:disabled) { transform: translateY(0); }
        .nplc-btn:disabled { opacity: .5; cursor: not-allowed; }
        .nplc-card { animation: fadeUp .45s ease both; }
      `}</style>

      {/* Mesh gradient background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          top: '-20%', left: '-15%',
          background: 'radial-gradient(circle at center, rgba(16,185,129,0.2) 0%, transparent 60%)',
          animation: 'move1 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          bottom: '-18%', right: '-10%',
          background: 'radial-gradient(circle at center, rgba(20,184,166,0.18) 0%, transparent 60%)',
          animation: 'move2 13s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          top: '30%', left: '45%',
          background: 'radial-gradient(circle at center, rgba(5,150,105,0.15) 0%, transparent 60%)',
          animation: 'move3 8s ease-in-out infinite',
        }} />
        {/* Noise grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg,rgba(16,185,129,0.04) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>

      {/* Left — hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 72px',
        position: 'relative', zIndex: 1,
      }} className="hidden lg:flex">

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg,#059669,#10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 28px rgba(16,185,129,0.55)',
          }}>
            <Brain size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>NLPC</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
              background: 'linear-gradient(90deg,#34d399,#14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Never Lose Product Context
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#34d399', marginBottom: 18 }}>
          Product Memory · AI Native
        </div>

        <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2.5px', marginBottom: 24 }}>
          <span style={{ color: '#fff' }}>Never lose<br /></span>
          <span style={{
            background: 'linear-gradient(90deg,#34d399,#10b981,#14b8a6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>context again.</span>
        </div>

        <p style={{ fontSize: 16, lineHeight: 1.8, color: 'rgba(255,255,255,0.38)', maxWidth: 400, marginBottom: 52 }}>
          One place for every decision, every source, every&nbsp;why —
          so your team never has to start from&nbsp;scratch.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 48 }}>
          {[['AI Q&A','Ask anything'],['Timeline','Full history'],['Sync','Jira + GitHub']].map(([big,small],i)=>(
            <div key={i}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#34d399' }}>{big}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{small}</div>
            </div>
          ))}
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
          {[
            { dot: '#34d399', text: 'Capture decisions with full context & rationale' },
            { dot: '#10b981', text: 'Sync Jira tickets and GitHub commits automatically' },
            { dot: '#14b8a6', text: 'Ask AI questions about any initiative instantly' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13.5, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: f.dot, flexShrink: 0 }} />
              {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        width: 460, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 44px', position: 'relative', zIndex: 1,
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(24px)',
      }}>
        <div className="nplc-card" style={{ width: '100%' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11,
              background: 'linear-gradient(135deg,#059669,#10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16,185,129,0.5)' }}>
              <Brain size={19} color="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>NLPC</span>
          </div>

          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.5px' }}>
            {mode === 'signup' ? 'Create a workspace' : 'Welcome back'}
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', marginBottom: 28, lineHeight: 1.5 }}>
            {mode === 'signup'
              ? 'A workspace has one shared password for your team.'
              : 'Sign in to your workspace to continue.'}
          </div>

          <form onSubmit={handleSubmit(submit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
                  color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.02em' }}>
                  Workspace name
                </label>
                <input className="nplc-input" placeholder="Acme Product Team"
                  {...register('tenantName', { required: 'Workspace name is required' })} />
                {errors.tenantName && (
                  <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 5 }}>{errors.tenantName.message}</p>
                )}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.02em' }}>
                Workspace slug
              </label>
              <input className="nplc-input" placeholder="acme" autoCapitalize="none" autoCorrect="off"
                {...register('tenantSlug', {
                  required: 'Workspace slug is required',
                  pattern: {
                    value: SLUG_PATTERN,
                    message: 'Only letters, numbers and single hyphens (e.g. "acme-labs")',
                  },
                  minLength: { value: 2, message: 'At least 2 characters' },
                  maxLength: { value: 32, message: 'At most 32 characters' },
                })} />
              {errors.tenantSlug && (
                <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 5 }}>{errors.tenantSlug.message}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.02em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input className="nplc-input" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  style={{ paddingRight: 42 }}
                  {...register('password', {
                    required: 'Password is required',
                    ...(mode === 'signup' ? { minLength: { value: 8, message: 'At least 8 characters' } } : {}),
                  })} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                    color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center',
                    borderRadius: 6, transition: 'color .15s, background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'none' }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password ? (
                <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 5 }}>{errors.password.message}</p>
              ) : mode === 'signup' && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>At least 8 characters.</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="nplc-btn" style={{ marginTop: 4 }}>
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />Please wait…</>
                : mode === 'signup'
                  ? <><UserPlus size={15} />Create workspace</>
                  : <><LogIn size={15} />Sign in</>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            {mode === 'signup' ? 'Already have a workspace?' : "Don't have a workspace?"}{' '}
            <Link to={mode === 'signup' ? '/sign-in' : '/sign-up'}
              style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700,
                backgroundImage: 'linear-gradient(90deg,#34d399,#14b8a6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
