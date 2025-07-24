// src/hooks/usePageAccess.js
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getUser } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔥 CACHE GLOBAL PARA EVITAR REQUESTS DUPLICADOS
const REQUEST_CACHE = new Map();
const CACHE_DURATION = 10000; // 10 segundos

export function usePageAccess(requiredConditions) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  const hasFetched = useRef(false); // 🔥 PREVENIR MÚLTIPLES CALLS

  useEffect(() => {
    const checkAccess = async () => {
  if (hasFetched.current) {
    console.log('🛑 usePageAccess: Ya se realizó la consulta, saltando...');
    return;
  }

  try {
    console.log("🔍 Verificando acceso para:", requiredConditions);
    hasFetched.current = true;

    // 🔥 USAR getUser QUE YA TIENE CACHE GLOBAL
    const response = await getUser();
    const user = response.user || response; // Manejar diferentes formatos de respuesta

    processUser(user);

  } catch (error) {
    console.error("❌ Error verificando acceso:", error);
    
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limited - manteniendo estado actual');
      setLoading(false);
      return;
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      navigate("/home", { replace: true });
    } else {
      setLoading(false);
    }
  }
};

    const processUser = (user) => {
      console.log("👤 Usuario:", { 
        email_verified: !!user?.email_verified_at,
        rol: user?.rol,
        name: user?.name,
        verificacion_estado: user?.verificacion?.estado
      });

      let canAccess = true;
      let redirectTo = "/home";

      // 📧 Email verificado
      if (requiredConditions.emailVerified === true && !user?.email_verified_at) {
        console.log("🚫 Email no verificado");
        canAccess = false;
        redirectTo = "/verificaremail";
      }

      if (requiredConditions.emailVerified === false && user?.email_verified_at) {
        console.log("🚫 Email ya verificado");
        canAccess = false;
        redirectTo = "/genero";
      }

      // 👤 Perfil completo
      if (requiredConditions.profileComplete === true && (!user?.rol || !user?.name)) {
        console.log("🚫 Perfil incompleto");
        canAccess = false;
        redirectTo = "/genero";
      }

      if (requiredConditions.profileComplete === false && user?.rol && user?.name) {
        console.log("🚫 Perfil ya completo");
        canAccess = false;
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
        console.log(`🚫 Rol incorrecto. Requerido: ${requiredConditions.role}, actual: ${user?.rol}`);
        canAccess = false;
        
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
          console.log(`🚫 Estado de verificación incorrecto. Requerido: ${requiredStatus}, actual: ${currentStatus}`);
          canAccess = false;
          
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
          console.log("🚫 Usuario en videochat activa");
          canAccess = false;
          redirectTo = user?.rol === "cliente" ? "/videochatclient" : "/videochat";
        }
      }

      // ✅ Requerir token de videochat
      if (requiredConditions.requiresCallToken) {
        const sessionRoomName = sessionStorage.getItem('roomName');
        
        console.log('🎮 [HOOK] Verificando requiresCallToken:', { 
          sessionRoomName,
          isValidRoom: sessionRoomName && sessionRoomName !== 'null' && sessionRoomName !== 'undefined' && sessionRoomName.trim() !== ''
        });
        
        // Verificar que hay un roomName válido en sessionStorage
        const hasValidRoom = sessionRoomName && 
                            sessionRoomName !== 'null' && 
                            sessionRoomName !== 'undefined' && 
                            sessionRoomName.trim() !== '';

        if (!hasValidRoom) {
          console.log("🚫 [HOOK] No hay sala válida en sessionStorage, redirigiendo");
          canAccess = false;
          redirectTo = user?.rol === "cliente" ? "/homecliente" : "/homellamadas";
        } else {
          console.log("✅ [HOOK] Sala válida encontrada, acceso permitido");
        }
      }

      if (!canAccess) {
        console.log("🔄 Redirigiendo a:", redirectTo);
        navigate(redirectTo, { replace: true });
      } else {
        console.log("✅ Acceso permitido");
        setHasAccess(true);
      }

      setLoading(false);
    };

    // 🔥 SOLO EJECUTAR UNA VEZ
    if (!hasFetched.current) {
      checkAccess();
    }
  }, []); // Sin dependencias para evitar re-runs

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
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // El hook ya redirigió
  }

  return children;
}