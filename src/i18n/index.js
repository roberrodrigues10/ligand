// src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

i18n
  .use(LanguageDetector) // detecta idioma del navegador
  .use(initReactI18next)
  .init({
    fallbackLng: 'es',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
    },
  });

export default i18n;