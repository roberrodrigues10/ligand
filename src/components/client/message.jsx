import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "./headercliente.jsx";
import { getUser } from "../../utils/auth";

import {
  useTranslation as useCustomTranslation,
  TranslationSettings,
  TranslatedMessage
} from '../../utils/translationSystem.jsx';

import {
  MessageSquare,
  Star,
  Pencil,
  Ban,
  Gift,
  Send,
  Search,
  Video,
  Settings,
  Globe,
  ArrowRight,
  X,
  Bell
} from "lucide-react";

// 🔥 IMPORTACIONES NECESARIAS
import CallingSystem from '../CallingOverlay';
import IncomingCallOverlay from '../IncomingCallOverlay';
import { useGiftSystem, GiftMessageComponent, GiftNotificationOverlay, GiftsModal, giftSystemStyles } from '../GiftSystem';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ChatPrivado() {
  const { settings: translationSettings, setSettings: setTranslationSettings, languages } = useCustomTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  

  // 🔥 ESTADOS PRINCIPALES OPTIMIZADOS
  const [usuario, setUsuario] = useState({ id: null, name: "Usuario", rol: "cliente" });
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionActiva, setConversacionActiva] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  
  // Estados UI simplificados
  const [loading, setLoading] = useState(false);
  const [busquedaConversacion, setBusquedaConversacion] = useState("");
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [showMainSettings, setShowMainSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(true);
  const [userBalance, setUserBalance] = useState(0);        // Balance de COINS
  const [giftBalance, setGiftBalance] = useState(0);

  // Estados de llamadas simplificados
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const [callPollingInterval, setCallPollingInterval] = useState(null);

  // Estados de funcionalidades SIMPLIFICADOS
  const [favoritos, setFavoritos] = useState(new Set());
  const [bloqueados, setBloqueados] = useState(new Set());
  const [bloqueadoPor, setBloqueadoPor] = useState(new Set()); // Quien me bloqueó
  const [apodos, setApodos] = useState({});
  const [loadingActions, setLoadingActions] = useState(false);

  // Estados de notificaciones SIMPLIFICADOS
  const [lastSeenMessages, setLastSeenMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Restaurar onlineUsers

  // Estados de regalos
  const [showGiftsModal, setShowGiftsModal] = useState(false);
  const [loadingGift, setLoadingGift] = useState(false);

  // Estados de apodos SIMPLIFICADOS
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameTarget, setNicknameTarget] = useState(null);
  const [nicknameValue, setNicknameValue] = useState('');

  // Refs
  const mensajesRef = useRef(null);
  const globalPollingInterval = useRef(null);
  const openChatWith = location.state?.openChatWith;
  const hasOpenedSpecificChat = useRef(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingCallPollingInterval, setIncomingCallPollingInterval] = useState(null);
  const audioRef = useRef(null)

  // 🔥 FUNCIONES MEMOIZADAS (DEFINIR PRIMERO)
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }, []);
const iniciarPollingLlamada = useCallback((callId) => {
  console.log('🔄 Iniciando polling para llamada:', callId);
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/calls/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ call_id: callId })
      });
      
      if (!response.ok) {
        console.error('❌ Error en response del polling:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('📞 Polling response:', data);
      
      if (data.success && data.call) {
        const callStatus = data.call.status;
        console.log('📊 Estado de llamada:', callStatus);
                
        if (callStatus === 'active') {
          // ✅ ¡Llamada aceptada por la modelo!
          console.log('🎉 ¡Llamada ACEPTADA! Redirigiendo...');
          clearInterval(interval);
          setCallPollingInterval(null);
          
          // 🔥 CRITICAL: Asegurar que tenemos room_name
          const roomName = data.call.room_name || data.room_name;
          if (!roomName) {
            console.error('❌ No se recibió room_name en la respuesta');
            alert('Error: No se pudo obtener información de la sala');
            setIsCallActive(false);
            setCurrentCall(null);
            return;
          }
          
          redirigirAVideochatCliente({
            ...data.call,
            room_name: roomName,
            call_id: callId
          });
          
        } else if (callStatus === 'rejected') {
          // ❌ Llamada rechazada por la modelo
          console.log('😞 Llamada RECHAZADA');
          clearInterval(interval);
          setCallPollingInterval(null);
          setIsCallActive(false);
          setCurrentCall(null);
          alert('La llamada fue rechazada');
          
        } else if (callStatus === 'cancelled') {
          // ⏰ Llamada cancelada por timeout
          console.log('⏰ Llamada CANCELADA por timeout');
          clearInterval(interval);
          setCallPollingInterval(null);
          setIsCallActive(false);
          setCurrentCall(null);
          alert('La llamada expiró');
          
        } else if (callStatus === 'pending') {
          // 🕐 Llamada aún pendiente (normal)
          console.log('⏳ Llamada aún pendiente...');
          
        } else {
          // ❓ Estado desconocido
          console.log('❓ Estado desconocido:', callStatus);
        }
      } else {
        console.error('❌ Respuesta inválida del polling:', data);
      }
      
    } catch (error) {
      console.error('💥 Error en polling:', error);
    }
  }, 2000); // Cada 2 segundos
  
  setCallPollingInterval(interval);
  
  // ⏰ Timeout de seguridad - más largo para dar tiempo
  setTimeout(() => {
    if (interval) {
      console.log('⏰ Timeout de seguridad activado');
      clearInterval(interval);
      setCallPollingInterval(null);
      
      if (isCallActive) {
        setIsCallActive(false);
        setCurrentCall(null);
        alert('La llamada expiró por tiempo de espera');
      }
    }
  }, 45000); // 45 segundos
}, [getAuthHeaders, isCallActive, setCallPollingInterval, setIsCallActive, setCurrentCall]);

// ============================================================================
// 2. FUNCIÓN: REDIRIGIR AL VIDEOCHAT DEL CLIENTE
// ============================================================================

const redirigirAVideochatCliente = useCallback((callData) => {
  console.log('🚀 Redirigiendo a videochat CLIENTE con datos:', callData);
  
  // Verificar que tenemos datos mínimos
  if (!callData.room_name) {
    console.error('❌ Error: No room_name en callData');
    alert('Error: Información de llamada incompleta');
    return;
  }
  
  // Guardar datos de la llamada en sessionStorage (más seguro)
  sessionStorage.setItem('roomName', callData.room_name);
  sessionStorage.setItem('userName', usuario.name || 'Cliente');
  sessionStorage.setItem('currentRoom', callData.room_name);
  sessionStorage.setItem('inCall', 'true');
  sessionStorage.setItem('videochatActive', 'true');
  
  // 🔥 TAMBIÉN EN localStorage para compatibilidad
  localStorage.setItem('roomName', callData.room_name);
  localStorage.setItem('userName', usuario.name || 'Cliente');
  localStorage.setItem('currentRoom', callData.room_name);
  localStorage.setItem('inCall', 'true');
  localStorage.setItem('videochatActive', 'true');
  
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
  if (incomingCallPollingInterval) {
    clearInterval(incomingCallPollingInterval);
    setIncomingCallPollingInterval(null);
  }
  
  console.log('📱 Navegando a videochatclient...');
  
  // 🔥 CRÍTICO: Redirigir al videochat DEL CLIENTE, NO de la modelo
  navigate('/videochatclient', {
    state: {
      roomName: callData.room_name,
      userName: usuario.name || 'Cliente',
      callId: callData.call_id || callData.id,
      from: 'call',
      callData: callData
    }
  });
}, [usuario.name, callPollingInterval, incomingCallPollingInterval, navigate]);

// ============================================================================
// 3. MODIFICAR LA FUNCIÓN iniciarLlamadaReal EXISTENTE
// ============================================================================

// 🔥 REEMPLAZA tu función iniciarLlamadaReal actual con esta versión mejorada:

const iniciarLlamadaRealMejorada = useCallback(async (otherUserId, otherUserName) => {
  try {
    console.log('📞 Iniciando llamada a:', {
      userId: otherUserId,
      userName: otherUserName
    });
    
    setCurrentCall({ id: otherUserId, name: otherUserName, status: 'initiating' });
    setIsCallActive(true);

    const response = await fetch(`${API_BASE_URL}/api/calls/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ receiver_id: otherUserId, call_type: 'video' })
    });

    const data = await response.json();
    console.log('✅ Respuesta del servidor:', data);
    
    if (data.success) {
      setCurrentCall({
        id: otherUserId,
        name: otherUserName,
        callId: data.call_id,
        roomName: data.room_name,
        status: 'calling'
      });
      
      // 🔥 INICIAR EL POLLING AQUÍ - ESTO ES LO QUE FALTABA
      iniciarPollingLlamada(data.call_id);
      
    } else {
      console.error('❌ Error en llamada:', data);
      setIsCallActive(false);
      setCurrentCall(null);
      alert(data.error || 'No se pudo iniciar la llamada');
    }
  } catch (error) {
    console.error('💥 Error iniciando llamada:', error);
    setIsCallActive(false);
    setCurrentCall(null);
    alert('Error de conexión al iniciar llamada');
  }
}, [getAuthHeaders, iniciarPollingLlamada]);

// ============================================================================
// 4. FUNCIÓN MEJORADA PARA CANCELAR LLAMADA
// ============================================================================

const cancelarLlamadaMejorada = useCallback(async () => {
  try {
    console.log('🛑 Cancelando llamada...');
    
    if (currentCall?.callId) {
      const response = await fetch(`${API_BASE_URL}/api/calls/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          call_id: currentCall.callId
        })
      });
      
      if (response.ok) {
        console.log('✅ Llamada cancelada exitosamente');
      } else {
        console.error('❌ Error cancelando llamada:', response.status);
      }
    }
    
    // Limpiar polling sin importar el resultado
    if (callPollingInterval) {
      clearInterval(callPollingInterval);
      setCallPollingInterval(null);
    }
    
  } catch (error) {
    console.error('💥 Error cancelando llamada:', error);
  } finally {
    // Siempre limpiar estado
    setIsCallActive(false);
    setCurrentCall(null);
  }
}, [currentCall, callPollingInterval, getAuthHeaders]);

useEffect(() => {
  console.log('🔍 Estado actual de llamadas:', {
    isCallActive,
    currentCall: currentCall?.callId,
    callPollingInterval: !!callPollingInterval,
    user: usuario?.id
  });
}, [isCallActive, currentCall, callPollingInterval, usuario]);
  // 🔥 SISTEMA DE REGALOS (DESPUÉS DE getAuthHeaders)
  const {
    gifts,
    loadingGifts,
    pendingRequests,
    loadingRequests,
    loadGifts,
    loadPendingRequests,
    setPendingRequests,
    acceptGiftRequest,    // ← NUEVO
    rejectGiftRequest     // ← NUEVO
  } = useGiftSystem(usuario.id, usuario.rol, getAuthHeaders, API_BASE_URL);

  const getInitial = useCallback((name) => name ? name.charAt(0).toUpperCase() : '?', []);

  const getDisplayName = useCallback((userId, originalName) => {
    return apodos[userId] || originalName;
  }, [apodos]);

  // MARCAR COMO VISTO MEJORADO - DEFINIR ANTES DE abrirConversacion
  const marcarComoVisto = useCallback(async (roomName) => {
    const now = Date.now();
    
    // Actualizar localStorage inmediatamente
    const newLastSeen = { ...lastSeenMessages, [roomName]: now };
    setLastSeenMessages(newLastSeen);
    localStorage.setItem('chatLastSeen', JSON.stringify(newLastSeen));
    
    try {
      // Marcar como leído en el servidor
      await fetch(`${API_BASE_URL}/api/chat/mark-read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ room_name: roomName })
      });
      
      // Actualizar contador local de la conversación
      setConversaciones(prev => 
        prev.map(conv => 
          conv.room_name === roomName 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
      
    } catch (error) {
    }
  }, [lastSeenMessages, getAuthHeaders]);

  // 🔥 CÁLCULOS MEMOIZADOS SIMPLIFICADOS
  const conversacionesFiltradas = useMemo(() => {
    return conversaciones.filter(conv =>
      conv.other_user_name.toLowerCase().includes(busquedaConversacion.toLowerCase())
    );
  }, [conversaciones, busquedaConversacion]);

  const conversacionSeleccionada = useMemo(() => {
    return conversaciones.find(c => c.room_name === conversacionActiva);
  }, [conversaciones, conversacionActiva]);

  // SIMPLIFICADO: Calcular notificaciones correctamente
  const calculateUnreadCount = useCallback((conversacion) => {
    if (conversacion.room_name === conversacionActiva) return 0;
    
    // Usar el contador del servidor si existe
    if (conversacion.unread_count && conversacion.unread_count > 0) {
      return conversacion.unread_count;
    }
    
    // Fallback: usar timestamp
    const lastSeen = lastSeenMessages[conversacion.room_name] || 0;
    const lastMessageTime = new Date(conversacion.last_message_time).getTime();
    return (lastMessageTime > lastSeen && conversacion.last_message_sender_id !== usuario.id) ? 1 : 0;
  }, [conversacionActiva, lastSeenMessages, usuario.id]);

  // 🔥 FUNCIONES PRINCIPALES SIMPLIFICADAS
  const cargarDatosUsuario = useCallback(async () => {
    try {
      const userData = await getUser();

      
      setUsuario({
        id: userData.id,
        name: userData.name || userData.alias || `Usuario_${userData.id}`,
        rol: userData.rol
      });
    } catch (error) {

      // 🔥 USAR DATOS DE EJEMPLO COMO FALLBACK

      setUsuario({
        id: 1,
        name: "Usuario Demo",
        rol: "cliente"
      });
    }
  }, []);


  const cargarConversaciones = useCallback(async () => {
    if (loading) return;
    
    try {
      // NO mostrar loading en actualizaciones automáticas, solo en carga inicial
      if (conversaciones.length === 0) {
        setLoading(true);
      }
      

      
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'GET',
        headers: getAuthHeaders()
      });


      
      if (response.ok) {
        const data = await response.json();

        
        const serverConversations = data.conversations || [];
        
        // 🔥 ESTRATEGIA: COMBINAR Y ORDENAR CORRECTAMENTE
        setConversaciones(prev => {
          // Separar conversaciones persistentes y del servidor
          const persistentConvs = prev.filter(conv => conv.isPersistent || conv.fromSearch || conv.createdLocally);
          const nonPersistentConvs = prev.filter(conv => !conv.isPersistent && !conv.fromSearch && !conv.createdLocally);
          

          // Crear nueva lista combinada
          const combined = [];
          
          // 🔥 PASO 1: Agregar conversaciones del servidor
          serverConversations.forEach(serverConv => {
            combined.push(serverConv);
          });
          
          // 🔥 PASO 2: Agregar conversaciones persistentes que NO estén en el servidor
          persistentConvs.forEach(persistentConv => {
            const existsInServer = serverConversations.some(serverConv => 
              serverConv.room_name === persistentConv.room_name ||
              serverConv.other_user_id === persistentConv.other_user_id
            );
            
            if (!existsInServer) {
              combined.push(persistentConv);
            } else {
              // 🔥 ACTUALIZAR la conversación del servidor con datos locales importantes
              const serverIndex = combined.findIndex(conv => 
                conv.room_name === persistentConv.room_name ||
                conv.other_user_id === persistentConv.other_user_id
              );
              
              if (serverIndex !== -1) {
                // Mantener datos del servidor pero preservar estado local si es necesario
                combined[serverIndex] = {
                  ...combined[serverIndex],
                  // Preservar datos importantes del estado local si los tiene
                  avatar: persistentConv.avatar || combined[serverIndex].avatar
                };
              }
            }
          });
          
          // 🔥 PASO 3: ORDENAR POR FECHA DE ÚLTIMO MENSAJE (MÁS RECIENTE PRIMERO)
          combined.sort((a, b) => {
            const timeA = new Date(a.last_message_time || 0).getTime();
            const timeB = new Date(b.last_message_time || 0).getTime();
            
            return timeB - timeA; // Más reciente primero
          });
          
          return combined;
        });
        
      } else {
        
        // En caso de error, ordenar las conversaciones existentes
        setConversaciones(prev => {
          const sorted = [...prev].sort((a, b) => {
            const timeA = new Date(a.last_message_time || 0).getTime();
            const timeB = new Date(b.last_message_time || 0).getTime();
            return timeB - timeA;
          });
          
          return sorted;
        });
      }
    } catch (error) {
      
      // En caso de error, ordenar las conversaciones existentes
      setConversaciones(prev => {
        const sorted = [...prev].sort((a, b) => {
          const timeA = new Date(a.last_message_time || 0).getTime();
          const timeB = new Date(b.last_message_time || 0).getTime();
          return timeB - timeA;
        });
        
        return sorted;
      });
    } finally {
      if (conversaciones.length === 0) {
        setLoading(false);
      }
    }
  }, [loading, getAuthHeaders]);

  const cargarMensajes = useCallback(async (roomName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/messages/${roomName}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          setMensajes(data.messages);
          localStorage.setItem(`messages_${roomName}`, JSON.stringify(data.messages));
        }
      }
    } catch (error) {
    }
  }, [getAuthHeaders]);

  // 🔥 FUNCIÓN DE ENVÍO DE MENSAJES OPTIMIZADA
  const enviarMensaje = useCallback(async (tipo = 'text', contenido = null) => {
  const mensaje = contenido || nuevoMensaje.trim();
  if (!mensaje || !conversacionActiva) return;

  // Verificar si está bloqueado (YO bloqueé al usuario O me bloquearon)
  const isBlockedByMe = conversacionSeleccionada ? bloqueados.has(conversacionSeleccionada.other_user_id) : false;
  const isBlockedByThem = conversacionSeleccionada ? bloqueadoPor.has(conversacionSeleccionada.other_user_id) : false;
  
  if (isBlockedByMe) {
    alert('No puedes enviar mensajes a un usuario bloqueado');
    return;
  }
  
  if (isBlockedByThem) {
    alert('Este usuario te ha bloqueado, no puedes enviarle mensajes');
    return;
  }

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
        const updatedMessages = [...mensajes, nuevoMensajeObj];
        localStorage.setItem(`messages_${conversacionActiva}`, JSON.stringify(updatedMessages));
        setNuevoMensaje("");
        
        // ACTUALIZAR PREVIEW INMEDIATAMENTE en la lista de conversaciones
        setConversaciones(prev => {
          const updated = prev.map(conv => 
            conv.room_name === conversacionActiva
              ? {
                  ...conv,
                  last_message: mensaje,
                  last_message_time: new Date().toISOString(),
                  last_message_sender_id: usuario.id
                }
              : conv
          );
          
          // 🔥 REORDENAR DESPUÉS DE ACTUALIZAR
          const sorted = updated.sort((a, b) => {
            const timeA = new Date(a.last_message_time || 0).getTime();
            const timeB = new Date(b.last_message_time || 0).getTime();
            
            return timeB - timeA; // Más reciente primero
          });
          
          return sorted;
        });
        
        // Marcar como visto después de enviar mensaje
        await marcarComoVisto(conversacionActiva);
        
        // Scroll al final
        setTimeout(() => {
          if (mensajesRef.current) {
            mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
          }
        }, 100);
        
        // Refrescar conversaciones después de un momento para sincronizar
        setTimeout(() => {
          cargarConversaciones();
        }, 1000);
      }
    } else {
      // Manejar errores específicos del backend
      const errorData = await response.json();
      if (errorData.error === 'blocked') {
        alert('No puedes enviar mensajes a este usuario');
      } else if (errorData.error === 'blocked_by_user') {
        alert('Este usuario te ha bloqueado');
      } else {
      }
    }
  } catch (error) {
  }
  }, [nuevoMensaje, conversacionActiva, conversacionSeleccionada, bloqueados, bloqueadoPor, getAuthHeaders, usuario, marcarComoVisto, cargarConversaciones]);
  
  const isChatBlocked = useCallback(() => {
    if (!conversacionSeleccionada) return false;
    const isBlockedByMe = bloqueados.has(conversacionSeleccionada.other_user_id);
    const isBlockedByThem = bloqueadoPor.has(conversacionSeleccionada.other_user_id);
    return isBlockedByMe || isBlockedByThem;
  }, [conversacionSeleccionada, bloqueados, bloqueadoPor]);


  const cargarEstadosIniciales = useCallback(async () => {
    if (!usuario.id) return;
    
    try {
      // Cargar favoritos
      const favResponse = await fetch(`${API_BASE_URL}/api/favorites/list`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (favResponse.ok) {
        const favData = await favResponse.json();
        if (favData.success) {
          const favIds = new Set(favData.favorites?.map(fav => fav.id) || []);
          setFavoritos(favIds);
        }
      }

      // Cargar estados de bloqueo
      const blockResponse = await fetch(`${API_BASE_URL}/api/block-status`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (blockResponse.ok) {
        const blockData = await blockResponse.json();
        if (blockData.success) {
          // Usuarios que YO he bloqueado
          const bloqueadosIds = new Set(blockData.my_blocked_users?.map(user => user.id) || []);
          setBloqueados(bloqueadosIds);
          
          // Usuarios que ME han bloqueado
          const bloqueadoresIds = new Set(blockData.blocked_by_users?.map(user => user.id) || []);
          setBloqueadoPor(bloqueadoresIds);
          
        }
      }

      // Cargar apodos
      const nicknameResponse = await fetch(`${API_BASE_URL}/api/nicknames/my-nicknames`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (nicknameResponse.ok) {
        const nicknameData = await nicknameResponse.json();
        if (nicknameData.success) {
          const apodosMap = {};
          nicknameData.nicknames?.forEach(item => {
            apodosMap[item.target_user_id] = item.nickname;
          });
          setApodos(apodosMap);
        }
      }
      
    } catch (error) {
    }
  }, [usuario.id, getAuthHeaders]);
  // 🔥 FUNCIONES DE ACCIÓN SIMPLIFICADAS
  const toggleFavorito = useCallback(async (userId, userName) => {
    if (loadingActions) return;
    setLoadingActions(true);
    
    try {
      const isFavorite = favoritos.has(userId);
      const response = await fetch(`${API_BASE_URL}/api/favorites/${isFavorite ? 'remove' : 'add'}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ favorite_user_id: userId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFavoritos(prev => {
            const newSet = new Set(prev);
            isFavorite ? newSet.delete(userId) : newSet.add(userId);
            return newSet;
          });
        }
      }
    } catch (error) {
    }
    setLoadingActions(false);
  }, [loadingActions, favoritos, getAuthHeaders]);

  const toggleBloquear = useCallback(async (userId, userName) => {
    if (loadingActions) return;
    setLoadingActions(true);
    
    try {
      const isBlocked = bloqueados.has(userId);
      const response = await fetch(`${API_BASE_URL}/api/blocks/${isBlocked ? 'unblock' : 'block'}-user`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          blocked_user_id: userId,
          reason: isBlocked ? undefined : 'Bloqueado desde chat'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBloqueados(prev => {
            const newSet = new Set(prev);
            isBlocked ? newSet.delete(userId) : newSet.add(userId);
            return newSet;
          });
          
          // Si se bloquea, quitar de favoritos
          if (!isBlocked) {
            setFavoritos(prev => {
              const newSet = new Set(prev);
              newSet.delete(userId);
              return newSet;
            });
          }
        }
      }
    } catch (error) {
    }
    setLoadingActions(false);
  }, [loadingActions, bloqueados, getAuthHeaders]);

  // FUNCIÓN PARA VERIFICAR ESTADO DE BLOQUEO
  const getBlockStatus = useCallback((userId) => {
    const yoBloquee = bloqueados.has(userId);
    const meBloquearon = bloqueadoPor.has(userId);
    
    if (yoBloquee && meBloquearon) return 'mutuo';
    if (yoBloquee) return 'yo_bloquee';
    if (meBloquearon) return 'me_bloquearon';
    return null;
  }, [bloqueados, bloqueadoPor]);



  const abrirConversacion = useCallback(async (conversacion) => {
  
    setConversacionActiva(conversacion.room_name);
    
    // Marcar como visto INMEDIATAMENTE al abrir
    await marcarComoVisto(conversacion.room_name);
    const savedMessages = JSON.parse(localStorage.getItem(`messages_${conversacion.room_name}`) || '[]');
    if (savedMessages.length > 0) {
      setMensajes(savedMessages);
    }
    
    // Cargar mensajes
    await cargarMensajes(conversacion.room_name);
    
    if (isMobile) {
      setShowSidebar(false);
    }

    // Scroll al final
    setTimeout(() => {
      if (mensajesRef.current) {
        mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
      }
    }, 100);
    
  }, [cargarMensajes, isMobile, marcarComoVisto]);

  
  // 🔥 AGREGAR ESTOS DOS useEffect A TU ChatPrivado.jsx
  // Agrégalos después de la línea: const hasOpenedSpecificChat = useRef(false);

  // 2️⃣ MANEJO DE PARÁMETROS URL (fallback para compatibilidad)
  useEffect(() => {
    // Manejar parámetros URL como fallback (para compatibilidad)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');
    
    if (userId && userName && !hasOpenedSpecificChat.current && conversaciones.length > 0) {
      
      // Buscar conversación existente
      const conversacionExistente = conversaciones.find(conv => 
        conv.other_user_id === parseInt(userId)
      );
      
      if (conversacionExistente) {

        abrirConversacion(conversacionExistente);
      } else {

        
        // Generar room_name usando la misma lógica del backend
        const currentUserId = usuario.id;
        const otherUserId = parseInt(userId);
        const ids = [currentUserId, otherUserId].sort();
        const roomName = `chat_user_${ids[0]}_${ids[1]}`;
        
        const nuevaConversacion = {
          id: Date.now(),
          other_user_id: otherUserId,
          other_user_name: decodeURIComponent(userName),
          other_user_role: 'modelo',
          room_name: roomName,
          last_message: "Conversación iniciada - Envía tu primer mensaje",
          last_message_time: new Date().toISOString(),
          last_message_sender_id: null,
          unread_count: 0,
          avatar: `https://i.pravatar.cc/40?u=${otherUserId}`
        };
        
        setConversaciones(prev => [nuevaConversacion, ...prev]);
        setTimeout(() => abrirConversacion(nuevaConversacion), 100);
      }
      
      hasOpenedSpecificChat.current = true;
      
      // Limpiar URL
      setTimeout(() => {
        navigate('/message', { replace: true });
      }, 500);
    }
  }, [usuario.id, conversaciones, abrirConversacion, navigate]);


  // 🔥 AGREGAR useEffect PARA RECUPERAR CONVERSACIÓN AL CARGAR
  useEffect(() => {
    // Recuperar conversación activa del localStorage al cargar el componente
    const savedActiveChat = localStorage.getItem('activeChat');
    const savedActiveRoom = localStorage.getItem('activeRoomName');
    
    if (savedActiveChat && savedActiveRoom && !conversacionActiva) {
      try {
        const chatData = JSON.parse(savedActiveChat);

        
        // Verificar si no existe ya en conversaciones
        const exists = conversaciones.some(conv => conv.room_name === chatData.room_name);
        
        if (!exists) {

          setConversaciones(prev => [chatData, ...prev]);
        }
        
        // Restaurar como activa
        if (savedActiveRoom && !conversacionActiva) {

          setConversacionActiva(savedActiveRoom);
        }
        
      } catch (error) {

        localStorage.removeItem('activeChat');
        localStorage.removeItem('activeRoomName');
      }
    }
  }, [conversaciones.length]); // Solo cuando cambien las conversaciones
  // 🔥 AGREGA ESTE useEffect AL FINAL DE TUS useEffect EN ChatPrivado

useEffect(() => {
  // Auto-reordenar conversaciones cuando hay cambios
  const reorderConversations = () => {
    setConversaciones(prev => {
      // Solo reordenar si hay más de una conversación
      if (prev.length <= 1) return prev;
      
      const sorted = [...prev].sort((a, b) => {
        const timeA = new Date(a.last_message_time || 0).getTime();
        const timeB = new Date(b.last_message_time || 0).getTime();
        return timeB - timeA;
      });
      
      // Solo actualizar si el orden cambió
      const orderChanged = sorted.some((conv, index) => 
        conv.room_name !== prev[index]?.room_name
      );
      
      if (orderChanged) {

        
        return sorted;
      }
      
      return prev;
    });
  };

  // Reordenar cada 5 segundos para mantener el orden correcto
  const interval = setInterval(reorderConversations, 5000);
  
  return () => clearInterval(interval);
}, []);

// 🔥 TAMBIÉN AGREGA ESTE useEffect PARA REORDENAR CUANDO LLEGUEN MENSAJES NUEVOS
useEffect(() => {
  // Cuando cambie el conteo de mensajes no leídos, reordenar
  const totalUnread = conversaciones.reduce((count, conv) => {
    return count + calculateUnreadCount(conv);
  }, 0);
  
  if (totalUnread > 0) {

    
    // Reordenar después de un pequeño delay para asegurar que los datos estén actualizados
    setTimeout(() => {
      setConversaciones(prev => {
        const sorted = [...prev].sort((a, b) => {
          const timeA = new Date(a.last_message_time || 0).getTime();
          const timeB = new Date(b.last_message_time || 0).getTime();
          return timeB - timeA;
        });
        
        // Verificar si el orden cambió
        const orderChanged = sorted.some((conv, index) => 
          conv.room_name !== prev[index]?.room_name
        );
        
        if (orderChanged) {

          return sorted;
        }
        
        return prev;
      });
    }, 1000);
  }
}, [conversaciones, calculateUnreadCount]);

useEffect(() => {

  if (openChatWith && !hasOpenedSpecificChat.current) {

    
    // Marcar como procesado PRIMERO
    hasOpenedSpecificChat.current = true;
    
    // 🔥 VERIFICAR SI VIENE DEL BACKEND O ES LOCAL
    const isFromBackend = openChatWith.fromBackend || openChatWith.id;
    
    let conversacionFinal = openChatWith;
    
    if (!isFromBackend) {

      // Si es local, agregar campos que el backend habría proporcionado
      conversacionFinal = {
        ...openChatWith,
        // No marcar como persistente si no viene del backend
        createdLocally: true,
        needsSync: true // Marcar que necesita sincronización
      };
    } else {

    }
    

    
    // 🔥 SIEMPRE AGREGAR A LA LISTA (sin localStorage si es del backend)
    setConversaciones(prev => {
      const exists = prev.some(conv => 
        conv.room_name === conversacionFinal.room_name ||
        conv.other_user_id === conversacionFinal.other_user_id
      );
      
      if (exists) {

        return prev.map(conv => {
          if (conv.room_name === conversacionFinal.room_name || conv.other_user_id === conversacionFinal.other_user_id) {
            return { ...conversacionFinal, id: conv.id }; // Mantener ID local si existe
          }
          return conv;
        });
      }
      

      return [conversacionFinal, ...prev];
    });
    
    // 🔥 ABRIR CONVERSACIÓN
    setTimeout(() => {
      setConversacionActiva(conversacionFinal.room_name);
      
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
      
      // Marcar como visto
      if (typeof marcarComoVisto === 'function') {
        marcarComoVisto(conversacionFinal.room_name);
      }
      
      // Scroll al final
      setTimeout(() => {
        if (mensajesRef.current) {
          mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
        }
      }, 200);
      
    }, 100);
    
    // 🔥 LIMPIAR STATE
    setTimeout(() => {
      navigate('/message', { replace: true, state: {} });
    }, 2000);
    

  }
  
}, [openChatWith]);

// 🔥 useEffect para resetear flag
useEffect(() => {
  if (!openChatWith) {
    hasOpenedSpecificChat.current = false;
  }
}, [openChatWith]);


  // 🔥 FUNCIONES DE LLAMADAS SIMPLIFICADAS
  const iniciarLlamadaReal = useCallback(async (otherUserId, otherUserName) => {
    try {
      setCurrentCall({ id: otherUserId, name: otherUserName, status: 'initiating' });
      setIsCallActive(true);

      const response = await fetch(`${API_BASE_URL}/api/calls/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ receiver_id: otherUserId, call_type: 'video' })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentCall({
          id: otherUserId,
          name: otherUserName,
          callId: data.call_id,
          roomName: data.room_name,
          status: 'calling'
        });
      }
    } catch (error) {

      setIsCallActive(false);
      setCurrentCall(null);
    }
  }, [getAuthHeaders]);

  const cancelarLlamada = useCallback(() => {
    if (callPollingInterval) {
      clearInterval(callPollingInterval);
      setCallPollingInterval(null);
    }
    setIsCallActive(false);
    setCurrentCall(null);
  }, [callPollingInterval]);
  const buildCompleteImageUrl = (imagePath, baseUrl = API_BASE_URL) => {
    if (!imagePath) {
      return null;
    }
    
    // Si ya es una URL completa
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Limpiar baseUrl (remover trailing slash si existe)
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // Limpiar imagePath de barras escapadas
    const cleanImagePath = imagePath.replace(/\\/g, '');

    
    // Si comienza con storage/
    if (cleanImagePath.startsWith('storage/')) {
      return `${cleanBaseUrl}/${cleanImagePath}`;
    }
    
    // Si comienza con / es ruta absoluta
    if (cleanImagePath.startsWith('/')) {
      return `${cleanBaseUrl}${cleanImagePath}`;
    }
    
    // Si es solo el nombre del archivo
    return `${cleanBaseUrl}/storage/gifts/${cleanImagePath}`;
  };

  // =================== 2. MODIFICAR SOLO pedirRegalo (reemplaza tu función actual) ===================
  const pedirRegalo = useCallback(async (giftId, clientId, roomName, message = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gifts/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          gift_id: giftId,
          client_id: clientId,
          room_name: roomName,
          message: message
        })
      });

      const data = await response.json();
      

      
      if (data.success) {
        if (data.chat_message) {
       
          // 🔥 CONSTRUIR URL COMPLETA DESDE EL FRONTEND
          let processedExtraData = { ...data.chat_message.extra_data };
          
          if (processedExtraData.gift_image) {
            const originalImagePath = processedExtraData.gift_image;
            const completeImageUrl = buildCompleteImageUrl(originalImagePath);
          
            
            // Actualizar con la URL completa
            processedExtraData.gift_image = completeImageUrl;
          }
          
          // 🔥 FIX: No hacer JSON.parse si ya es un objeto - MANTENER TU LÓGICA
          let processedMessage = {
            ...data.chat_message,
            // Asegurar que gift_data esté disponible para el renderizado
            gift_data: processedExtraData, // 🔥 AHORA CON URL COMPLETA
            extra_data: processedExtraData  // También actualizar extra_data
          };
          
          // Agregar el mensaje directamente a la lista
          setMensajes(prev => {
            const newMessages = [...prev, processedMessage];
            return newMessages;
          });
          
          // Actualizar conversación activa con preview
          setConversaciones(prev => 
            prev.map(conv => 
              conv.room_name === roomName
                ? {
                    ...conv,
                    last_message: `🎁 Solicitud: ${processedExtraData.gift_name || 'Regalo'}`,
                    last_message_time: new Date().toISOString(),
                    last_message_sender_id: usuario.id
                  }
                : conv
            )
          );
          
          // Scroll al final
          setTimeout(() => {
            if (mensajesRef.current) {
              mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
            }
          }, 100);
        }
        

        return { success: true, data: data.request };
      } else {

        return { success: false, error: data.error || 'Error desconocido' };
      }
    } catch (error) {

      return { success: false, error: 'Error de conexión' };
    }
  }, [getAuthHeaders, usuario.id]);

  const handleRequestGift = useCallback(async (giftId, recipientId, roomName, message) => {
    try {
      setLoadingGift(true);
      const result = await pedirRegalo(giftId, recipientId, roomName, message);
      if (result.success) {
        setShowGiftsModal(false);
      }
      return result;
    } catch (error) {
      return { success: false, error: 'Error inesperado' };
    } finally {
      setLoadingGift(false);
    }
  }, [pedirRegalo]);

  const handleAcceptGift = useCallback(async (requestId, securityHash = null) => {
  try {
    setLoadingGift(true);

    if (pendingRequests && pendingRequests.length > 0) {

      pendingRequests.forEach((req, index) => {
        // 🔍 VERIFICAR SI EL HASH ESTÁ EN gift_data
        if (req.gift_data) {
          try {
            const giftData = typeof req.gift_data === 'string' 
              ? JSON.parse(req.gift_data) 
              : req.gift_data;

              
            if (giftData.security_hash || giftData.hash) {

              
            }
          } catch (parseError) {

          }
        }
      });
    }

    
    // 🔥 BUSCAR SECURITY HASH CON MÚLTIPLES ESTRATEGIAS
    let finalSecurityHash = securityHash;
    
    if (!finalSecurityHash) {

      
      const pendingRequest = pendingRequests?.find(req => req.id === parseInt(requestId));
      
      if (pendingRequest) {
        
        // 🔍 ESTRATEGIA 1: security_hash directo
        if (pendingRequest.security_hash) {
          finalSecurityHash = pendingRequest.security_hash;
        }
        // 🔍 ESTRATEGIA 2: buscar en gift_data
        else if (pendingRequest.gift_data) {
          try {
            const giftData = typeof pendingRequest.gift_data === 'string' 
              ? JSON.parse(pendingRequest.gift_data) 
              : pendingRequest.gift_data;
            
            if (giftData.security_hash) {
              finalSecurityHash = giftData.security_hash;

            } else if (giftData.hash) {
              finalSecurityHash = giftData.hash;

            }
          } catch (parseError) {

          }
        }
        
        // 🔍 ESTRATEGIA 3: Generar hash en frontend (último recurso)
        if (!finalSecurityHash) {

          
          try {
            // Generar usando los mismos parámetros que el backend
            const currentHour = new Date().toISOString().slice(0, 13).replace('T', '-');
            const sessionId = localStorage.getItem('app_session_id') || 'web_fallback';
            
            // Recrear el hash como lo hace el backend
            const data = [
              usuario.id.toString(),
              sessionId,
              currentHour,
              'web-app-key',
              'web_client'
            ].join('|');
            
            // Función SHA-256 simple
            const encoder = new TextEncoder();
            const msgBuffer = encoder.encode(data);
            
            crypto.subtle.digest('SHA-256', msgBuffer).then(hashBuffer => {
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const generatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
              
              // Intentar con el hash generado
              finalSecurityHash = generatedHash;
            });
            
          } catch (hashError) {

          }
        }
        
      } else {

      }
    }
    
    // 🚨 SI AUN NO HAY HASH, INTENTAR SIN HASH (PARA DEBUG)
    if (!finalSecurityHash) {

      
      // 🔥 PREGUNTA AL USUARIO QUE QUIERE HACER
      const userChoice = confirm(
        'No se encontró el hash de seguridad. ¿Quieres:\n\n' +
        '✅ Aceptar - Intentar enviar sin hash (modo debug)\n' +
        '❌ Cancelar - Cancelar la operación'
      );
      
      if (!userChoice) {
        return { success: false, error: 'Operación cancelada por el usuario' };
      }
      

      finalSecurityHash = null; // Explícitamente null para debug
    } else {

    }
    

    
    // 🔥 LLAMAR acceptGiftRequest 
    const result = await acceptGiftRequest(requestId, finalSecurityHash);
    
    if (result.success) {
      // 🎁 MOSTRAR NOTIFICACIÓN DE ÉXITO
      if (result.giftInfo) {
        const successMessage = `¡${result.giftInfo.name} enviado exitosamente!${result.newBalance !== undefined ? ` Saldo: ${result.newBalance}` : ''}`;
        
        // Notificación del navegador
        if (Notification.permission === 'granted') {
          new Notification('🎁 Regalo Enviado', {
            body: successMessage,
            icon: result.giftInfo.image || '/favicon.ico'
          });
        }
        
        alert(successMessage);
      }
      
    } else {

      
      let errorMsg = result.error;
      
      // Personalizar mensajes de error
      if (result.error === 'insufficient_balance') {
        errorMsg = '💰 Saldo insuficiente para enviar este regalo';
      } else if (result.error === 'invalid_request') {
        errorMsg = '⏰ Esta solicitud ya expiró o fue procesada';
      } else if (result.error === 'security_violation') {
        errorMsg = '🔐 Error de seguridad. Recarga la página e inténtalo de nuevo';
      } else if (result.error === 'user_banned') {
        errorMsg = '🚫 ' + (result.ban_info?.reason || 'Tu cuenta está temporalmente suspendida');
      } else if (result.error === 'missing_parameters') {
        errorMsg = '📋 Faltan parámetros requeridos. Los datos enviados fueron:\n' + 
                  (result.sentFields ? result.sentFields.join(', ') : 'No disponible');

      }
      
      alert(errorMsg);
    }
    
    return result;
    
  } catch (error) {

    alert('Error inesperado enviando el regalo. Inténtalo de nuevo.');
    return { success: false, error: 'Error inesperado: ' + error.message };
  } finally {
    setLoadingGift(false);
  }
  }, [acceptGiftRequest, pendingRequests, usuario.id]);

  const enviarRegaloDirecto = useCallback(async (giftId, recipientId, roomName, message = '', requiredGiftCoins) => {
    try {

      
      const authToken = localStorage.getItem("token");
      
      const response = await fetch(`${API_BASE_URL}/api/gifts/send-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          gift_id: giftId,
          recipient_id: recipientId,
          room_name: roomName,
          message: message || '',
          sender_type: 'cliente',
          expected_cost: requiredGiftCoins
        })
      });

      const data = await response.json();
      
      if (data.success) {

        
        // Procesar mensaje del chat si viene
        if (data.chat_message) {
          let processedExtraData = { ...data.chat_message.extra_data };
          
          if (processedExtraData.gift_image) {
            const completeImageUrl = buildCompleteImageUrl(processedExtraData.gift_image);
            processedExtraData.gift_image = completeImageUrl;
          }
          
          let processedMessage = {
            ...data.chat_message,
            gift_data: processedExtraData,
            extra_data: processedExtraData
          };
          
          // Agregar mensaje al chat
          setMensajes(prev => [...prev, processedMessage]);
          
          // Actualizar conversación
          setConversaciones(prev => 
            prev.map(conv => 
              conv.room_name === roomName
                ? {
                    ...conv,
                    last_message: `🎁 Regalo: ${processedExtraData.gift_name || 'Regalo'}`,
                    last_message_time: new Date().toISOString(),
                    last_message_sender_id: usuario.id
                  }
                : conv
            )
          );
          
          // Scroll al final
          setTimeout(() => {
            if (mensajesRef.current) {
              mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
            }
          }, 100);
        }
        
        // Mostrar notificación de éxito
        if (data.new_balance !== undefined) {
          alert(`¡Regalo enviado! Nuevo saldo: ${data.new_balance} monedas`);
        }
        
        return { success: true, data };
      } else {

        
        // Personalizar mensajes de error
        let errorMsg = data.error;
        if (data.error === 'insufficient_balance') {
          errorMsg = '💰 Saldo insuficiente para enviar este regalo';
        } else if (data.error === 'user_banned') {
          errorMsg = '🚫 Tu cuenta está temporalmente suspendida';
        }
        
        alert(errorMsg);
        return { success: false, error: data.error };
      }
    } catch (error) {
      alert('Error de conexión al enviar regalo');
      return { success: false, error: 'Error de conexión' };
    }
  }, [buildCompleteImageUrl, usuario.id, setMensajes, setConversaciones, mensajesRef]);
  const updateBalance = useCallback(async () => {
  try {
    const authToken = localStorage.getItem('token');
    if (!authToken) return;


    
    // OBTENER BALANCE DE COINS (monedas generales)
    const coinsResponse = await fetch(`${API_BASE_URL}/api/client-balance/my-balance/quick`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (coinsResponse.ok) {
      const coinsData = await coinsResponse.json();
      if (coinsData.success) {
        setUserBalance(coinsData.total_coins || 0);

      }
    }

    // OBTENER BALANCE DE GIFTS (regalos específicos) - 🔥 FIX AQUÍ
    const giftsResponse = await fetch(`${API_BASE_URL}/api/gifts/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (giftsResponse.ok) {
      const giftsData = await giftsResponse.json();

      
      if (giftsData.success) {
        // 🔥 FIX: Acceder correctamente a los datos
        const giftBalanceValue = giftsData.balance?.gift_balance || 0;
        setGiftBalance(giftBalanceValue);
      }
    }

  } catch (error) {
  }
  }, []);

useEffect(() => {
  if (usuario.id && usuario.rol === 'cliente') {
    updateBalance();
    
    // Actualizar balance cada 30 segundos
    const balanceInterval = setInterval(updateBalance, 30000);
    return () => clearInterval(balanceInterval);
  }
}, [usuario.id, usuario.rol, updateBalance]);


  const handleRejectGift = useCallback(async (requestId) => {
    try {
      setLoadingGift(true);
      
      
      const result = await rejectGiftRequest(requestId);
      
      if (result.success) {

      } else {
        alert(result.error || 'Error rechazando el regalo');
      }
      
      return result;
    } catch (error) {

      alert('Error inesperado');
      return { success: false, error: 'Error inesperado' };
    } finally {
      setLoadingGift(false);
    }
  }, [rejectGiftRequest]);
  const handleSendGift = useCallback(async (giftId, recipientId, roomName, message, requiredCoins) => {
  try {
    setLoadingGift(true);
    
    // VERIFICAR SALDO ANTES DE ENVIAR
    if (giftBalance < requiredCoins) {
      alert(`Saldo insuficiente. Necesitas ${requiredCoins} gift coins, tienes ${giftBalance}`);
      return { success: false, error: 'Saldo insuficiente' };
    }
    
    const result = await enviarRegaloDirecto(giftId, recipientId, roomName, message, requiredCoins);
    
    if (result.success) {
      setShowGiftsModal(false);

  
      // ACTUALIZAR BALANCE DESPUÉS DE ENVIAR
      setTimeout(() => {
        updateBalance();
      }, 1000);
      
      // Notificación de éxito
      if (Notification.permission === 'granted') {
        new Notification('🎁 Regalo Enviado', {
          body: 'Tu regalo ha sido enviado exitosamente',
          icon: '/favicon.ico'
        });
      }
    }
    
    return result;
  } catch (error) {
    alert('Error inesperado al enviar regalo');
    return { success: false, error: 'Error inesperado' };
  } finally {
    setLoadingGift(false);
  }
}, [enviarRegaloDirecto, setLoadingGift, setShowGiftsModal, giftBalance, updateBalance]);


  // 🔥 FUNCIONES DE APODOS
  const abrirModalApodo = useCallback((userId, userName) => {
    setNicknameTarget({ userId, userName });
    setNicknameValue(apodos[userId] || '');
    setShowNicknameModal(true);
  }, [apodos]);

  const guardarApodo = useCallback(async () => {
    if (!nicknameTarget || !nicknameValue.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/nicknames/set`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          target_user_id: nicknameTarget.userId,
          nickname: nicknameValue.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        setApodos(prev => ({
          ...prev,
          [nicknameTarget.userId]: nicknameValue.trim()
        }));
        setShowNicknameModal(false);
        setNicknameTarget(null);
        setNicknameValue('');
      }
    } catch (error) {
    }
  }, [nicknameTarget, nicknameValue, getAuthHeaders]);

// 🔥 SOLUCIÓN MÁS SIMPLE: Construir URL directamente en renderMensaje

const renderMensaje = useCallback((mensaje) => {
  const textoMensaje = mensaje.message || mensaje.text || null;
  const esUsuarioActual = mensaje.user_id === usuario.id;
  

  // 🔥 FIX: Permitir que los regalos se rendericen SIN texto
  if ((!textoMensaje || textoMensaje.trim() === '') && 
      !['gift_request', 'gift_sent', 'gift_received', 'gift'].includes(mensaje.type)) {
    return null; // Solo bloquear si NO es regalo
  }

  switch (mensaje.type) {
    case 'gift':
      return (
        <div className="flex items-center gap-2 text-yellow-400">
          <Gift size={16} />
          <span>Envió: {textoMensaje}</span>
        </div>
      );

    case 'gift_request':
      // 🔥 TU CÓDIGO ACTUAL ESTÁ BIEN - MANTENERLO
      const giftData = mensaje.gift_data || mensaje.extra_data || {};
      let finalGiftData = giftData;
      
      if (typeof mensaje.extra_data === 'string') {
        try {
          finalGiftData = JSON.parse(mensaje.extra_data);
        } catch (e) {
          finalGiftData = giftData;
        }
      }
      
      // Construir URL de imagen
      let imageUrl = null;
      if (finalGiftData.gift_image) {
        const imagePath = finalGiftData.gift_image;
        const baseUrl = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          imageUrl = imagePath;
        } else {
          const cleanPath = imagePath.replace(/\\/g, '');
          if (cleanPath.startsWith('storage/')) {
            imageUrl = `${cleanBaseUrl}/${cleanPath}`;
          } else if (cleanPath.startsWith('/')) {
            imageUrl = `${cleanBaseUrl}${cleanPath}`;
          } else {
            imageUrl = `${cleanBaseUrl}/storage/gifts/${cleanPath}`;
          }
        }
      }
      
      return (
        <div className="bg-gradient-to-br from-[#ff007a]/20 via-[#cc0062]/20 to-[#990047]/20 rounded-xl p-4 max-w-xs border border-[#ff007a]/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="bg-gradient-to-r from-[#ff007a] to-[#cc0062] rounded-full p-2">
              <Gift size={16} className="text-white" />
            </div>
            <span className="text-pink-100 text-sm font-semibold">Solicitud de Regalo</span>
          </div>
          
          {imageUrl && (
            <div className="mb-3 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-purple-300/30">
                <img 
                  src={imageUrl} 
                  alt={finalGiftData.gift_name || 'Regalo'}
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentNode.querySelector('.gift-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="gift-fallback hidden w-12 h-12 items-center justify-center">
                  <Gift size={20} className="text-purple-300" />
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center space-y-2">
            <p className="text-white font-bold text-base">
              {finalGiftData.gift_name || 'Regalo Especial'}
            </p>
            
            {finalGiftData.gift_price && (
              <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-lg px-3 py-1 border border-amber-300/30">
                <span className="text-amber-200 font-bold text-sm">
                  ✨ {finalGiftData.gift_price} monedas
                </span>
              </div>
            )}
            
            {finalGiftData.original_message && (
              <div className="bg-black/20 rounded-lg p-2 mt-3 border-l-4 border-[#ff007a]">
                <p className="text-purple-100 text-xs italic">
                  💭 "{finalGiftData.original_message}"
                </p>
              </div>
            )}
          </div>
        </div>
      );

    // 🔥 AGREGAR CASO FALTANTE: gift_received
    case 'gift_received':
      const receivedGiftData = mensaje.gift_data || mensaje.extra_data || {};
      
      let finalReceivedGiftData = receivedGiftData;
      if (typeof mensaje.extra_data === 'string') {
        try {
          finalReceivedGiftData = JSON.parse(mensaje.extra_data);
        } catch (e) {
          finalReceivedGiftData = receivedGiftData;
        }
      }
      
      // Construir URL de imagen
      let receivedImageUrl = null;
      if (finalReceivedGiftData.gift_image) {
        const imagePath = finalReceivedGiftData.gift_image;
        const baseUrl = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          receivedImageUrl = imagePath;
        } else {
          const cleanPath = imagePath.replace(/\\/g, '');
          if (cleanPath.startsWith('storage/')) {
            receivedImageUrl = `${cleanBaseUrl}/${cleanPath}`;
          } else if (cleanPath.startsWith('/')) {
            receivedImageUrl = `${cleanBaseUrl}${cleanPath}`;
          } else {
            receivedImageUrl = `${cleanBaseUrl}/storage/gifts/${cleanPath}`;
          }
        }
      }
      
      return (
        <div className="bg-gradient-to-br from-green-900/40 via-emerald-900/40 to-teal-900/40 rounded-xl p-4 max-w-xs border border-green-300/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-2">
              <Gift size={16} className="text-white" />
            </div>
            <span className="text-green-100 text-sm font-semibold">¡Regalo Recibido!</span>
          </div>
          
          {receivedImageUrl && (
            <div className="mb-3 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-green-300/30">
                <img 
                  src={receivedImageUrl} 
                  alt={finalReceivedGiftData.gift_name || 'Regalo'}
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentNode.querySelector('.gift-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="gift-fallback hidden w-12 h-12 items-center justify-center">
                  <Gift size={20} className="text-green-300" />
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center space-y-2">
            <p className="text-white font-bold text-base">
              {finalReceivedGiftData.gift_name || 'Regalo Especial'}
            </p>
            
            <div className="bg-black/20 rounded-lg p-2 mt-3 border-l-4 border-green-400">
              <p className="text-green-100 text-xs font-medium">
                💰 ¡{finalReceivedGiftData.client_name || 'El cliente'} te envió este regalo!
              </p>
            </div>
          </div>
        </div>
      );

    case 'gift_sent':
      // Para clientes que enviaron el regalo
      const sentGiftData = mensaje.gift_data || mensaje.extra_data || {};
      
      let finalSentGiftData = sentGiftData;
      if (typeof mensaje.extra_data === 'string') {
        try {
          finalSentGiftData = JSON.parse(mensaje.extra_data);
        } catch (e) {
          finalSentGiftData = sentGiftData;
        }
      }
      
      // Construir URL de imagen
      let sentImageUrl = null;
      if (finalSentGiftData.gift_image) {
        const imagePath = finalSentGiftData.gift_image;
        const baseUrl = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          sentImageUrl = imagePath;
        } else {
          const cleanPath = imagePath.replace(/\\/g, '');
          if (cleanPath.startsWith('storage/')) {
            sentImageUrl = `${cleanBaseUrl}/${cleanPath}`;
          } else if (cleanPath.startsWith('/')) {
            sentImageUrl = `${cleanBaseUrl}${cleanPath}`;
          } else {
            sentImageUrl = `${cleanBaseUrl}/storage/gifts/${cleanPath}`;
          }
        }
      }
      
      return (
        <div className="bg-gradient-to-br from-blue-900/40 via-cyan-900/40 to-teal-900/40 rounded-xl p-4 max-w-xs border border-blue-300/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-2">
              <Gift size={16} className="text-white" />
            </div>
            <span className="text-blue-100 text-sm font-semibold">Regalo Enviado</span>
          </div>
          
          {sentImageUrl && (
            <div className="mb-3 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-blue-300/30">
                <img 
                  src={sentImageUrl} 
                  alt={finalSentGiftData.gift_name || 'Regalo'}
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentNode.querySelector('.gift-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="gift-fallback hidden w-12 h-12 items-center justify-center">
                  <Gift size={20} className="text-blue-300" />
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center space-y-2">
            <p className="text-white font-bold text-base">
              {finalSentGiftData.gift_name || 'Regalo Especial'}
            </p>
            
            {finalSentGiftData.gift_price && (
              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg px-3 py-1 border border-blue-300/30">
                <span className="text-blue-200 font-bold text-sm">
                  -{finalSentGiftData.gift_price} monedas
                </span>
              </div>
            )}
          </div>
        </div>
      );

    case 'emoji':
      return <div className="text-2xl">{textoMensaje}</div>;
    
    default:
      // Mensajes normales con traducción
      if (translationSettings?.enabled && TranslatedMessage && textoMensaje?.trim()) {
        const tipoMensaje = esUsuarioActual ? 'local' : 'remote';
        const shouldShowTranslation = !esUsuarioActual || translationSettings.translateOutgoing;

        if (shouldShowTranslation) {
          return (
            <TranslatedMessage
              message={{
                text: textoMensaje.trim(),
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
      }
      return <span className="text-white">{textoMensaje}</span>;
  }
}, [usuario.id, translationSettings, TranslatedMessage]);

  const formatearTiempo = useCallback((timestamp) => {
    const fecha = new Date(timestamp);
    return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }, []);

  // 🔥 EFECTOS SIMPLIFICADOS
  useEffect(() => {
    cargarDatosUsuario();
    // Cargar última vez visto desde localStorage
    const savedLastSeen = JSON.parse(localStorage.getItem('chatLastSeen') || '{}');
    setLastSeenMessages(savedLastSeen);
    
    // Pedir permisos para notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
      });
    }
  }, []);

  useEffect(() => {
    if (usuario.id && !loading) {
      cargarConversaciones();
      cargarEstadosIniciales(); // Cargar favoritos, bloqueos y apodos
      loadGifts();
    }
  }, [usuario.id, usuario.rol, cargarEstadosIniciales]);
  useEffect(() => {
  if (!usuario.id || usuario.rol !== 'cliente') return;
  
  
  const interval = setInterval(async () => {
    try {
      await loadPendingRequests();
    } catch (error) {
    }
  }, 3000); // Cada 3 segundos
  
  return () => {
    clearInterval(interval);
  };
  }, [usuario.id, usuario.rol, loadPendingRequests]);

  // Polling de mensajes en conversación activa - TIEMPO REAL
  useEffect(() => {
  let interval;
  if (conversacionActiva) {
    
    interval = setInterval(async () => {
      try {
        let allMessages = [];

        // 🔥 PASO 1: Cargar mensajes del room principal
        const response = await fetch(`${API_BASE_URL}/api/chat/messages/${conversacionActiva}`, {
          method: 'GET',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages) {
            allMessages = [...allMessages, ...data.messages];
          }
        }

        // 🔥 PASO 2: NUEVO - Cargar mensajes del room específico del cliente
        const clientRoomName = `${conversacionActiva}_client`;

        const clientResponse = await fetch(`${API_BASE_URL}/api/chat/messages/${clientRoomName}`, {
          method: 'GET',
          headers: getAuthHeaders()
        });

        if (clientResponse.ok) {
          const clientData = await clientResponse.json();
          if (clientData.success && clientData.messages) {
            allMessages = [...allMessages, ...clientData.messages];
          }
        } else {
        }

        // 🔥 PASO 3: Ordenar todos los mensajes por fecha
        allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // 🔥 PASO 4: Comparar con mensajes actuales
        const currentMessageIds = new Set(mensajes.map(m => m.id));
        const newMessages = allMessages.filter(m => !currentMessageIds.has(m.id));
        
        if (newMessages.length > 0) {
          
          // 🔍 DETECTAR TIPOS DE MENSAJES NUEVOS (solo para logging)
          const giftSentMessages = newMessages.filter(msg => msg.type === 'gift_sent');
          const giftRequestMessages = newMessages.filter(msg => msg.type === 'gift_request');
          const normalMessages = newMessages.filter(msg => !['gift_sent', 'gift_request', 'gift_received'].includes(msg.type));
          
          if (giftSentMessages.length > 0) {
          }
          if (giftRequestMessages.length > 0) {
          }
          if (normalMessages.length > 0) {
          }
          
          // 🔥 PASO 5: Actualizar con TODOS los mensajes (principales + cliente)
          setMensajes(allMessages);
          
          // Marcar como visto inmediatamente si estás en la conversación
          await marcarComoVisto(conversacionActiva);
          
          // Auto-scroll al final
          setTimeout(() => {
            if (mensajesRef.current) {
              mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
            }
          }, 100);

        } else {
        }
      } catch (error) {
      }
    }, 3000); // Cada 3 segundos
  }
  
  return () => {
    if (interval) {
      clearInterval(interval);
    }
  };
  }, [conversacionActiva, mensajes, getAuthHeaders, marcarComoVisto]);
  // Detectar móvil
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Polling OPTIMIZADO - más frecuente y sin loaders
  useEffect(() => {
    if (!usuario.id) return;
    
    const interval = setInterval(async () => {
      // SIEMPRE hacer polling sin mostrar loading
      await cargarConversaciones();
    }, 5000); // Cada 5 segundos para tiempo más real
    
    return () => clearInterval(interval);
  }, [usuario.id, cargarConversaciones]);

  // Mostrar notificación cuando llegue mensaje nuevo (fuera de conversación activa)
  useEffect(() => {
    const checkForNewMessages = () => {
      conversaciones.forEach(conv => {
        const unreadCount = calculateUnreadCount(conv);
        if (unreadCount > 0 && conv.room_name !== conversacionActiva) {
          // Solo mostrar notificación si no estás en esa conversación
          
          // Opcional: Mostrar notificación del navegador
          if (Notification.permission === 'granted') {
            new Notification(`Mensaje nuevo de ${conv.other_user_name}`, {
              body: conv.last_message.substring(0, 50) + '...',
              icon: '/favicon.ico',
              tag: conv.room_name // Evita notificaciones duplicadas
            });
          }
        }
      });
    };

    // Verificar mensajes nuevos cada vez que cambien las conversaciones
    checkForNewMessages();
  }, [conversaciones, calculateUnreadCount, conversacionActiva]);

  // Calcular y mostrar conteo global de notificaciones
  const totalUnreadCount = useMemo(() => {
    const total = conversaciones.reduce((count, conv) => {
      return count + calculateUnreadCount(conv);
    }, 0);
    return total;
  }, [conversaciones, calculateUnreadCount]);

  // Cargar usuarios online - FUNCIONALIDAD REAL
  useEffect(() => {
    const cargarUsuariosOnline = async () => {
      if (!usuario.id) return;
      
      try {
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
        } else {
          // Fallback con datos simulados
          setOnlineUsers(new Set([2, 3, 4, 5]));
        }
      } catch (error) {
        // Fallback con datos simulados
        setOnlineUsers(new Set([2, 3, 4, 5]));
      }
    };

    if (usuario.id) {
      // Cargar inicial
      cargarUsuariosOnline();
      
      // Actualizar cada 30 segundos para estado online en tiempo real
      const interval = setInterval(cargarUsuariosOnline, 30000);
      return () => clearInterval(interval);
    }
  }, [usuario.id, getAuthHeaders]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1c20] to-[#2b2d31] text-white p-6">
      <div className="relative">
        <Header />
        
        {/* Botón chat móvil */}
        {isMobile && conversacionActiva && !showSidebar && (
          <button
            onClick={() => setShowSidebar(true)}
            className="fixed top-[29px] right-24 z-[100] bg-[#ff007a] hover:bg-[#cc0062] p-2 rounded-full shadow-xl transition-colors"
          >
            <MessageSquare size={18} className="text-white" />
            {/* Mostrar conteo global en botón móvil */}
            {totalUnreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-white">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </div>
            )}
          </button>
        )}
      </div>

      <div className="p-2">
        <div className={`flex rounded-xl overflow-hidden shadow-lg ${
          isMobile ? 'h-[calc(100vh-80px)]' : 'h-[83vh]'
        } border border-[#ff007a]/10 relative`}>
          
          {/* Sidebar de conversaciones */}
          <aside className={`${
            isMobile
              ? `fixed inset-y-0 left-0 z-40 w-full bg-[#2b2d31] transform transition-transform ${
                  showSidebar ? 'translate-x-0' : '-translate-x-full'
                }`
              : 'w-1/3 bg-[#2b2d31]'
          } p-4 overflow-y-auto`}>
            
            {isMobile && (
              <button
                onClick={() => setShowSidebar(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            )}

            {/* Búsqueda */}
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
                  <p className="text-xs text-white/60">Cargando...</p>
                </div>
              ) : conversacionesFiltradas.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/60">No hay conversaciones</p>
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
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#ff007a] to-[#cc0062] rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {getInitial(getDisplayName(conv.other_user_id, conv.other_user_name))}
                          </div>
                          
                          {/* Indicador de estado: Online/Offline o Bloqueado */}
                          {(() => {
                            const blockStatus = getBlockStatus(conv.other_user_id);
                            if (blockStatus === 'yo_bloquee') {
                              return <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#2b2d31]" title="Bloqueado por ti" />;
                            } else if (blockStatus === 'me_bloquearon') {
                              return <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-[#2b2d31]" title="Te bloqueó" />;
                            } else if (blockStatus === 'mutuo') {
                              return <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-700 rounded-full border-2 border-[#2b2d31]" title="Bloqueo mutuo" />;
                            } else {
                              return <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${
                                isOnline ? 'bg-green-500' : 'bg-gray-500'
                              }`} title={isOnline ? 'En línea' : 'Desconectado'} />;
                            }
                          })()}
                          
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -left-1 bg-[#ff007a] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {unreadCount}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {getDisplayName(conv.other_user_id, conv.other_user_name)}
                          </p>
                          <div className="text-xs text-white/60 truncate">
                            {conv.last_message_sender_id === usuario.id ? (
                              <span><span className="text-white/40">Tú:</span> {conv.last_message}</span>
                            ) : (
                              conv.last_message
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
              ? `${showSidebar ? 'hidden' : 'w-full h-full'}`
              : 'w-2/3'
          } bg-[#0a0d10] flex flex-col relative overflow-hidden`}>
            
            {!conversacionActiva ? (
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
                {/* Header de conversación */}
                <div className="bg-[#2b2d31] px-5 py-3 flex justify-between items-center border-b border-[#ff007a]/20">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#ff007a] to-[#cc0062] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {getInitial(conversacionSeleccionada?.other_user_name)}
                      </div>
                      {/* Indicador de estado en header */}
                      {(() => {
                        const blockStatus = getBlockStatus(conversacionSeleccionada?.other_user_id);
                        if (blockStatus === 'yo_bloquee') {
                          return <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#2b2d31]" title="Bloqueado por ti" />;
                        } else if (blockStatus === 'me_bloquearon') {
                          return <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-[#2b2d31]" title="Te bloqueó" />;
                        } else if (blockStatus === 'mutuo') {
                          return <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-700 rounded-full border-2 border-[#2b2d31]" title="Bloqueo mutuo" />;
                        } else {
                          return <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${
                            onlineUsers.has(conversacionSeleccionada?.other_user_id) ? 'bg-green-500' : 'bg-gray-500'
                          }`} title={onlineUsers.has(conversacionSeleccionada?.other_user_id) ? 'En línea' : 'Desconectado'} />;
                        }
                      })()}
                    </div>
                    <div>
                      <span className="font-semibold block">
                        {getDisplayName(conversacionSeleccionada?.other_user_id, conversacionSeleccionada?.other_user_name)}
                      </span>
                      {/* Mostrar estado de bloqueo */}
                      {conversacionSeleccionada && (() => {
                        const blockStatus = getBlockStatus(conversacionSeleccionada.other_user_id);
                        if (blockStatus === 'yo_bloquee') {
                          return (
                            <span className="text-xs text-red-400">
                              <Ban size={12} className="inline mr-1" />
                              Bloqueado por ti
                            </span>
                          );
                        } else if (blockStatus === 'me_bloquearon') {
                          return (
                            <span className="text-xs text-orange-400">
                              <Ban size={12} className="inline mr-1" />
                              Te bloqueó
                            </span>
                          );
                        } else if (blockStatus === 'mutuo') {
                          return (
                            <span className="text-xs text-red-600">
                              <Ban size={12} className="inline mr-1" />
                              Bloqueo mutuo
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">

                    <div className="relative">
                      <button
                        onClick={() => setShowMainSettings(!showMainSettings)}
                        className="text-white hover:text-[#ff007a] transition-colors p-2 hover:bg-[#3a3d44] rounded-lg"
                      >
                        <Settings size={20} />
                      </button>

                      {showMainSettings && (
                        <div className="absolute right-0 mt-2 bg-[#1f2125] border border-[#ff007a]/30 rounded-xl shadow-lg z-50 w-64">
                          <button
                            onClick={() => {
                              setShowTranslationSettings(true);
                              setShowMainSettings(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-[#2b2d31] transition text-left group"
                          >
                            <Globe className="text-[#ff007a]" size={20} />
                            <div className="flex-1">
                              <span className="text-white text-sm font-medium">Traducción</span>
                              <div className="text-xs text-gray-400">
                                {translationSettings?.enabled ? 'Activa' : 'Inactiva'}
                              </div>
                            </div>
                            <ArrowRight className="text-gray-400" size={16} />
                          </button>

                          <button
                            onClick={() => {
                              toggleFavorito(
                                conversacionSeleccionada?.other_user_id,
                                conversacionSeleccionada?.other_user_name
                              );
                              setShowMainSettings(false);
                            }}
                            disabled={loadingActions}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm text-white"
                          >
                            {loadingActions ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff007a]"></div>
                            ) : (
                              <Star 
                                size={16} 
                                className={favoritos.has(conversacionSeleccionada?.other_user_id) ? 'fill-yellow-400 text-yellow-400' : 'text-white'} 
                              />
                            )}
                            {favoritos.has(conversacionSeleccionada?.other_user_id)
                              ? 'Quitar Favorito'
                              : 'Agregar Favorito'
                            }
                          </button>

                          <button
                            onClick={() => {
                              if (conversacionSeleccionada) {
                                abrirModalApodo(
                                  conversacionSeleccionada.other_user_id,
                                  conversacionSeleccionada.other_user_name
                                );
                              }
                              setShowMainSettings(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#2b2d31] text-sm text-white transition-colors"
                          >
                            <Pencil size={16} />
                            Cambiar apodo
                          </button>

                          <button
                            onClick={() => {
                              if (conversacionSeleccionada) {
                                toggleBloquear(
                                  conversacionSeleccionada.other_user_id,
                                  conversacionSeleccionada.other_user_name
                                );
                              }
                              setShowMainSettings(false);
                            }}
                            disabled={loadingActions}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm text-red-400"
                          >
                            {loadingActions ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                            ) : (
                              <Ban size={16} />
                            )}
                            {bloqueados.has(conversacionSeleccionada?.other_user_id)
                              ? 'Desbloquear'
                              : 'Bloquear'
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mensajes + Indicador de bloqueo */}
                <div
                  ref={mensajesRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#ff007a #2b2d31'
                  }}
                >
                  {/* INDICADOR DE USUARIO BLOQUEADO */}
                  {conversacionSeleccionada && bloqueados.has(conversacionSeleccionada.other_user_id) && (
                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <Ban size={20} className="text-red-400" />
                        <div className="flex-1">
                          <p className="text-red-300 font-semibold">🚫 Usuario Bloqueado</p>
                          <p className="text-red-200 text-sm mb-3">
                            Has bloqueado a <span className="font-bold">{getDisplayName(conversacionSeleccionada.other_user_id, conversacionSeleccionada.other_user_name)}</span>.
                            No pueden enviarte mensajes ni llamarte.
                          </p>
                          <button
                            onClick={() => {
                              if (confirm(`¿Desbloquear a ${conversacionSeleccionada.other_user_name}?`)) {
                                toggleBloquear(conversacionSeleccionada.other_user_id, conversacionSeleccionada.other_user_name);
                              }
                            }}
                            disabled={loadingActions}
                            className="bg-[#ff007a] hover:bg-[#e6006f] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                          >
                            {loadingActions ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Desbloqueando...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                                Desbloquear Usuario
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NOTIFICACIÓN DE MENSAJE NUEVO EN TIEMPO REAL */}
                  {conversacionActiva && (
                    <div className="hidden" id="mensaje-nuevo-sound">
                      {/* Audio para notificación de mensaje (opcional) */}
                      <audio id="message-sound" preload="auto">
                        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYgBTGH0fPTgjMIHm7A7qONLwcZat3lqOm8dKVMf7zNwpO/tPe0BQAABCQ=" type="audio/wav"/>
                      </audio>
                    </div>
                  )}

                  {mensajes.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-white/60">No hay mensajes aún</p>
                    </div>
                  ) : (
                    mensajes.map((mensaje) => {
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
                                mensaje.type === 'gift_request' || mensaje.type === 'gift_sent'
                                  ? '' // Sin fondo para gift_request
                                  : esUsuarioActual
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

                {/* Panel de regalos y emojis - DESHABILITADO SI ESTÁ BLOQUEADO */}
                <div className="bg-[#2b2d31] px-4 py-2 border-t border-[#ff007a]/10">
                  {isChatBlocked() ? (
                    // Mensaje cuando está bloqueado
                    <div className="text-center py-3">
                      <p className="text-red-400 text-sm">
                        <Ban size={16} className="inline mr-2" />
                        {bloqueados.has(conversacionSeleccionada?.other_user_id) 
                          ? "Usuario bloqueado - No puedes enviar regalos ni emojis"
                          : "Este usuario te bloqueó - No puedes enviar regalos ni emojis"
                        }
                      </p>
                    </div>
                  ) : (
                    // Panel normal de regalos y emojis
                    <div className={`flex gap-2 mb-2 ${isMobile ? 'flex-wrap' : ''}`}>
                      
                    </div>
                  )}
                </div>

                {/* Input mensaje */}
                <div className={`bg-[#2b2d31] border-t border-[#ff007a]/20 flex gap-3 ${
                  isMobile ? 'p-3 pb-safe-area-inset-bottom sticky bottom-0 z-10' : 'p-4'
                }`}>
                  <input
                    type="text"
                    placeholder={
                      isChatBlocked()
                        ? bloqueados.has(conversacionSeleccionada?.other_user_id)
                          ? "Usuario bloqueado - no puedes enviar mensajes"
                          : "Este usuario te ha bloqueado"
                        : "Escribe un mensaje..."
                    }
                    className={`flex-1 px-4 py-2 rounded-full outline-none placeholder-white/60 ${
                      isChatBlocked()
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1a1c20] text-white focus:ring-2 focus:ring-[#ff007a]/50'
                    }`}
                    value={nuevoMensaje}
                    onChange={(e) => {
                      if (!isChatBlocked()) {
                        setNuevoMensaje(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => e.key === "Enter" && !isChatBlocked() && enviarMensaje()}
                    disabled={isChatBlocked()}
                  />
                  <button
                    onClick={() => enviarMensaje()}
                    disabled={!nuevoMensaje.trim() || isChatBlocked()}
                    className={`px-6 py-2 rounded-full font-semibold transition-colors flex items-center gap-2 ${
                      isChatBlocked()
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                        : !nuevoMensaje.trim()
                          ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                          : 'bg-[#ff007a] hover:bg-[#e6006e] text-white'
                    }`}
                  >
                    <Send size={16} />
                    {!isMobile && (
                      isChatBlocked() 
                        ? bloqueados.has(conversacionSeleccionada?.other_user_id) 
                          ? 'Bloqueado' 
                          : 'Te bloqueó'
                        : 'Enviar'
                    )}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Modal de apodos */}
      {showNicknameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1f2125] border border-[#ff007a]/30 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#ff007a]/20">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Cambiar Apodo</h3>
                <button
                  onClick={() => {
                    setShowNicknameModal(false);
                    setNicknameTarget(null);
                    setNicknameValue('');
                  }}
                  className="text-white/60 hover:text-white p-2 hover:bg-[#3a3d44] rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-white/70 text-sm mt-2">
                Personaliza cómo quieres ver a <span className="font-semibold text-[#ff007a]">
                  {nicknameTarget?.userName}
                </span>
              </p>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-white text-sm font-medium mb-2">
                  Apodo personalizado
                </label>
                <input
                  type="text"
                  value={nicknameValue}
                  onChange={(e) => setNicknameValue(e.target.value)}
                  maxLength={20}
                  className="w-full px-4 py-3 bg-[#1a1c20] text-white placeholder-white/60 rounded-lg outline-none focus:ring-2 focus:ring-[#ff007a]/50 border border-[#3a3d44]"
                />
                <p className="text-xs text-white/50 mt-1">
                  {nicknameValue.length}/20 caracteres
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-[#ff007a]/20 flex gap-3">
              <button
                onClick={() => {
                  setShowNicknameModal(false);
                  setNicknameTarget(null);
                  setNicknameValue('');
                }}
                className="flex-1 bg-[#3a3d44] hover:bg-[#4a4d54] text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarApodo}
                disabled={!nicknameValue.trim()}
                className="flex-1 bg-[#ff007a] hover:bg-[#e6006e] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay móvil */}
      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Modales */}
      <TranslationSettings
        isOpen={showTranslationSettings}
        onClose={() => setShowTranslationSettings(false)}
        settings={translationSettings}
        onSettingsChange={setTranslationSettings}
        languages={languages}
      />

      <CallingSystem
        isVisible={isCallActive}
        callerName={currentCall?.name}
        onCancel={cancelarLlamadaMejorada}
        callStatus={currentCall?.status || 'initiating'}
      />

      <GiftsModal
        isOpen={showGiftsModal}
        onClose={() => setShowGiftsModal(false)}
        recipientName={conversacionSeleccionada?.other_user_name || 'Usuario'}
        recipientId={conversacionSeleccionada?.other_user_id}
        roomName={conversacionActiva}
        userRole={usuario.rol}
        gifts={gifts}
        // 🔥 PROPS SEGÚN ROL
        {...(usuario.rol === 'modelo' ? {
          onRequestGift: handleRequestGift,  // Solo modelos
        } : {
          onSendGift: handleSendGift,       // Solo clientes
          userBalance: userBalance,          // Balance de monedas normales
          giftBalance: giftBalance,          // Balance de gift coins ← CRÍTICO
        })}
        loading={loadingGift}
      />
      <GiftNotificationOverlay
        pendingRequests={pendingRequests}
        onAccept={handleAcceptGift}
        onReject={handleRejectGift}
        onClose={() => setPendingRequests([])}
        isVisible={pendingRequests.length > 0}
      />
      <IncomingCallOverlay
        isVisible={isReceivingCall}
        callData={incomingCall}
        onAnswer={() => responderLlamada('accept')}
        onDecline={() => responderLlamada('reject')}
      />
    </div>
  );
}
