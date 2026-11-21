import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { translations, getValue } from '../translations'

const LanguageContext = createContext(null)
const STORAGE_KEY = 'fb_language'

function interpolate(text, vars) {
  if (!vars) return text
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => (vars[key] !== undefined ? String(vars[key]) : match))
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'hi' || saved === 'en' ? saved : 'en'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.setAttribute('lang', language)
    document.documentElement.setAttribute('data-lang', language)
  }, [language])

  const t = useCallback(
    (path, vars) => {
      const value = getValue(translations[language], path) ?? getValue(translations.en, path) ?? path
      return typeof value === 'string' ? interpolate(value, vars) : value
    },
    [language]
  )

  const changeLanguage = useCallback((next) => {
    if (next === 'en' || next === 'hi') setLanguage(next)
  }, [])

  const value = useMemo(
    () => ({ language, setLanguage: changeLanguage, t, isHindi: language === 'hi' }),
    [language, changeLanguage, t]
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}
