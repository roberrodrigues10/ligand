import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// 👉 Interceptor para añadir token
instance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 👉 Variable para evitar bucles infinitos
let isRefreshing = false;
let hasLoggedOut = false;

// 👉 Interceptor mejorado para capturar errores globales
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔥 AQUÍ ESTABA EL ERROR: config no estaba definido
    // Necesitas obtenerlo desde error.config
    const config = error.config || {};

    // Saltar si está marcado para omitir
    if (config.skipInterceptor) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const mensaje = error.response?.data?.message || "";
    const codigo = error.response?.data?.code || "";

    const mensajesEspeciales = [
      "Correo no verificado.",
      "Ya tienes un rol asignado."
    ];

    // Si es un mensaje especial, no eliminar token
    if (mensajesEspeciales.includes(mensaje)) {
      return Promise.reject(error);
    }

    // Manejar errores 401/403 de forma más inteligente
    if ((status === 401 || status === 403) && !isRefreshing && !hasLoggedOut) {
      isRefreshing = true;
      hasLoggedOut = true;
      
      console.log("🧹 Interceptor: Token inválido detectado");
      
      // Limpiar token
      sessionStorage.removeItem("token");
      
      // Opcional: Notificar al usuario
      console.warn("🚫 Sesión expirada. Por favor, inicia sesión nuevamente.");
      
      // Opcional: Redirigir al login después de un breve delay
      setTimeout(() => {
        // window.location.href = '/login';
        // O usar tu router: navigate('/login');
        console.log("🔄 Debería redirigir al login");
        isRefreshing = false;
      }, 1000);
    }

    // 🔥 Aquí también usar error.config en lugar de config
    const customEvent = new CustomEvent("axiosError", {
      detail: {
        status,
        mensaje,
        codigo,
        url: error.config?.url,
        method: error.config?.method,
      },
    });
    window.dispatchEvent(customEvent);

    return Promise.reject(error);
  }
);

export default instance;