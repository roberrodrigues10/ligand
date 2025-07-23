import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
  
  // 🔥 NUEVOS: Estados para identificación robusta del usuario actual
  const [currentUserData, setCurrentUserData] = useState({
    name: userName || '',
    role: userRole || '',
    id: null,
    aliases: [] // Lista de posibles nombres/aliases del usuario actual
  });
  
  const partnerLoaded = useRef(false);
  const detectionMethod = useRef(null);
  
  // 🔥 NUEVO: Función para verificar si un mensaje es del usuario actual
  const isMyMessage = (msgUserName, msgUserId, msgUserRole) => {
    const checks = {
      byName: msgUserName === currentUserData.name || 
              msgUserName === userName || 
              currentUserData.aliases.includes(msgUserName),
      byId: msgUserId && currentUserData.id && msgUserId === currentUserData.id,
      byRole: msgUserRole === currentUserData.role && 
              msgUserName === currentUserData.name
    };
    
    const isMyMsg = checks.byName || checks.byId || checks.byRole;
    
    console.log('🔍 Verificando si es mi mensaje:', {
      msgUserName,
      msgUserId, 
      msgUserRole,
      currentUserData,
      checks,
      result: isMyMsg
    });
    
    return isMyMsg;
  };

  console.log('🔄 SimpleChat inicializado:', {
    userName,
    userRole,
    roomName,
    currentUserData,
    hasOnMessageReceived: !!onMessageReceived,
    hasOnParticipantsUpdated: !!onParticipantsUpdated,
    persistedUser: persistedUser.current?.name
  });

  // Restaurar estado si hay usuario persistido
  useEffect(() => {
    if (persistedUser.current && !otherParticipant) {
      console.log('🔄 Restaurando usuario persistido:', persistedUser.current.name);
      setOtherParticipant(persistedUser.current);
      setIsDetecting(false);
      partnerLoaded.current = true;
      detectionMethod.current = 'restored';
      
      if (onUserLoaded && typeof onUserLoaded === 'function') {
        onUserLoaded(persistedUser.current);
      }
    }
  }, []);

  // Detectar usuario con prioridad y persistencia
  const detectOtherUser = (user, method) => {
    console.log('🕵️ Intentando detectar usuario:', {
      user,
      method,
      currentMethod: detectionMethod.current,
      partnerLoaded: partnerLoaded.current,
      persistedUser: persistedUser.current?.name
    });

    // Si ya tenemos un usuario persistido y es el mismo, no hacer nada
    if (persistedUser.current && persistedUser.current.name === user.name) {
      console.log('✅ Usuario ya detectado y persistido:', user.name);
      setOtherParticipant(persistedUser.current);
      setIsDetecting(false);
      return true;
    }

    // Si ya cargamos un partner y el método actual tiene menor prioridad, no sobrescribir
    if (partnerLoaded.current && detectionMethod.current === 'participants' && method === 'messages') {
      console.log('⚠️ Ignorando detección por mensajes - ya detectado por participantes');
      return false;
    }

    // Si es la primera detección o el nuevo método tiene mayor prioridad
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

  // 🔥 MEJORADA: Función para obtener participantes
  const fetchParticipants = async () => {
    if (!roomName) {
      console.log('⚠️ No hay roomName para obtener participantes');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No hay token para obtener participantes');
        return;
      }

      console.log('🔍 Intentando obtener participantes de:', `${API_BASE_URL}/api/chat/participants/${roomName}`);

      const response = await fetch(`${API_BASE_URL}/api/chat/participants/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Respuesta participantes:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('👥 Participantes recibidos del servidor:', {
          count: data.participants?.length || 0,
          participants: data.participants
        });

        if (data.success && data.participants) {
          setParticipants(data.participants);
          
          // 🔥 ENCONTRAR USUARIO ACTUAL Y ACTUALIZAR DATOS
          const currentUser = data.participants.find(p => p.is_current_user);
          if (currentUser) {
            console.log('👤 Usuario actual encontrado en participantes:', currentUser);
            setCurrentUserData(prev => ({
              ...prev,
              name: currentUser.name,
              role: currentUser.role,
              id: currentUser.id,
              aliases: [...new Set([...prev.aliases, currentUser.name, userName].filter(Boolean))]
            }));
          }
          
          // Encontrar al otro participante
          const otherUser = data.participants.find(p => !p.is_current_user);
          
          if (otherUser) {
            console.log('🧍‍♂️ Otro participante encontrado via API:', otherUser);
            console.log('🔍 Detalles del filtrado:', {
              totalParticipants: data.participants.length,
              allParticipants: data.participants.map(p => `${p.name} (current: ${p.is_current_user})`),
              selectedOther: `${otherUser.name} (current: ${otherUser.is_current_user})`
            });
            
            detectOtherUser({
              name: otherUser.name,
              role: otherUser.role,
              id: otherUser.id
            }, 'participants');
          } else {
            console.log('⚠️ No se encontró otro participante diferente');
            console.log('👥 Participantes disponibles:', data.participants.map(p => 
              `${p.name} (ID: ${p.id}, current: ${p.is_current_user})`
            ));
          }
          
          if (onParticipantsUpdated && typeof onParticipantsUpdated === 'function') {
            onParticipantsUpdated(data.participants);
          }
        }
      } else if (response.status === 500) {
        console.warn('⚠️ Error 500 en participantes - El endpoint probablemente no está implementado');
        console.warn('🔄 Usando detección por mensajes como fallback');
        
        if (participantsInterval.current) {
          clearInterval(participantsInterval.current);
          participantsInterval.current = null;
          console.log('🛑 Polling de participantes detenido debido a error 500');
        }
      } else {
        console.log('❌ Error obteniendo participantes:', response.status);
      }
    } catch (error) {
      console.error('❌ Error de red obteniendo participantes:', error);
      console.warn('🔄 Continuando con detección por mensajes');
    }
  };

  // 🔥 COMPLETAMENTE REESCRITA: Función para detectar usuario desde mensajes
  const detectUserFromMessage = (msg) => {
    // Solo usar mensajes como fallback si no tenemos detección por participantes
    if (detectionMethod.current === 'participants') {
      console.log('🚫 Ignorando detección por mensaje - ya detectado por participantes');
      return false;
    }

    // 🔥 USAR LA NUEVA FUNCIÓN isMyMessage
    if (!isMyMessage(msg.user_name, msg.user_id, msg.user_role)) {
      console.log('🕵️ Detectando usuario desde mensaje:', {
        user_name: msg.user_name,
        user_role: msg.user_role,
        user_id: msg.user_id,
        currentUserData
      });

      return detectOtherUser({
        name: msg.user_name,
        role: msg.user_role,
        id: msg.user_id
      }, 'messages');
    } else {
      console.log('🚫 Mensaje es mío, no detectando como otro usuario:', {
        msg_user: msg.user_name,
        my_data: currentUserData
      });
    }
    
    return false;
  };

  // 🔥 COMPLETAMENTE REESCRITA: Función para obtener mensajes
  const fetchMessages = async () => {
    if (!roomName) {
      console.log('⚠️ No hay roomName para fetch');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No hay token de autenticación');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/chat/messages/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Mensajes recibidos del servidor:', {
          count: data.messages?.length || 0,
          hasMessages: !!data.messages?.length,
          currentUserData
        });

        if (data.success && data.messages) {
          // Intentar detectar usuario desde mensajes SOLO como último recurso
          if (!partnerLoaded.current || detectionMethod.current === null) {
            const otherUserMessage = data.messages.find(msg => 
              !isMyMessage(msg.user_name, msg.user_id, msg.user_role)
            );
            if (otherUserMessage) {
              console.log('🔍 Intentando detectar desde mensaje (último recurso):', otherUserMessage);
              detectUserFromMessage(otherUserMessage);
            }
          }

          // 🔥 FILTRADO MEJORADO: Procesar mensajes nuevos que NO son míos
          const newMessages = data.messages.filter(msg => {
            const isNotMine = !isMyMessage(msg.user_name, msg.user_id, msg.user_role);
            const isNotProcessed = !processedMessages.current.has(msg.id);
            const isNewer = !lastMessageId.current || msg.id > lastMessageId.current;
            
            console.log('🔍 Evaluando mensaje:', {
              id: msg.id,
              user_name: msg.user_name,
              user_id: msg.user_id,
              message: msg.message?.substring(0, 30) + '...',
              isNotMine,
              isNotProcessed,
              isNewer,
              willProcess: isNotMine && isNotProcessed && isNewer
            });
            
            return isNotMine && isNotProcessed && isNewer;
          });

          console.log('🔍 Mensajes nuevos filtrados:', {
            total: data.messages.length,
            newCount: newMessages.length,
            currentUserData,
            lastMessageId: lastMessageId.current
          });

          newMessages.forEach(msg => {
            processedMessages.current.add(msg.id);
            lastMessageId.current = Math.max(lastMessageId.current || 0, msg.id);

            console.log('📨 Procesando mensaje nuevo (confirmado NO es mío):', {
              id: msg.id,
              user_name: msg.user_name,
              user_role: msg.user_role,
              message: msg.message,
              type: msg.type
            });

            // Detectar usuario si es necesario
            detectUserFromMessage(msg);

            if (onMessageReceived) {
              const messageForParent = {
                id: msg.id,
                text: msg.message,
                sender: msg.user_name,
                senderRole: msg.user_role,
                senderId: msg.user_id,
                type: 'remote',
                timestamp: msg.timestamp,
                messageType: msg.type
              };

              console.log('📤 Enviando mensaje al padre (confirmado del otro lado):', messageForParent);
              onMessageReceived(messageForParent);

              if (msg.type === 'gift' && msg.extra_data && onGiftReceived) {
                console.log('🎁 Procesando regalo:', msg.extra_data);
                onGiftReceived(msg.extra_data);
              }
            }
          });

          setIsConnected(true);
        }
      } else {
        console.log('❌ Error en respuesta del servidor:', response.status);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('❌ Error obteniendo mensajes:', error);
      setIsConnected(false);
    }
  };

  // Funciones de envío (SIN CAMBIOS pero con logging mejorado)
  const sendMessage = async (messageText) => {
    console.log('📤 Enviando mensaje:', { 
      messageText, 
      roomName, 
      currentUserData,
      userName
    });

    if (!messageText?.trim()) {
      console.log('❌ Mensaje vacío');
      return false;
    }

    if (!roomName) {
      console.log('❌ No hay roomName');
      return false;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.log('❌ No hay token de autenticación');
        return false;
      }

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
        const data = await response.json();
        console.log('✅ Mensaje enviado exitosamente:', data);
        console.log('⏰ Esperando 500ms antes de fetch para evitar rebote...');
        setTimeout(fetchMessages, 500);
        return true;
      } else {
        const errorData = await response.text();
        console.error('❌ Error enviando mensaje:', response.status, errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red enviando mensaje:', error);
      return false;
    }
  };

  const sendGift = async (gift) => {
    console.log('🎁 Enviando regalo:', gift);

    if (!gift || !roomName) {
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
          message: `Envió ${gift.nombre}`,
          type: 'gift',
          extra_data: gift
        })
      });

      if (response.ok) {
        console.log('✅ Regalo enviado exitosamente');
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

    if (!emoji || !roomName) {
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
          message: emoji,
          type: 'emoji'
        })
      });

      if (response.ok) {
        console.log('✅ Emoji enviado exitosamente');
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
  const getOtherParticipant = () => {
    return otherParticipant;
  };

  const getAllParticipants = () => {
    return participants;
  };

  const getParticipantsByRole = (role) => {
    return participants.filter(p => p.role === role);
  };

  // 🔥 CONFIGURACIÓN DE POLLING (sin cambios pero con logging mejorado)
  useEffect(() => {
    if (!roomName) {
      console.log('⚠️ No hay roomName, no iniciando polling');
      return;
    }

    console.log('🔄 Iniciando polling agresivo para sala:', roomName, 'con usuario:', currentUserData);

    // Verificar si ya tenemos usuario persistido
    if (persistedUser.current) {
      console.log('✅ Usuario ya persistido, saltando detección inicial:', persistedUser.current.name);
      setOtherParticipant(persistedUser.current);
      setIsDetecting(false);
      partnerLoaded.current = true;
      
      fetchParticipants().catch(() => {});
      
      pollingInterval.current = setInterval(() => {
        fetchMessages();
      }, 3000);

      participantsInterval.current = setInterval(() => {
        fetchParticipants().catch(() => {});
      }, 10000);

      return;
    }

    // Fetch inicial inmediato
    fetchParticipants().then(() => {
      if (!partnerLoaded.current) {
        fetchMessages();
      }
    }).catch(error => {
      console.warn('⚠️ Error inicial en participantes, probando mensajes inmediatamente');
      fetchMessages();
    });

    // Polling agresivo al inicio
    let aggressiveCount = 0;
    const aggressiveInterval = setInterval(() => {
      aggressiveCount++;
      
      if (partnerLoaded.current) {
        clearInterval(aggressiveInterval);
        console.log('✅ Usuario detectado, deteniendo polling agresivo');
        return;
      }
      
      fetchParticipants().catch(() => {
        fetchMessages();
      });
      
      if (aggressiveCount >= 10) {
        clearInterval(aggressiveInterval);
        console.log('🔄 Cambiando a polling normal');
      }
    }, 1000);

    // Polling normal de mensajes
    pollingInterval.current = setInterval(() => {
      fetchMessages();
    }, 2000);

    // Polling normal de participantes
    setTimeout(() => {
      participantsInterval.current = setInterval(() => {
        fetchParticipants().catch(error => {
          console.warn('⚠️ Error en polling de participantes');
        });
      }, 5000);
    }, 10000);

    return () => {
      if (aggressiveInterval) {
        clearInterval(aggressiveInterval);
      }
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        console.log('🛑 Polling de mensajes detenido');
      }
      if (participantsInterval.current) {
        clearInterval(participantsInterval.current);
        console.log('🛑 Polling de participantes detenido');
      }
      
      const currentRoom = sessionStorage.getItem('roomName');
      if (currentRoom !== roomName) {
        console.log('🧹 Limpiando usuario persistido - cambio de sala');
        persistedUser.current = null;
      }
    };
  }, [roomName, currentUserData.name]); // 🔥 AGREGAR currentUserData.name como dependencia

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
      currentUserData, // 🔥 NUEVO: Exponer datos del usuario actual
      getOtherParticipant,
      getAllParticipants,
      getParticipantsByRole,
      refreshParticipants: fetchParticipants
    };

    console.log('🎯 Exponiendo chatFunctions (SimpleChat):', {
      hasSendMessage: !!chatFunctionsData.sendMessage,
      isConnected: chatFunctionsData.isConnected,
      participantsCount: participants.length,
      otherParticipantName: otherParticipant?.name,
      detectionMethod: detectionMethod.current,
      currentUserData,
      roomName
    });

    if (window.livekitChatFunctions) {
      console.log('✅ Registrando funciones en window.livekitChatFunctions');
      window.livekitChatFunctions(chatFunctionsData);
    } else {
      console.log('🔄 Creando window.livekitChatFunctions callback');
      window.livekitChatFunctions = (callback) => {
        if (typeof callback === 'function') {
          callback(chatFunctionsData);
        }
      };

      setTimeout(() => {
        if (window.livekitChatFunctions && typeof window.livekitChatFunctions === 'function') {
          console.log('🔄 Registro tardío de funciones');
          window.livekitChatFunctions(chatFunctionsData);
        }
      }, 1000);
    }
  }, [roomName, isConnected, participants, otherParticipant, currentUserData]);

  // Limpiar cache cada 5 minutos
  useEffect(() => {
    const cleanup = setInterval(() => {
      processedMessages.current.clear();
      console.log('🧹 Cache de mensajes limpiado');
    }, 5 * 60 * 1000);

    return () => clearInterval(cleanup);
  }, []);

  // Log mejorado con datos del usuario actual
  useEffect(() => {
    console.log('📊 SimpleChat Estado:', {
      userName,
      userRole,
      roomName,
      currentUserData,
      isConnected,
      hasPolling: !!pollingInterval.current,
      processedCount: processedMessages.current.size,
      lastMessageId: lastMessageId.current,
      participantsCount: participants.length,
      otherParticipantName: otherParticipant?.name,
      otherParticipantRole: otherParticipant?.role,
      detectionMethod: detectionMethod.current || '❌ No detectado'
    });
  }, [userName, userRole, roomName, isConnected, participants, otherParticipant, currentUserData]);

  // 🔥 MEJORADA: Función para cargar perfil
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('👤 Cargando perfil de usuario...');
        const user = await getUser();
        const name = user.alias || user.name || user.username || '';
        const role = user.rol || user.role || 'modelo';

        console.log('✅ Perfil cargado:', { name, role, id: user.id });

        // 🔥 ACTUALIZAR currentUserData con todos los datos
        setCurrentUserData(prev => ({
          name: name || userName || prev.name,
          role: role,
          id: user.id,
          aliases: [...new Set([
            ...prev.aliases, 
            name, 
            userName, 
            user.alias, 
            user.name, 
            user.username
          ].filter(Boolean))]
        }));

        console.log('🔄 CurrentUserData actualizado:', {
          name: name || userName,
          role,
          id: user.id,
          aliases: [...new Set([name, userName, user.alias, user.name, user.username].filter(Boolean))]
        });

      } catch (err) {
        console.error('❌ Error cargando perfil en SimpleChat:', err);
        // Fallback con datos disponibles
        setCurrentUserData(prev => ({
          ...prev,
          name: userName || prev.name,
          role: userRole || prev.role,
          aliases: [...new Set([...prev.aliases, userName].filter(Boolean))]
        }));
      }
    };

    fetchProfile();
  }, [userName, userRole]); // 🔥 INCLUIR userName y userRole como dependencias

  return null;
};

export default SimpleChat;