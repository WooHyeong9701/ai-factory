import { createContext, useContext, useState, useCallback } from 'react'
import ko from './ko'
import en from './en'
import zh from './zh'
import ja from './ja'

export const LANGUAGES = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

const messages = { ko, en, zh, ja }

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en')

  const switchLang = useCallback((code) => {
    setLang(code)
    localStorage.setItem('lang', code)
  }, [])

  const t = useCallback((key, params) => {
    let str = messages[lang]?.[key] || messages.en[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v)
      })
    }
    return str
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
