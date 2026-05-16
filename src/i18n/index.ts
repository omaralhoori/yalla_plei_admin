import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ar from './locales/ar.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: localStorage.getItem('yp_lang') ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', lng => {
  document.documentElement.lang = lng
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
  localStorage.setItem('yp_lang', lng)
})

// Apply direction for initial language
const initialLng = i18n.language
document.documentElement.lang = initialLng
document.documentElement.dir = initialLng === 'ar' ? 'rtl' : 'ltr'

export default i18n
