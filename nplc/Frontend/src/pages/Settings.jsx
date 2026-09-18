import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { LANGUAGES } from '../i18n/translations'
import { Sun, Moon, Type, Globe } from 'lucide-react'

const FONT_OPTS = [
  { id: 'small' },
  { id: 'medium' },
  { id: 'large' },
]

const LANG_DISPLAY = { en: 'EN', hi: 'हि', te: 'తె', kn: 'ಕ' }

export default function Settings() {
  const { dark, toggle, fontSize, setFontSize } = useTheme()
  const { lang, changeLang, t } = useLanguage()

  const card = dark ? 'glass-dark' : 'glass-light shadow-sm'
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const head  = dark ? 'text-gray-100' : 'text-gray-800'

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-[22px] font-bold ${head}`}>{t('settings.title')}</h2>
        <p className={`text-[14px] ${muted}`}>{t('settings.subtitle')}</p>
      </div>

      {/* Appearance */}
      <div className={`rounded-2xl p-5 ${card}`}>
        <div className="flex items-center gap-2 mb-4">
          <Sun size={15} className="text-emerald-400" />
          <h3 className={`text-[16px] font-semibold ${head}`}>{t('settings.appearance')}</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Theme toggle */}
          <div className={`flex items-center justify-between flex-1 px-4 py-3 rounded-xl border ${dark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              {dark ? <Moon size={14} className="text-emerald-400" /> : <Sun size={14} className="text-emerald-600" />}
              <span className={`text-[13px] font-medium ${head}`}>{dark ? t('settings.darkMode') : t('settings.lightMode')}</span>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="relative rounded-full transition-all flex-shrink-0 cursor-pointer"
              style={{ width: 36, height: 20, background: dark ? 'linear-gradient(135deg,#059669,#0d9488)' : 'rgba(0,0,0,0.12)' }}
              title="Toggle theme"
            >
              <span className="absolute top-[4px] rounded-full bg-white transition-all"
                style={{ width: 12, height: 12, left: dark ? 20 : 4 }} />
            </button>
          </div>
          {/* Font size */}
          <div className={`flex items-center justify-between flex-1 px-4 py-3 rounded-xl border ${dark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <Type size={14} className={dark ? 'text-emerald-400' : 'text-emerald-600'} />
              <span className={`text-[13px] font-medium ${head}`}>{t('settings.fontSize')}</span>
            </div>
            <div className="flex gap-1">
              {FONT_OPTS.map(({ id }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setFontSize(id)}
                  className="rounded-[6px] transition-all text-[11px] font-bold cursor-pointer"
                  style={{
                    width: 26, height: 26,
                    background: fontSize === id ? 'linear-gradient(135deg,#059669,#0d9488)' : dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                    color: fontSize === id ? '#fff' : dark ? '#9ca3af' : '#374151',
                    border: fontSize === id ? 'none' : dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #d1d5db',
                  }}
                  title={id}
                >
                  {id === 'small' ? 'S' : id === 'medium' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Language */}
        <div className={`flex items-center justify-between mt-3 px-4 py-3 rounded-xl border ${dark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-2">
            <Globe size={14} className={dark ? 'text-emerald-400' : 'text-emerald-600'} />
            <span className={`text-[13px] font-medium ${head}`}>{t('settings.language')}</span>
          </div>
          <div className="flex gap-1">
            {LANGUAGES.map(({ code }) => (
              <button
                type="button"
                key={code}
                onClick={() => changeLang(code)}
                className="rounded-[6px] transition-all text-[11px] font-bold cursor-pointer"
                style={{
                  width: 26, height: 26,
                  background: lang === code ? 'linear-gradient(135deg,#059669,#0d9488)' : dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                  color: lang === code ? '#fff' : dark ? '#9ca3af' : '#374151',
                  border: lang === code ? 'none' : dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #d1d5db',
                }}
                title={code}
              >
                {LANG_DISPLAY[code]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
