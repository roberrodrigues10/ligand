// src/utils/auth.js
import axios from "../api/axios"; // instancia con baseURL y withCredentials

// ✅ Obtener cookie CSRF desde el backend (Sanctum)
export const getCsrfCookie = async () => {
  try {
    await axios.get("/sanctum/csrf-cookie");
    console.log("✅ CSRF cookie obtenida");
  } catch (error) {
    console.error("❌ Error obteniendo CSRF cookie:", error);
    throw error;
  }
};

// ✅ Login
export const login = async (email, password) => {
  try {
    await getCsrfCookie();
    const response = await axios.post("/login", { email, password });
    console.log("✅ Login exitoso");
    return response.data;
  } catch (error) {
    console.error("❌ Error en login:", error.response?.data || error);
    throw error;
  }
};

// ✅ Logout
export const logout = async () => {
  try {
    const response = await axios.post("/logout");
    console.log("✅ Logout exitoso");
    return response.data;
  } catch (error) {
    console.error("❌ Error en logout:", error.response?.data || error);
    throw error;
  }
};

// ✅ Registrar usuario
export const register = async (userData) => {
  try {
    await getCsrfCookie();
    const response = await axios.post("/register", userData);
    console.log("✅ Registro exitoso");
    return response.data;
  } catch (error) {
    console.error("❌ Error en registro:", error.response?.data || error);
    throw error;
  }
};

// ✅ Obtener usuario autenticado
export const getCurrentUser = async () => {
  try {
    const response = await axios.get("/user");
    console.log("✅ Usuario obtenido");
    return response.data;
  } catch (error) {
    console.error("❌ Error obteniendo usuario:", error.response?.data || error);
    throw error;
  }
};

// ✅ Refrescar usuario (igual que getCurrentUser)
export const refreshUser = async () => {
  try {
    const response = await axios.get("/user");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ✅ Métodos generales
export const get = async (endpoint) => {
  const response = await axios.get(endpoint);
  return response.data;
};

export const post = async (endpoint, data) => {
  const response = await axios.post(endpoint, data);
  return response.data;
};

export const put = async (endpoint, data) => {
  const response = await axios.put(endpoint, data);
  return response.data;
};

export const remove = async (endpoint) => {
  const response = await axios.delete(endpoint);
  return response.data;
};
