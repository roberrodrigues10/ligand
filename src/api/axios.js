import axios from "axios";
import Cookies from "js-cookie";
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const instance = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  const token = Cookies.get("XSRF-TOKEN");
  if (token) {
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(token);
  }
  return config;
});
i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'es',
    lng: localStorage.getItem('lng') || 'es', // 👈 persistencia aquí
    resources: {
      es: { translation: { /* ... */ } },
      en: { translation: { /* ... */ } },
      pt: { translation: { /* ... */ } },
    },
    interpolation: {
      escapeValue: false,
    },
  });
export { i18n };
export default instance;