// src/hooks/usePageAccess.js
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUser } from '../utils/auth';

// 🔥 PROTECCIONES GLOBALES CONTRA LOOPS
let GLOBAL_PROCESSING = false;

export function usePageAccess() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const hasFetched = useRef(false);
  const componentId = useRef(Math.random().toString(36).substr(2, 9));
  
  // 🎯 DEFINIR RUTAS POR ROL
  const ROLE_ROUTES = {
    cliente: {
      home: '/homecliente',
      allowedPaths: [
        '/homecliente',
        '/esperandocallcliente', 
        '/videochatclient',
        '/message',
        '/favoritesboy'
      ]
    },
    modelo: {
      home: '/homellamadas',
      allowedPaths: [
        '/homellamadas',
        '/mensajes',
        '/favorites', 
        '/historysu',
        '/esperandocall',
        '/videochat',
        '/configuracion',
        '/VideoRecorderUpload',
        '/usersearch'
      ]
    },
    admin: {
      home: '/verificacionesadmin',
      allowedPaths: [
        '/verificacionesadmin'
      ]
    }
  };

  // 🔓 RUTAS PÚBLICAS (no requieren verificación de rol)
  const PUBLIC_ROUTES = [
    '/home',
    '/login', 
    '/logout',
    '/rate-limit-wait',
    '/verificaremail',
    '/genero',
    '/verificacion',
    '/anteveri', 
    '/esperando'
  ];

  useEffect(() => {
    const checkAndRedirect = async () => {
      // 🛑 PREVENIR MÚLTIPLES EJECUCIONES
      if (hasFetched.current || GLOBAL_PROCESSING) {
        console.log(`🛑 [usePageAccess-${componentId.current}] Ya procesando, saltando...`);
        return;
      }

      const currentPath = location.pathname;

      // 🔓 Si está en ruta pública, no verificar
      if (PUBLIC_ROUTES.includes(currentPath)) {
        console.log(`🔓 [usePageAccess] Ruta pública: ${currentPath}`);
        setLoading(false);
        return;
      }

      // Verificar token
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.log(`🚨 [usePageAccess] No hay token - redirigiendo a /home`);
        navigate("/home", { replace: true });
        return;
      }

      try {
        console.log(`🔍 [usePageAccess-${componentId.current}] Verificando rol para: ${currentPath}`);
        
        hasFetched.current = true;
        GLOBAL_PROCESSING = true;

        // Obtener usuario
        const response = await getUser();
        const user = response?.user || response;

        if (!user || !user.rol) {
          console.log(`❌ [usePageAccess] Usuario sin rol válido`);
          navigate("/home", { replace: true });
          return;
        }

        const userRole = user.rol;
        console.log(`👤 [usePageAccess] Usuario detectado: ${userRole}`);

        // 🎯 VERIFICAR SI ESTÁ EN RUTA CORRECTA
        const roleConfig = ROLE_ROUTES[userRole];
        
        if (!roleConfig) {
          console.log(`❌ [usePageAccess] Rol no reconocido: ${userRole}`);
          navigate("/home", { replace: true });
          return;
        }

        // Verificar si la ruta actual está permitida para este rol
        const isAllowedPath = roleConfig.allowedPaths.includes(currentPath);

        if (!isAllowedPath) {
          console.log(`🔄 [usePageAccess] Redirigiendo ${userRole} de ${currentPath} a ${roleConfig.home}`);
          navigate(roleConfig.home, { replace: true });
          return;
        }

        console.log(`✅ [usePageAccess] ${userRole} en ruta correcta: ${currentPath}`);

      } catch (error) {
        console.error(`❌ [usePageAccess-${componentId.current}] Error:`, error);
        
        // Si hay error, redirigir a home
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate("/home", { replace: true });
        }
        
      } finally {
        GLOBAL_PROCESSING = false;
        setLoading(false);
      }
    };

    // 🚀 INICIAR VERIFICACIÓN
    if (!hasFetched.current && !GLOBAL_PROCESSING) {
      checkAndRedirect();
    }

    // 🧹 CLEANUP
    return () => {
      hasFetched.current = false;
      GLOBAL_PROCESSING = false;
    };

  }, [location.pathname]); // Se ejecuta cuando cambia la ruta

  return { loading };
}

// 🛡️ COMPONENTE WRAPPER simple
export function ProtectedPage({ children }) {
  const { loading } = usePageAccess();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white/80">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  return children;
}