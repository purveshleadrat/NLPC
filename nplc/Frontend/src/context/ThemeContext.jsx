import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const SCALE = { small: 1, medium: 1.15, large: 1.35 }
const FS_KEY   = 'nplc_font_size'
const DARK_KEY = 'nplc_dark'

// Arbitrary px sizes used in the app
const SIZES = [9, 9.5, 10, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 17, 18, 19, 20, 22, 24, 42]

// Standard Tailwind text classes + their default px values
const NAMED = [
  ['text-xs',   12],
  ['text-sm',   14],
  ['text-base', 16],
  ['text-lg',   18],
  ['text-xl',   20],
  ['text-2xl',  24],
  ['text-3xl',  30],
  ['text-4xl',  36],
  ['text-5xl',  48],
]

function applyFontScale(scale) {
  let tag = document.getElementById('nplc-fs')
  if (!tag) { tag = document.createElement('style'); tag.id = 'nplc-fs'; document.head.appendChild(tag) }
  if (scale === 1) { tag.textContent = ''; return }
  const esc = (s) => `${s}`.replace('.', '\\.')
  const arbitrary = SIZES.map(s => {
    const out = Math.round(s * scale * 10) / 10
    return `.text-\\[${esc(s)}px\\] { font-size: ${out}px !important; }`
  })
  const named = NAMED.map(([cls, px]) => {
    const out = Math.round(px * scale * 10) / 10
    return `.${cls} { font-size: ${out}px !important; }`
  })
  tag.textContent = [...arbitrary, ...named].join('\n')
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(DARK_KEY) !== 'false' } catch { return true }
  })
  const [fontSize, setFontSize] = useState(() => {
    try { return localStorage.getItem(FS_KEY) || 'medium' } catch { return 'medium' }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem(DARK_KEY, dark) } catch { /* ignore */ }
  }, [dark])

  useEffect(() => {
    applyFontScale(SCALE[fontSize] ?? 1)
    try { localStorage.setItem(FS_KEY, fontSize) } catch { /* ignore */ }
  }, [fontSize])

  function toggle() { setDark(d => !d) }

  return (
    <ThemeContext.Provider value={{ dark, toggle, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
