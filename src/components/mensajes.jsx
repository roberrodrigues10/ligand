import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation  } from "react-router-dom";
import Header from "./header";
import { getUser } from "../utils/auth";

import {
  useTranslation as useCustomTranslation,
  TranslationSettings,
  TranslatedMessage
} from '../utils/translationSystem.jsx';

import {
  MessageSquare,
  Home,
  Star,
  MoreVertical,
  Pencil,
  Ban,
  Languages,
  Gift,
  Heart,
  Send,
  Users,
  Search,
  Video,
  Phone,
  Settings,
  Globe,
  ArrowRight,
  Circle,
  X,
  ChevronDown,
  Bell
} from "lucide-react";
// 🔥 AGREGAR ESTAS IMPORTACIONES
import CallingSystem from './CallingOverlay';
import IncomingCallOverlay from './IncomingCallOverlay';

// 🔥 AGREGAR API_BASE_URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ChatPrivado() {
  const { settings: translationSettings, setSettings: setTranslationSettings, languages } = useCustomTranslation();
  const location = useLocation(); // ← Agregar esto
 // 🔥 NUEVOS ESTADOS PARA LLAMADAS Y FAVORITOS
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callPollingInterval, setCallPollingInterval] = useState(null);
  const [favoritos, setFavoritos] = useState(new Set());
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  // 🔥 NUEVOS ESTADOS PARA SISTEMA DE BLOQUEO
  const [usuariosBloqueados, setUsuariosBloqueados] = useState(new Set());
  const [bloqueadoPor, setBloqueadoPor] = useState(new Set());
  const [loadingBlock, setLoadingBlock] = useState(false);
  const [conversacionBloqueada, setConversacionBloqueada] = useState(null); // 'yo_bloquee', 'me_bloquearon', 'mutuo', null
  const audioRef = useRef(null);
  // 🔥 RECIBIR PARÁMETROS DE NAVEGACIÓN
  const openChatWith = location.state?.openChatWith;
  const hasOpenedSpecificChat = useRef(false); // ← Agregar esto
  // 🔧 Función t local para traducciones básicas
  const t = (key) => {
    const translations = {
      'translation.title': 'Traducción',
      'translation.translationActive': 'Traducción activa',
      'translation.translationInactive': 'Traducción inactiva',
      'chat.typeMessage': 'Escribe un mensaje...',
      'chat.send': 'Enviar',
      'settings.title': 'Configuración',
      'status.online': 'En línea',
      'status.offline': 'Desconectado'
    };
    return translations[key] || key;
  };
  
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionActiva, setConversacionActiva] = useState(null);
  const [usuario, setUsuario] = useState({
    id: null,
    name: "Usuario",
    rol: "cliente"
  });
  const [loading, setLoading] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [busquedaConversacion, setBusquedaConversacion] = useState("");
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [showMainSettings, setShowMainSettings] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set([2, 3])); // Mock de usuarios online
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // 🔔 SISTEMA DE NOTIFICACIONES GLOBALES MEJORADO
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);
  const [showGlobalNotification, setShowGlobalNotification] = useState(false);
  const [lastSeenMessages, setLastSeenMessages] = useState({}); // Timestamp de última vez visto cada chat
  const [previousConversations, setPreviousConversations] = useState([]);
  
  // 📜 SCROLL MEJORADO
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollTimeoutRef = useRef(null);
  
  const mensajesRef = useRef(null);
  const globalPollingInterval = useRef(null);
  const navigate = useNavigate();

  // 🔥 FUNCIÓN PARA OBTENER HEADERS CON TU TOKEN
  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("token");
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };
  // 🔥 FUNCIÓN PARA INICIAR LLAMADA REAL
  const iniciarLlamadaReal = async (otherUserId, otherUserName) => {
    try {
      console.log('📞 Iniciando llamada a:', otherUserName);
      
      setCurrentCall({
        id: otherUserId,
        name: otherUserName,
        status: 'initiating'
      });
      setIsCallActive(true);
      
      const response = await fetch(`${API_BASE_URL}/api/calls/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          receiver_id: otherUserId,
          call_type: 'video'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Llamada iniciada:', data);
        setCurrentCall({
          id: otherUserId,
          name: otherUserName,
          callId: data.call_id,
          roomName: data.room_name,
          status: 'calling'
        });
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

  // 🔥 POLLING PARA VERIFICAR ESTADO DE LLAMADA
  const iniciarPollingLlamada = (callId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/calls/status`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ call_id: callId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          const callStatus = data.call.status;
          
          if (callStatus === 'active') {
            clearInterval(interval);
            setCallPollingInterval(null);
            redirigirAVideochat(data.call);
          } else if (callStatus === 'rejected') {
            clearInterval(interval);
            setCallPollingInterval(null);
            setIsCallActive(false);
            setCurrentCall(null);
            alert('La llamada fue rechazada');
          } else if (callStatus === 'cancelled') {
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
    }, 2000);
    
    setCallPollingInterval(interval);
  };

  // 🔥 CANCELAR LLAMADA
  const cancelarLlamada = async () => {
    try {
      if (currentCall?.callId) {
        await fetch(`${API_BASE_URL}/api/calls/cancel`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ call_id: currentCall.callId })
        });
      }
      
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

  // 🔥 REDIRIGIR AL VIDEOCHAT
  const redirigirAVideochat = (callData) => {
    sessionStorage.setItem('roomName', callData.room_name);
    sessionStorage.setItem('userName', usuario.name || 'Usuario');
    sessionStorage.setItem('currentRoom', callData.room_name);
    sessionStorage.setItem('inCall', 'true');
    
    setIsCallActive(false);
    setCurrentCall(null);
    
    if (callPollingInterval) {
      clearInterval(callPollingInterval);
      setCallPollingInterval(null);
    }
    
    const targetRoute = usuario.rol === 'modelo' ? '/videochat' : '/videochatclient';
    navigate(targetRoute, {
      state: {
        roomName: callData.room_name,
        userName: usuario.name || 'Usuario',
        callId: callData.call_id || callData.id,
        from: 'call'
      }
    });
  };

  // 🔥 CARGAR FAVORITOS
  const cargarFavoritos = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/list`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const favoritosIds = new Set((data.favorites || []).map(fav => fav.id));
          setFavoritos(favoritosIds);
        }
      }
    } catch (error) {
      console.error('❌ Error cargando favoritos:', error);
    }
  };

  // 🔥 TOGGLE FAVORITO
  const toggleFavorito = async (otherUserId, otherUserName) => {
    if (loadingFavorite) return;
    
    const isFavorite = favoritos.has(otherUserId);
    
    try {
      setLoadingFavorite(true);
      
      const endpoint = isFavorite ? 'remove' : 'add';
      const response = await fetch(`${API_BASE_URL}/api/favorites/${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          favorite_user_id: otherUserId,
          note: isFavorite ? undefined : `Agregado desde chat con ${otherUserName}`
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newFavoritos = new Set(favoritos);
        if (isFavorite) {
          newFavoritos.delete(otherUserId);
        } else {
          newFavoritos.add(otherUserId);
        }
        setFavoritos(newFavoritos);
      }
    } catch (error) {
      console.error('❌ Error toggle favorito:', error);
    } finally {
      setLoadingFavorite(false);
    }
  };
  // 🔥 FUNCIÓN PARA CARGAR ESTADO DE BLOQUEOS
  const cargarEstadoBloqueos = async () => {
  try {
    console.log('🔍 Cargando estado completo de bloqueos...');
    
    const response = await fetch(`${API_BASE_URL}/api/block-status`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Usuarios que YO he bloqueado
        const bloqueadosIds = new Set(
          (data.my_blocked_users || []).map(user => user.id)
        );
        setUsuariosBloqueados(bloqueadosIds);
        
        // Usuarios que ME han bloqueado
        const bloqueadoresIds = new Set(
          (data.blocked_by_users || []).map(user => user.id)
        );
        setBloqueadoPor(bloqueadoresIds);
        
        console.log('✅ Estado bloqueos cargado:', {
          yoBloquee: Array.from(bloqueadosIds),
          meBloquearon: Array.from(bloqueadoresIds)
        });
        
        // Si hay conversación activa, actualizar su estado
        if (conversacionActiva) {
          const conversacionSeleccionada = conversaciones.find(c => c.room_name === conversacionActiva);
          if (conversacionSeleccionada) {
            const estadoBloqueo = verificarBloqueoConversacion(conversacionSeleccionada.other_user_id);
            setConversacionBloqueada(estadoBloqueo);
          }
        }
      }
    } else {
      console.error('❌ Error cargando estado bloqueos:', response.status);
    }
  } catch (error) {
    console.error('❌ Error cargando estado bloqueos:', error);
  }
  };
  // 🔥 FUNCIÓN PARA VERIFICAR SI UN USUARIO ESPECÍFICO ME BLOQUEÓ
  const verificarSiMeBloqueó = async (otherUserId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/check-if-blocked-by`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: otherUserId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.is_blocked_by_them) {
          console.log('🚫 Confirmado: este usuario me bloqueó');
          
          // Actualizar estado local
          const newBloqueadoPor = new Set(bloqueadoPor);
          newBloqueadoPor.add(otherUserId);
          setBloqueadoPor(newBloqueadoPor);
          
          // Actualizar estado de conversación
          const estadoBloqueo = verificarBloqueoConversacion(otherUserId);
          setConversacionBloqueada(estadoBloqueo);
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ Error verificando si me bloqueó:', error);
      return false;
    }
  };

  // 🔥 FUNCIÓN PARA VERIFICAR ESTADO DE BLOQUEO DE CONVERSACIÓN ACTUAL
  const verificarBloqueoConversacion = (otherUserId) => {
    if (!otherUserId) return null;
    
    const yoBloquee = usuariosBloqueados.has(otherUserId);
    const meBloquearon = bloqueadoPor.has(otherUserId);
    
    if (yoBloquee && meBloquearon) return 'mutuo';
    if (yoBloquee) return 'yo_bloquee';
    if (meBloquearon) return 'me_bloquearon';
    return null;
  };

  // 🔥 FUNCIÓN MEJORADA CON MEJOR MANEJO DE ERRORES
const toggleBloquearUsuario = async (otherUserId, otherUserName) => {
  if (loadingBlock) return;
  
  const isBlocked = usuariosBloqueados.has(otherUserId);
  let motivo = null;
  
  if (!isBlocked) {
    motivo = prompt(`¿Por qué quieres bloquear a ${otherUserName}?`, 'Comportamiento inapropiado');
    if (motivo === null) return;
  }
  
  try {
    setLoadingBlock(true);
    
    const endpoint = isBlocked ? 'unblock-user' : 'block-user';
    const requestBody = {
      blocked_user_id: otherUserId
    };
    
    if (!isBlocked && motivo) {
      requestBody.reason = motivo;
    }
    
    console.log('🔍 Enviando solicitud:', {
      endpoint: `${API_BASE_URL}/api/blocks/${endpoint}`,
      body: requestBody,
      headers: getAuthHeaders()
    });
    
    const response = await fetch(`${API_BASE_URL}/api/blocks/${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 Respuesta status:', response.status);
    
    // 🔥 LEER LA RESPUESTA COMPLETA PARA DEBUG
    const responseText = await response.text();
    console.log('📝 Respuesta completa:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError);
      console.error('📄 Texto de respuesta:', responseText);
      alert('Error del servidor: Respuesta no válida');
      return;
    }
    
    if (response.ok && data.success) {
      const newBloqueados = new Set(usuariosBloqueados);
      
      if (isBlocked) {
        newBloqueados.delete(otherUserId);
        console.log(`✅ ${otherUserName} desbloqueado`);
        alert(`${otherUserName} ha sido desbloqueado`);
      } else {
        newBloqueados.add(otherUserId);
        console.log(`🚫 ${otherUserName} bloqueado`);
        alert(`${otherUserName} ha sido bloqueado`);
        
        if (favoritos.has(otherUserId)) {
          const newFavoritos = new Set(favoritos);
          newFavoritos.delete(otherUserId);
          setFavoritos(newFavoritos);
        }
      }
      
      setUsuariosBloqueados(newBloqueados);
      
      if (conversacionActiva) {
        const conversacionSeleccionada = conversaciones.find(c => c.room_name === conversacionActiva);
        if (conversacionSeleccionada?.other_user_id === otherUserId) {
          const nuevoEstadoBloqueo = verificarBloqueoConversacion(otherUserId);
          setConversacionBloqueada(nuevoEstadoBloqueo);
        }
      }
      
    } else {
      console.error('❌ Error del servidor:', {
        status: response.status,
        data: data,
        error: data?.error || 'Error desconocido'
      });
      alert('Error: ' + (data?.error || `Error ${response.status}: ${responseText}`));
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    alert('Error de conexión: ' + error.message);
  } finally {
    setLoadingBlock(false);
  }
};

  // 🔥 FUNCIÓN PARA OBTENER INICIAL DEL NOMBRE
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // 🌍 FUNCIÓN PARA TRADUCIR PREVIEW DE MENSAJES EN LA LISTA
  const getTranslatedPreview = async (message) => {
    if (!translationSettings?.enabled || !message) return message;
    
    try {
      // Si tienes tu función de traducción disponible, úsala aquí
      // Por ahora, retornamos el mensaje original
      return message;
    } catch (error) {
      return message;
    }
  };

  // 🔧 DEBUG: Hook de traducción
  useEffect(() => {
    console.log('🔍 Hook traducción inicializado:', {
      t: typeof t,
      translationSettings,
      languages: Object.keys(languages || {}),
      TranslatedMessage: typeof TranslatedMessage
    });
  }, [translationSettings, languages]);

  // 📱 DETECTAR MÓVIL
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setShowSidebar(true); // En móvil mostrar sidebar por defecto
      } else {
        setShowSidebar(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🔔 CARGAR TIMESTAMPS DE ÚLTIMA VEZ VISTO DESDE LOCALSTORAGE
  useEffect(() => {
    const savedLastSeen = JSON.parse(localStorage.getItem('chatLastSeen') || '{}');
    setLastSeenMessages(savedLastSeen);
    console.log('📍 Cargados timestamps desde localStorage:', savedLastSeen);
  }, []);

  // 💾 GUARDAR TIMESTAMPS EN LOCALSTORAGE
  const updateLastSeen = (roomName) => {
    const now = Date.now();
    const newLastSeen = { ...lastSeenMessages, [roomName]: now };
    setLastSeenMessages(newLastSeen);
    localStorage.setItem('chatLastSeen', JSON.stringify(newLastSeen));
    console.log(`📍 Actualizado lastSeen para ${roomName}:`, new Date(now));
  };

  // 🔔 CALCULAR MENSAJES NO LEÍDOS REALES MEJORADO
  const calculateUnreadCount = (conversacion) => {
    const lastSeen = lastSeenMessages[conversacion.room_name] || 0;
    
    // NO mostrar contador si es la conversación activa (ya la estás viendo)
    if (conversacion.room_name === conversacionActiva) {
      return 0;
    }
    
    // Si no hay mensajes cargados para esta conversación, usar el último mensaje de la conversación
    const lastMessageTime = new Date(conversacion.last_message_time).getTime();
    
    // Si hay mensajes cargados para esta conversación específica, contar los reales
    if (conversacion.room_name === conversacionActiva && mensajes.length > 0) {
      // Contar mensajes no leídos reales desde la última vez visto
      const unreadMessages = mensajes.filter(msg => {
        const messageTime = new Date(msg.created_at).getTime();
        return messageTime > lastSeen && msg.user_id !== usuario.id;
      });
      return unreadMessages.length;
    } else {
      // Para conversaciones no activas, usar el unread_count del servidor o calcular básico
      if (conversacion.unread_count && conversacion.unread_count > 0) {
        return conversacion.unread_count;
      }
      
      // Fallback: si el último mensaje es después de la última vez visto Y no es del usuario actual
      if (lastMessageTime > lastSeen && conversacion.last_message_sender_id !== usuario.id) {
        return 1;
      }
    }
    
    return 0;
  };

  // 🔔 CALCULAR CONTEO GLOBAL TOTAL
  const calculateGlobalUnreadCount = () => {
    return conversaciones.reduce((total, conv) => {
      return total + calculateUnreadCount(conv);
    }, 0);
  };

  // 📜 DETECTAR SCROLL DEL USUARIO MEJORADO
  const handleScroll = () => {
    if (!mensajesRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = mensajesRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // Si el usuario está cerca del final, permitir auto-scroll
    setShouldAutoScroll(isNearBottom);
    
    // Detectar si el usuario está haciendo scroll manual
    if (!isNearBottom) {
      setIsUserScrolling(true);
      
      // Resetear después de 3 segundos de inactividad
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 3000);
    } else {
      setIsUserScrolling(false);
    }
  };

  // 🌍 POLLING GLOBAL DE CONVERSACIONES MEJORADO
  useEffect(() => {
    if (!usuario.id) return;

    const startGlobalPolling = () => {
      globalPollingInterval.current = setInterval(async () => {
        try {
          console.log('🔄 Polling global de conversaciones...');
          
          // 🔥 CAMBIO: Agregar API_BASE_URL
          const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
            method: 'GET',
            headers: getAuthHeaders()
          });
          
          if (response.ok) {
            const data = await response.json();
            const newConversations = data.conversations || [];
            
            // Calcular conteo global DESPUÉS de tener las conversaciones actualizadas
            let totalUnread = 0;
            let hasNewMessages = false;
            
            newConversations.forEach(newConv => {
              const unreadCount = calculateUnreadCount(newConv);
              totalUnread += unreadCount;
              
              // Detectar si hay mensajes realmente nuevos comparando con estado anterior
              const oldConv = previousConversations.find(old => old.room_name === newConv.room_name);
              if (oldConv) {
                const oldTime = new Date(oldConv.last_message_time).getTime();
                const newTime = new Date(newConv.last_message_time).getTime();
                
                if (newTime > oldTime && newConv.last_message !== oldConv.last_message && unreadCount > 0) {
                  hasNewMessages = true;
                  console.log(`📩 Nuevo mensaje en ${newConv.other_user_name}: ${newConv.last_message}`);
                }
              }
            });
            
            // Actualizar conteo global
            setGlobalUnreadCount(totalUnread);
            
            // Mostrar notificación solo si hay mensajes REALMENTE nuevos
            if (hasNewMessages && totalUnread > 0) {
              setShowGlobalNotification(true);
              
              // Auto-ocultar después de 4 segundos
              setTimeout(() => {
                setShowGlobalNotification(false);
              }, 4000);
            }
            
            // Actualizar conversaciones y guardar como anterior
            setConversaciones(newConversations);
            setPreviousConversations(newConversations);
            
          }
        } catch (error) {
          console.error('❌ Error en polling global:', error);
        }
      }, 5000); // Cada 5 segundos
    };

    startGlobalPolling();

    return () => {
      if (globalPollingInterval.current) {
        clearInterval(globalPollingInterval.current);
        console.log('🛑 Polling global detenido');
      }
    };
  }, [usuario.id, previousConversations, lastSeenMessages, conversacionActiva]);

  // 🔔 ACTUALIZAR CONTEO GLOBAL CUANDO CAMBIEN LAS CONVERSACIONES
  useEffect(() => {
    const totalUnread = calculateGlobalUnreadCount();
    setGlobalUnreadCount(totalUnread);
    console.log('📊 Conteo global actualizado:', totalUnread);
  }, [conversaciones, lastSeenMessages, conversacionActiva]);

  // Cargar datos del usuario usando tu sistema de auth
  useEffect(() => {
    cargarDatosUsuario();
  }, []);

  // Cargar conversaciones cuando se tenga el usuario
  useEffect(() => {
    if (usuario.id) {
      cargarConversaciones();
      cargarFavoritos();
      cargarEstadoBloqueos();

    }
  }, [usuario.id]);

  // Auto-scroll MEJORADO - SIEMPRE al final al abrir conversación, luego inteligente
  useEffect(() => {
    if (mensajesRef.current) {
      // SIEMPRE scroll al final cuando cambian los mensajes
      if (shouldAutoScroll && !isUserScrolling) {
        mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
      }
    }
  }, [mensajes, shouldAutoScroll, isUserScrolling]);

  // Polling de mensajes si hay conversación activa
  useEffect(() => {
    let interval;
    if (conversacionActiva) {
      interval = setInterval(() => {
        cargarMensajes(conversacionActiva);
      }, 3000); // Cada 3 segundos
    }
    return () => clearInterval(interval);
  }, [conversacionActiva]);

  // 🔥 SIMULACIÓN DE USUARIOS ONLINE (en producción esto vendría del servidor)
  useEffect(() => {
  const cargarUsuariosOnline = async () => {
    try {
      // 🔥 CAMBIO: Agregar API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/api/chat/users/my-contacts`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        const usuariosOnlineIds = new Set(
          (data.contacts || []).map(contact => contact.id)
        );
        setOnlineUsers(usuariosOnlineIds);
        console.log('🟢 Usuarios online actualizados:', Array.from(usuariosOnlineIds));
      }
    } catch (error) {
      console.error('❌ Error cargando usuarios online:', error);
    }
  };

  if (usuario.id) {
    // Cargar inicial
    cargarUsuariosOnline();
    
    // Actualizar cada 15 segundos
    const interval = setInterval(cargarUsuariosOnline, 15000);
    return () => clearInterval(interval);
  }
  }, [usuario.id]);


  const cargarDatosUsuario = async () => {
    try {
      console.log('🔍 Cargando perfil usando tu sistema de auth...');
      console.log('🔑 Token disponible:', sessionStorage.getItem("token") ? 'SÍ' : 'NO');
      
      // 🔥 USAR TU FUNCIÓN getUser EXISTENTE
      const userData = await getUser();
      
      console.log('✅ Datos de usuario recibidos:', userData);
      setUsuario({
        id: userData.id,
        name: userData.name || userData.alias || `Usuario_${userData.id}`,
        rol: userData.rol
      });
      
    } catch (error) {
      console.error('❌ Error cargando datos usuario:', error);
      
      // Si es error de autenticación, usar datos de prueba
      if (error.response?.status === 401) {
        console.log('🔧 Error de autenticación, usando datos de prueba...');
        setUsuario({
          id: 1,
          name: "Usuario Demo",
          rol: "cliente"
        });
      }
    }
  };

  const cargarConversaciones = async () => {
    try {
      setLoading(true);
      console.log('🔍 Cargando conversaciones...');
      
      // 🔥 CAMBIO: Agregar API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      console.log('📡 Respuesta conversaciones:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversaciones recibidas:', data);
        const newConversations = data.conversations || [];
        setConversaciones(newConversations);
        setPreviousConversations(newConversations); // Inicializar estado anterior
      } else if (response.status === 401) {
        console.error('❌ Token inválido para conversaciones');
        // Intentar refrescar el usuario o redirigir al login
      } else {
        console.error('❌ Error cargando conversaciones:', response.status);
        const errorText = await response.text();
        console.error('Detalles:', errorText);
      }
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      // Datos de ejemplo para desarrollo
      console.log('🔧 Usando datos de ejemplo...');
      const exampleConversations = [
        {
          id: 1,
          other_user_id: 2,
          other_user_name: "SofiSweet",
          other_user_role: "modelo",
          room_name: "chat_user_1_2",
          last_message: "¡Hola! ¿Cómo estás?",
          last_message_time: "2024-01-15T14:30:00Z",
          last_message_sender_id: 2, // ID del que envió el último mensaje
          unread_count: 3, // Ejemplo: 3 mensajes sin leer
          session_date: "2024-01-15T13:45:00Z",
          avatar: "https://i.pravatar.cc/40?u=2"
        },
        {
          id: 2,
          other_user_id: 3,
          other_user_name: "Mia88",
          other_user_role: "modelo", 
          room_name: "chat_user_1_3",
          last_message: "Gracias por la sesión 😘",
          last_message_time: "2024-01-15T12:15:00Z",
          last_message_sender_id: 3, // ID del que envió el último mensaje
          unread_count: 1, // Ejemplo: 1 mensaje sin leer
          session_date: "2024-01-15T11:30:00Z",
          avatar: "https://i.pravatar.cc/40?u=3"
        },
        {
          id: 3,
          other_user_id: 4,
          other_user_name: "JuanXtreme",
          other_user_role: "cliente",
          room_name: "chat_user_1_4", 
          last_message: "¿Cuándo nos vemos de nuevo?",
          last_message_time: "2024-01-14T20:45:00Z",
          last_message_sender_id: 4, // ID del que envió el último mensaje
          unread_count: 2, // Ejemplo: 2 mensajes sin leer
          session_date: "2024-01-14T20:00:00Z",
          avatar: "https://i.pravatar.cc/40?u=4"
        }
      ];
      setConversaciones(exampleConversations);
      setPreviousConversations(exampleConversations);
    } finally {
      setLoading(false);
    }
  };

  const cargarMensajes = async (roomName) => {
    try {
      // 🔥 CAMBIO: Agregar API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/api/chat/messages/${roomName}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          // ✅ SIMPLIFICADO - solo cargar mensajes sin separadores
          setMensajes(data.messages);
        }
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      // Mensajes de ejemplo para desarrollo
      const exampleMessages = [
        {
          id: 1,
          user_id: 2,
          user_name: "SofiSweet",
          user_role: "modelo",
          message: "¡Hola! ¿Cómo estás?",
          type: "text",
          created_at: "2024-01-15T14:25:00Z"
        },
        {
          id: 2,
          user_id: 1,
          user_name: "Usuario Demo",
          user_role: "cliente",
          message: "¡Hola! Todo bien, ¿y tú?",
          type: "text",
          created_at: "2024-01-15T14:26:00Z"
        },
        {
          id: 3,
          user_id: 2,
          user_name: "SofiSweet", 
          user_role: "modelo",
          message: "Muy bien también 😊",
          type: "text",
          created_at: "2024-01-15T14:27:00Z"
        }
      ];
      setMensajes(exampleMessages);
    }
  };

  // 🔥 MODIFICAR LA FUNCIÓN abrirConversacion EXISTENTE
  const abrirConversacion = async (conversacion) => {
    setConversacionActiva(conversacion.room_name);
    
    // 🔔 MARCAR COMO VISTO INMEDIATAMENTE AL ABRIR
    updateLastSeen(conversacion.room_name);
    
    // 📜 FORZAR SCROLL AL FINAL AL ABRIR CONVERSACIÓN
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    
    await cargarMensajes(conversacion.room_name);
    
    // 🔥 VERIFICAR BLOQUEO AL ABRIR CONVERSACIÓN
    const estadoBloqueo = verificarBloqueoConversacion(conversacion.other_user_id);
    setConversacionBloqueada(estadoBloqueo);
    
    // Si no sabemos si me bloqueó, verificar con el servidor
    if (!bloqueadoPor.has(conversacion.other_user_id) && !usuariosBloqueados.has(conversacion.other_user_id)) {
      await verificarSiMeBloqueó(conversacion.other_user_id);
    }
    
    // 📜 FORZAR SCROLL AL FINAL DESPUÉS DE CARGAR MENSAJES
    setTimeout(() => {
      if (mensajesRef.current) {
        mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
      }
    }, 100);
    
    // En móvil, ocultar sidebar al abrir conversación
    if (isMobile) {
      setShowSidebar(false);
    }
    
    // Marcar mensajes como leídos en el servidor
    if (conversacion.unread_count > 0) {
      marcarComoLeido(conversacion.room_name);
    }
  };
  // 🔥 BUSCAR Y ABRIR CONVERSACIÓN ESPECÍFICA AL LLEGAR DESDE InterfazCliente
  const buscarYAbrirConversacion = async (userInfo) => {
    if (hasOpenedSpecificChat.current) return;
    
    console.log('🔍 Buscando conversación con:', userInfo);
    
    try {
      // Esperar a que se carguen las conversaciones
      let intentos = 0;
      const maxIntentos = 10;
      
      const buscarConversacion = () => {
        const conversacionExistente = conversaciones.find(conv => 
          conv.other_user_id === userInfo.userId ||
          conv.other_user_name === userInfo.userName
        );
        
        if (conversacionExistente) {
          console.log('✅ Conversación encontrada:', conversacionExistente);
          abrirConversacion(conversacionExistente);
          hasOpenedSpecificChat.current = true;
          return true;
        }
        
        return false;
      };
      
      // Intentar encontrar la conversación
      if (!buscarConversacion() && intentos < maxIntentos) {
        const interval = setInterval(() => {
          intentos++;
          console.log(`🔄 Intento ${intentos} de encontrar conversación...`);
          
          if (buscarConversacion() || intentos >= maxIntentos) {
            clearInterval(interval);
            
            if (intentos >= maxIntentos && !hasOpenedSpecificChat.current) {
              console.log('⚠️ No se encontró conversación existente');
              // Crear nueva conversación
              const nuevaConversacion = {
                id: Date.now(),
                other_user_id: userInfo.userId,
                other_user_name: userInfo.userName,
                other_user_role: userInfo.userRole,
                room_name: `chat_user_${usuario.id}_${userInfo.userId}`,
                last_message: "",
                last_message_time: new Date().toISOString(),
                unread_count: 0
              };
              
              setConversaciones(prev => [nuevaConversacion, ...prev]);
              abrirConversacion(nuevaConversacion);
              hasOpenedSpecificChat.current = true;
            }
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ Error buscando conversación:', error);
    }
  };

// 🔥 MANEJAR PARÁMETRO DE CONVERSACIÓN ESPECÍFICA
useEffect(() => {
  if (openChatWith && conversaciones.length > 0 && usuario.id) {
    console.log('📩 Recibido parámetro para abrir chat con:', openChatWith);
    buscarYAbrirConversacion(openChatWith);
  }
}, [openChatWith, conversaciones, usuario.id]);

  const marcarComoLeido = async (roomName) => {
    try {
      // 🔥 CAMBIO: Agregar API_BASE_URL
      await fetch(`${API_BASE_URL}/api/chat/mark-read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ room_name: roomName })
      });
      
      // Actualizar contador local
      setConversaciones(prev => 
        prev.map(conv => 
          conv.room_name === roomName 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marcando como leído:', error);
    }
  };
  // 🔥 MODIFICAR LA FUNCIÓN enviarMensaje EXISTENTE
  const enviarMensaje = async (tipo = 'text', contenido = null) => {
    const mensaje = contenido || nuevoMensaje.trim();
    if (!mensaje || !conversacionActiva) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          room_name: conversacionActiva,
          message: mensaje,
          type: tipo,
          extra_data: tipo === 'gift' ? { gift_type: mensaje } : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
            // Agregar mensaje inmediatamente para UX fluida
            const nuevoMensajeObj = {
              id: Date.now(),
              user_id: usuario.id,
              user_name: usuario.name,
              user_role: usuario.rol,
              message: mensaje,
              type: tipo,
              created_at: new Date().toISOString()
            };
            setMensajes(prev => [...prev, nuevoMensajeObj]);
            setNuevoMensaje("");
            
            // 🔔 ACTUALIZAR ÚLTIMA VEZ VISTO AL ENVIAR MENSAJE
            updateLastSeen(conversacionActiva);
            
            // 📜 PERMITIR AUTO-SCROLL AL ENVIAR MENSAJE
            setShouldAutoScroll(true);
            setIsUserScrolling(false);
            
            // Actualizar último mensaje en la lista
            setConversaciones(prev => 
              prev.map(conv => 
                conv.room_name === conversacionActiva
                  ? { 
                      ...conv, 
                      last_message: mensaje,
                      last_message_time: new Date().toISOString(),
                      last_message_sender_id: usuario.id
                    }
                  : conv
              )
            );
          }
      } else {
        // 🔥 DETECTAR SI FALLO POR BLOQUEO
        if (response.status === 403 || response.status === 423) {
          try {
            const errorData = await response.json();
            
            // Verificar diferentes tipos de error de bloqueo
            if (errorData.error && 
                (errorData.error.includes('bloqueado') || 
                errorData.error.includes('blocked') ||
                errorData.error.includes('no permitido'))) {
                
              console.log('🚫 Detectado bloqueo al enviar mensaje');
              
              const conversacionSeleccionada = conversaciones.find(c => c.room_name === conversacionActiva);
              if (conversacionSeleccionada) {
                // Confirmar con el servidor que me bloquearon
                const fueBloqueado = await verificarSiMeBloqueó(conversacionSeleccionada.other_user_id);
                if (fueBloqueado) {
                  alert(`${conversacionSeleccionada.other_user_name} te ha bloqueado`);
                }
              }
            }
          } catch (parseError) {
            console.error('Error parseando respuesta:', parseError);
          }
        }
        
        console.error('Error enviando mensaje:', response.status);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const iniciarVideochat = (otherUserId, otherUserRole) => {
    // Navegar a videochat con el usuario específico
    if (otherUserRole === 'modelo') {
      navigate('/videochatclient', { 
        state: { 
          targetUserId: otherUserId,
          fromChat: true 
        }
      });
    } else {
      navigate('/videochat', { 
        state: { 
          targetUserId: otherUserId,
          fromChat: true 
        }
      });
    }
  };

  const enviarRegalo = (tipoRegalo) => {
    enviarMensaje('gift', tipoRegalo);
  };

  const enviarEmoji = (emoji) => {
    enviarMensaje('emoji', emoji);
  };

  const formatearTiempo = (timestamp) => {
    const fecha = new Date(timestamp);
    const ahora = new Date();
    const diffMs = ahora - fecha;
    const diffHoras = diffMs / (1000 * 60 * 60);
    
    if (diffHoras < 1) {
      return fecha.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffHoras < 24) {
      return fecha.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return fecha.toLocaleDateString('es-ES', { 
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  const renderMensaje = (mensaje) => {
    const textoMensaje = mensaje.message || mensaje.text || 'Mensaje sin contenido';
    const esUsuarioActual = mensaje.user_id === usuario.id;
    
    switch (mensaje.type) {
      case 'gift':
        return (
          <div className="flex items-center gap-2 text-yellow-400">
            <Gift size={16} />
            <span>Envió: {textoMensaje}</span>
          </div>
        );
      case 'emoji':
        return (
          <div className="text-2xl">
            {textoMensaje}
          </div>
        );
      default:
        // Si la traducción está habilitada Y tenemos el componente
        if (translationSettings?.enabled && TranslatedMessage && textoMensaje && textoMensaje.trim()) {
          try {
            const tipoMensaje = esUsuarioActual ? 'local' : 'remote';
            const shouldShowTranslation = !esUsuarioActual || translationSettings.translateOutgoing;
            
            // 🔥 VALIDAR QUE EL TEXTO NO ESTÉ VACÍO Y NO SEA SOLO EMOJIS
            const cleanText = textoMensaje.trim();
            const isOnlyEmojis = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]*$/u.test(cleanText);
            const isOnlySpecialChars = /^[^\w\s]*$/.test(cleanText);
            
            if (shouldShowTranslation && cleanText.length > 0 && !isOnlyEmojis && !isOnlySpecialChars) {
              return (
                <TranslatedMessage
                  message={{
                    text: cleanText,
                    type: tipoMensaje,
                    id: mensaje.id,
                    timestamp: mensaje.created_at,
                    sender: mensaje.user_name,
                    senderRole: mensaje.user_role
                  }}
                  settings={translationSettings}
                  className="text-white"
                />
              );
            }
          } catch (error) {
            console.error('❌ Error en TranslatedMessage:', error);
            // Fallback al texto normal si hay error
          }
        }
        
        // Fallback: mostrar solo mensaje normal
        return <span className="text-white">{textoMensaje}</span>;
    }
  };
  // 🔥 CLEANUP AL DESMONTAR
  useEffect(() => {
    return () => {
      if (callPollingInterval) {
        clearInterval(callPollingInterval);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  // 🔥 NUEVO useEffect PARA MONITOREAR BLOQUEO DE CONVERSACIÓN ACTUAL
  useEffect(() => {
    if (conversacionActiva) {
      const conversacionSeleccionada = conversaciones.find(c => c.room_name === conversacionActiva);
      if (conversacionSeleccionada) {
        const estadoBloqueo = verificarBloqueoConversacion(conversacionSeleccionada.other_user_id);
        setConversacionBloqueada(estadoBloqueo);
      }
    } else {
      setConversacionBloqueada(null);
    }
  }, [conversacionActiva, usuariosBloqueados, bloqueadoPor, conversaciones]);
    // 🔥 NUEVO useEffect PARA VERIFICACIÓN PERIÓDICA DE BLOQUEOS
  useEffect(() => {
    if (!usuario.id) return;

    // Verificar bloqueos cada 30 segundos
    const interval = setInterval(() => {
      if (conversacionActiva) {
        const conversacionSeleccionada = conversaciones.find(c => c.room_name === conversacionActiva);
        if (conversacionSeleccionada && !conversacionBloqueada) {
          // Solo verificar si no sabemos ya que hay bloqueo
          verificarSiMeBloqueó(conversacionSeleccionada.other_user_id);
        }
      }
    }, 30000); // Cada 30 segundos

    return () => clearInterval(interval);
  }, [usuario.id, conversacionActiva, conversacionBloqueada]);

  const conversacionesFiltradas = conversaciones.filter(conv => 
    conv.other_user_name.toLowerCase().includes(busquedaConversacion.toLowerCase())
  );

  const conversacionSeleccionada = conversaciones.find(c => c.room_name === conversacionActiva);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1c20] to-[#2b2d31] text-white p-6">
      <div className="relative">
        <Header />
        
       {/* 📱 BOTÓN DE CHAT - IZQUIERDA DEL NAVBAR */}
      {isMobile && conversacionActiva && !showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed top-[29px] right-[135px] z-[100] bg-[#ff007a] hover:bg-[#cc0062] p-2 rounded-full shadow-xl transition-colors border-2 border-white/20"
        >
          <MessageSquare size={18} className="text-white" />
          {/* 🔔 MOSTRAR CONTEO GLOBAL EN EL BOTÓN */}
          {globalUnreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-white">
              {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
            </div>
          )}
        </button>
        )}
  
      </div>
      
      {/* 🔔 NOTIFICACIÓN GLOBAL DE MENSAJES NUEVOS - ABAJO IZQUIERDA ESQUINADA */}
      {showGlobalNotification && globalUnreadCount > 0 && (
        <div className="fixed bottom-4 left-4 bg-[#ff007a] text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce z-[200] border border-[#cc0062]">
          <Bell size={18} />
          <div>
            <div className="text-sm font-medium">
              {globalUnreadCount === 1 
                ? 'Tienes 1 mensaje nuevo' 
                : `Tienes ${globalUnreadCount} mensajes nuevos`
              }
            </div>
            <div className="text-xs opacity-75">en tus conversaciones</div>
          </div>
        </div>
      )}
      
      <div className={`${isMobile ? 'p-2' : 'p-2'}`}>
      <div className={`flex rounded-xl overflow-hidden shadow-lg ${
        isMobile 
          ? 'h-[calc(100vh-80px)] max-h-[calc(100vh-80px)]' 
          : 'h-[83vh]'
      } border border-[#ff007a]/10 relative`}>
          {/* Sidebar de conversaciones */}
          <aside className={`${
            isMobile 
              ? `fixed inset-y-0 left-0 z-40 w-full bg-[#2b2d31] transform transition-transform ${
                  showSidebar ? 'translate-x-0' : '-translate-x-full'
                }`
              : 'w-1/3 bg-[#2b2d31]'
          } p-4 overflow-y-auto`}>
            
            {/* 📱 BOTÓN CERRAR EN MÓVIL */}
            {isMobile && (
              <button
                onClick={() => setShowSidebar(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            )}

            {/* Búsqueda de conversaciones */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1a1c20] text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-[#ff007a]/50"
                value={busquedaConversacion}
                onChange={(e) => setBusquedaConversacion(e.target.value)}
              />
            </div>

            {/* Lista de conversaciones */}
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff007a] mx-auto mb-2"></div>
                  <p className="text-xs text-white/60">Cargando conversaciones...</p>
                </div>
              ) : conversacionesFiltradas.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/60">No hay conversaciones</p>
                  <p className="text-xs text-white/40">Tus chats aparecerán aquí después de las sesiones</p>
                </div>
              ) : (
                conversacionesFiltradas.map((conv) => {
                  const isOnline = onlineUsers.has(conv.other_user_id);
                  const unreadCount = calculateUnreadCount(conv);
                  
                  return (
                    <div
                      key={conv.id}
                      onClick={() => abrirConversacion(conv)}
                      className={`p-3 hover:bg-[#3a3d44] rounded-lg cursor-pointer transition-colors border ${
                        conversacionActiva === conv.room_name 
                          ? 'bg-[#ff007a]/20 border-[#ff007a]' 
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* 🔥 AVATAR CON INICIAL Y ESTADO ONLINE */}
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#ff007a] to-[#cc0062] rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {getInitial(conv.other_user_name)}
                          </div>
                          {/* Solo punto indicador */}
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${
                            isOnline ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                          {/* 🔔 CONTADOR DE MENSAJES NUEVOS REALES */}
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -left-1 bg-[#ff007a] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                              {unreadCount}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{conv.other_user_name}</p>
                          <div className="text-xs text-white/60 truncate">
                            {/* 🌍 PREVIEW CON TRADUCCIÓN SI ESTÁ HABILITADA */}
                            {translationSettings?.enabled && conv.last_message && conv.last_message.trim() ? (
                              <TranslatedMessage
                                message={{
                                  text: conv.last_message.trim(),
                                  type: 'remote',
                                  id: `preview_${conv.id}`,
                                  timestamp: conv.last_message_time
                                }}
                                settings={{
                                  ...translationSettings,
                                  showOriginal: false,
                                  showOnlyTranslation: true
                                }}
                                className="text-white/60"
                              />
                            ) : (
                              // Mostrar mensaje original si no se puede traducir
                              conv.last_message_sender_id === usuario.id ? (
                                <span><span className="text-white/40">Tú:</span> {conv.last_message}</span>
                              ) : (
                                conv.last_message
                              )
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-xs text-white/40">
                            {formatearTiempo(conv.last_message_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Panel de chat */}
          <section className={`${
            isMobile 
              ? `${showSidebar ? 'hidden' : 'w-full h-[80vh]'}` 
              : 'w-2/3'
          } bg-[#0a0d10] flex flex-col relative overflow-hidden`}>
            {!conversacionActiva ? (
              /* Estado sin conversación seleccionada - Solo en desktop */
              !isMobile && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare size={48} className="text-white/30 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Selecciona una conversación</h3>
                    <p className="text-white/60">Elige una conversación para ver los mensajes</p>
                  </div>
                </div>
              )
            ) : (
              <>
                {/* Header de conversación activa */}
                <div className="bg-[#2b2d31] px-5 py-3 flex justify-between items-center border-b border-[#ff007a]/20">
                  <div className="flex items-center gap-3">
                    {/* 🔥 AVATAR CON INICIAL Y SOLO PUNTO */}
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#ff007a] to-[#cc0062] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {getInitial(conversacionSeleccionada?.other_user_name)}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${
                        onlineUsers.has(conversacionSeleccionada?.other_user_id) ? 'bg-green-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div>
                      <span className="font-semibold block">
                        {conversacionSeleccionada?.other_user_name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                    onClick={() => iniciarLlamadaReal(
                      conversacionSeleccionada?.other_user_id,
                      conversacionSeleccionada?.other_user_name
                    )}
                    disabled={isCallActive || isReceivingCall || conversacionBloqueada !== null}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                      isCallActive || isReceivingCall || conversacionBloqueada
                        ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                        : 'bg-[#ff007a]/20 hover:bg-[#ff007a]/30 text-[#ff007a]'
                    }`}
                    title={
                      conversacionBloqueada 
                        ? 'No disponible - usuario bloqueado'
                        : isCallActive || isReceivingCall 
                          ? 'Llamada en curso'
                          : 'Iniciar videochat'
                    }
                  >
                    <Video size={16} />
                    {!isMobile && (
                      conversacionBloqueada 
                        ? 'Bloqueado' 
                        : isCallActive 
                          ? 'Llamando...' 
                          : 'Videochat'
                    )}
                  </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowMainSettings(!showMainSettings)}
                        className="text-white hover:text-[#ff007a] transition-colors p-2 hover:bg-[#3a3d44] rounded-lg"
                      >
                        <Settings size={20} />
                      </button>
                      
                      {/* 🔥 PANEL DE CONFIGURACIÓN CON TRADUCCIÓN */}
                      {showMainSettings && (
                        <div className="absolute right-0 mt-2 bg-[#1f2125] border border-[#ff007a]/30 rounded-xl shadow-lg z-50 w-64">
                          <button
                            onClick={() => {
                              setShowTranslationSettings(true);
                              setShowMainSettings(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-[#2b2d31] transition text-left group"
                          >
                            <Globe className="text-[#ff007a] group-hover:scale-110 transition-transform" size={20} />
                            <div className="flex-1">
                              <span className="text-white text-sm font-medium">Traducción</span>
                              <div className="text-xs text-gray-400">
                                {translationSettings?.enabled ? 
                                  `Traducción activa (${languages[translationSettings.targetLanguage]?.name})` : 
                                  'Traducción inactiva'
                                }
                              </div>
                            </div>
                            <ArrowRight className="text-gray-400 group-hover:text-white" size={16} />
                          </button>
                          
                          <button 
                            onClick={() => {
                              toggleFavorito(
                                conversacionSeleccionada?.other_user_id,
                                conversacionSeleccionada?.other_user_name
                              );
                              setShowMainSettings(false);
                            }}
                            disabled={loadingFavorite}
                            className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm ${
                              favoritos.has(conversacionSeleccionada?.other_user_id) 
                                ? 'text-red-400' 
                                : 'text-white'
                            }`}
                          >
                            {loadingFavorite ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff007a]"></div>
                            ) : (
                              <Star 
                                size={16} 
                                className={favoritos.has(conversacionSeleccionada?.other_user_id) ? 'fill-current' : ''}
                              />
                            )}
                            {favoritos.has(conversacionSeleccionada?.other_user_id) 
                              ? 'Quitar de Favoritos' 
                              : 'Agregar a Favoritos'
                            }
                          </button>
                          <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm">
                            <Pencil size={16} /> Cambiar apodo
                          </button>
                          <button 
                            onClick={() => {
                              const conversacionSeleccionada = conversaciones.find(c => c.room_name === conversacionActiva);
                              if (conversacionSeleccionada) {
                                toggleBloquearUsuario(
                                  conversacionSeleccionada.other_user_id,
                                  conversacionSeleccionada.other_user_name
                                );
                              }
                              setShowMainSettings(false);
                            }}
                            disabled={loadingBlock || conversacionBloqueada === 'me_bloquearon'}
                            className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm ${
                              conversacionBloqueada === 'me_bloquearon' 
                                ? 'text-gray-500 cursor-not-allowed' 
                                : 'text-red-400'
                            }`}
                          >
                            {loadingBlock ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                            ) : (
                              <Ban size={16} />
                            )}
                            {conversacionBloqueada === 'me_bloquearon' 
                              ? 'No disponible (te bloqueó)' 
                              : conversacionBloqueada === 'yo_bloquee' 
                                ? 'Desbloquear usuario'
                                : 'Bloquear usuario'
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mensajes - SIN SEPARADORES DE MENSAJES NUEVOS */}
                <div 
                  ref={mensajesRef}
                  className={`flex-1 overflow-y-auto p-4 space-y-3 mensajes-container ${
                    isMobile ? 'pb-safe-area-inset-bottom' : ''
                  }`}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#ff007a #2b2d31',
                    maxHeight: isMobile ? 'calc(100vh - 220px)' : 'auto'
                  }}
                  onScroll={handleScroll}
                >
                  <style>
                    {`
                      .mensajes-container::-webkit-scrollbar {
                        width: 6px;
                      }
                      .mensajes-container::-webkit-scrollbar-track {
                        background: #2b2d31;
                        border-radius: 3px;
                      }
                      .mensajes-container::-webkit-scrollbar-thumb {
                        background: #ff007a;
                        border-radius: 3px;
                      }
                      .mensajes-container::-webkit-scrollbar-thumb:hover {
                        background: #cc0062;
                      }
                      
                      .animate-fadeIn {
                        animation: fadeIn 0.5s ease-in-out;
                      }
                      
                      @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                      }
                    `}
                  </style>
                  
                  {mensajes.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-white/60">No hay mensajes aún</p>
                    </div>
                  ) : (
                    mensajes.map((mensaje, index) => {
                      const esUsuarioActual = mensaje.user_id === usuario.id;
                      
                      return (
                        <div key={mensaje.id} className={`flex ${esUsuarioActual ? "justify-end" : "justify-start"}`}>
                          <div className="flex flex-col max-w-sm">
                            {!esUsuarioActual && (
                              <div className="flex items-center gap-2 mb-1 px-2">
                                <div className="w-5 h-5 bg-gradient-to-br from-[#ff007a] to-[#cc0062] rounded-full flex items-center justify-center text-white font-bold text-xs">
                                  {getInitial(mensaje.user_name)}
                                </div>
                                <span className="text-xs text-white/60">{mensaje.user_name}</span>
                              </div>
                            )}
                            <div
                              className={`relative px-4 py-2 rounded-2xl text-sm ${
                                esUsuarioActual
                                  ? "bg-[#ff007a] text-white rounded-br-md shadow-lg"
                                  : mensaje.type === 'gift' 
                                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-bl-md shadow-lg"
                                    : "bg-[#2b2d31] text-white/80 rounded-bl-md shadow-lg"
                              }`}
                            >
                              {renderMensaje(mensaje)}
                              <div className="text-xs opacity-70 mt-1">
                                {formatearTiempo(mensaje.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* 🔥 MENSAJE DE ESTADO DE BLOQUEO COMPLETO */}
                {conversacionBloqueada && (
                  <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-4 mx-4 mb-2">
                    <div className="flex items-center gap-3">
                      <Ban size={24} className="text-red-400 flex-shrink-0" />
                      <div className="flex-1">
                        {conversacionBloqueada === 'yo_bloquee' && (
                          <>
                            <p className="text-red-300 font-semibold">🚫 Usuario Bloqueado</p>
                            <p className="text-red-200 text-sm mb-2">
                              Has bloqueado a {conversaciones.find(c => c.room_name === conversacionActiva)?.other_user_name}. 
                              No podrán enviarte mensajes ni llamarte.
                            </p>
                            <button 
                              onClick={() => {
                                const conv = conversaciones.find(c => c.room_name === conversacionActiva);
                                if (conv) toggleBloquearUsuario(conv.other_user_id, conv.other_user_name);
                              }}
                              className="text-red-400 hover:text-red-300 text-sm underline bg-red-900/30 px-2 py-1 rounded"
                              disabled={loadingBlock}
                            >
                              {loadingBlock ? 'Desbloqueando...' : 'Desbloquear usuario'}
                            </button>
                          </>
                        )}
                        
                        {conversacionBloqueada === 'me_bloquearon' && (
                          <>
                            <p className="text-red-300 font-semibold">❌ Fuiste Bloqueado</p>
                            <p className="text-red-200 text-sm">
                              {conversaciones.find(c => c.room_name === conversacionActiva)?.other_user_name} te ha bloqueado. 
                              No puedes enviar mensajes ni realizar llamadas.
                            </p>
                            <p className="text-red-300 text-xs mt-1 italic">
                              Solo podrás ver mensajes anteriores, pero no enviar nuevos.
                            </p>
                          </>
                        )}
                        
                        {conversacionBloqueada === 'mutuo' && (
                          <>
                            <p className="text-red-300 font-semibold">🚫 Bloqueo Mutuo</p>
                            <p className="text-red-200 text-sm mb-2">
                              Ambos se han bloqueado mutuamente. Ninguno puede contactar al otro.
                            </p>
                            <button 
                              onClick={() => {
                                const conv = conversaciones.find(c => c.room_name === conversacionActiva);
                                if (conv) toggleBloquearUsuario(conv.other_user_id, conv.other_user_name);
                              }}
                              className="text-red-400 hover:text-red-300 text-sm underline bg-red-900/30 px-2 py-1 rounded"
                              disabled={loadingBlock}
                            >
                              {loadingBlock ? 'Desbloqueando...' : 'Desbloquear de mi parte'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Panel de regalos y emojis */}
                <div className="bg-[#2b2d31] px-4 py-2 border-t border-[#ff007a]/10">
                  <div className={`flex gap-2 mb-2 ${isMobile ? 'flex-wrap' : ''}`}>
                    {/* Regalos rápidos */}
                    <button
                      onClick={() => enviarRegalo('🌹 Rosa')}
                      className="px-3 py-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-full text-xs hover:scale-105 transition-transform"
                    >
                      🌹 {!isMobile && 'Rosa'}
                    </button>
                    <button
                      onClick={() => enviarRegalo('💎 Diamante')}
                      className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-xs hover:scale-105 transition-transform"
                    >
                      💎 {!isMobile && 'Diamante'}
                    </button>
                    <button
                      onClick={() => enviarRegalo('👑 Corona')}
                      className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-xs hover:scale-105 transition-transform"
                    >
                      👑 {!isMobile && 'Corona'}
                    </button>
                    
                    {/* Emojis rápidos */}
                    <div className="flex gap-1 ml-2">
                      {['❤️', '😍', '🔥', '👏', '😘', '🥰', '💋'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => enviarEmoji(emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3d44] rounded-full transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input mensaje */}
                <div className={`bg-[#2b2d31] border-t border-[#ff007a]/20 flex gap-3 ${
                  isMobile 
                    ? 'p-3 pb-safe-area-inset-bottom sticky bottom-0 z-10' 
                    : 'p-4'
                }`}>                  
                <input
                    type="text"
                    placeholder={
                      conversacionBloqueada === 'yo_bloquee' 
                        ? "Has bloqueado a este usuario..." 
                        : conversacionBloqueada === 'me_bloquearon'
                          ? "Este usuario te ha bloqueado..."
                          : conversacionBloqueada === 'mutuo'
                            ? "Bloqueo mutuo activo..."
                            : "Escribe un mensaje..."
                    }
                    className={`flex-1 px-4 py-2 rounded-full outline-none placeholder-white/60 ${
                      conversacionBloqueada 
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                        : 'bg-[#1a1c20] text-white focus:ring-2 focus:ring-[#ff007a]/50'
                    }`}
                    value={nuevoMensaje}
                    onChange={(e) => !conversacionBloqueada && setNuevoMensaje(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !conversacionBloqueada && enviarMensaje()}
                    disabled={conversacionBloqueada !== null}
                  />
                  <button
                    onClick={() => enviarMensaje()}
                    disabled={!nuevoMensaje.trim() || conversacionBloqueada !== null}
                    className={`px-6 py-2 rounded-full font-semibold transition-colors flex items-center gap-2 ${
                      conversacionBloqueada !== null
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                        : !nuevoMensaje.trim()
                          ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                          : 'bg-[#ff007a] hover:bg-[#e6006e] text-white'
                    }`}
                  >
                    <Send size={16} />
                    {!isMobile && (conversacionBloqueada ? 'Bloqueado' : 'Enviar')}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* 📱 OVERLAY PARA CERRAR SIDEBAR EN MÓVIL */}
      {isMobile && showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Modal de configuración de traducción */}
      <TranslationSettings
        isOpen={showTranslationSettings}
        onClose={() => setShowTranslationSettings(false)}
        settings={translationSettings}
        onSettingsChange={setTranslationSettings}
        languages={languages}
      />
      {/* 🔥 OVERLAYS DE LLAMADAS */}
      <CallingSystem
        isVisible={isCallActive}
        callerName={currentCall?.name}
        onCancel={cancelarLlamada}
        callStatus={currentCall?.status || 'initiating'}
      />

      <IncomingCallOverlay
        isVisible={isReceivingCall}
        callData={incomingCall}
        onAnswer={() => console.log('Responder llamada')}
        onDecline={() => console.log('Rechazar llamada')}
      />
    </div>
  );
}