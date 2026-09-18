import { createContext, useContext, useState } from 'react'
import { t as translate } from '../i18n/translations'

const LANG_KEY = 'nplc_lang'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'en')

  function changeLang(code) {
    setLang(code)
    localStorage.setItem(LANG_KEY, code)
  }

  function t(key, vars) {
    return translate(lang, key, vars)
  }

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
