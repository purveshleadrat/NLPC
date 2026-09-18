import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Brain, Loader2, LogIn, UserPlus, Eye, EyeOff, Zap, GitBranch, Layers, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/i

export default function Login() {
  const { login, signup } = useAuth()
  const { t } = useLanguage()
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
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'system-ui,-apple-system,sans-serif', overflow: 'hidden', position: 'relative', background: '#030f07' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes orb1 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(60px, -40px) } }
        @keyframes orb2 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-50px, 60px) } }
        @keyframes orb3 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(30px, 50px) } }
        @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
        @keyframes pulse-ring { 0% { transform: scale(0.92); opacity: 0.7 } 70% { transform: scale(1.08); opacity: 0 } 100% { transform: scale(0.92); opacity: 0 } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes card-in { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: translateX(0) } }

        .login-input {
          width: 100%; box-sizing: border-box;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 12px 16px;
          font-size: 14px; color: #f1f5f9; outline: none; transition: all .2s;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.2); }
        .login-input:focus {
          border-color: rgba(52,211,153,0.6);
          background: rgba(52,211,153,0.04);
          box-shadow: 0 0 0 3px rgba(52,211,153,0.1);
        }
        .login-btn {
          width: 100%; padding: 13px; border: none; border-radius: 10px;
          background: linear-gradient(135deg, #059669 0%, #10b981 50%, #14b8a6 100%);
          color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all .25s; box-shadow: 0 4px 20px rgba(16,185,129,0.5);
        }
        .login-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(16,185,129,0.65); }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: .5; cursor: not-allowed; }
        .form-card { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      {/* ── Ambient background orbs ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', top: '-200px', left: '-200px', background: 'radial-gradient(circle, rgba(5,150,105,0.18) 0%, transparent 65%)', animation: 'orb1 20s ease-in-out infinite', filter: 'blur(1px)' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', bottom: '-150px', right: '-150px', background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 65%)', animation: 'orb2 25s ease-in-out infinite', filter: 'blur(1px)' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: '40%', left: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)', animation: 'orb3 18s ease-in-out infinite', filter: 'blur(1px)' }} />
        {/* subtle dot grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
          <defs>
            <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#34d399" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* ── Left: brand + features (desktop only) ── */}
      <div className="hidden lg:flex" style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', padding: '64px 72px', position: 'relative', zIndex: 1 }}>

        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56 }}>
          <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'linear-gradient(135deg,#059669,#10b981)', opacity: 0.3, animation: 'pulse-ring 2.5s ease-out infinite' }} />
            <div style={{ position: 'relative', width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(16,185,129,0.5)' }}>
              <Brain size={24} color="#fff" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>NLPC</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', background: 'linear-gradient(90deg,#34d399,#14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: 2 }}>
              Hackathon 2K26
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 99, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', marginBottom: 22 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 8px #34d399' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', letterSpacing: '.12em', textTransform: 'uppercase' }}>{t('login.badge')}</span>
          </div>

          <h1 style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.04, letterSpacing: '-3px', margin: 0, marginBottom: 20 }}>
            <span style={{ color: '#fff', display: 'block' }}>{t('login.headline1')}</span>
            <span style={{ display: 'block', background: 'linear-gradient(90deg,#34d399 0%,#10b981 50%,#14b8a6 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 4s linear infinite' }}>
              {t('login.headline2')}
            </span>
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', lineHeight: 1.75, maxWidth: 420, margin: 0 }}>
            {t('login.tagline')} <em style={{ color: 'rgba(52,211,153,0.7)', fontStyle: 'normal', fontWeight: 600 }}>{t('login.why')}</em>.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: Zap, color: '#fbbf24', label: t('login.feat1Label'), desc: t('login.feat1Desc') },
            { icon: Layers, color: '#60a5fa', label: t('login.feat2Label'), desc: t('login.feat2Desc') },
            { icon: GitBranch, color: '#a78bfa', label: t('login.feat3Label'), desc: t('login.feat3Desc') },
            { icon: Search, color: '#34d399', label: t('login.feat4Label'), desc: t('login.feat4Desc') },
          ].map(({ icon: Icon, color, label, desc }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, animation: `card-in .4s ease ${i * 0.08}s both` }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', lineHeight: 1.4 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Vertical divider (desktop) ── */}
      <div className="hidden lg:block" style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

      {/* ── Right: form ── */}
      <div className="w-full lg:w-[460px] lg:flex-shrink-0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', position: 'relative', zIndex: 1 }}>
        <div className="form-card" style={{ width: '100%' }}>

          {/* Mobile brand */}
          <div className="flex lg:hidden" style={{ alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>NLPC</span>
          </div>

          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.6px' }}>
            {mode === 'signup' ? t('login.createWorkspace') : t('login.welcomeBack')}
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.3)', marginBottom: 32, lineHeight: 1.6 }}>
            {mode === 'signup' ? t('login.createSubtitle') : t('login.signInSubtitle')}
          </div>

          <form onSubmit={handleSubmit(submit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 7, letterSpacing: '.07em', textTransform: 'uppercase' }}>{t('login.workspaceName')}</label>
                <input className="login-input" placeholder="Acme Product Team" {...register('tenantName', { required: 'Required' })} />
                {errors.tenantName && <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 5 }}>{errors.tenantName.message}</p>}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 7, letterSpacing: '.07em', textTransform: 'uppercase' }}>{t('login.workspaceSlug')}</label>
              <input className="login-input" placeholder="acme" autoCapitalize="none" autoCorrect="off"
                {...register('tenantSlug', {
                  required: 'Required',
                  pattern: { value: SLUG_PATTERN, message: 'Letters, numbers & single hyphens only' },
                  minLength: { value: 2, message: 'Min 2 characters' },
                  maxLength: { value: 32, message: 'Max 32 characters' },
                })} />
              {errors.tenantSlug && <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 5 }}>{errors.tenantSlug.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 7, letterSpacing: '.07em', textTransform: 'uppercase' }}>{t('login.password')}</label>
              <div style={{ position: 'relative' }}>
                <input className="login-input" type={showPassword ? 'text' : 'password'} placeholder="••••••••" style={{ paddingRight: 44 }}
                  {...register('password', {
                    required: 'Required',
                    ...(mode === 'signup' ? { minLength: { value: 8, message: 'Min 8 characters' } } : {}),
                  })} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', transition: 'color .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password
                ? <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 5 }}>{errors.password.message}</p>
                : mode === 'signup' && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 5 }}>{t('login.minChars')}</p>}
            </div>

            <button type="submit" disabled={loading} className="login-btn" style={{ marginTop: 4 }}>
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />{t('login.pleaseWait')}</>
                : mode === 'signup'
                  ? <><UserPlus size={14} />{t('login.createWorkspace')}</>
                  : <><LogIn size={14} />{t('login.signIn')}</>}
            </button>
          </form>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '26px 0' }} />

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
            {mode === 'signup' ? t('login.alreadyHave') : t('login.dontHave')}{' '}
            <Link to={mode === 'signup' ? '/sign-in' : '/sign-up'}
              style={{ fontWeight: 700, fontSize: 13, background: 'linear-gradient(90deg,#34d399,#14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {mode === 'signup' ? t('login.signIn') : t('login.createOne')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
