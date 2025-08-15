import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔥 CACHE SIMPLIFICADO SIN RATE LIMITING - OPTIMIZADO PARA CHAT EN TIEMPO REAL
class ChatCacheManager {
  constructor() {
    this.participantsCache = new Map();
    this.messagesCache = new Map();
    this.pendingRequests = new Map();
    
    // Cache más corto para chat en tiempo real
    this.PARTICIPANTS_CACHE_DURATION = 5000; // 5 segundos
    this.MESSAGES_CACHE_DURATION = 1500; // 1.5 segundos - muy corto para tiempo real
    this.RATE_LIMIT_BACKOFF = 3000; // Solo para errores 429 del servidor
  }

  async fetchWithCache(endpoint, cacheMap, cacheDuration, fetchFunction) {
    // 1. Verificar cache (solo si no es muy viejo)
    const cached = cacheMap.get(endpoint);
    if (cached && (Date.now() - cached.timestamp) < cacheDuration) {
      console.log(`🎯 Cache hit para ${endpoint}`);
      return cached.data;
    }

    // 2. Verificar request pendiente para evitar duplicados
    if (this.pendingRequests.has(endpoint)) {
      console.log(`⏳ Request pendiente para ${endpoint}`);
      return await this.pendingRequests.get(endpoint);
    }

    // 3. Hacer request sin rate limiting interno
    const requestPromise = this.makeRequestWithRetry(endpoint, fetchFunction);
    this.pendingRequests.set(endpoint, requestPromise);

    try {
      const result = await requestPromise;
      
      // Guardar en cache
      cacheMap.set(endpoint, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } finally {
      this.pendingRequests.delete(endpoint);
    }
  }

  async makeRequestWithRetry(endpoint, fetchFunction, retryCount = 0) {
    try {
      return await fetchFunction();
    } catch (error) {
      // Solo manejar errores 429 del servidor, no rate limiting propio
      if (error.response?.status === 429) {
        console.warn(`⚠️ Rate limited por servidor en ${endpoint}, intento ${retryCount + 1}`);
        
        // Usar cache como fallback si existe
        const cacheKey = endpoint;
        const participantsCache = this.participantsCache.get(cacheKey);
        const messagesCache = this.messagesCache.get(cacheKey);
        
        if (participantsCache || messagesCache) {
          console.log(`🔄 Usando cache como fallback para ${endpoint}`);
          return (participantsCache || messagesCache).data;
        }

        // Solo reintentar si es error del servidor
        if (retryCount < 2) {
          const delay = this.RATE_LIMIT_BACKOFF * (retryCount + 1);
          console.log(`⏳ Reintentando ${endpoint} en ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequestWithRetry(endpoint, fetchFunction, retryCount + 1);
        }
      }
      
      throw error;
    }
  }

  // 🔥 NUEVA FUNCIÓN: Invalidar cache específico
  invalidateCache(endpoint) {
    this.participantsCache.delete(endpoint);
    this.messagesCache.delete(endpoint);
    console.log(`🗑️ Cache invalidado para ${endpoint}`);
  }

  clearCache() {
    this.participantsCache.clear();
    this.messagesCache.clear();
    this.pendingRequests.clear();
    console.log('🧹 Chat cache limpiado');
  }
}

// 🔥 INSTANCIA GLOBAL
const chatCache = new ChatCacheManager();

const SimpleChat = ({ 
  userName, 
  userRole = 'modelo',
  roomName,
  onMessageReceived = null,
  onGiftReceived = null, 
  onUserLoaded = null,
  onParticipantsUpdated = null,
  disabled = false,           // 🔥 AGREGAR ESTA LÍNEA
  suppressMessages = false    // 🔥 AGREGAR ESTA LÍNEA
}) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const persistedUser = useRef(null);
  
  const lastMessageId = useRef(null);
  const pollingInterval = useRef(null);
  const participantsInterval = useRef(null);
  const processedMessages = useRef(new Set());
  const [localUserName, setLocalUserName] = useState(userName || '');
  const [localUserRole, setLocalUserRole] = useState(userRole || '');
  const partnerLoaded = useRef(false);
  const detectionMethod = useRef(null);
  
  // 🔥 FUNCIÓN SIN RATE LIMITING: fetchParticipants
  const fetchParticipants = async () => {
    if (!roomName) {
      console.log('⚠️ No hay roomName para obtener participantes');
      return;
    }

    const endpoint = `participants_${roomName}`;
    
    try {
      const result = await chatCache.fetchWithCache(
        endpoint,
        chatCache.participantsCache,
        chatCache.PARTICIPANTS_CACHE_DURATION,
        async () => {
          const token = localStorage.getItem('token');
          if (!token) {
            console.error('🔐 No hay token para participantes');
            throw new Error('No hay token');
          }

          console.log('📡 Request a participantes:', {
            url: `${API_BASE_URL}/api/chat/participants/${roomName}`,
            roomName,
            token: token.substring(0, 20) + '...'
          });

          const response = await fetch(`${API_BASE_URL}/api/chat/participants/${roomName}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Sin contenido de error');
            console.error('❌ Error en fetchParticipants:', {
              status: response.status,
              statusText: response.statusText,
              errorBody: errorText,
              roomName
            });

            if (response.status === 403) {
              console.error('🚫 Error 403 en participantes - problema de autenticación');
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('✅ Participantes obtenidos:', data.participants?.length || 0);
          
          return data;
        }
      );

      // Procesar resultado
      if (result.success && result.participants) {
        setParticipants(result.participants);
        
        const otherUser = result.participants.find(p => !p.is_current_user);
        if (otherUser) {
          console.log('🧍‍♂️ Otro participante encontrado:', otherUser.name);
          detectOtherUser({
            name: otherUser.name,
            role: otherUser.role,
            id: otherUser.id
          }, 'participants');
        }
        
        if (onParticipantsUpdated && typeof onParticipantsUpdated === 'function') {
          onParticipantsUpdated(result.participants);
        }
      }

    } catch (error) {
      console.error('❌ Error obteniendo participantes:', error.message);
      
      if (error.message.includes('500')) {
        console.warn('⚠️ Error 500 en participantes - endpoint no implementado');
        
        // Detener polling de participantes si es error 500
        if (participantsInterval.current) {
          clearInterval(participantsInterval.current);
          participantsInterval.current = null;
        }
      }
    }
  };

  // 🔥 FUNCIÓN SIN RATE LIMITING: fetchMessages - URL CORREGIDA
  const fetchMessages = async () => {

  if (disabled || suppressMessages) {
    console.log('🚫 [SimpleChat] Bloqueado por disabled/suppressMessages');
    return;
  }

  if (!roomName) {
    console.log('⚠️ No hay roomName para fetch');
    return;
  }

  const endpoint = `messages_${roomName}`;

  try {
    const result = await chatCache.fetchWithCache(
      endpoint,
      chatCache.messagesCache,
      chatCache.MESSAGES_CACHE_DURATION,
      async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('🔐 No hay token de autenticación en localStorage');
          throw new Error('No hay token de autenticación');
        }

        console.log('📡 Haciendo request a mensajes:', {
          url: `${API_BASE_URL}/api/chat/messages/${roomName}`,
          token: token.substring(0, 20) + '...',
          roomName
        });

        const response = await fetch(`${API_BASE_URL}/api/chat/messages/${roomName}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Sin contenido de error');
          console.error('❌ Error en fetchMessages:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            headers: Object.fromEntries(response.headers.entries()),
            errorBody: errorText,
            roomName,
            token: token ? 'Presente' : 'Ausente'
          });

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return data;
      }
    );

    // Procesar mensajes
    if (result.success && result.messages) {
      // 🔥 DEBUG: ANALIZAR TODOS LOS MENSAJES RECIBIDOS
      console.log('📥 [SimpleChat] Todos los mensajes recibidos:', result.messages.length);
      
      result.messages.forEach((msg, index) => {
        
        // 🔥 SI ES GIFT_REQUEST, MOSTRAR DATOS COMPLETOS
        if (msg.type === 'gift_request') {
          console.log('🎁 [SimpleChat] ¡GIFT_REQUEST ENCONTRADO!', {
            fullMessage: msg,
            extraData: msg.extra_data,
            giftData: msg.gift_data,
            rawExtraData: JSON.stringify(msg.extra_data)
          });
        }
      });

      // Detectar usuario desde mensajes si no tenemos detección por participantes
      if (!partnerLoaded.current || detectionMethod.current === null) {
        const otherUserMessage = result.messages.find(msg => 
          msg.user_name !== userName && 
          msg.user_name !== localUserName
        );
        if (otherUserMessage) {
          detectUserFromMessage(otherUserMessage);
        }
      }

      // Procesar mensajes nuevos
      const newMessages = result.messages.filter(msg => {
        const isNotMine = msg.user_name !== userName;
        const isNotProcessed = !processedMessages.current.has(msg.id);
        const isNewer = !lastMessageId.current || msg.id > lastMessageId.current;
        
        return isNotMine && isNotProcessed && isNewer;
      });

      // 🔥 DEBUG: MOSTRAR MENSAJES NUEVOS QUE SE VAN A PROCESAR
      console.log('🆕 [SimpleChat] Mensajes nuevos a procesar:', newMessages.length);
      newMessages.forEach((msg, index) => {
        console.log(`🆕 [SimpleChat] Nuevo mensaje ${index}:`, {
          id: msg.id,
          type: msg.type,
          message: msg.message?.substring(0, 30),
          will_send_to_parent: !!onMessageReceived
        });
      });

      // 🔥 REEMPLAZAR EN SimpleChat.jsx - fetchMessages()
// Líneas 100-170 aproximadamente

newMessages.forEach(msg => {
  processedMessages.current.add(msg.id);
  lastMessageId.current = Math.max(lastMessageId.current || 0, msg.id);

  detectUserFromMessage(msg);

  if (onMessageReceived) {
    console.log('🔍 [MESSAGES] Analizando mensaje:', {
      id: msg.id,
      originalType: msg.type,
      message: msg.message?.substring(0, 50),
      hasExtraData: !!msg.extra_data,
      isGiftText: msg.message && msg.message.includes('Solicitud de regalo')
    });

    // 🔥 DETECTAR SI ES GIFT_REQUEST POR CONTENIDO Y TIPO
    const isGiftRequest = msg.type === 'gift_request' || 
                         (msg.message && msg.message.includes('Solicitud de regalo'));
    
    const isGiftMessage = isGiftRequest ||
                         msg.type === 'gift_sent' ||
                         msg.type === 'gift_received' ||
                         msg.type === 'gift' ||
                         msg.type === 'gift_rejected' ||
                         (msg.message && (
                           msg.message.includes('Solicitud de regalo') ||
                           msg.message.includes('Rechazaste una solicitud') ||
                           msg.message.includes('Enviaste un regalo') ||
                           msg.message.includes('Recibiste un regalo') ||
                           msg.message.includes('Enviaste:') ||
                           msg.message.includes('Recibiste:')
                         ));

    console.log('🎁 [GIFT DETECTION]', {
      id: msg.id,
      originalType: msg.type,
      message: msg.message?.substring(0, 40),
      isGiftRequest,
      isGiftMessage,
      hasExtraData: !!msg.extra_data
    });

    // 🔥 FUNCIÓN HELPER PARA PARSING SEGURO
    const parseJsonSafely = (data, fieldName = 'data') => {
      if (!data) return {};
      
      if (typeof data === 'object' && data !== null) {
        return data;
      }
      
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          return parsed;
        } catch (e) {
          console.error(`❌ Error parseando ${fieldName}:`, e);
          return {};
        }
      }
      
      return {};
    };

    const messageForParent = {
      id: msg.id,
      text: msg.message,
      sender: msg.user_name,
      senderRole: msg.user_role,
      
      // 🔥 TIPO CORRECTO BASADO EN CONTENIDO
      type: (() => {
        if (isGiftRequest) return 'gift_request';
        if (msg.type === 'gift_sent') return 'gift_sent';
        if (msg.type === 'gift_received') return 'gift_received';
        if (msg.type === 'gift_rejected') return 'gift_rejected';
        if (msg.type === 'gift') return 'gift';
        return msg.type || 'remote';
      })(),
      
      timestamp: msg.created_at,
      
      // 🔥 PARSING SIMPLIFICADO
      extra_data: parseJsonSafely(msg.extra_data, 'extra_data'),
      gift_data: parseJsonSafely(msg.gift_data, 'gift_data'),
      
      // Legacy compatibility
      messageType: msg.type
    };

    // 🔥 DEBUG ESPECÍFICO PARA GIFT REQUESTS
    if (isGiftRequest) {
      console.log('🎁 [SimpleChat] GIFT_REQUEST detectado y enviando:', {
        originalMessage: msg.message,
        detectedAsGift: true,
        finalType: messageForParent.type,
        extraData: messageForParent.extra_data,
        giftData: messageForParent.gift_data
      });
    }

    console.log('📨 [SimpleChat] Enviando mensaje al padre:', {
      id: messageForParent.id,
      type: messageForParent.type,
      text: messageForParent.text?.substring(0, 30),
      isGiftMessage,
      hasExtraData: Object.keys(messageForParent.extra_data).length > 0,
      hasGiftData: Object.keys(messageForParent.gift_data).length > 0
    });

    onMessageReceived(messageForParent);

    // 🔥 MANTENER LÓGICA DE REGALOS EXISTENTE
    if (msg.type === 'gift' && messageForParent.extra_data && onGiftReceived) {
      onGiftReceived(messageForParent.extra_data);
    }
  }
});

      setIsConnected(true);
    }

  } catch (error) {
    console.error('❌ Error obteniendo mensajes:', error.message);
    setIsConnected(false);
  }
};
  // Funciones de detección (sin cambios)
  const detectOtherUser = (user, method) => {
    console.log('🕵️ Intentando detectar usuario:', { user, method });

    if (persistedUser.current && persistedUser.current.name === user.name) {
      console.log('✅ Usuario ya detectado y persistido:', user.name);
      setOtherParticipant(persistedUser.current);
      setIsDetecting(false);
      return true;
    }

    if (partnerLoaded.current && detectionMethod.current === 'participants' && method === 'messages') {
      console.log('⚠️ Ignorando detección por mensajes - ya detectado por participantes');
      return false;
    }

    if (!partnerLoaded.current || method === 'participants') {
      console.log('✅ Detectando usuario:', user);
      
      persistedUser.current = user;
      setOtherParticipant(user);
      setIsDetecting(false);
      detectionMethod.current = method;
      
      if (onUserLoaded && typeof onUserLoaded === 'function') {
        onUserLoaded(user);
        partnerLoaded.current = true;
        console.log(`✅ Usuario detectado y persistido via ${method}:`, user.name);
      }
      
      return true;
    }
    
    return false;
  };

  const detectUserFromMessage = (msg) => {
    if (detectionMethod.current === 'participants') {
      return false;
    }

    const currentUserName = userName || localUserName;
    if (msg.user_name !== currentUserName && 
        msg.user_name !== localUserName && 
        msg.user_name !== userName) {
      
      return detectOtherUser({
        name: msg.user_name,
        role: msg.user_role,
        id: msg.user_id
      }, 'messages');
    }
    
    return false;
  };

  // 🔥 FUNCIONES DE ENVÍO MEJORADAS - URL CORREGIDA
  const sendMessage = async (messageText) => {
    console.log('📤 Enviando mensaje:', { messageText, roomName, userName });

    if (!messageText?.trim() || !roomName) {
      return false;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      // 🔥 URL CORREGIDA: usar send-message en lugar de send
      const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          room_name: roomName,
          message: messageText.trim(),
          type: 'text'
        })
      });

      if (response.ok) {
        console.log('✅ Mensaje enviado exitosamente');
        
        // 🔥 INVALIDAR SOLO EL CACHE DE MENSAJES INMEDIATAMENTE
        const endpoint = `messages_${roomName}`;
        chatCache.invalidateCache(endpoint);
        
        // Fetch inmediato sin esperar
        fetchMessages();
        return true;
      } else {
        console.error('❌ Error enviando mensaje:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red enviando mensaje:', error);
      return false;
    }
  };  

  const sendGift = async (gift) => {
    console.log('🎁 Enviando regalo:', gift);

    if (!gift || !roomName) return false;

    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      // 🔥 URL CORREGIDA
      const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          room_name: roomName,
          message: `Envió ${gift.nombre}`,
          type: 'gift',
          extra_data: gift
        })
      });

      if (response.ok) {
        console.log('✅ Regalo enviado exitosamente');
        
        // Invalidar cache e inmediatamente fetch
        const endpoint = `messages_${roomName}`;
        chatCache.invalidateCache(endpoint);
        fetchMessages();
        return true;
      } else {
        console.error('❌ Error enviando regalo:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red enviando regalo:', error);
      return false;
    }
  };

  const sendEmoji = async (emoji) => {
    console.log('😊 Enviando emoji:', emoji);

    if (!emoji || !roomName) return false;

    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      // 🔥 URL CORREGIDA
      const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          room_name: roomName,
          message: emoji,
          type: 'emoji'
        })
      });

      if (response.ok) {
        console.log('✅ Emoji enviado exitosamente');
        
        // Invalidar cache e inmediatamente fetch
        const endpoint = `messages_${roomName}`;
        chatCache.invalidateCache(endpoint);
        fetchMessages();
        return true;
      } else {
        console.error('❌ Error enviando emoji:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red enviando emoji:', error);
      return false;
    }
  };

  // Funciones auxiliares
  const getOtherParticipant = () => otherParticipant;
  const getAllParticipants = () => participants;
  const getParticipantsByRole = (role) => participants.filter(p => p.role === role);

  // 🔥 POLLING OPTIMIZADO PARA TIEMPO REAL - SIN RATE LIMITING
  useEffect(() => {
    if (!roomName) {
      console.log('⚠️ No hay roomName, no iniciando polling');
      return;
    }

    console.log('🔄 Iniciando polling optimizado para tiempo real en sala:', roomName);

    // Fetch inicial
    fetchParticipants();
    fetchMessages();

    // 🔥 POLLING MÁS FRECUENTE PARA CHAT EN TIEMPO REAL
    pollingInterval.current = setInterval(() => {
      fetchMessages(); // Cada 2 segundos para mensajes
    }, 2000);

    participantsInterval.current = setInterval(() => {
      fetchParticipants(); // Cada 6 segundos para participantes
    }, 6000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        console.log('🛑 Polling de mensajes detenido');
      }
      if (participantsInterval.current) {
        clearInterval(participantsInterval.current);
        console.log('🛑 Polling de participantes detenido');
      }
      
      // Limpiar cache al cambiar de sala
      const currentRoom = localStorage.getItem('roomName');
      if (currentRoom !== roomName) {
        console.log('🧹 Limpiando chat cache - cambio de sala');
        chatCache.clearCache();
        persistedUser.current = null;
      }
    };
  }, [roomName, userName]);

  // Exponer funciones al componente padre
  useEffect(() => {
    const chatFunctionsData = {
      sendMessage,
      sendGift,
      sendEmoji,
      isConnected: isConnected && !!roomName,
      participants,
      otherParticipant,
      isDetecting,
      getOtherParticipant,
      getAllParticipants,
      getParticipantsByRole,
      refreshParticipants: fetchParticipants,
      // 🔥 NUEVA FUNCIÓN: Force refresh sin cache
      forceRefreshMessages: () => {
        const endpoint = `messages_${roomName}`;
        chatCache.invalidateCache(endpoint);
        fetchMessages();
      }
    };

    if (window.livekitChatFunctions) {
      window.livekitChatFunctions(chatFunctionsData);
    } else {
      window.livekitChatFunctions = (callback) => {
        if (typeof callback === 'function') {
          callback(chatFunctionsData);
        }
      };

      setTimeout(() => {
        if (window.livekitChatFunctions && typeof window.livekitChatFunctions === 'function') {
          window.livekitChatFunctions(chatFunctionsData);
        }
      }, 1000);
    }
  }, [roomName, isConnected, participants, otherParticipant]);

  // Limpiar cache de mensajes procesados cada 3 minutos (más frecuente)
  useEffect(() => {
    const cleanup = setInterval(() => {
      processedMessages.current.clear();
      console.log('🧹 Cache de mensajes procesados limpiado');
    }, 3 * 60 * 1000);

    return () => clearInterval(cleanup);
  }, []);

  // Cargar perfil sin rate limiting
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('👤 Cargando perfil de usuario...');
        const user = await getUser(false);
        const name = user.alias || user.name || user.username || '';
        const role = user.rol || user.role || 'modelo';

        console.log('✅ Perfil cargado:', { name, role, id: user.id });

        setLocalUserName(name);
        setLocalUserRole(role);

        if (onUserLoaded && typeof onUserLoaded === 'function') {
          onUserLoaded({ name, role, id: user.id });
        }
      } catch (err) {
        console.error('❌ Error cargando perfil en SimpleChat:', err);
        setLocalUserName(userName || 'Usuario');
        setLocalUserRole(userRole || 'modelo');
      }
    };

    fetchProfile();
  }, []);

  return null;
};

export default SimpleChat;