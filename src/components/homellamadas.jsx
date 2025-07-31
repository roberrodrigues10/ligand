import React from "react";
import { MessageSquare, Star, Home, Phone, Clock, CheckCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "./header";
import { useTranslation } from "react-i18next";
import { ProtectedPage } from './usePageAccess';
import { getUser } from "../utils/auth";
import axios from "../api/axios";
import CallingSystem from './CallingOverlay';
import IncomingCallOverlay from './IncomingCallOverlay';

export default function InterfazCliente() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Estados
  const [user, setUser] = React.useState(null);
  const [existingStory, setExistingStory] = React.useState(null);
  const [loadingStory, setLoadingStory] = React.useState(true);
  const [usuariosActivos, setUsuariosActivos] = React.useState([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [initialLoad, setInitialLoad] = React.useState(true);
  
  // 🔥 ESTADOS DE LLAMADAS - MEJORADO
  const [isCallActive, setIsCallActive] = React.useState(false);
  const [currentCall, setCurrentCall] = React.useState(null);
  const [isReceivingCall, setIsReceivingCall] = React.useState(false);
  const [incomingCall, setIncomingCall] = React.useState(null);
  const [callPollingInterval, setCallPollingInterval] = React.useState(null);
  const [incomingCallPollingInterval, setIncomingCallPollingInterval] = React.useState(null);
  const [incomingCallAudio, setIncomingCallAudio] = React.useState(null);
  const audioRef = React.useRef(null);


  const historial = [
    { nombre: "LeoFlex", accion: t("client.history.callEnded") || "Llamada finalizada", hora: t("client.history.today") + ", 10:45 AM" },
    { nombre: "ValePink", accion: t("client.history.messageSent") || "Mensaje enviado", hora: t("client.history.yesterday") + ", 9:13 PM" },
    { nombre: "Nico21", accion: t("client.history.addedToFavorites") || "Te agregó a favoritos", hora: t("client.history.yesterday") + ", 7:30 PM" },
  ];

  // 🔥 FUNCIÓN PARA OBTENER HEADERS CON TOKEN
 const getAuthHeaders = () => {
  const token = sessionStorage.getItem("token");
  
  // 🔍 DEBUG: Verificar el token
  console.log('🔑 Token completo:', token);
  console.log('🔑 Token length:', token?.length);
  console.log('🔑 Token válido:', token && token !== 'null' && token !== 'undefined');
  
  if (!token || token === 'null' || token === 'undefined') {
    console.error('❌ TOKEN INVÁLIDO - Redirigiendo a login');
    // Opcional: redirigir automáticamente al login
    // window.location.href = '/login';
    return {};
  }
  
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Authorization': `Bearer ${token}`
  };
};

  // 🔥 FUNCIÓN PARA OBTENER INICIAL DEL NOMBRE
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // 🔥 CARGAR USUARIOS ACTIVOS/ONLINE - SIN CAMBIOS
  // 🔥 FUNCIÓN PARA OBTENER USUARIOS ACTIVOS - VERSIÓN CORREGIDA
const cargarUsuariosActivos = async (isBackgroundUpdate = false) => {
  try {
    if (!isBackgroundUpdate) {
      setLoadingUsers(true);
    }
    
    console.log('🔍 Cargando usuarios activos...');
    
    const headers = getAuthHeaders();
    
    // Verificar que tenemos headers válidos
    if (!headers.Authorization) {
      console.error('❌ No hay token válido, saltando carga de usuarios');
      if (initialLoad) {
        await handleFallbackData();
      }
      return;
    }
    
    const response = await fetch('/api/chat/users/my-contacts', {
      method: 'GET',
      headers: headers
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', response.headers.get('content-type'));
    
    // 🔥 VERIFICAR SI LA RESPUESTA ES REALMENTE JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ La respuesta no es JSON:', contentType);
      
      // Leer como texto para debug
      const textResponse = await response.text();
      console.error('❌ Respuesta recibida:', textResponse.substring(0, 200));
      
      // Si es un 401, el token es inválido
      if (response.status === 401) {
        console.error('🚨 TOKEN EXPIRADO - Limpiando sesión');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        // window.location.href = '/login'; // Descomentar para redirigir automáticamente
      }
      
      if (initialLoad) {
        await handleFallbackData();
      }
      return;
    }
    
    if (response.ok) {
      try {
        const data = await response.json();
        console.log('✅ Usuarios activos recibidos:', data);
        
        const usuariosOnline = (data.contacts || []);
        
        setUsuariosActivos(prevUsers => {
          const newUserIds = usuariosOnline.map(u => u.id).sort();
          const prevUserIds = prevUsers.map(u => u.id).sort();
          
          if (JSON.stringify(newUserIds) !== JSON.stringify(prevUserIds)) {
            console.log('📝 Actualizando lista de usuarios activos');
            return usuariosOnline;
          }
          
          return prevUsers.map(prevUser => {
            const updatedUser = usuariosOnline.find(u => u.id === prevUser.id);
            return updatedUser || prevUser;
          });
        });
        
      } catch (jsonError) {
        console.error('❌ Error parseando JSON:', jsonError);
        
        if (initialLoad) {
          await handleFallbackData();
        }
      }
    } else {
      console.error('❌ Error HTTP:', response.status);
      
      // Manejar específicamente el 401
      if (response.status === 401) {
        console.error('🚨 UNAUTHORIZED - Token inválido');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
      
      if (initialLoad) {
        await handleFallbackData();
      }
    }
  } catch (error) {
    console.error('❌ Error cargando usuarios activos:', error);
    if (initialLoad) {
      await handleFallbackData();
    }
  } finally {
    if (!isBackgroundUpdate) {
      setLoadingUsers(false);
    }
    if (initialLoad) {
      setInitialLoad(false);
    }
  }
};
  // Función para manejar datos de fallback - SIN CAMBIOS
  const handleFallbackData = async () => {
    try {
      const conversationsResponse = await fetch('/api/chat/conversations', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        console.log('✅ Usando conversaciones como fuente de usuarios activos');
        
        const uniqueUsers = (conversationsData.conversations || []).map(conv => ({
          id: conv.other_user_id,
          name: conv.other_user_name,
          alias: conv.other_user_name,
          role: conv.other_user_role,
          is_online: Math.random() > 0.3,
          avatar: `https://i.pravatar.cc/40?u=${conv.other_user_id}`,
          last_seen: new Date().toISOString()
        })).filter(u => u.is_online);
        
        setUsuariosActivos(uniqueUsers);
      } else {
        throw new Error('No se pudieron cargar conversaciones');
      }
    } catch (fallbackError) {
      console.log('🔧 Usando datos de ejemplo...');
      const exampleUsers = [
        {
          id: 101,
          name: "Carlos_VIP",
          alias: "Carlos_VIP",
          role: "cliente",
          is_online: true,
          avatar: "https://i.pravatar.cc/40?u=101",
          last_seen: new Date().toISOString()
        },
        {
          id: 102,
          name: "Miguel89",
          alias: "Miguel89", 
          role: "cliente",
          is_online: true,
          avatar: "https://i.pravatar.cc/40?u=102",
          last_seen: new Date().toISOString()
        }
      ];
      
      setUsuariosActivos(exampleUsers);
    }
  };

  // 🔥 FUNCIÓN PARA NAVEGAR A CHAT CON USUARIO ESPECÍFICO - SIN CAMBIOS
  const abrirChatConUsuario = (usuario) => {
    console.log('📩 Abriendo chat con:', usuario.name);
    
    navigate('/mensajes', {
      state: {
        openChatWith: {
          userId: usuario.id,
          userName: usuario.name || usuario.alias,
          userRole: usuario.role
        }
      }
    });
  };

  // 🔥 NUEVA FUNCIÓN: INICIAR LLAMADA CON EL CALLCONTROLLER
  const iniciarLlamadaReal = async (usuario) => {
    try {
      console.log('📞 Iniciando llamada a:', usuario.name);
      
      // Mostrar overlay de llamando
      setCurrentCall({
        ...usuario,
        status: 'initiating'
      });
      setIsCallActive(true);
      
      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/calls/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: usuario.id,
          call_type: 'video'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Llamada iniciada:', data);
        
        // Actualizar estado con datos de la llamada
        setCurrentCall({
          ...usuario,
          callId: data.call_id,
          roomName: data.room_name,
          status: 'calling'
        });
        
        // Iniciar polling para verificar respuesta
        iniciarPollingLlamada(data.call_id);
        
      } else {
        console.error('❌ Error iniciando llamada:', data.error);
        setIsCallActive(false);
        setCurrentCall(null);
        alert(data.error);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      setIsCallActive(false);
      setCurrentCall(null);
      alert('Error al iniciar llamada');
    }
  };

  // 🔥 NUEVA FUNCIÓN: POLLING PARA VERIFICAR ESTADO DE LLAMADA SALIENTE
  const iniciarPollingLlamada = (callId) => {
    console.log('🔄 Iniciando polling para llamada:', callId);
    
    const interval = setInterval(async () => {
      try {
        const token = sessionStorage.getItem('token');
        const response = await fetch('/api/calls/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ call_id: callId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          const callStatus = data.call.status;
          console.log('📊 Estado llamada:', callStatus);
          
          if (callStatus === 'active') {
            // ¡Llamada aceptada! Redirigir al videochat
            console.log('🎉 Llamada aceptada, redirigiendo...');
            clearInterval(interval);
            setCallPollingInterval(null);
            redirigirAVideochat(data.call);
            
          } else if (callStatus === 'rejected') {
            // Llamada rechazada
            console.log('❌ Llamada rechazada');
            clearInterval(interval);
            setCallPollingInterval(null);
            setIsCallActive(false);
            setCurrentCall(null);
            alert('La llamada fue rechazada');
            
          } else if (callStatus === 'cancelled') {
            // Llamada cancelada por timeout
            console.log('🛑 Llamada cancelada por timeout');
            clearInterval(interval);
            setCallPollingInterval(null);
            setIsCallActive(false);
            setCurrentCall(null);
            alert('La llamada expiró sin respuesta');
          }
        }
        
      } catch (error) {
        console.error('❌ Error verificando llamada:', error);
      }
    }, 2000); // Verificar cada 2 segundos
    
    setCallPollingInterval(interval);
    
    // Limpiar después de 35 segundos (timeout de seguridad)
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setCallPollingInterval(null);
        if (isCallActive) {
          setIsCallActive(false);
          setCurrentCall(null);
          alert('Tiempo de espera agotado');
        }
      }
    }, 35000);
  };

  // 🔥 NUEVA FUNCIÓN: CANCELAR LLAMADA SALIENTE
  const cancelarLlamada = async () => {
    try {
      console.log('🛑 Cancelando llamada...');
      
      if (currentCall?.callId) {
        const token = sessionStorage.getItem('token');
        await fetch('/api/calls/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            call_id: currentCall.callId
          })
        });
      }
      
      // Limpiar polling
      if (callPollingInterval) {
        clearInterval(callPollingInterval);
        setCallPollingInterval(null);
      }
      
    } catch (error) {
      console.error('❌ Error cancelando llamada:', error);
    }
    
    setIsCallActive(false);
    setCurrentCall(null);
  };

  
  const verificarLlamadasEntrantes = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/calls/check-incoming', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.has_incoming && data.incoming_call) {
          console.log('📞 Llamada entrante detectada:', data.incoming_call);
          
          // 🔥 VALIDAR QUE NO SEA LA MISMA LLAMADA QUE ESTOY HACIENDO
          const isMyOutgoingCall = currentCall && 
                                  currentCall.callId === data.incoming_call.id;
          
          if (isMyOutgoingCall) {
            console.log('⚠️ Ignorando llamada entrante - es mi propia llamada saliente');
            return;
          }
          
          // Solo mostrar si no hay ya una llamada visible
          if (!isReceivingCall && !isCallActive) {
            console.log('🔊 Reproduciendo sonido de llamada entrante');
            
            // 🔊 REPRODUCIR SONIDO AQUÍ
            playIncomingCallSound();
            
            setIncomingCall(data.incoming_call);
            setIsReceivingCall(true);
          }
        } else if (isReceivingCall && !data.has_incoming) {
          // La llamada ya no está disponible
          console.log('📞 Llamada entrante ya no disponible');
          
          // 🔇 DETENER SONIDO
          stopIncomingCallSound();
          
          setIsReceivingCall(false);
          setIncomingCall(null);
        }
      }
    } catch (error) {
      console.log('⚠️ Error verificando llamadas entrantes:', error);
    }
  };
const playIncomingCallSound = async () => {
  try {
    console.log('🔊 INTENTANDO reproducir sonido...');
    
    // Si ya hay un audio reproduciéndose, no crear otro
    if (audioRef.current) {
      console.log('⚠️ Ya hay audio reproduciéndose');
      return;
    }
    
    // Crear el audio
    const audio = new Audio('/sounds/incoming-call.mp3');
    console.log('📁 Audio creado, archivo:', audio.src);
    
    // Configurar propiedades
    audio.loop = true;
    audio.volume = 0.8;
    audio.preload = 'auto';
    
    // Eventos para debug
    audio.addEventListener('loadstart', () => console.log('🔄 Cargando audio...'));
    audio.addEventListener('canplay', () => console.log('✅ Audio listo para reproducir'));
    audio.addEventListener('play', () => console.log('▶️ Audio iniciado'));
    audio.addEventListener('error', (e) => console.error('❌ Error de audio:', e));
    
    // Guardar referencia
    audioRef.current = audio;
    
    try {
      // Intentar reproducir
      await audio.play();
      console.log('🎵 AUDIO REPRODUCIÉNDOSE CORRECTAMENTE');
    } catch (playError) {
      console.error('❌ Error al reproducir:', playError);
      
      if (playError.name === 'NotAllowedError') {
        console.log('🚫 AUTOPLAY BLOQUEADO - Necesita interacción del usuario');
        
        // Mostrar mensaje al usuario
        alert('⚠️ Para escuchar el sonido de las llamadas, haz clic en cualquier parte de la página');
        
        // Intentar reproducir después de la próxima interacción
        const enableAudio = () => {
          audio.play().then(() => {
            console.log('🎵 Audio habilitado después de interacción');
          }).catch(e => console.log('❌ Aún no se puede reproducir:', e));
          document.removeEventListener('click', enableAudio, { once: true });
        };
        
        document.addEventListener('click', enableAudio, { once: true });
      }
    }
    
  } catch (error) {
    console.error('❌ Error general creando audio:', error);
  }
};

// 🔥 AGREGA ESTE useEffect PARA HABILITAR AUDIO DESDE EL INICIO
React.useEffect(() => {
  console.log('🎵 Configurando sistema de audio...');
  
  // Función para habilitar audio después de primera interacción
  const enableAudioContext = async () => {
    console.log('👆 Primera interacción detectada - habilitando audio');
    
    // Crear y reproducir un audio silencioso para "despertar" el sistema
    try {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAABAABABkAAgAAACAJAAEAAABkYXRhBAAAAAEA');
      silentAudio.volume = 0.01;
      await silentAudio.play();
      console.log('🔓 Sistema de audio desbloqueado');
    } catch (e) {
      console.log('⚠️ No se pudo desbloquear audio:', e);
    }
    
    // Remover listener después de la primera interacción
    document.removeEventListener('click', enableAudioContext);
    document.removeEventListener('touchstart', enableAudioContext);
    document.removeEventListener('keydown', enableAudioContext);
  };
  
  // Escuchar cualquier tipo de interacción
  document.addEventListener('click', enableAudioContext, { once: true });
  document.addEventListener('touchstart', enableAudioContext, { once: true });
  document.addEventListener('keydown', enableAudioContext, { once: true });
  
  return () => {
    document.removeEventListener('click', enableAudioContext);
    document.removeEventListener('touchstart', enableAudioContext);
    document.removeEventListener('keydown', enableAudioContext);
  };
}, []);

// 🔥 TAMBIÉN VERIFICA QUE EL ARCHIVO EXISTA
React.useEffect(() => {
  const testAudioFile = async () => {
    try {
      const response = await fetch('/sounds/incoming-call.mp3');
      if (response.ok) {
        console.log('✅ Archivo de audio encontrado');
      } else {
        console.error('❌ Archivo de audio NO encontrado (404)');
      }
    } catch (error) {
      console.error('❌ Error verificando archivo de audio:', error);
    }
  };
  
  testAudioFile();
}, []);

// 🔥 FUNCIÓN PARA DETENER SONIDO
const stopIncomingCallSound = () => {
  if (audioRef.current) {
    console.log('🔇 Deteniendo sonido de llamada');
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }
};

  // 🔥 NUEVA FUNCIÓN: RESPONDER LLAMADA ENTRANTE
  const responderLlamada = async (accion) => {
  if (!incomingCall) return;
  
  try {
    console.log(`📱 Respondiendo llamada: ${accion}`);
    
    // 🔇 DETENER SONIDO INMEDIATAMENTE
    stopIncomingCallSound();
    
    const token = sessionStorage.getItem('token');
    const response = await fetch('/api/calls/answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        call_id: incomingCall.id,
        action: accion // 'accept' o 'reject'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      if (accion === 'accept') {
        console.log('✅ Llamada aceptada:', data);
        
        // Ocultar overlay de llamada entrante
        setIsReceivingCall(false);
        setIncomingCall(null);
        
        // Redirigir al videochat
        redirigirAVideochat(data);
        
      } else {
        console.log('❌ Llamada rechazada');
        setIsReceivingCall(false);
        setIncomingCall(null);
      }
    } else {
      console.error('❌ Error respondiendo llamada:', data.error);
      setIsReceivingCall(false);
      setIncomingCall(null);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    setIsReceivingCall(false);
    setIncomingCall(null);
  }
  };

  // 🔥 AGREGAR ESTE USEEFFECT PARA LIMPIAR AUDIO AL DESMONTAR
  React.useEffect(() => {
    return () => {
      // Limpiar audio al desmontar el componente
      stopIncomingCallSound();
      
      // Limpiar todos los intervals al desmontar
      if (callPollingInterval) {
        clearInterval(callPollingInterval);
      }
      if (incomingCallPollingInterval) {
        clearInterval(incomingCallPollingInterval);  
      }
    };
  }, []);

  // 🔥 OPCIONAL: Agregar este useEffect para detener audio si cambia la visibilidad de la página
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current) {
        // Página oculta, pausar audio para ahorrar recursos
        audioRef.current.volume = 0.3;
      } else if (!document.hidden && audioRef.current) {
        // Página visible, restaurar volumen
        audioRef.current.volume = 0.8;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 🔥 NUEVA FUNCIÓN: REDIRIGIR AL VIDEOCHAT
  const redirigirAVideochat = (callData) => {
    console.log('🚀 Redirigiendo a videochat:', callData);
    
    // Guardar datos de la llamada
    sessionStorage.setItem('roomName', callData.room_name);
    sessionStorage.setItem('userName', user?.name || 'Usuario');
    sessionStorage.setItem('currentRoom', callData.room_name);
    sessionStorage.setItem('inCall', 'true');
    sessionStorage.setItem('videochatActive', 'true');
    
    // Limpiar estados de llamada
    setIsCallActive(false);
    setCurrentCall(null);
    setIsReceivingCall(false);
    setIncomingCall(null);
    
    // Limpiar intervals
    if (callPollingInterval) {
      clearInterval(callPollingInterval);
      setCallPollingInterval(null);
    }
    
    // Redirigir según el rol del usuario
    const targetRoute = user?.rol === 'modelo' ? '/videochat' : '/videochatclient';
    navigate(targetRoute, {
      state: {
        roomName: callData.room_name,
        userName: user?.name || 'Usuario',
        callId: callData.call_id || callData.id,
        from: 'call',
        callData: callData
      }
    });
  };

  // 🔥 USEEFFECTS EXISTENTES - SIN CAMBIOS
  React.useEffect(() => {
    if (!user?.id) return;

    cargarUsuariosActivos(false);

    const interval = setInterval(() => {
      cargarUsuariosActivos(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUser();
        setUser(userData);
      } catch (err) {
        console.error("Error al obtener usuario:", err);
      }
    };
    fetchUser();
  }, []);

  React.useEffect(() => {
    checkExistingStory();
  }, []);

  // 🔥 NUEVO USEEFFECT: POLLING PARA LLAMADAS ENTRANTES
  React.useEffect(() => {
  if (!user?.id) return;

  console.log('🔔 Iniciando monitoreo de llamadas entrantes');
  
  // Solo verificar llamadas entrantes si NO hay llamada saliente activa
  if (!isCallActive) {
    verificarLlamadasEntrantes();
    
    // Configurar polling cada 3 segundos
    const interval = setInterval(() => {
      // Solo hacer polling si no hay llamada saliente
      if (!isCallActive) {
        verificarLlamadasEntrantes();
      }
    }, 3000);
    
    setIncomingCallPollingInterval(interval);

    return () => {
      console.log('🔔 Deteniendo monitoreo de llamadas entrantes');
      if (interval) {
        clearInterval(interval);
      }
    };
  }
  }, [user?.id, isCallActive]); // Agregar isCallActive como dependencia

  // 🔥 CLEANUP AL DESMONTAR COMPONENTE
  React.useEffect(() => {
    return () => {
      // Limpiar todos los intervals al desmontar
      if (callPollingInterval) {
        clearInterval(callPollingInterval);
      }
      if (incomingCallPollingInterval) {
        clearInterval(incomingCallPollingInterval);  
      }
    };
  }, []);

  const checkExistingStory = async () => {
    try {
      setLoadingStory(true);
      
      const token = sessionStorage.getItem('token');
      
      if (!token || token === 'null' || token === 'undefined') {
        console.warn('❌ Token inválido o no encontrado');
        return;
      }
      
      const config = {
        skipInterceptor: true,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false,
      };
      
      const response = await axios.get("/api/stories/my-story", config);
      
      if (response.data) {
        setExistingStory(response.data);
      }
    } catch (error) {
      console.error('❌ Error al verificar historia existente:', error);
      if (error.response?.status !== 404) {
        console.error('Error inesperado:', error.response?.data);
      }
    } finally {
      setLoadingStory(false);
    }
  };

  // Función para determinar el texto y estado del botón de historia - SIN CAMBIOS
  const getStoryButtonInfo = () => {
    if (loadingStory) {
      return {
        text: t("client.loading") || "Cargando...",
        icon: null,
        disabled: true,
        className: "w-full bg-gray-500 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-md opacity-50 cursor-not-allowed"
      };
    }

    if (!existingStory) {
      return {
        text: t("client.uploadStory") || "Subir Historia",
        icon: null,
        disabled: false,
        className: "w-full bg-[#ffb6d2] text-[#4b2e35] px-8 py-4 rounded-full text-lg font-semibold shadow-md hover:bg-[#ff9fcb] transition"
      };
    }

    const isPending = existingStory.status === 'pending';
    const isApproved = existingStory.status === 'approved';
    const isRejected = existingStory.status === 'rejected';

    if (isPending) {
      return {
        text: t("client.storyPending") || "Historia Pendiente por Aprobación",
        icon: <Clock size={20} className="text-yellow-500" />,
        disabled: false,
        className: "w-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 px-8 py-4 rounded-full text-lg font-semibold shadow-md hover:bg-yellow-500/30 transition"
      };
    }

    if (isApproved) {
      return {
        text: t("client.viewApprovedStory") || "Ver Tu Historia Aprobada",
        icon: <CheckCircle size={20} className="text-green-500" />,
        disabled: false,
        className: "w-full bg-green-500/20 border border-green-500/50 text-green-300 px-8 py-4 rounded-full text-lg font-semibold shadow-md hover:bg-green-500/30 transition"
      };
    }

    if (isRejected) {
      return {
        text: t("client.storyRejected") || "Historia Rechazada - Crear Nueva",
        icon: null,
        disabled: false,
        className: "w-full bg-red-500/20 border border-red-500/50 text-red-300 px-8 py-4 rounded-full text-lg font-semibold shadow-md hover:bg-red-500/30 transition"
      };
    }

    return {
      text: t("client.uploadStory") || "Subir Historia",
      icon: null,
      disabled: false,
      className: "w-full bg-[#ffb6d2] text-[#4b2e35] px-8 py-4 rounded-full text-lg font-semibold shadow-md hover:bg-[#ff9fcb] transition"
    };
  };

  const storyButtonInfo = getStoryButtonInfo();

  return (
    <ProtectedPage requiredConditions={{
      emailVerified: true,
      profileComplete: true,
      role: "modelo",
      verificationStatus: "aprobada",
      blockIfInCall: true
    }}>
      <div className="min-h-screen bg-ligand-mix-dark from-[#1a1c20] to-[#2b2d31] text-white p-6">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Panel central - SIN CAMBIOS */}
          <main className="lg:col-span-3 bg-[#1f2125] rounded-2xl p-8 shadow-xl flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 mt-16">
              {t("client.greeting", { name: user?.name || t("client.defaultUser") || "Usuario" })}
            </h2>
            <p className="text-center text-white/70 mb-8 max-w-md">
              {t("client.instructions") || "Gestiona tu perfil, conecta con clientes y ofrece tus servicios de manera profesional."}
            </p>

            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <button
                className="w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-8 py-4 rounded-full text-lg font-semibold shadow-md transition-all duration-200 transform hover:scale-105"
                onClick={() => navigate("/esperandocall")}
              >
                {t("client.startCall") || "Iniciar Llamada"}
              </button>

              <button
                className={storyButtonInfo.className}
                onClick={() => navigate("/historysu")}
                disabled={storyButtonInfo.disabled}
              >
                <div className="flex items-center justify-center gap-2">
                  {storyButtonInfo.icon}
                  <span>{storyButtonInfo.text}</span>
                </div>
              </button>

              <div className="w-full bg-[#2b2d31] border border-[#ff007a]/30 rounded-xl p-4 text-center mt-2">
                <p className="text-white text-sm mb-1 font-semibold">
                  🌟 {t("client.tipTitle") || "Consejo Profesional"}
                </p>
                <p className="text-white/70 text-sm italic">
                  {t("client.tipText") || "Mantén tu perfil actualizado y responde rápidamente a los mensajes para aumentar tus oportunidades."}
                </p>
              </div>
            </div>
          </main>

          {/* Panel lateral - SIN CAMBIOS HASTA LOS BOTONES */}
          <aside className="flex flex-col gap-2 h-[82vh] overflow-y-auto">
            <section className="bg-[#2b2d31] rounded-2xl p-5 shadow-lg h-1/2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#ff007a]">
                  {t("client.activeUsers") || "Usuarios Activos"}
                </h3>
                {usuariosActivos.length > 0 && (
                  <span className="text-xs text-white/50 bg-[#ff007a]/20 px-2 py-1 rounded-full">
                    {usuariosActivos.length}
                  </span>
                )}
              </div>
              
              {loadingUsers && initialLoad ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#ff007a] border-t-transparent"></div>
                  <span className="ml-3 text-sm text-white/60">
                    {t("client.loadingUsers") || "Cargando usuarios..."}
                  </span>
                </div>
              ) : (
                <div className="space-y-3 h-[calc(100%-4rem)] overflow-y-auto pr-2">
                  <style>
                    {`
                      .space-y-3::-webkit-scrollbar {
                        width: 4px;
                      }
                      .space-y-3::-webkit-scrollbar-track {
                        background: #2b2d31;
                        border-radius: 2px;
                      }
                      .space-y-3::-webkit-scrollbar-thumb {
                        background: #ff007a;
                        border-radius: 2px;
                      }
                      .space-y-3::-webkit-scrollbar-thumb:hover {
                        background: #cc0062;
                      }
                    `}
                  </style>
                  
                  {usuariosActivos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <Users size={32} className="text-white/20 mb-3" />
                      <p className="text-sm text-white/60 font-medium">
                        {t("client.noActiveUsers") || "No hay usuarios activos"}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {t("client.contactsWillAppear") || "Tus contactos aparecerán aquí cuando estén en línea"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {usuariosActivos.map((usuario, index) => (
                        <div
                          key={usuario.id}
                          className="flex items-center justify-between bg-[#1f2125] p-3 rounded-xl hover:bg-[#25282c] transition-all duration-200 animate-fadeIn"
                          style={{
                            animationDelay: `${index * 50}ms`
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#ff007a] flex items-center justify-center font-bold text-sm relative">
                              {getInitial(usuario.name || usuario.alias)}
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2b2d31] animate-pulse"></div>
                            </div>
                            <div>
                              <div className="font-semibold text-sm">
                                {usuario.name || usuario.alias}
                              </div>
                              <div className="text-xs text-green-400">
                                {t("client.status.home.online") || "En línea"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => iniciarLlamadaReal(usuario)}
                              disabled={isCallActive || isReceivingCall}
                              className={`p-2 rounded-full transition-colors duration-200 ${
                                isCallActive || isReceivingCall 
                                  ? 'bg-gray-500/20 cursor-not-allowed' 
                                  : 'hover:bg-[#ff007a]/20'
                              }`}
                              title={
                                isCallActive || isReceivingCall 
                                  ? "Llamada en curso" 
                                  : (t("client.call") || "Llamar")
                              }
                            >
                              <Phone 
                                size={16} 
                                className={`${
                                  isCallActive || isReceivingCall 
                                    ? 'text-gray-500' 
                                    : 'text-[#ff007a] hover:text-white'
                                } transition-colors`} 
                              />
                            </button>
                            <button
                              onClick={() => abrirChatConUsuario(usuario)}
                              className="p-2 rounded-full hover:bg-gray-500/20 transition-colors duration-200"
                              title={t("client.message") || "Mensaje"}
                            >
                              <MessageSquare size={16} className="text-gray-400 hover:text-white transition-colors" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Historial mejorado - SIN CAMBIOS */}
            <section className="bg-[#2b2d31] rounded-2xl p-5 shadow-lg h-1/2">
              <h3 className="text-lg font-bold text-[#ff007a] mb-4 text-center">
                {t("client.yourHistory") || "Tu Historial"}
              </h3>
              <div className="space-y-3 h-[calc(100%-4rem)] overflow-y-auto pr-2">
                {historial.map((item, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-start bg-[#1f2125] p-3 rounded-xl hover:bg-[#25282c] transition-colors duration-200"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-9 h-9 bg-pink-400 text-[#1a1c20] font-bold rounded-full flex items-center justify-center text-sm">
                        {item.nombre.charAt(0)}
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">{item.nombre}</p>
                        <p className="text-white/60 text-xs">{item.accion}</p>
                      </div>
                    </div>
                    <div className="text-right text-white/40 text-xs">{item.hora}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {/* Estilos adicionales para animaciones */}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `}</style>
      </div>

      {/* 🔥 OVERLAY PARA LLAMADAS SALIENTES */}
      <CallingSystem
        isVisible={isCallActive}
        callerName={currentCall?.name || currentCall?.alias}
        callerAvatar={currentCall?.avatar}
        onCancel={cancelarLlamada}
        callStatus={currentCall?.status || 'initiating'}
      />

      {/* 🔥 OVERLAY PARA LLAMADAS ENTRANTES */}
      <IncomingCallOverlay
        isVisible={isReceivingCall}
        callData={incomingCall}
        onAnswer={() => responderLlamada('accept')}
        onDecline={() => responderLlamada('reject')}
      />
    </ProtectedPage>
  );
}