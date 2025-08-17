import axios from "../api/axios";
import userCache from "./userCache"; // 🔥 IMPORTAR CACHE GLOBAL
import { useRateLimitHandler } from '../components/RateLimitLigand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ========================
// SISTEMA DE HEARTBEAT
// ========================
let heartbeatInterval = null;

const getCurrentRoom = () => {
  return localStorage.getItem("roomName") ?? null;
};

// 🎯 Obtener el tipo de actividad actual del usuario
const getCurrentActivityType = () => {
  // Puedes ajustar esto si tienes otras actividades como 'browsing', 'waiting', etc
  const path = window.location.pathname;

  if (path.includes('/videochat')) {
    const role = localStorage.getItem('userRole');
    return role === 'modelo' ? 'videochat_model' : 'videochat';
  }

  return 'browsing'; // navegación general
};

const sendHeartbeat = async () => {
  try {
    const token = localStorage.getItem("token");
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
    const token = localStorage.getItem("token");
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
      localStorage.setItem("token", token);
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


export const loginWithoutRedirect = async (email, password) => {
  try {
    // ✅ URL correcta (tu ruta es /api/login)
    const response = await axios.post(`${API_BASE_URL}/api/login`, { email, password });

    const token = response.data.access_token;
    if (token) {
      localStorage.setItem("token", token);
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
    // 🔧 CORRECCIÓN: Agregar manejo de error 404 (email no existe)
    if (error.response?.status === 404) {
      throw new Error(error.response.data.message || "No existe una cuenta con este correo");
    }

    if (error.response?.status === 401) {
      throw new Error(error.response.data.message || "La contraseña ingresada es incorrecta");
    }

    if (error.response?.status === 403) {
      throw new Error(error.response.data.message || "Correo no verificado");
    }

    console.error("❌ Error en login:", error.response?.data || error);
    throw new Error(error.response?.data?.message || "Error desconocido en el login");
  }
};

export const logout = async () => {
  try {
    await markUserOffline();
    stopHeartbeat();
    
    await axios.post(`${API_BASE_URL}/api/logout`);
    localStorage.removeItem("token");
    localStorage.removeItem("roomName");
    localStorage.removeItem("userName");
    
    // 🔥 LIMPIAR CACHE AL LOGOUT
    userCache.clearCache();
    
    return true;
  } catch (error) {
    console.error("❌ Error en logout:", error.response?.data || error);
    
    stopHeartbeat();
    localStorage.removeItem("token");
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
      localStorage.removeItem("token");
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
    const token = localStorage.getItem("token");
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
      localStorage.setItem("token", nuevoToken);
      
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
  const token = localStorage.getItem("token");
  
  if (token) {
    console.log("🔄 Token encontrado, iniciando heartbeat automático");
    startHeartbeat();
  }
};

// Función para actualizar heartbeat
export const updateHeartbeatRoom = async (roomName) => {
  try {
    const token = localStorage.getItem("token");
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


export const loginWithGoogle = async () => {
  try {
    console.log('🔵 Iniciando Google OAuth...');
    
    // ✅ CORRECCIÓN: Usar la URL correcta del backend
    const response = await axios.get(`${API_BASE_URL}/api/auth/google/redirect`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔵 Respuesta del servidor:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error al obtener URL de Google');
    }

    // ✅ Redirigir a Google OAuth
    console.log('🔵 Redirigiendo a:', response.data.auth_url);
    window.location.href = response.data.auth_url;
    
  } catch (error) {
    console.error('❌ Error en loginWithGoogle:', error);
    console.error('❌ Response data:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Error al iniciar sesión con Google');
  }
};

/**
 * Maneja el callback de Google
 */
export const handleGoogleCallback = async (code, state) => {
  try {
    console.log('🔄 Procesando callback de Google...');
    console.log('📋 Parámetros recibidos:', { code: code?.substring(0, 10) + '...', state });
    
    if (!code) {
      throw new Error('Código de autorización no recibido');
    }

    const response = await axios.get(`${API_BASE_URL}/api/auth/google/callback`, {
      params: { code, state }
    });

    console.log('🔄 Respuesta del callback:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error en autenticación con Google');
    }

    const { access_token, user, signup_step } = response.data;

    localStorage.setItem('token', access_token);
    userCache.clearCache();
    
    try {
      await axios.post(`${API_BASE_URL}/api/user/mark-online`, {}, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      console.log("🟢 Usuario marcado como online");
      startHeartbeat();
    } catch (error) {
      console.error("❌ Error marcando como online:", error);
    }

    console.log('✅ Google OAuth exitoso para:', user.email);
    return { user, signup_step, token: access_token };

  } catch (error) {
    console.error('❌ Error en handleGoogleCallback:', error);
    throw new Error(error.response?.data?.message || 'Error al procesar autenticación con Google');
  }
}; // ← Asegúrate de que esta llave esté cerrada

/**
 * Desvincula cuenta de Google
 */
export const unlinkGoogle = async () => {
  try {
    const token = localStorage.getItem('access_token');
    
    const response = await axios.post(`${API_BASE_URL}/auth/google/unlink`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error desvincular Google:', error);
    throw new Error(error.response?.data?.message || 'Error al desvincular cuenta de Google');
  }
};

// 🔥 FUNCIÓN PARA LIMPIAR CACHE MANUALMENTE
export const clearUserCache = () => {
  userCache.clearCache();
};

// 🔥 FUNCIÓN PARA DEBUGGING
export const debugAuth = () => {
  return {
    hasToken: !!localStorage.getItem('token'),
    cache: userCache.getDebugInfo(),
    heartbeatActive: !!heartbeatInterval
  };
};

export { startHeartbeat, stopHeartbeat };