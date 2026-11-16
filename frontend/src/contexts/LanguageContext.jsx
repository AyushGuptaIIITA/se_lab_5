import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import en from '../translations/en';
import hi from '../translations/hi';
import { SUPPORTED_LANGUAGES, PHRASE_DICTIONARY, translatePhrase } from '../translations/indianLanguages';

const baseTranslations = { en, hi };
const LanguageContext = createContext(null);

// Map language codes to Intl locale strings for date/number formatting
const LOCALE_MAP = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', te: 'te-IN',
  ta: 'ta-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
  ml: 'ml-IN', pa: 'pa-IN', or: 'or-IN'
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');
  const observerRef = useRef(null);
  const translationCacheRef = useRef({}); // cache translated text → original

  const setLang = useCallback((newLang) => {
    localStorage.setItem('lang', newLang);
    setLangState(newLang);
    document.documentElement.lang = newLang;
  }, []);

  // t() — translate a key or phrase
  const t = useCallback((keyOrPhrase) => {
    if (!keyOrPhrase) return '';

    // 1. Direct translation key lookup (en.js / hi.js files)
    if (baseTranslations[lang]?.[keyOrPhrase]) {
      return baseTranslations[lang][keyOrPhrase];
    }

    // 2. Phrase dictionary (all Indian languages)
    const phraseMatch = PHRASE_DICTIONARY[keyOrPhrase];
    if (phraseMatch?.[lang]) {
      return phraseMatch[lang];
    }

    // 3. Fallback to English key
    if (baseTranslations.en?.[keyOrPhrase]) {
      return baseTranslations.en[keyOrPhrase];
    }

    return keyOrPhrase;
  }, [lang]);

  // formatDate() — locale-aware date formatting
  const formatDate = useCallback((date, options = {}) => {
    if (!date) return '';
    const locale = LOCALE_MAP[lang] || 'en-IN';
    const defaultOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(new Date(date));
  }, [lang]);

  // ── DOM-level translation: walk all text nodes and translate known phrases ──
  const applyDOMTranslations = useCallback((targetLang) => {
    const resolvedLang = targetLang ?? lang;

    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const raw = (node._originalText ?? node.textContent).trim();
        if (raw.length < 2 || raw.length > 120) return;

        // Always store original English text the first time we see it
        if (!node._originalText) {
          node._originalText = node.textContent;
        }

        if (resolvedLang === 'en') {
          // Restore original English
          if (node.textContent !== node._originalText) {
            node.textContent = node._originalText;
          }
          return;
        }

        const translated = PHRASE_DICTIONARY[raw]?.[resolvedLang];
        if (translated && node.textContent !== translated) {
          node.textContent = translated;
        }
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        !['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)
      ) {
        node.childNodes.forEach(walk);
      }
    };

    const app = document.getElementById('root');
    if (app) {
      const allNodes = [];
      const collect = (n) => {
        allNodes.push(n);
        n.childNodes.forEach(collect);
      };
      collect(app);
      allNodes.forEach(walk);
    }
  }, [lang]);

  // Set html lang attribute on mount + language change
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Apply DOM translations when lang changes
  useEffect(() => {
    if (lang === 'en') {
      // Restore originals for all nodes
      applyDOMTranslations('en');
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    // Run immediately
    applyDOMTranslations(lang);

    // Then watch for DOM changes (React re-renders) and re-translate
    if (observerRef.current) observerRef.current.disconnect();
    const observer = new MutationObserver(() => {
      applyDOMTranslations(lang);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false
    });
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [lang, applyDOMTranslations]);

  return (
    <LanguageContext.Provider value={{
      lang,
      setLang,
      t,
      formatDate,
      locale: LOCALE_MAP[lang] || 'en-IN',
      supportedLanguages: SUPPORTED_LANGUAGES
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
