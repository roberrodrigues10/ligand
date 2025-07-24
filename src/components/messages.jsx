import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔥 CACHE GLOBAL PARA PARTICIPANTES Y MENSAJES
class ChatCacheManager {
  constructor() {
    this.participantsCache = new Map();
    this.messagesCache = new Map();
    this.pendingRequests = new Map();
    this.lastRequestTimes = new Map();
    
    this.PARTICIPANTS_CACHE_DURATION = 10000; // 10 segundos
    this.MESSAGES_CACHE_DURATION = 3000; // 3 segundos
    this.MIN_REQUEST_INTERVAL = 2000; // 2 segundos mínimo entre requests
    this.RATE_LIMIT_BACKOFF = 5000; // 5 segundos para 429
  }

  canMakeRequest(endpoint) {
    const lastTime = this.lastRequestTimes.get(endpoint) || 0;
    const now = Date.now();
    const timeSince = now - lastTime;
    
    if (timeSince < this.MIN_REQUEST_INTERVAL) {
      console.log(`⏳ Rate limiting ${endpoint} - ${timeSince}ms < ${this.MIN_REQUEST_INTERVAL}ms`);
      return false;
    }
    
    return true;
  }

  async fetchWithCache(endpoint, cacheMap, cacheDuration, fetchFunction) {
    // 1. Verificar cache
    const cached = cacheMap.get(endpoint);
    if (cached && (Date.now() - cached.timestamp) < cacheDuration) {
      console.log(`🎯 Cache hit para ${endpoint}`);
      return cached.data;
    }

    // 2. Verificar request pendiente
    if (this.pendingRequests.has(endpoint)) {
      console.log(`⏳ Request pendiente para ${endpoint}`);
      return await this.pendingRequests.get(endpoint);
    }

    // 3. Verificar rate limiting
    if (!this.canMakeRequest(endpoint)) {
      if (cached) {
        console.log(`🔄 Rate limited, usando cache expirado para ${endpoint}`);
        return cached.data;
      }
      throw new Error(`Rate limited: ${endpoint}`);
    }

    // 4. Hacer request
    const requestPromise = this.makeRequestWithRetry(endpoint, fetchFunction);
    this.pendingRequests.set(endpoint, requestPromise);

    try {
      const result = await requestPromise;
      
      // Guardar en cache
      cacheMap.set(endpoint, {
        data: result,
        timestamp: Date.now()
      });
      
      this.lastRequestTimes.set(endpoint, Date.now());
      return result;
    } finally {
      this.pendingRequests.delete(endpoint);
    }
  }

  async makeRequestWithRetry(endpoint, fetchFunction, retryCount = 0) {
    try {
      return await fetchFunction();
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn(`⚠️ Rate limited en ${endpoint}, intento ${retryCount + 1}`);
        
        // Usar cache como fallback si existe
        const cacheKey = endpoint;
        const participantsCache = this.participantsCache.get(cacheKey);
        const messagesCache = this.messagesCache.get(cacheKey);
        
        if (participantsCache || messagesCache) {
          console.log(`🔄 Usando cache como fallback para ${endpoint}`);
          return (participantsCache || messagesCache).data;
        }

        // Si no hay cache y podemos reintentar
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

  clearCache() {
    this.participantsCache.clear();
    this.messagesCache.clear();
    this.pendingRequests.clear();
    this.lastRequestTimes.clear();
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
  onParticipantsUpdated = null
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
  
  // 🔥 FUNCIÓN MEJORADA: fetchParticipants con cache y rate limiting
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
          const token = sessionStorage.getItem('token');
          if (!token) {
            throw new Error('No hay token');
          }

          console.log('📡 Request REAL a participantes:', roomName);

          const response = await fetch(`${API_BASE_URL}/api/chat/participants/${roomName}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
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
      
      if (error.message.includes('429') || error.message.includes('Rate limited')) {
        console.warn('⚠️ Rate limited en participantes - continuando silenciosamente');
        return; // No hacer nada, solo continuar
      }
      
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

  // 🔥 FUNCIÓN MEJORADA: fetchMessages con cache
  const fetchMessages = async () => {
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
          const token = sessionStorage.getItem('token');
          if (!token) {
            throw new Error('No hay token de autenticación');
          }

          const response = await fetch(`${API_BASE_URL}/api/chat/messages/${roomName}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('📥 Mensajes obtenidos:', data.messages?.length || 0);
          
          return data;
        }
      );

      // Procesar mensajes (resto del código igual)
      if (result.success && result.messages) {
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

        newMessages.forEach(msg => {
          processedMessages.current.add(msg.id);
          lastMessageId.current = Math.max(lastMessageId.current || 0, msg.id);

          detectUserFromMessage(msg);

          if (onMessageReceived) {
            const messageForParent = {
              id: msg.id,
              text: msg.message,
              sender: msg.user_name,
              senderRole: msg.user_role,
              type: 'remote',
              timestamp: msg.timestamp,
              messageType: msg.type
            };

            onMessageReceived(messageForParent);

            if (msg.type === 'gift' && msg.extra_data && onGiftReceived) {
              onGiftReceived(msg.extra_data);
            }
          }
        });

        setIsConnected(true);
      }

    } catch (error) {
      console.error('❌ Error obteniendo mensajes:', error.message);
      
      if (error.message.includes('429') || error.message.includes('Rate limited')) {
        console.warn('⚠️ Rate limited en mensajes - continuando silenciosamente');
        return;
      }
      
      setIsConnected(false);
    }
  };

  // 🔥 RESTO DE FUNCIONES (SIN CAMBIOS SIGNIFICATIVOS)
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

  // 🔥 FUNCIONES DE ENVÍO (SIN CAMBIOS)
  const sendMessage = async (messageText) => {
    console.log('📤 Enviando mensaje:', { messageText, roomName, userName });

    if (!messageText?.trim() || !roomName) {
      return false;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
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
        
        // 🔥 INVALIDAR CACHE DE MENSAJES DESPUÉS DE ENVIAR
        const endpoint = `messages_${roomName}`;
        chatCache.messagesCache.delete(endpoint);
        
        setTimeout(fetchMessages, 500);
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
      const token = sessionStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
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
        
        // Invalidar cache
        const endpoint = `messages_${roomName}`;
        chatCache.messagesCache.delete(endpoint);
        
        setTimeout(fetchMessages, 500);
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
      const token = sessionStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
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
        
        // Invalidar cache
        const endpoint = `messages_${roomName}`;
        chatCache.messagesCache.delete(endpoint);
        
        setTimeout(fetchMessages, 500);
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

  // 🔥 POLLING MEJORADO CON RATE LIMITING
  useEffect(() => {
    if (!roomName) {
      console.log('⚠️ No hay roomName, no iniciando polling');
      return;
    }

    console.log('🔄 Iniciando polling con rate limiting para sala:', roomName);

    // Fetch inicial
    fetchParticipants().catch(() => {});
    fetchMessages().catch(() => {});

    // 🔥 POLLING MENOS AGRESIVO
    pollingInterval.current = setInterval(() => {
      fetchMessages().catch(() => {}); // Silenciar errores en polling
    }, 4000); // Cada 4 segundos en lugar de 2

    participantsInterval.current = setInterval(() => {
      fetchParticipants().catch(() => {}); // Silenciar errores en polling
    }, 8000); // Cada 8 segundos en lugar de 5

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
      const currentRoom = sessionStorage.getItem('roomName');
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
      refreshParticipants: fetchParticipants
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

  // Limpiar cache cada 5 minutos
  useEffect(() => {
    const cleanup = setInterval(() => {
      processedMessages.current.clear();
      console.log('🧹 Cache de mensajes procesados limpiado');
    }, 5 * 60 * 1000);

    return () => clearInterval(cleanup);
  }, []);

  // Cargar perfil (usando cache)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('👤 Cargando perfil de usuario con cache...');
        const user = await getUser(false); // NO force refresh
        const name = user.alias || user.name || user.username || '';
        const role = user.rol || user.role || 'modelo';

        console.log('✅ Perfil cargado desde cache:', { name, role, id: user.id });

        setLocalUserName(name);
        setLocalUserRole(role);

        if (onUserLoaded && typeof onUserLoaded === 'function') {
          onUserLoaded({ name, role, id: user.id });
        }
      } catch (err) {
        console.error('❌ Error cargando perfil en SimpleChat:', err);
        
        if (err.response?.status === 429) {
          console.warn('⚠️ Rate limited en SimpleChat - usando fallback');
          setLocalUserName(userName || 'Usuario');
          setLocalUserRole(userRole || 'modelo');
        }
      }
    };

    fetchProfile();
  }, []);

  return null;
};

// 🔥 FUNCIÓN GLOBAL PARA DEBUGGING
window.debugChatCache = () => {
  console.log('🔍 Chat Cache:', {
    participantsEntries: chatCache.participantsCache.size,
    messagesEntries: chatCache.messagesCache.size,
    pendingRequests: chatCache.pendingRequests.size
  });
};

window.clearChatCache = () => {
  chatCache.clearCache();
  console.log('🧹 Chat cache limpiado manualmente');
};

export default SimpleChat;