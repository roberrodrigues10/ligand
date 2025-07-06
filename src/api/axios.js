// src/api/axios.js
import axios from "axios";

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'https://ligand-backend.onrender.com';
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Interceptor CSRF
axios.interceptors.request.use(async (config) => {
  if (!getCsrfTokenFromCookie()) {
    await getCsrfCookie();
  }

  const token = getCsrfTokenFromCookie();
  if (token) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
  }

  return config;
});

function getCsrfTokenFromCookie() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

async function getCsrfCookie() {
  try {
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
    return true;
  } catch (error) {
    console.error('❌ Error obteniendo CSRF cookie:', error);
    return false;
  }
}

// 👇👇👇 ESTA ES LA LÍNEA QUE FALTABA
export default axios;
