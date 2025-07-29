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
          const token = sessionStorage.getItem('token');
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

  // 🔥 FUNCIÓN SIN RATE LIMITING: fetchMessages con manejo de permisos asimétricos
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
            console.error('🔐 No hay token de autenticación en sessionStorage');
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

          // 🔥 DEBUG DETALLADO PARA 403
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

            // Manejo específico para 403 con permisos asimétricos
            if (response.status === 403) {
              console.error('🚫 Error 403 - PERMISOS ASIMÉTRICOS DETECTADOS:');
              console.error('   ✅ Puedes ENVIAR mensajes (confirmado)');
              console.error('   ❌ NO puedes LEER mensajes');
              console.error('   🤔 Posibles causas:');
              console.error('      - API tiene permisos separados para lectura/escritura');
              console.error('      - Endpoint de lectura requiere permisos adicionales');
              console.error('      - Configuración de roles incorrecta en servidor');
              console.error('      - Endpoint de mensajes usa método incorrecto');
              
              // Verificar si el token está realmente presente
              const tokenCheck = sessionStorage.getItem('token');
              if (!tokenCheck) {
                console.error('🔐 Token no encontrado después del error 403');
              } else {
                console.log('🔐 Token presente:', tokenCheck.length, 'caracteres');
                
                // 🔥 DIAGNÓSTICO ADICIONAL: Verificar si estamos en la sala
                console.log('🏠 Información de la sala:', {
                  roomName: roomName,
                  currentUrl: window.location.href,
                  expectedInRoom: !!roomName,
                  sessionRoomName: sessionStorage.getItem('roomName')
                });
                
                // Verificar si el nombre de sala es válido
                if (roomName && (roomName.includes('undefined') || roomName === 'null')) {
                  console.error('🚫 Nombre de sala inválido detectado:', roomName);
                }
                
                // 🔥 NUEVO: Intentar endpoint alternativo
                console.log('🔄 Intentando endpoints alternativos...');
                try {
                  // Intentar con POST en lugar de GET
                  const altResponse = await fetch(`${API_BASE_URL}/api/chat/messages`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ room_name: roomName })
                  });
                  
                  if (altResponse.ok) {
                    console.log('✅ Endpoint alternativo POST funciona!');
                    const altData = await altResponse.json();
                    return altData;
                  } else {
                    console.log('❌ Endpoint alternativo POST también falló:', altResponse.status);
                  }
                } catch (altError) {
                  console.log('❌ Error en endpoint alternativo:', altError.message);
                }
              }
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('📥 Mensajes obtenidos exitosamente:', data.messages?.length || 0);
          
          return data;
        }
      );

      // Procesar mensajes
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
      
      // 🔥 MANEJO ESPECÍFICO DE ERRORES 403
      if (error.message.includes('403')) {
        console.error('🚫 Error 403 detectado - Verificando estado de autenticación...');
        
        // Verificar token
        const currentToken = sessionStorage.getItem('token');
        if (!currentToken) {
          console.error('🔐 Token perdido - redirigiendo a login');
          // Opcional: redirigir a login
          // window.location.href = '/login';
        } else {
          console.log('🔐 Token aún presente, pero servidor rechaza acceso');
          console.log('💡 Posible solución: refrescar token o verificar permisos de sala');
          
          // 🔥 NUEVO: Intentar obtener información del usuario actual
          console.log('👤 Verificando información del usuario...');
          try {
            const userInfo = await getUser(false);
            console.log('✅ Usuario actual:', {
              id: userInfo.id,
              name: userInfo.name || userInfo.alias,
              role: userInfo.role || userInfo.rol,
              active: userInfo.active
            });
          } catch (userError) {
            console.error('❌ Error obteniendo info del usuario:', userError.message);
          }
        }
        
        // 🔥 NUEVO: No detener polling inmediatamente, intentar recuperación
        console.warn('🔄 Manteniendo polling pero con intervalo mayor debido a 403');
        
        // Cambiar a polling menos frecuente para evitar spam
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          console.log('⏸️ Cambiando a polling de recuperación (cada 10 segundos)');
          
          pollingInterval.current = setInterval(() => {
            console.log('🔄 Intento de recuperación - fetchMessages');
            fetchMessages();
          }, 10000); // Cada 10 segundos cuando hay problemas de acceso
        }
      }
      
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

  // 🔥 FUNCIONES DE ENVÍO MEJORADAS - SIN RATE LIMITING
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

// 🔥 FUNCIONES GLOBALES PARA DEBUGGING
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

// 🔥 NUEVA FUNCIÓN: Test específico para permisos asimétricos
window.testAsymmetricPermissions = async (roomName) => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    console.error('❌ No hay token');
    return;
  }
  
  console.log('🧪 Testando permisos asimétricos para:', roomName);
  
  // 1. Test de envío (debería funcionar)
  try {
    const sendResponse = await fetch(`${API_BASE_URL}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        room_name: roomName,
        message: '[TEST] Verificando permisos de envío',
        type: 'text'
      })
    });
    
    console.log('📤 Test ENVÍO:', {
      status: sendResponse.status,
      ok: sendResponse.ok,
      result: sendResponse.ok ? '✅ FUNCIONA' : '❌ FALLÓ'
    });
  } catch (e) {
    console.error('❌ Error en test de envío:', e);
  }
  
  // 2. Test de lectura GET (debería fallar con 403)
  try {
    const readGetResponse = await fetch(`${API_BASE_URL}/api/chat/messages/${roomName}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📥 Test LECTURA GET:', {
      status: readGetResponse.status,
      ok: readGetResponse.ok,
      result: readGetResponse.ok ? '✅ FUNCIONA' : '❌ FALLÓ (esperado)'
    });
  } catch (e) {
    console.error('❌ Error en test GET:', e);
  }
  
  // 3. Test de lectura POST (alternativo)
  try {
    const readPostResponse = await fetch(`${API_BASE_URL}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ room_name: roomName })
    });
    
    console.log('📥 Test LECTURA POST:', {
      status: readPostResponse.status,
      ok: readPostResponse.ok,
      result: readPostResponse.ok ? '✅ FUNCIONA' : '❌ FALLÓ'
    });
    
    if (readPostResponse.ok) {
      const data = await readPostResponse.json();
      console.log('📝 Datos obtenidos con POST:', data);
    }
  } catch (e) {
    console.error('❌ Error en test POST:', e);
  }
  
  // 4. Test otros endpoints
  const endpoints = [
    { name: 'chat/room', method: 'GET', url: `${API_BASE_URL}/api/chat/room/${roomName}` },
    { name: 'chat/history', method: 'GET', url: `${API_BASE_URL}/api/chat/history/${roomName}` },
    { name: 'chat/fetch', method: 'POST', url: `${API_BASE_URL}/api/chat/fetch`, body: { room_name: roomName } }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const options = {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const response = await fetch(endpoint.url, options);
      console.log(`🔍 Test ${endpoint.name}:`, {
        status: response.status,
        ok: response.ok,
        result: response.ok ? '✅ FUNCIONA' : `❌ ${response.status}`
      });
      
      if (response.ok) {
        console.log(`✅ ¡Endpoint alternativo encontrado! ${endpoint.name}`);
      }
    } catch (e) {
      console.log(`🔍 Test ${endpoint.name}: Error de red`);
    }
  }
};

// 🔥 NUEVA FUNCIÓN: Intentar unirse a la sala
window.joinRoom = async (roomName) => {
  const token = sessionStorage.getItem('token');
  if (!token || !roomName) {
    console.error('❌ Token o roomName faltante');
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ room_name: roomName })
    });
    
    if (response.ok) {
      console.log('✅ Unido a sala exitosamente');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Error uniéndose a sala:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en joinRoom:', error);
    return false;
  }
};

// 🔥 NUEVA FUNCIÓN: Refresh token si está disponible
window.refreshToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        sessionStorage.setItem('token', data.token);
        console.log('✅ Token refreshed successfully');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    return false;
  }
};

export default SimpleChat;