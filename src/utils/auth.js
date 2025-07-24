import axios from "../api/axios";
import userCache from "./userCache"; // 🔥 IMPORTAR CACHE GLOBAL
import { useRateLimitHandler } from '../components/RateLimitLigand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ========================
// SISTEMA DE HEARTBEAT
// ========================
let heartbeatInterval = null;

const getCurrentRoom = () => {
  return sessionStorage.getItem("roomName") ?? null;
};

// 🎯 Obtener el tipo de actividad actual del usuario
const getCurrentActivityType = () => {
  // Puedes ajustar esto si tienes otras actividades como 'browsing', 'waiting', etc
  const path = window.location.pathname;

  if (path.includes('/videochat')) {
    const role = sessionStorage.getItem('userRole');
    return role === 'modelo' ? 'videochat_model' : 'videochat';
  }

  return 'browsing'; // navegación general
};

const sendHeartbeat = async () => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    const payload = {
      activity_type: getCurrentActivityType(), // videochat_client, browsing, etc
      room: getCurrentRoom(), // sala actual si está en videochat
      status: 'active'
    };

    await axios.post(`${API_BASE_URL}/api/heartbeat`, payload, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 5000 // reducir timeout
    });
    console.log("💓 Heartbeat enviado", payload);
  } catch (error) {
    // tu manejo de errores está bien
  }
};

const startHeartbeat = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  console.log("💓 Iniciando sistema de heartbeat");
  sendHeartbeat(); // enviar inmediatamente
  heartbeatInterval = setInterval(sendHeartbeat, 10000); // cada 10 segundos
};

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log("💓 Sistema de heartbeat detenido");
  }
};

const markUserOffline = async () => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    await axios.post(`${API_BASE_URL}/api/user/mark-offline`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("🔴 Usuario marcado como offline");
  } catch (error) {
    console.error("❌ Error marcando como offline:", error);
  }
};

// ✅ Registrar usuario
export const register = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/register`, { email, password }, { skipInterceptor: true });

    const token = response.data.access_token;
    if (token) {
      sessionStorage.setItem("token", token);
      console.log("✅ Token guardado en registro:", token.substring(0, 10) + "...");
    } else {
      console.warn("⚠️ No se recibió access_token en registro.", response.data);
    }

    return response.data;
  } catch (error) {
    console.error("❌ Error en registro:", error.response?.data || error);
    throw error;
  }
};

// ✅ Login
export const loginWithoutRedirect = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/login`, { email, password });

    const token = response.data.access_token;
    if (token) {
      sessionStorage.setItem("token", token);
      console.log("✅ Token guardado en login:", token.substring(0, 10) + "...");
      
      // 🔥 LIMPIAR CACHE AL HACER LOGIN
      userCache.clearCache();
      
      try {
        await axios.post(`${API_BASE_URL}/api/user/mark-online`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("🟢 Usuario marcado como online");
        startHeartbeat();
      } catch (error) {
        console.error("❌ Error marcando como online:", error);
      }
    }

    return response.data;
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error(error.response.data.message || "Correo no verificado");
    }

    if (error.response?.status === 401) {
      throw new Error("Credenciales incorrectas");
    }

    console.error("❌ Error en login:", error.response?.data || error);
    throw new Error("Error desconocido en el login");
  }
};

// ✅ Logout
export const logout = async () => {
  try {
    await markUserOffline();
    stopHeartbeat();
    
    await axios.post(`${API_BASE_URL}/api/logout`);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("roomName");
    sessionStorage.removeItem("userName");
    
    // 🔥 LIMPIAR CACHE AL LOGOUT
    userCache.clearCache();
    
    return true;
  } catch (error) {
    console.error("❌ Error en logout:", error.response?.data || error);
    
    stopHeartbeat();
    sessionStorage.removeItem("token");
    userCache.clearCache(); // 🔥 LIMPIAR CACHE SIEMPRE
    
    throw error;
  }
};

// 🔥 ✅ getUser CON CACHE GLOBAL REAL
export const getUser = async (forceRefresh = false) => {
  try {
    console.log("🔐 getUser llamado, forceRefresh:", forceRefresh);
    
    // 🔥 USAR EL CACHE MANAGER EN LUGAR DE LLAMADA DIRECTA
    const userData = await userCache.getUser(forceRefresh);
    
    console.log("✅ Perfil obtenido desde cache manager:", userData.name || userData.email);
    return userData;
    
  } catch (error) {
    console.error("❌ Error obteniendo usuario:", error.response?.data || error.message);
    
    // 🔥 MANEJO DE RATE LIMITING
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limited obteniendo usuario');
      throw error; // Dejar que el cache manager maneje esto
    }
    
    // Solo limpiar token en errores reales de auth
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log("🧹 Limpiando token inválido");
      stopHeartbeat();
      sessionStorage.removeItem("token");
      userCache.clearCache();
    }
    
    throw error;
  }
};

// 🔥 FUNCIÓN PARA REFRESCAR USUARIO (FORZAR NUEVA REQUEST)
export const refreshUser = async () => {
  console.log("🔄 Forzando refresh de usuario");
  return await getUser(true);
};

// ✅ Verificar código
export async function verificarCodigo(email, code) {
  console.log("➡️ Enviando:", { email, code });
  const response = await axios.post(`${API_BASE_URL}/api/verify-email-code`, {
    email,
    code,
  });
  return response.data;
}

// ✅ Reenviar código
export async function reenviarCodigo(email) {
  return await axios.post(`${API_BASE_URL}/api/resend-code`, { email });
}

export const asignarRol = async ({ rol, nombre }) => {
  return axios.post(`${API_BASE_URL}/api/asignar-rol`, {
    rol,
    name: nombre,
  });
};

// ✅ Reclamar sesión
export const reclamarSesion = async () => {
  try {
    const token = sessionStorage.getItem("token");
    const response = await axios.post(
      `${API_BASE_URL}/api/reclamar-sesion`,
      {},
      {
        skipInterceptor: true,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const nuevoToken = response.data.nuevo_token;
    if (nuevoToken) {
      sessionStorage.setItem("token", nuevoToken);
      
      // 🔥 LIMPIAR CACHE CON NUEVO TOKEN
      userCache.clearCache();
      startHeartbeat();
      
      return nuevoToken;
    } else {
      console.warn("⚠️ No se recibió nuevo_token");
      return null;
    }
  } catch (error) {
    console.error("❌ Error reclamando sesión:", error.response?.data || error);
    throw error;
  }
};

// Función para inicializar el sistema
export const initializeAuth = () => {
  const token = sessionStorage.getItem("token");
  
  if (token) {
    console.log("🔄 Token encontrado, iniciando heartbeat automático");
    startHeartbeat();
  }
};

// Función para actualizar heartbeat
export const updateHeartbeatRoom = async (roomName) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    await axios.post(`${API_BASE_URL}/api/heartbeat`, {
      current_room: roomName,
      activity_type: 'videochat'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("💓 Heartbeat actualizado para videochat");
  } catch (error) {
    console.error("❌ Error actualizando heartbeat:", error);
    
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limited actualizando heartbeat');
      return;
    }
  }
};

// 🔥 FUNCIÓN PARA LIMPIAR CACHE MANUALMENTE
export const clearUserCache = () => {
  userCache.clearCache();
};

// 🔥 FUNCIÓN PARA DEBUGGING
export const debugAuth = () => {
  return {
    hasToken: !!sessionStorage.getItem('token'),
    cache: userCache.getDebugInfo(),
    heartbeatActive: !!heartbeatInterval
  };
};

export { startHeartbeat, stopHeartbeat };