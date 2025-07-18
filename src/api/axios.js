import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.DEV
    ? "http://192.168.1.109:8000"
    : "https://ligand-backend-oz6a.onrender.com",
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
    
    // Saltar interceptor si está marcado
    if (config.skipInterceptor) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const mensaje = error.response?.data?.message || "";

    // Solo manejar errores 401/403
    if (status === 401 || status === 403) {
      
      // Mensajes específicos que NO deben cerrar sesión
      const mensajesEspeciales = [
        "Correo no verificado.",
        "Ya tienes un rol asignado."
      ];

      // Si es un mensaje especial, no hacer nada
      if (mensajesEspeciales.includes(mensaje)) {
        return Promise.reject(error);
      }

      // Si estamos reclamando sesión, NO eliminar token
      const estamosReclamando = sessionStorage.getItem("reclamando_sesion") === "true";
      
      if (estamosReclamando) {
        console.log("🔍 Interceptor: No eliminar token - Reclamando sesión");
        return Promise.reject(error);
      }

      // Verificar si es un error de sesión duplicada común
      const esSesionDuplicada = 
        mensaje.includes("sesión cerrada en otro dispositivo") ||
        mensaje.includes("Token inválido") ||
        mensaje.includes("sesión duplicada");

      if (esSesionDuplicada) {
        console.log("🔍 Interceptor: No eliminar token - Posible sesión duplicada");
        return Promise.reject(error);
      }

      // Para cualquier otro error 401/403, eliminar token
      console.log("🧹 Interceptor: Eliminando token por error de autenticación");
      sessionStorage.removeItem("token");
    }

    return Promise.reject(error);
  }
);

export default instance;