import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,  // ✅ CAMBIAR AQUÍ
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

// 👉 Interceptor para capturar errores globales - SIMPLIFICADO
instance.interceptors.response.use(
  (response) => response,
  (error) => {
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

    if (status === 401 || status === 403) {
      console.log("🧹 Interceptor: Eliminando token por error de autenticación");
      sessionStorage.removeItem("token");
    }

    return Promise.reject(error);
  }
);


export default instance;