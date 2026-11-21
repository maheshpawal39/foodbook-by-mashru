import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries, translate } from '../translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = window.localStorage.getItem('fb-lang')
      return stored === 'hi' ? 'hi' : 'en'
    } catch (e) {
      return 'en'
    }
  })

  useEffect(() => {
    document.documentElement.lang = language
    try {
      window.localStorage.setItem('fb-lang', language)
    } catch (e) {
      /* ignore */
    }
  }, [language])

  const setLanguage = useCallback((next) => {
    setLanguageState(next === 'hi' ? 'hi' : 'en')
  }, [])

  const t = useCallback(
    (key, vars = {}) => translate(dictionaries[language], key, vars),
    [language],
  )

  const pick = useCallback(
    (english, hindi) => (language === 'hi' && hindi ? hindi : english || hindi || ''),
    [language],
  )

  const value = useMemo(
    () => ({ language, setLanguage, t, pick, isHindi: language === 'hi', dictionary: dictionaries[language] }),
    [language, setLanguage, t, pick],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
