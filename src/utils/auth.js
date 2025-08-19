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


export const loginWithWait = async (email, password, onStatusUpdate = null) => {
  try {
    console.log("🔄 Intentando login...");
    
    // Usar la función existente pero interceptar el 202
    const response = await axios.post(`${API_BASE_URL}/api/login`, { 
      email, 
      password 
    }, { skipInterceptor: true });

    // Login exitoso directo (no había sesión activa)
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem("just_logged_in", "true");

      setTimeout(() => {
        localStorage.removeItem("just_logged_in");
      }, 10000);

      console.log("✅ Token guardado en login:", response.data.access_token.substring(0, 10) + "...");
      
      // Marcar como online y iniciar heartbeat
      try {
        await axios.post(`${API_BASE_URL}/api/user/mark-online`, {}, {
          headers: { 'Authorization': `Bearer ${response.data.access_token}` }
        });
        console.log("🟢 Usuario marcado como online");
        startHeartbeat();
      } catch (error) {
        console.error("❌ Error marcando como online:", error);
      }

      userCache.clearCache();
      return { success: true, data: response.data, requiresWait: false };
    }

    return { success: true, data: response.data, requiresWait: false };

  } catch (error) {
    // Usuario A está activo, necesitamos esperar (código 202)
    if (error.response?.status === 202 && error.response?.data?.status === 'waiting_for_user_decision') {
      console.log("⏳ Usuario activo detectado - Iniciando espera...");
      
      return await waitForUserDecision(email, password, error.response.data, onStatusUpdate);
    }

    // Otros errores (401, 404, etc.)
    throw error;
  }
};

// Función para esperar la decisión del Usuario A
const waitForUserDecision = async (email, password, initialResponse, onStatusUpdate) => {
  const requestId = initialResponse.request_id;
  const maxWaitTime = (initialResponse.wait_time || 10) * 60 * 1000; // convertir a ms
  const startTime = Date.now();
  
  console.log(`⏳ Esperando decisión del usuario activo por ${initialResponse.wait_time} minutos...`);
  
  // Notificar al UI del estado inicial
  if (onStatusUpdate) {
    onStatusUpdate({
      status: 'waiting',
      message: 'Hay una sesión activa. El usuario está siendo notificado...',
      remainingTime: initialResponse.wait_time,
      canCancel: true
    });
  }

  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      try {
        const elapsed = Date.now() - startTime;
        
        // Timeout alcanzado
        if (elapsed >= maxWaitTime) {
          clearInterval(checkInterval);
          reject(new Error('Tiempo de espera agotado'));
          return;
        }

        // Verificar estado actual
        const statusResponse = await axios.post(`${API_BASE_URL}/api/check-login-status`, {
          email,
          request_id: requestId
        }, { skipInterceptor: true });

        const status = statusResponse.data;
        console.log("🔍 Estado actual:", status);

        // Actualizar UI
        if (onStatusUpdate) {
          onStatusUpdate({
            status: status.status,
            message: status.message,
            remainingTime: status.remaining_time || 0,
            canCancel: true
          });
        }

        // Usuario A aprobó o tiempo expiró
        if (status.can_login) {
          clearInterval(checkInterval);
          console.log("✅ Acceso aprobado - Completando login...");
          
          try {
            // Completar el login
            const loginResponse = await axios.post(`${API_BASE_URL}/api/complete-pending-login`, {
              email,
              password
            }, { skipInterceptor: true });

            if (loginResponse.data.access_token) {
              localStorage.setItem('token', loginResponse.data.access_token);
              localStorage.setItem("just_logged_in", "true");

              setTimeout(() => {
                localStorage.removeItem("just_logged_in");
              }, 10000);

              console.log("✅ Login completado con token:", loginResponse.data.access_token.substring(0, 10) + "...");
              
              // Marcar como online y iniciar heartbeat
              try {
                await axios.post(`${API_BASE_URL}/api/user/mark-online`, {}, {
                  headers: { 'Authorization': `Bearer ${loginResponse.data.access_token}` }
                });
                console.log("🟢 Usuario marcado como online");
                startHeartbeat();
              } catch (error) {
                console.error("❌ Error marcando como online:", error);
              }

              userCache.clearCache();
              
              resolve({ 
                success: true, 
                data: loginResponse.data,
                requiresWait: true,
                waitResult: 'approved'
              });
            } else {
              throw new Error('No se recibió token de acceso');
            }
          } catch (loginError) {
            clearInterval(checkInterval);
            reject(loginError);
          }
        }

      } catch (error) {
        console.error("❌ Error verificando estado:", error);
        clearInterval(checkInterval);
        reject(error);
      }
    }, 3000); // Verificar cada 3 segundos

    // Cleanup function para cancelar si es necesario
    resolve.cancel = () => {
      clearInterval(checkInterval);
      reject(new Error('Operación cancelada por el usuario'));
    };
  });
};

// Función para cancelar la espera (Usuario B)
export const cancelWaitingLogin = () => {
  console.log("❌ Usuario B canceló la espera");
  // Esta función puede ser llamada desde el UI para cancelar la espera
  return { cancelled: true };
};


// 🔄 MODIFICAR loginWithoutRedirect - Usuario B entra inmediatamente
export const loginWithoutRedirect = async (email, password) => {
  try {
    console.log("🔄 Login (Usuario B entra inmediatamente)");
    
    const response = await axios.post(`${API_BASE_URL}/api/login`, { 
      email, 
      password 
    }, { skipInterceptor: true });

    // Login exitoso - Usuario B entra inmediatamente
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem("just_logged_in", "true");

      setTimeout(() => {
        localStorage.removeItem("just_logged_in");
      }, 10000);

      console.log("✅ Token guardado:", response.data.access_token.substring(0, 10) + "...");
      
      // 🔥 CARGAR IDIOMA INMEDIATAMENTE DESPUÉS DEL LOGIN
      try {
        console.log('🔄 Cargando idioma del usuario...');
        const userResponse = await axios.get(`${API_BASE_URL}/api/profile/info`, {
          headers: { 'Authorization': `Bearer ${response.data.access_token}` }
        });
        
        if (userResponse.data.success && userResponse.data.user.preferred_language) {
          localStorage.setItem('userPreferredLanguage', userResponse.data.user.preferred_language);
          localStorage.setItem('selectedLanguage', userResponse.data.user.preferred_language);
          localStorage.setItem('i18nextLng', userResponse.data.user.preferred_language);
          localStorage.setItem('lang', userResponse.data.user.preferred_language);
          console.log('🌍 Idioma cargado:', userResponse.data.user.preferred_language);
          
          if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
            window.i18n.changeLanguage(userResponse.data.user.preferred_language);
          }
        } else {
          console.log('⚠️ Usando español por defecto');
          localStorage.setItem('userPreferredLanguage', 'es');
          localStorage.setItem('selectedLanguage', 'es');
        }
      } catch (languageError) {
        console.error('❌ Error cargando idioma:', languageError);
        localStorage.setItem('userPreferredLanguage', 'es');
        localStorage.setItem('selectedLanguage', 'es');
      }
      
      userCache.clearCache();
      
      // Marcar como online y iniciar heartbeat
      try {
        await axios.post(`${API_BASE_URL}/api/user/mark-online`, {}, {
          headers: { 'Authorization': `Bearer ${response.data.access_token}` }
        });
        console.log("🟢 Usuario B marcado como online");
        startHeartbeat();
      } catch (error) {
        console.error("❌ Error marcando como online:", error);
      }

      return response.data;
    }

    return response.data;

  } catch (error) {
    // Mantener el mismo manejo de errores que antes
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

// 🔄 MODIFICADO: Reclamar sesión (Usuario A permite acceso a Usuario B)
export const reclamarSesion = async (email, password) => {
  try {
    console.log('🔄 Usuario A permitiendo acceso para:', email);
    
    const response = await axios.post(`${API_BASE_URL}/api/reclaim-session`, {
      email,
      password,
      force: true
    }, { skipInterceptor: true });

    console.log("✅ Acceso permitido exitosamente");
    
    // Usuario A será desconectado - limpiar su estado local
    stopHeartbeat();
    localStorage.removeItem("token");
    localStorage.removeItem("just_logged_in");
    userCache.clearCache();
    
    return response.data;
  } catch (error) {
    console.error("❌ Error permitiendo acceso:", error.response?.data || error);
    
    if (error.response?.status === 401) {
      throw new Error("Credenciales incorrectas");
    } else if (error.response?.status === 400) {
      throw new Error("Solicitud de sesión expirada o inválida");
    } else if (error.response?.status === 404) {
      throw new Error("Usuario no encontrado");
    }
    
    throw new Error("Error al permitir acceso");
  }
};
export const rechazarNuevaSesion = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No hay token");
    }

    const response = await axios.post(`${API_BASE_URL}/api/reject-new-session`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log("✅ Intruso expulsado exitosamente");
    
    if (response.data.access_token) {
      localStorage.setItem("token", response.data.access_token);
      console.log("✅ Nuevo token recibido para Usuario A");
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error expulsando intruso:', error);
    throw error;
  }
};

// 🆕 NUEVA: Función para que Usuario A permita el acceso y se desconecte
export const allowAndDisconnect = async (email, password) => {
  try {
    console.log('🔄 Usuario A permitiendo acceso y desconectándose');
    
    // Usar reclamarSesion que ya maneja esto
    await reclamarSesion(email, password);
    
    // Inmediatamente desconectar (el token será invalidado por Usuario B)
    stopHeartbeat();
    localStorage.removeItem("token");
    localStorage.removeItem("just_logged_in");
    userCache.clearCache();
    
    return { success: true, message: 'Acceso permitido' };
  } catch (error) {
    console.error("❌ Error permitiendo acceso:", error);
    throw error;
  }
};

export const checkAuthStatus = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No hay token");
    }

    const response = await axios.get(`${API_BASE_URL}/api/check-auth`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error verificando estado de auth:', error);
    throw error;
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
    
    // 🆕 MANEJO ESPECÍFICO DE SESIÓN DUPLICADA
    if (error.response?.status === 401 && error.response?.data?.code === 'SESSION_DUPLICATED') {
      console.log("🔥 Sesión duplicada detectada en getUser");
      throw error; // Dejar que VerificarSesionActiva maneje esto
    }
    
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
      localStorage.removeItem("reclamando_sesion");
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


export const allowNewSession = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No hay token");
    }

    const response = await axios.post(`${API_BASE_URL}/api/allow-new-session`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log("✅ Acceso permitido");
    return response.data;
  } catch (error) {
    console.error('❌ Error permitiendo acceso:', error);
    throw error;
  }
};

export { startHeartbeat, stopHeartbeat,    };