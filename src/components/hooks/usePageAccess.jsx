// src/hooks/usePageAccess.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUser } from '../../utils/auth';

// 🔥 PROTECCIONES GLOBALES CONTRA LOOPS
let GLOBAL_PROCESSING = false;

export function usePageAccess() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const hasFetched = useRef(false);
  const componentId = useRef(Math.random().toString(36).substr(2, 9));
  
  // 🎯 DEFINIR RUTAS POR ROL (Solo para usuarios con registro COMPLETADO)
  const ROLE_ROUTES = {
    cliente: {
      home: '/homecliente',
      allowedPaths: [
        '/homecliente',
        '/esperandocallcliente', 
        '/videochatclient',
        '/message',
        '/favoritesboy',
        '/usersearch', // 🔍 Compartida con modelo
        '/settings'
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
        '/usersearch' // 🔍 Compartida con cliente
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
    '/rate-limit-wait'
  ];

  // 📝 RUTAS DE REGISTRO (manejadas por useRegistrationAccess)
  const REGISTRATION_ROUTES = [
    '/verificaremail',
    '/genero',
    '/verificacion',
    '/anteveri', 
    '/esperando'
  ];

  // 🛡️ VERIFICAR SI USUARIO VERIFICADO INTENTA ACCEDER A RUTAS BLOQUEADAS
  const isAttemptingBlockedRoute = (user, currentPath) => {
    const isFullyVerified = isRegistrationComplete(user);
    const isBlockedRoute = REGISTRATION_ROUTES.includes(currentPath); // 🔧 USAR REGISTRATION_ROUTES
    
    if (isFullyVerified && isBlockedRoute) {
      console.log(`🚫 [usePageAccess] Usuario completamente verificado intentando acceder a ruta bloqueada: ${currentPath}`);
      return true;
    }
    
    return false;
  };

  // 🎯 VERIFICAR SI EL USUARIO TIENE REGISTRO COMPLETADO
  const isRegistrationComplete = (user) => {
    if (!user.email_verified_at) {
      return false;
    }

    // 🔧 CORREGIDO: Usar solo verificacion_estado
    const verificacionEstado = user.verificacion_estado;

    console.log(`🔍 [usePageAccess] Verificando registro completo:`, {
      rol: user.rol,
      email_verified_at: user.email_verified_at,
      verificacion_completa: user.verificacion_completa,
      verificacion_estado: verificacionEstado
    });

    switch (user.rol) {
      case 'cliente':
        // CLIENTE: Solo necesita email verificado + rol cliente
        const clienteCompleto = user.rol === 'cliente';
        console.log(`👤 [usePageAccess] Cliente completo: ${clienteCompleto}`);
        return clienteCompleto;
        
      case 'modelo':
        // MODELO: Si estado es 'aprobada', está completo independientemente de verificacion_completa
        const modeloCompleto = verificacionEstado === 'aprobada' || (user.verificacion_completa && verificacionEstado === 'aprobada');
        console.log(`👤 [usePageAccess] Modelo completo: ${modeloCompleto} (verificacion_completa: ${user.verificacion_completa}, estado: ${verificacionEstado})`);
        return modeloCompleto;
        
      case 'admin':
        // ADMIN: Si estado es 'aprobada', está completo independientemente de verificacion_completa  
        const adminCompleto = verificacionEstado === 'aprobada' || (user.verificacion_completa && verificacionEstado === 'aprobada');
        console.log(`👤 [usePageAccess] Admin completo: ${adminCompleto} (verificacion_completa: ${user.verificacion_completa}, estado: ${verificacionEstado})`);
        return adminCompleto;
        
      default:
        console.log(`👤 [usePageAccess] Rol desconocido: ${user.rol}`);
        return false;
    }
  };

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

      // 📝 Si está en ruta de registro, delegar a useRegistrationAccess
      if (REGISTRATION_ROUTES.includes(currentPath)) {
        console.log(`📝 [usePageAccess] Ruta de registro detectada: ${currentPath}, delegando a useRegistrationAccess`);
        setLoading(false);
        return;
      }

      // Verificar token
      const token = localStorage.getItem('token');
      if (!token) {
        console.log(`🚨 [usePageAccess] No hay token - redirigiendo a /home`);
        navigate("/home", { replace: true });
        return;
      }

      try {
        console.log(`🔍 [usePageAccess-${componentId.current}] Verificando acceso para: ${currentPath}`);
        
        hasFetched.current = true;
        GLOBAL_PROCESSING = true;

        // Obtener usuario
        const response = await getUser();
        const user = response?.user || response;

        if (!user) {
          console.log(`❌ [usePageAccess] Usuario no encontrado`);
          navigate("/home", { replace: true });
          return;
        }

        // 🔧 CORREGIDO: Usar solo verificacion_estado para el log
        const verificacionEstado = user.verificacion_estado;

        console.log(`👤 [usePageAccess] Usuario obtenido:`, {
          email: user.email,
          email_verified_at: user.email_verified_at,
          rol: user.rol,
          verificacion_completa: user.verificacion_completa,
          verificacion_estado: verificacionEstado,
          user_debug: user // Para debug completo
        });

        // 🛡️ VERIFICAR SI USUARIO VERIFICADO INTENTA ACCEDER A RUTAS BLOQUEADAS
        if (isAttemptingBlockedRoute(user, currentPath)) {
          const roleConfig = ROLE_ROUTES[user.rol];
          if (roleConfig) {
            console.log(`🚫 [usePageAccess] BLOQUEANDO y redirigiendo a home: ${roleConfig.home}`);
            navigate(roleConfig.home, { replace: true });
            return;
          }
        }

        // 🔍 VERIFICAR SI EL REGISTRO ESTÁ COMPLETO
        if (!isRegistrationComplete(user)) {
          console.log(`📝 [usePageAccess] Registro incompleto para usuario con rol: ${user.rol}`);
          console.log(`🔄 [usePageAccess] Redirigiendo a flujo de registro (useRegistrationAccess se hará cargo)`);
          
          // Redirigir al inicio del flujo de registro
          if (!user.email_verified_at) {
            navigate("/verificaremail", { replace: true });
          } else if (!user.rol || user.rol === 'user') {
            navigate("/genero", { replace: true });
          } else if (user.rol === 'cliente') {
            // Cliente con email verificado debería estar completo
            // Si llegó aquí es porque hay un problema, verificar en género
            navigate("/genero", { replace: true });
          } else if (user.rol === 'modelo') {
            // 🔧 CORREGIDO: Usar solo verificacion_estado para las condiciones
            if (!user.verificacion_completa) {
              navigate("/anteveri", { replace: true });
            } else if (verificacionEstado === 'pendiente') {
              console.log(`⏳ [usePageAccess] Modelo con verificación pendiente, redirigiendo a /esperando`);
              navigate("/esperando", { replace: true });
            } else if (verificacionEstado === 'rechazada') {
              navigate("/anteveri", { replace: true });
            } else {
              navigate("/anteveri", { replace: true });
            }
          } else {
            navigate("/verificaremail", { replace: true });
          }
          return;
        }

        // 🎯 USUARIO CON REGISTRO COMPLETO - VERIFICAR ACCESO POR ROL
        const userRole = user.rol;
        console.log(`✅ [usePageAccess] Usuario con registro completo, rol: ${userRole}`);

        const roleConfig = ROLE_ROUTES[userRole];
        
        if (!roleConfig) {
          console.log(`❌ [usePageAccess] Rol no reconocido: ${userRole}`);
          navigate("/home", { replace: true });
          return;
        }

        // Si está en /dashboard, redirigir a su home correspondiente
        if (currentPath === '/dashboard') {
          console.log(`🏠 [usePageAccess] Redirigiendo desde dashboard a ${roleConfig.home}`);
          navigate(roleConfig.home, { replace: true });
          return;
        }

        // Si está en rutas de registro pero ya está completo, BLOQUEAR y redirigir a su home
        if (REGISTRATION_ROUTES.includes(currentPath)) {
          console.log(`🚫 [usePageAccess] BLOQUEANDO usuario completo en ruta de registro: ${currentPath}`);
          console.log(`🔄 [usePageAccess] Redirigiendo a home del rol: ${roleConfig.home}`);
          navigate(roleConfig.home, { replace: true });
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

// 🛡️ COMPONENTE WRAPPER para rutas con registro completo
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