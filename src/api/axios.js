import axios from 'axios';

const API_BASE_URL = 'https://ligand-backend.onrender.com';

// Crear instancia de axios
const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Habilitar cookies cross-domain
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Interceptor para requests
instance.interceptors.request.use(
  (config) => {
    console.log('📡 Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para responses
instance.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.status, error.response?.data);
    
    // Manejar errores específicos
    if (error.response?.status === 401) {
      // Token expirado o no válido
      console.log('🔑 Token inválido, redirigiendo al login');
      // Aquí puedes disparar un evento o usar tu store para limpiar el estado
      window.dispatchEvent(new CustomEvent('auth-logout'));
    }
    
    if (error.response?.status === 419) {
      // Token CSRF expirado
      console.log('🔒 CSRF token expirado, obteniendo nuevo token');
      // Intentar obtener nuevo CSRF token
      return instance.get('/sanctum/csrf-cookie').then(() => {
        // Reintentar la solicitud original
        return instance.request(error.config);
      });
    }
    
    return Promise.reject(error);
  }
);