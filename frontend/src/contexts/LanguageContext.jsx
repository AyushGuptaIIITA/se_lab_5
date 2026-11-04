import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from '../translations/en';
import hi from '../translations/hi';
import { SUPPORTED_LANGUAGES, PHRASE_DICTIONARY, translatePhrase } from '../translations/indianLanguages';

const baseTranslations = { en, hi };
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');

  const setLang = useCallback((newLang) => {
    localStorage.setItem('lang', newLang);
    setLangState(newLang);
    document.documentElement.lang = newLang;
  }, []);

  const t = useCallback((keyOrPhrase) => {
    if (!keyOrPhrase) return '';

    // 1. Direct translation key lookup
    if (baseTranslations[lang]?.[keyOrPhrase]) {
      return baseTranslations[lang][keyOrPhrase];
    }

    // 2. Phrase dictionary lookup (Hindi & all Indian languages)
    const phraseMatch = PHRASE_DICTIONARY[keyOrPhrase];
    if (phraseMatch && phraseMatch[lang]) {
      return phraseMatch[lang];
    }

    // 3. Fallback to English translation key
    if (baseTranslations.en?.[keyOrPhrase]) {
      return baseTranslations.en[keyOrPhrase];
    }

    // 4. Return as-is
    return keyOrPhrase;
  }, [lang]);

  // Global DOM localization observer: when an Indian language (like Hindi) is active,
  // translate known buttons, links, and headings so the ENTIRE application converts.
  useEffect(() => {
    if (lang === 'en') return;

    const translateDOMNodes = () => {
      const elements = document.querySelectorAll('button, a, span, h1, h2, h3, h4, th, p');
      elements.forEach(el => {
        // Only target element if it has pure text and no complex children
        if (el.children.length === 0 && el.textContent) {
          const rawText = el.textContent.trim();
          if (PHRASE_DICTIONARY[rawText]?.[lang]) {
            el.textContent = PHRASE_DICTIONARY[rawText][lang];
          }
        }
      });
    };

    translateDOMNodes();
    const observer = new MutationObserver(() => {
      translateDOMNodes();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
