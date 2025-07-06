// src/api/axios.js
import axios from "axios";
import Cookies from "js-cookie";

// 👇 Asegúrate de usar el dominio completo del backend
const instance = axios.create({
  baseURL: "https://ligand-backend.onrender.com", // ⬅️ DOMINIO DE TU BACKEND DEPLOYADO
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest", // necesario para Sanctum
  },
});

// Interceptor para añadir el token CSRF automáticamente
instance.interceptors.request.use((config) => {
  const token = Cookies.get("XSRF-TOKEN");

  if (token) {
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(token); // lo que Sanctum espera
  }

  // Logs de depuración
  console.log("🔑 Token CSRF:", token ? "✅ Presente" : "❌ Faltante");
  console.log("📡 Request URL:", config.url);
  console.log("🔧 Headers:", config.headers);

  return config;
});

// Interceptor de respuesta
instance.interceptors.response.use(
  (response) => {
    console.log("✅ Response exitosa:", response.status);
    return response;
  },
  (error) => {
    console.error("❌ Error de respuesta:", error.response?.status, error.response?.data);

    if (error.response?.status === 419) {
      console.error("🚫 Error 419 - Token CSRF inválido o expirado");
    }

    return Promise.reject(error);
  }
);

export default instance;
