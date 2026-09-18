import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(true)

  // shadcn/ui primitives (Sheet, Button, Input, Badge) read their colors from CSS
  // variables toggled by a `dark` class on <html>, separate from this app's own
  // dark-prop-threading pattern used everywhere else - both need to stay in sync.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
