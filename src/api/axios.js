// src/api/axios.js
import axios from "axios";
import Cookies from "js-cookie";

const instance = axios.create({
  baseURL: "https://ligand-backend.onrender.com",
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token CSRF automáticamente
instance.interceptors.request.use((config) => {
  const token = Cookies.get("XSRF-TOKEN");
  
  if (token) {
    // 👇 ESTA es la cabecera que Laravel Sanctum busca
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(token);
  }
  
  config.headers["X-Requested-With"] = "XMLHttpRequest";
  
  // Debug temporal
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
