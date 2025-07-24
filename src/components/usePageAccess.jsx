// src/hooks/usePageAccess.js
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getUser } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔥 PROTECCIONES GLOBALES CONTRA LOOPS
let GLOBAL_REDIRECT_IN_PROGRESS = false;
let GLOBAL_PROCESSING = false;
const FAILED_REQUESTS = new Set(); // Track de requests fallidos
const MAX_RETRIES = 3;

// 🛡️ HELPER: Limpiar cache corrupto
const clearCorruptedCache = () => {
  console.log('🧹 [usePageAccess] Limpiando cache corrupto...');
  
  // Limpiar localStorage si existe
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('user') || key.includes('cache')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.log('⚠️ [usePageAccess] Error limpiando localStorage:', e);
  }

  // Limpiar sessionStorage si existe
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.includes('user') || key.includes('cache')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.log('⚠️ [usePageAccess] Error limpiando sessionStorage:', e);
  }
};

// 🔄 HELPER: Retry con backoff exponencial
const retryRequest = async (requestFn, retries = MAX_RETRIES) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await requestFn();
      
      // Validar que el resultado no esté corrupto
      if (result && typeof result === 'object' && (result.user || result.id)) {
        return result;
      }
      
      if (i === retries - 1) {
        throw new Error('Usuario inválido después de todos los reintentos');
      }
      
      console.log(`🔄 [usePageAccess] Intento ${i + 1} falló, reintentando...`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000)); // Backoff exponencial
      
    } catch (error) {
      if (i === retries - 1) throw error;
      
      console.log(`⚠️ [usePageAccess] Intento ${i + 1} falló:`, error.message);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

export function usePageAccess(requiredConditions) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const retryCount = useRef(0);
  const componentId = useRef(Math.random().toString(36).substr(2, 9)); // ID único
  
  useEffect(() => {
    const checkAccess = async () => {
      // 🛑 PREVENIR MÚLTIPLES EJECUCIONES
      if (hasFetched.current || GLOBAL_PROCESSING) {
        console.log(`🛑 [usePageAccess-${componentId.current}] Ya procesando, saltando...`);
        return;
      }

      // 🛑 PREVENIR REDIRECCIONES MÚLTIPLES
      if (GLOBAL_REDIRECT_IN_PROGRESS) {
        console.log(`🛑 [usePageAccess-${componentId.current}] Redirección en progreso, saltando...`);
        setLoading(false);
        return;
      }

      try {
        console.log(`🔍 [usePageAccess-${componentId.current}] Verificando acceso para:`, requiredConditions);
        
        hasFetched.current = true;
        GLOBAL_PROCESSING = true;

        // 🔄 USAR RETRY CON VALIDACIÓN
        const response = await retryRequest(async () => {
          const result = await getUser(retryCount.current > 0); // Force refresh en reintentos
          
          // 🔍 VALIDACIÓN ESTRICTA DE LA RESPUESTA
          if (!result) {
            throw new Error('Respuesta vacía del servidor');
          }

          // Si es undefined, null, o un objeto vacío, limpiar cache
          if (result === undefined || result === null || 
              (typeof result === 'object' && Object.keys(result).length === 0)) {
            console.log('💥 [usePageAccess] Cache corrupto detectado, limpiando...');
            clearCorruptedCache();
            throw new Error('Cache corrupto detectado');
          }

          return result;
        });

        const user = response.user || response;

        // 🔍 VALIDACIÓN FINAL DEL USUARIO
        if (!user || typeof user !== 'object') {
          throw new Error('Usuario inválido recibido');
        }

        console.log(`👤 [usePageAccess-${componentId.current}] Usuario válido recibido:`, {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          rol: user?.rol,
          email_verified_at: user?.email_verified_at ? 'presente' : 'ausente',
          verificacion: user?.verificacion ? 'presente' : 'ausente'
        });

        processUser(user);

      } catch (error) {
        console.error(`❌ [usePageAccess-${componentId.current}] Error verificando acceso:`, error);
        
        // 🔄 MANEJO DE ERRORES CON REINTENTOS
        if (retryCount.current < MAX_RETRIES && 
            (error.message.includes('Cache corrupto') || 
             error.message.includes('Usuario inválido') ||
             error.response?.status === 500)) {
          
          retryCount.current++;
          console.log(`🔄 [usePageAccess-${componentId.current}] Reintentando (${retryCount.current}/${MAX_RETRIES})...`);
          
          // Reset estados para reintentar
          hasFetched.current = false;
          GLOBAL_PROCESSING = false;
          
          // Retry con delay
          setTimeout(() => {
            if (!GLOBAL_REDIRECT_IN_PROGRESS) {
              checkAccess();
            }
          }, 2000 * retryCount.current);
          
          return;
        }
        
        // 🚨 MANEJO DE ERRORES ESPECÍFICOS
        if (error.response?.status === 429) {
          console.warn('⚠️ [usePageAccess] Rate limited - manteniendo estado actual');
          setLoading(false);
          return;
        }
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          safeNavigate("/home", "Error de autenticación");
        } else {
          console.error(`💥 [usePageAccess-${componentId.current}] Error crítico:`, error);
          setLoading(false);
        }
      } finally {
        GLOBAL_PROCESSING = false;
      }
    };

    const processUser = (user) => {
      try {
        console.log(`👤 [usePageAccess-${componentId.current}] Procesando usuario:`, { 
          email_verified: !!user?.email_verified_at,
          rol: user?.rol,
          name: user?.name,
          verificacion_estado: user?.verificacion?.estado
        });

        let canAccess = true;
        let redirectTo = "/home";
        let redirectReason = "";

        // 📧 Email verificado
        if (requiredConditions.emailVerified === true && !user?.email_verified_at) {
          console.log(`🚫 [usePageAccess-${componentId.current}] Email no verificado`);
          canAccess = false;
          redirectTo = "/verificaremail";
          redirectReason = "Email no verificado";
        }

        if (requiredConditions.emailVerified === false && user?.email_verified_at) {
          console.log(`🚫 [usePageAccess-${componentId.current}] Email ya verificado`);
          canAccess = false;
          redirectTo = "/genero";
          redirectReason = "Email ya verificado";
        }

        // 👤 Perfil completo
        if (requiredConditions.profileComplete === true && (!user?.rol || !user?.name)) {
          console.log(`🚫 [usePageAccess-${componentId.current}] Perfil incompleto`);
          canAccess = false;
          redirectTo = "/genero";
          redirectReason = "Perfil incompleto";
        }

        if (requiredConditions.profileComplete === false && user?.rol && user?.name) {
          console.log(`🚫 [usePageAccess-${componentId.current}] Perfil ya completo`);
          canAccess = false;
          redirectReason = "Perfil ya completo";
          
          // Redirigir según el rol
          if (user.rol === "cliente") {
            redirectTo = "/homecliente";
          } else if (user.rol === "modelo") {
            const estado = user.verificacion?.estado;
            switch (estado) {
              case "pendiente": redirectTo = "/esperando"; break;
              case "aprobada": redirectTo = "/homellamadas"; break;
              default: redirectTo = "/anteveri";
            }
          }
        }

        // 🎭 Rol específico
        if (requiredConditions.role && user?.rol !== requiredConditions.role) {
          console.log(`🚫 [usePageAccess-${componentId.current}] Rol incorrecto. Requerido: ${requiredConditions.role}, actual: ${user?.rol}`);
          canAccess = false;
          redirectReason = `Rol incorrecto: necesario ${requiredConditions.role}`;
          
          if (user?.rol === "cliente") {
            redirectTo = "/homecliente";
          } else if (user?.rol === "modelo") {
            const estado = user.verificacion?.estado;
            switch (estado) {
              case "pendiente": redirectTo = "/esperando"; break;
              case "aprobada": redirectTo = "/homellamadas"; break;
              default: redirectTo = "/anteveri";
            }
          } else {
            redirectTo = "/home";
          }
        }

        // ✅ Estado de verificación para modelos
        if (requiredConditions.verificationStatus) {
          const currentStatus = user?.verificacion?.estado;
          const requiredStatus = requiredConditions.verificationStatus;

          if (currentStatus !== requiredStatus) {
            console.log(`🚫 [usePageAccess-${componentId.current}] Estado de verificación incorrecto. Requerido: ${requiredStatus}, actual: ${currentStatus}`);
            canAccess = false;
            redirectReason = `Estado de verificación incorrecto: ${currentStatus} -> ${requiredStatus}`;
            
            switch (currentStatus) {
              case null:
              case undefined:
              case "rechazada":
                redirectTo = "/anteveri";
                break;
              case "pendiente":
                redirectTo = "/esperando";
                break;
              case "aprobada":
                redirectTo = "/homellamadas";
                break;
              default:
                redirectTo = "/anteveri";
            }
          }
        }

        // 🚫 Bloquear si está en videochat
        if (requiredConditions.blockIfInCall) {
          const token = sessionStorage.getItem('token');
          const roomName = sessionStorage.getItem('roomName');
          
          if (token && roomName) {
            console.log(`🚫 [usePageAccess-${componentId.current}] Usuario en videochat activa`);
            canAccess = false;
            redirectTo = user?.rol === "cliente" ? "/videochatclient" : "/videochat";
            redirectReason = "Usuario en videochat activa";
          }
        }

        // ✅ Requerir token de videochat
        if (requiredConditions.requiresCallToken) {
          const sessionRoomName = sessionStorage.getItem('roomName');
          
          console.log(`🎮 [usePageAccess-${componentId.current}] Verificando requiresCallToken:`, { 
            sessionRoomName,
            isValidRoom: sessionRoomName && sessionRoomName !== 'null' && sessionRoomName !== 'undefined' && sessionRoomName.trim() !== ''
          });
          
          const hasValidRoom = sessionRoomName && 
                              sessionRoomName !== 'null' && 
                              sessionRoomName !== 'undefined' && 
                              sessionRoomName.trim() !== '';

          if (!hasValidRoom) {
            console.log(`🚫 [usePageAccess-${componentId.current}] No hay sala válida en sessionStorage`);
            canAccess = false;
            redirectTo = user?.rol === "cliente" ? "/homecliente" : "/homellamadas";
            redirectReason = "No hay sala válida";
          } else {
            console.log(`✅ [usePageAccess-${componentId.current}] Sala válida encontrada`);
          }
        }

        // 🎯 RESULTADO FINAL
        if (!canAccess) {
          safeNavigate(redirectTo, redirectReason);
        } else {
          console.log(`✅ [usePageAccess-${componentId.current}] Acceso permitido`);
          setHasAccess(true);
        }

        setLoading(false);

      } catch (error) {
        console.error(`💥 [usePageAccess-${componentId.current}] Error procesando usuario:`, error);
        setLoading(false);
      }
    };

    // 🛡️ NAVEGACIÓN SEGURA CON PROTECCIÓN CONTRA LOOPS
    const safeNavigate = (path, reason) => {
      if (GLOBAL_REDIRECT_IN_PROGRESS) {
        console.log(`🛑 [usePageAccess-${componentId.current}] Redirección ya en progreso, ignorando nueva redirección a ${path}`);
        return;
      }

      GLOBAL_REDIRECT_IN_PROGRESS = true;
      
      console.log(`🔄 [usePageAccess-${componentId.current}] Redirigiendo a: ${path} (Razón: ${reason})`);
      
      // Delay pequeño para evitar race conditions
      setTimeout(() => {
        try {
          navigate(path, { replace: true });
        } catch (error) {
          console.error(`❌ [usePageAccess-${componentId.current}] Error en navegación:`, error);
        }
        
        // Reset el flag después de un tiempo
        setTimeout(() => {
          GLOBAL_REDIRECT_IN_PROGRESS = false;
        }, 2000);
      }, 100);
    };

    // 🚀 INICIAR VERIFICACIÓN
    if (!hasFetched.current && !GLOBAL_PROCESSING) {
      checkAccess();
    }

    // 🧹 CLEANUP
    return () => {
      console.log(`🧹 [usePageAccess-${componentId.current}] Limpiando componente`);
      hasFetched.current = false;
      GLOBAL_PROCESSING = false;
    };

  }, []); // Sin dependencias para evitar re-runs

  // 🕐 TIMEOUT DE SEGURIDAD
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log(`⏰ [usePageAccess-${componentId.current}] Timeout de verificación alcanzado`);
        setLoading(false);
        
        // Si aún está cargando después de 30 segundos, algo está mal
        if (!hasAccess) {
          console.log(`🚨 [usePageAccess-${componentId.current}] Timeout crítico, redirigiendo a home`);
          navigate("/home", { replace: true });
        }
      }
    }, 30000); // 30 segundos

    return () => clearTimeout(timeout);
  }, [loading, hasAccess, navigate]);

  return { loading, hasAccess };
}

// 🛡️ COMPONENTE WRAPPER para páginas protegidas
export function ProtectedPage({ children, requiredConditions }) {
  const { loading, hasAccess } = usePageAccess(requiredConditions);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white/80 mt-4">Verificando permisos...</p>
          <p className="text-white/60 text-sm mt-2">
            Si esto toma mucho tiempo, recarga la página
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // El hook ya redirigió
  }

  return children;
}