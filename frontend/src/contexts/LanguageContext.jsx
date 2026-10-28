import React, { createContext, useContext, useState, useCallback } from 'react';
import en from '../translations/en';
import hi from '../translations/hi';

const translations = { en, hi };
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');

  const setLang = useCallback((newLang) => {
    localStorage.setItem('lang', newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
