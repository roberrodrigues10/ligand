import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SkipForward,
  Heart,
  Ban,
  Gift,
  Smile,
  ShieldCheck,
  Clock,
  MessageCircle,
  X,
  Menu,
  Send,
  Square,
} from "lucide-react";
import Header from "./header";
import SimpleChat from "./messages";
import { getUser } from "../utils/auth";
import { useSessionCleanup } from './closesession';
import { updateHeartbeatRoom } from '../utils/auth';
import { useVideoChatHeartbeat } from '../utils/heartbeat'; // 🔥 AGREGAR ESTE IMPORT




// 🔥 AGREGAR ESTE IMPORT
import { useSearching } from '../contexts/SearchingContext.jsx'; // Asegúrate de que esta ruta sea correcta

// ❌ ELIMINAR ESTE IMPORT:
// import SearchingUserLoading from './search';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔥 CACHE GLOBAL PERSISTENTE
const USER_CACHE = new Map();

// Función para generar clave única de la sala
const getRoomCacheKey = (roomName, currentUserName) => {
  return `${roomName}_${currentUserName}`;
};
// 🔥 AGREGAR ESTE COMPONENTE AL INICIO DE videochat.jsx
// (Después de los imports y antes del componente VideoChat principal)

  
      

// ✅ COMPONENTE CON VIDEO REAL PARA LA MODELO - RESPONSIVE
const VideoDisplay = ({ onCameraSwitch, mainCamera }) => {
  const participants = useParticipants();
  const localParticipant = participants.find(p => p.isLocal);
  const remoteParticipant = participants.find(p => !p.isLocal);
  
  // Obtener tracks de video
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ], { onlySubscribed: false });

  const getMainVideo = () => {
    try {
      if (mainCamera === "local" && localParticipant) {
        const localVideoTrack = tracks.find(
          trackRef => trackRef.participant.sid === localParticipant.sid && trackRef.source === Track.Source.Camera
        );
        
        if (localVideoTrack) {
          return (
            <VideoTrack 
              trackRef={localVideoTrack}
              className="w-full h-full object-cover"
            />
          );
        }
      } else if (remoteParticipant) {
        const remoteVideoTrack = tracks.find(
          trackRef => trackRef.participant.sid === remoteParticipant.sid && trackRef.source === Track.Source.Camera
        );
        
        if (remoteVideoTrack) {
          return (
            <VideoTrack 
              trackRef={remoteVideoTrack}
              className="w-full h-full object-cover"
            />
          );
        }
      }
    } catch (error) {
      console.log("Error rendering main video:", error);
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white p-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="animate-pulse text-4xl sm:text-6xl mb-4">👩‍💼</div>
          <p className="text-lg sm:text-xl mb-2">Vista de la Modelo</p>
          <div className="space-y-2 text-xs sm:text-sm">
            <p className="text-green-400">✅ Conectada al servidor LiveKit</p>
            <p className="text-gray-400">👥 Participantes: {participants.length}</p>
            {localParticipant && (
              <p className="text-blue-400">🟦 Tú (Modelo): {localParticipant.identity}</p>
            )}
            {remoteParticipant && (
              <p className="text-pink-400">🟪 Cliente: {remoteParticipant.identity}</p>
            )}
            {!remoteParticipant && participants.length === 1 && (
              <p className="text-yellow-400">⏳ Esperando que se conecte el cliente...</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getMiniVideo = () => {
    try {
      if (mainCamera === "local" && remoteParticipant) {
        const remoteVideoTrack = tracks.find(
          trackRef => trackRef.participant.sid === remoteParticipant.sid && trackRef.source === Track.Source.Camera
        );
        
        if (remoteVideoTrack) {
          return (
            <VideoTrack 
              trackRef={remoteVideoTrack}
              className="w-full h-full object-cover"
            />
          );
        }
      } else if (localParticipant) {
        const localVideoTrack = tracks.find(
          trackRef => trackRef.participant.sid === localParticipant.sid && trackRef.source === Track.Source.Camera
        );
        
        if (localVideoTrack) {
          return (
            <VideoTrack 
              trackRef={localVideoTrack}
              className="w-full h-full object-cover"
            />
          );
        }
      }
    } catch (error) {
      console.log("Error rendering mini video:", error);
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-600 text-white text-xs">
        <span>Vista mini</span>
      </div>
    );
  };

  return (
    <>
      <div className="w-full h-full">{getMainVideo()}</div>
      <div
        className="absolute top-4 right-2 w-20 h-28 lg:bottom-4 lg:left-4 lg:top-auto lg:right-auto lg:w-40 lg:h-28 rounded-lg overflow-hidden border-2 border-[#ff007a] shadow-lg cursor-pointer transition-all hover:scale-105"
        onClick={onCameraSwitch}
      >
        {getMiniVideo()}
        <div className="absolute top-0.5 left-0.5 right-0.5 bg-black/80 px-1 py-0.5 rounded text-[8px] text-white text-center truncate">
          {mainCamera === "local" ? "CLIENTE" : "YO"}
        </div>
      </div>
    </>
  );
};

// ✅ COMPONENTE PARA MENSAJES FLOTANTES
const FloatingMessages = ({ messages }) => {
  return (
    <div className="lg:hidden absolute top-4 left-2 right-2 max-h-[35vh] overflow-y-auto z-10 space-y-2">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`transition-opacity duration-300 ${
            msg.isOld ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {msg.type === 'system' ? (
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 border border-green-400/30 max-w-[90%]">
              <span className="font-bold text-green-400 text-xs">🎰 Sistema</span>
              <p className="text-white text-xs mt-1 leading-tight">{msg.text}</p>
            </div>
          ) : msg.type === 'remote' ? (
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 max-w-[85%]">
              <span className="font-bold text-blue-400 text-xs">Cliente</span>
              <p className="text-white text-xs mt-1 leading-tight">{msg.text}</p>
            </div>
          ) : (
            <div className="flex justify-end">
              <div className="bg-[#ff007a]/80 backdrop-blur-sm rounded-lg p-2 max-w-[75%]">
                <p className="text-white text-xs leading-tight">{msg.text}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// 🔥 COMPONENTE PRINCIPAL COMPLETAMENTE CORREGIDO
export default function VideoChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();


  // 🔥 AGREGAR EL HOOK DE SEARCHING
const { startSearching, stopSearching, forceStopSearching } = useSearching();

  // 🔥 PRIMERO: Declarar roomName y userName
  const modelo = location.state?.modelo;
  const getParam = (key) => {
    const stateValue = location.state?.[key];
    const sessionValue = sessionStorage.getItem(key);
    const urlValue = searchParams.get(key);
    return stateValue || sessionValue || urlValue;
  };

  const roomName = getParam("roomName");
  const userName = getParam("userName");
  const selectedCamera = location.state?.selectedCamera;
  const selectedMic = location.state?.selectedMic;

  // 🔥 ESTADOS BÁSICOS
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [modeloStoppedWorking, setModeloStoppedWorking] = useState(false);
  const [receivedNotification, setReceivedNotification] = useState(false);


  // ❌ ELIMINAR ESTA LÍNEA:
  // const [isSearchingUser, setIsSearchingUser] = useState(false);

  // Estados para controles
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  
  // Estados para UI
  const [camaraPrincipal, setCamaraPrincipal] = useState("remote");
  const [tiempo, setTiempo] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [mostrarRegalos, setMostrarRegalos] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const { finalizarSesion, limpiarDatosSession } = useSessionCleanup(roomName, connected);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      text: '¡Cliente conectado! Comienza tu show 🎥',
      timestamp: Date.now(),
      isOld: false
    },
    {
      id: 2,
      type: 'remote',
      text: '¡Hola! ¿Cómo estás?',
      timestamp: Date.now(),
      isOld: false
    }
  ]);

  // 🔥 ESTADOS DE USUARIO CON CACHE PERSISTENTE
  const [userData, setUserData] = useState({
    name: "",
    role: "",
    id: null,
  });

  const [otherUser, setOtherUser] = useState(() => {
    if (!roomName || !userName) return null;
    const cacheKey = getRoomCacheKey(roomName, userName);
    const cached = USER_CACHE.get(cacheKey);
    console.log('🔄 Inicializando VideoChat con cache:', cached);
    return cached || null;
  });

  const [isDetectingUser, setIsDetectingUser] = useState(() => {
    if (!roomName || !userName) return false;
    const cacheKey = getRoomCacheKey(roomName, userName);
    const hasCache = USER_CACHE.has(cacheKey);
    console.log('🔍 Estado inicial de detección:', !hasCache);
    return !hasCache;
  });
  
  useVideoChatHeartbeat(roomName, 'modelo');

  const [chatFunctions, setChatFunctions] = useState(null);
  const messagesContainerRef = useRef(null);
  const sendHeartbeat = async (activityType = 'videochat') => {
  try {
    const authToken = sessionStorage.getItem('token');
    if (!authToken) return;

    const response = await fetch(`${API_BASE_URL}/api/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        activity_type: activityType, // 🔥 'videochat' = NO disponible para emparejamiento
        room: roomName
      })
    });

    if (response.ok) {
      console.log(`💓 [VIDEOCHAT] Heartbeat enviado: ${activityType}`);
    }
  } catch (error) {
    console.log('⚠️ [VIDEOCHAT] Error enviando heartbeat:', error);
  }
};

  // Agregar useEffect para heartbeat periódico
  useEffect(() => {
    if (!roomName) return;

    // Heartbeat inicial
    sendHeartbeat('videochat');

    // Heartbeat cada 15 segundos durante videochat
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat('videochat');
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
      // Heartbeat final al salir
      sendHeartbeat('browsing'); // Volver a estado disponible
    };
  }, [roomName]);

  // 🔥 FUNCIONES DE CACHE MEJORADAS
  const updateOtherUser = (user) => {
    if (!user || !roomName || !userName) {
      console.log('⚠️ updateOtherUser: Parámetros faltantes', { user, roomName, userName });
      return;
    }
    
    const cacheKey = getRoomCacheKey(roomName, userName);
    console.log('💾 Guardando usuario en cache:', { user, cacheKey });
    
    USER_CACHE.set(cacheKey, user);
    setOtherUser(user);
    setIsDetectingUser(false);
    
    console.log('✅ Usuario actualizado y guardado en cache:', user.name);
  };

  const clearUserCache = () => {
    if (!roomName || !userName) return;
    const cacheKey = getRoomCacheKey(roomName, userName);
    console.log('🧹 Limpiando cache para:', cacheKey);
    USER_CACHE.delete(cacheKey);
    setOtherUser(null);
    setIsDetectingUser(true);
  };

  // 🔥 FUNCIÓN DE RATE LIMITING
  const handleRateLimit = useCallback((error, context = 'general') => {
    if (error?.response?.status === 429) {
      console.warn(`⚠️ Rate limit detectado en VideoChat MODELO (${context})`);
      
      navigate('/rate-limit-wait', {
        state: {
          message: `Servidor ocupado en videochat modelo, reintentando...`,
          waitTime: 12000,
          fallbackRoute: "/homellamadas",
          onRetry: (userRole) => {
            console.log('🔄 Reintentando videochat con rol:', userRole);
            if (userRole === 'cliente') return '/homecliente';
            if (userRole === 'modelo') return '/homellamadas';
            return '/home';
          }
        },
        replace: true
      });
      return true;
    }
    return false;
  }, [navigate]);

  // 🔥 FUNCIONES DE DISPLAY MEJORADAS
  const getDisplayName = () => {
    if (!roomName || !userName) return "Configurando...";
    
    const cacheKey = getRoomCacheKey(roomName, userName);
    const cached = USER_CACHE.get(cacheKey);
    
    if (cached) {
      return cached.name;
    }
    
    if (otherUser) {
      return otherUser.name;
    }
    
    if (isDetectingUser) {
      return "Conectando...";
    }
    
    return "Esperando usuario...";
  };

  const getDisplayRole = () => {
    if (!roomName || !userName) return "Configurando...";
    
    const cacheKey = getRoomCacheKey(roomName, userName);
    const cached = USER_CACHE.get(cacheKey);
    
    if (cached) {
      return cached.role === 'modelo' ? 'Modelo' : 'Cliente';
    }
    
    if (otherUser) {
      return otherUser.role === 'modelo' ? 'Modelo' : 'Cliente';
    }
    
    if (isDetectingUser) {
      return "Buscando usuario";
    }
    
    return "Sin conexión";
  };

  const shouldShowSpinner = () => {
    if (!roomName || !userName) return false;
    const cacheKey = getRoomCacheKey(roomName, userName);
    const hasCache = USER_CACHE.has(cacheKey);
    return !hasCache && isDetectingUser;
  };

  // 🔥 CALLBACKS MEJORADOS
  const handleUserLoadedFromChat = (user) => {
    console.log('📥 Usuario recibido desde SimpleChat:', user);
    updateOtherUser(user);
  };

  const handleMessageReceived = (newMessage) => {
    console.log('🎯 handleMessageReceived llamado con:', newMessage);
    
    const formattedMessage = {
      ...newMessage,
      id: newMessage.id || Date.now() + Math.random(),
      type: 'remote',
      senderRole: newMessage.senderRole || 'cliente'
    };
    
    console.log('💾 Mensaje formateado para guardar:', formattedMessage);
    
    setMessages(prev => {
      console.log('📝 Mensajes antes:', prev.length);
      const updated = [formattedMessage, ...prev];
      console.log('📝 Mensajes después:', updated.length);
      return updated;
    });
  };

  const handleGiftReceived = (gift) => {
    const giftMessage = {
      id: Date.now(),
      type: 'system',
      text: `¡Recibiste ${gift.nombre}! +${gift.valor} monedas 💰`,
      timestamp: Date.now(),
      isOld: false
    };
    setMessages(prev => [giftMessage, ...prev]);
  };

  // Funciones de UI
  const formatoTiempo = () => {
    const minutos = Math.floor(tiempo / 60).toString().padStart(2, "0");
    const segundos = (tiempo % 60).toString().padStart(2, "0");
    return `${minutos}:${segundos}`;
  };

  const cambiarCamara = () => {
    setCamaraPrincipal(prev => prev === "remote" ? "local" : "remote");
  };

  const handleRoomConnected = () => {
    console.log("🟢 MODELO - Conectada a LiveKit!");
    setConnected(true);
  };
  
  const handleRoomDisconnected = () => {
    console.log("🔴 MODELO - Desconectada de LiveKit");
    setConnected(false);
  };

  const enviarMensaje = () => {
    if (mensaje.trim()) {
      console.log('🚀 Intentando enviar mensaje:', mensaje.trim());
      
      if (chatFunctions?.sendMessage) {
        console.log('📡 Llamando a chatFunctions.sendMessage...');
        const success = chatFunctions.sendMessage(mensaje.trim());
        
        if (success) {
          const nuevoMensaje = {
            id: Date.now(),
            type: 'local',
            text: mensaje.trim(),
            timestamp: Date.now(),
            isOld: false
          };
          setMessages(prev => [nuevoMensaje, ...prev]);
          setMensaje("");
        }
      } else {
        const nuevoMensaje = {
          id: Date.now(),
          type: 'local',
          text: mensaje.trim(),
          timestamp: Date.now(),
          isOld: false
        };
        setMessages(prev => [...prev, nuevoMensaje]);
        setMensaje("");
      }
    }
  };

  const enviarRegalo = (regalo) => {
    if (chatFunctions?.sendGift) {
      const success = chatFunctions.sendGift(regalo);
      if (success) {
        const regaloMessage = {
          id: Date.now(),
          type: 'local',
          text: `Enviaste ${regalo.nombre}`,
          timestamp: Date.now(),
          isOld: false
        };
        setMessages(prev => [...prev, regaloMessage]);
        setMostrarRegalos(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      enviarMensaje();
    }
  };


  const siguientePersona = async () => {
    console.log('🔄 [MODELO] Siguiente persona solicitado...');
    
    try {
      const authToken = sessionStorage.getItem('token');
      
      // 🔥 SOLO NOTIFICAR AL SERVIDOR - NO NAVEGAR
      await fetch(`${API_BASE_URL}/api/livekit/client-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          currentRoom: roomName,
          userName: userName,
          action: 'siguiente',
          userRole: 'modelo',
          partnerId: otherUser?.id,
          timestamp: Date.now()
        }),
      });

      // 🔥 NAVEGAR A USERSEARCH CON PARÁMETROS ESPECÍFICOS
      const urlParams = new URLSearchParams({
        role: 'modelo',
        action: 'siguiente',
        currentRoom: roomName,
        userName: userName,
        selectedCamera: selectedCamera || '',
        selectedMic: selectedMic || '',
        excludeUser: otherUser?.id || '',
        from: 'videochat_siguiente'
      });
      
      navigate(`/usersearch?${urlParams}`);
      
    } catch (error) {
      console.error('❌ [MODELO] Error en siguiente:', error);
      // Fallback: navegar a UserSearch sin notificación
      navigate(`/usersearch?role=modelo&currentRoom=${roomName}&userName=${userName}`);
    }
  };

  const finalizarChat = async () => {
    console.log('🛑 [MODELO] Finalizando chat...');
    
    try {
      const authToken = sessionStorage.getItem('token');
      
      // 🔥 NOTIFICAR FINALIZACIÓN
      await fetch(`${API_BASE_URL}/api/livekit/client-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          currentRoom: roomName,
          userName: userName,
          action: 'stop',
          userRole: 'modelo',
          partnerId: otherUser?.id,
          timestamp: Date.now()
        }),
      });

      // 🔥 NAVEGAR A PÁGINA DE ESPERA (NO A USERSEARCH)
      navigate('/esperandocall', { replace: true });
      
    } catch (error) {
      console.error('❌ [MODELO] Error finalizando:', error);
      navigate('/esperandocall', { replace: true });
    }
  };
    
  // En videochat.js (MODELO)
  useEffect(() => {
    if (!userData.id || !roomName) return;

    console.log('📡 [MODELO] Conectando a notificaciones...');
    
    // 🔥 CONECTAR A SERVER-SENT EVENTS
    const eventSource = new EventSource(
      `${API_BASE_URL}/api/notifications/${userData.id}`,
      {
        withCredentials: false,
      }
    );
    
    eventSource.onopen = () => {
      console.log('✅ [MODELO] Notificaciones conectadas');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 [MODELO] Notificación recibida:', data);
        
        if (data.type === 'client_left') {
          console.log(`👤 [MODELO] Cliente se fue (${data.action}) - buscando automáticamente...`);
          
          // 🔥 NAVEGAR AUTOMÁTICAMENTE A BÚSQUEDA
          const urlParams = new URLSearchParams({
            role: 'modelo',
            currentRoom: roomName,
            userName: userName,
            selectedCamera: selectedCamera || '',
            selectedMic: selectedMic || '',
          });
          
          navigate(`/usersearch?${urlParams}`);
        }
      } catch (error) {
        console.error('❌ [MODELO] Error procesando notificación:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ [MODELO] Error en notificaciones:', error);
    };

    return () => {
      console.log('🔌 [MODELO] Cerrando conexión de notificaciones');
      eventSource.close();
    };
  }, [userData.id, roomName, navigate]);

  // 🔥 CARGAR USUARIO CON RATE LIMITING
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('👤 [MODELO] Cargando datos del usuario...');
        const user = await getUser(false);
        const name = user.alias || user.name || user.username || "";
        const role = user.rol || user.role || "modelo";

        console.log('✅ [MODELO] Usuario cargado:', { name, role, id: user.id });

        setUserData({
          name,
          role,
          id: user.id,
        });
      } catch (err) {
        console.error("❌ [MODELO] Error al obtener usuario en VideoChat:", err);
        
        const wasRateLimited = handleRateLimit(err, 'getUser');
        if (wasRateLimited) {
          return;
        }
        
        if (err.response?.status === 429) {
          console.warn('⚠️ Rate limited en VideoChat - continuando con datos básicos');
          setUserData({
            name: userName || "Usuario",
            role: "modelo",
            id: null,
          });
        }
      }
    };

    fetchUser();
  }, [handleRateLimit, userName]);

  // 🔥 NUEVO: Detener búsqueda cuando se conecta
  useEffect(() => {
    // 🔥 CONDICIONES PARA QUITAR EL LOADING:
    const shouldStopLoading = 
      connected && 
      token && 
      chatFunctions && 
      (
        chatFunctions.participantsCount > 1 || // Hay más de 1 participante (tú + cliente)
        chatFunctions.hasOtherParticipant ||   // Detectó otro participante
        !chatFunctions.isDetecting             // Ya no está detectando
      );

    if (shouldStopLoading) {
      console.log('🎉 [VIDEOCHAT] ¡Usuario encontrado! Quitando loading...', {
        connected,
        hasToken: !!token,
        participantsCount: chatFunctions?.participantsCount,
        hasOtherParticipant: chatFunctions?.hasOtherParticipant,
        isDetecting: chatFunctions?.isDetecting
      });
      
      forceStopSearching();
    } else if (connected && token && chatFunctions) {
      console.log('⏳ [VIDEOCHAT] Conectado pero sin usuarios - manteniendo loading...', {
        participantsCount: chatFunctions?.participantsCount,
        hasOtherParticipant: chatFunctions?.hasOtherParticipant,
        isDetecting: chatFunctions?.isDetecting
      });
    }
  }, [connected, token, chatFunctions, forceStopSearching]);

  useEffect(() => {
    console.log('🔧 Configurando chatFunctions para:', { roomName, userName });
    
    window.livekitChatFunctions = (functions) => {
      console.log('📡 Recibiendo chatFunctions:', {
        hasOtherParticipant: !!functions.otherParticipant,
        isDetecting: functions.isDetecting,
        participantsCount: functions.participants?.length || 0
      });
      
      setChatFunctions(functions);
      
      if (functions.otherParticipant && !otherUser) {
        console.log('👥 Recibiendo participante desde chatFunctions:', functions.otherParticipant);
        updateOtherUser(functions.otherParticipant);
      }
      
      if (functions.isDetecting !== undefined) {
        setIsDetectingUser(functions.isDetecting);
      }
    };
    
    return () => {
      delete window.livekitChatFunctions;
    };
  }, [roomName, userName]);

  // Limpiar cache al cambiar sala
  useEffect(() => {
    return () => {
      const currentRoom = sessionStorage.getItem('roomName');
      if (currentRoom !== roomName) {
        console.log('🧹 Limpiando cache - cambio de sala detectado');
        clearUserCache();
      }
    };
  }, [roomName]);

  // Guardar parámetros en sessionStorage
  useEffect(() => {
    if (roomName && roomName !== 'null' && roomName !== 'undefined') {
      sessionStorage.setItem("roomName", roomName);
    }
    if (userName && userName !== 'null' && userName !== 'undefined') {
      sessionStorage.setItem("userName", userName);
    }
  }, [roomName, userName]);

  // ⏳ Heartbeat cada 30 segundos mientras estás en la sala
  useEffect(() => {
    let interval = null;

    if (room && roomName) {
      updateHeartbeatRoom(roomName);

      interval = setInterval(() => {
        updateHeartbeatRoom(roomName);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [room, roomName]);

  // Memmo
  const memoizedRoomName = useMemo(() => {
    const room = getParam("roomName");
    return room && room !== 'null' && room !== 'undefined' ? room : null;
  }, [location.state, searchParams]);

  const memoizedUserName = useMemo(() => {
    const user = getParam("userName");
    return user && user !== 'null' && user !== 'undefined' ? user : null;
  }, [location.state, searchParams]);

  const handleChatFunctions = useCallback((functions) => {
    console.log('📡 Recibiendo chatFunctions:', {
      hasOtherParticipant: !!functions.otherParticipant,
      isDetecting: functions.isDetecting,
      participantsCount: functions.participants?.length || 0
    });
    
    setChatFunctions(functions);
    
    if (functions.otherParticipant && !otherUser) {
      console.log('👥 Recibiendo participante desde chatFunctions:', functions.otherParticipant);
      updateOtherUser(functions.otherParticipant);
    }
    
    if (functions.isDetecting !== undefined) {
      setIsDetectingUser(functions.isDetecting);
    }
  }, [otherUser]);


// 🔥 REEMPLAZAR EL useEffect PROBLEMÁTICO EN videochat.js (MODELO)
  useEffect(() => {
    if (modeloStoppedWorking || receivedNotification) {
      console.log('🛑 [MODELO] No buscar - modelo paró o recibió notificación');
      return;
    }

    if (!connected || !token || !chatFunctions) {
      console.log('⏳ [MODELO] Aún no conectado completamente');
      return;
    }

    console.log('🔍 [MODELO] Verificando participantes:', {
      participantsCount: chatFunctions.participantsCount,
      hasOtherParticipant: chatFunctions.hasOtherParticipant,
      participants: chatFunctions.participants?.map(p => ({ identity: p.identity, isLocal: p.isLocal }))
    });

    // 🔥 DETECCIÓN MEJORADA: Solo la modelo queda en la sala
    const soloLaModeloQueda = chatFunctions.participantsCount <= 1;
    
    if (soloLaModeloQueda) {
      console.log('👤 [MODELO] ¡Cliente se fue! Navegando a UserSearch...');
      
      // 🔥 TIMEOUT CORTO PARA DAR TIEMPO A QUE SE ACTUALICE EL ESTADO
      const timer = setTimeout(() => {
        console.log('🔄 [MODELO] Ejecutando navegación a UserSearch...');
        
        // Limpiar cache del usuario anterior
        clearUserCache();
        
        // 🔥 NAVEGAR INMEDIATAMENTE A USERSEARCH
        const urlParams = new URLSearchParams({
          role: 'modelo',
          currentRoom: roomName,
          userName: userName,
          selectedCamera: selectedCamera || '',
          selectedMic: selectedMic || '',
          reason: 'cliente_se_fue' // Para debugging
        });
        
        console.log('🧭 [MODELO] Navegando a:', `/usersearch?${urlParams}`);
        navigate(`/usersearch?${urlParams}`);
        
      }, 2000); // 2 segundos de delay

      return () => clearTimeout(timer);
    } else {
      console.log('👥 [MODELO] Cliente aún conectado, no hacer nada');
    }

  }, [
    connected, 
    token, 
    chatFunctions?.participantsCount, // 🔥 DEPENDENCIA ESPECÍFICA
    chatFunctions?.hasOtherParticipant,
    modeloStoppedWorking, 
    receivedNotification,
    navigate,
    roomName,
    userName,
    selectedCamera,
    selectedMic
  ]);
  // 🔥 AÑADIR ESTE DEBUG EN videochat.js (MODELO)
// Justo después de configurar chatFunctions

  useEffect(() => {
    if (chatFunctions) {
      console.log('👥 [MODELO] DEBUG Participantes:', {
        count: chatFunctions.participantsCount,
        hasOther: chatFunctions.hasOtherParticipant,
        participants: chatFunctions.participants?.map(p => ({
          identity: p.identity,
          isLocal: p.isLocal,
          sid: p.sid
        })) || [],
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }, [chatFunctions?.participantsCount, chatFunctions?.hasOtherParticipant]);

  const handleParticipantsChange = useCallback((participants) => {
    console.log('🔄 [MODELO] Participantes actualizados:', participants.length);
  }, []);



  // 🔥 TAMBIÉN RESETEAR EL FLAG CUANDO CAMBIE LA SALA
  useEffect(() => {
    setModeloStoppedWorking(false);
    setReceivedNotification(false); // 🔥 RESETEAR TAMBIÉN ESTE
  }, [roomName]);

  // 🔥 FIX 4: Obtener token con rate limiting protection
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const getTokenWithRetry = async () => {
      try {
        if (!memoizedRoomName || !memoizedUserName) {
          throw new Error(`Parámetros inválidos - roomName: "${memoizedRoomName}", userName: "${memoizedUserName}"`);
        }

        console.log("🎥 MODELO - Obteniendo token para:", { 
          roomName: memoizedRoomName, 
          userName: memoizedUserName 
        });

        const authToken = sessionStorage.getItem('token');
        if (!authToken) {
          throw new Error('No se encontró token de autenticación');
        }

        const response = await fetch(`${API_BASE_URL}/api/livekit/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ 
            room: memoizedRoomName.trim(), 
            identity: memoizedUserName.trim(),
            preferredCamera: selectedCamera,
            preferredMic: selectedMic
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          const error = new Error(`Error ${response.status}: ${errorData}`);
          error.response = { status: response.status };
          
          if (response.status === 429) {
            const wasRateLimited = handleRateLimit(error, 'livekit-token');
            if (wasRateLimited) {
              return;
            }
            
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = 3000 * retryCount;
              console.warn(`⚠️ Rate limited token, reintentando en ${delay}ms...`);
              setTimeout(() => {
                if (isMounted) getTokenWithRetry();
              }, delay);
              return;
            }
          }
          
          throw error;
        }
        
        const data = await response.json();
        console.log("✅ MODELO - Token obtenido exitosamente");

        if (isMounted) {
          setToken(data.token);
          setServerUrl(data.serverUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ MODELO - Error al obtener token:', err);
        
        const wasRateLimited = handleRateLimit(err, 'token-error');
        if (!wasRateLimited && isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    if (memoizedRoomName && memoizedUserName) {
      getTokenWithRetry();
    } else {
      console.error("Parámetros faltantes:", { 
        roomName: memoizedRoomName, 
        userName: memoizedUserName 
      });
      setError(`Faltan parámetros de la sala.`);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [memoizedRoomName, memoizedUserName, handleRateLimit]);

  // 🔥 RESETEAR FLAG AL CAMBIAR DE SALA (para permitir trabajo en nueva sala)
  useEffect(() => {
    setModeloStoppedWorking(false);
  }, [roomName]);
  // Timer
  useEffect(() => {
    const intervalo = setInterval(() => setTiempo((prev) => prev + 1), 1000);
    return () => clearInterval(intervalo);
  }, []);
 
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Marcar mensajes como viejos
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages(prev => prev.map(msg => ({ ...msg, isOld: true })));
    }, 3000);

    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token || !roomName) return;

    const interval = setInterval(() => {
      fetch(`${API_BASE_URL}/api/heartbeat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_room: roomName,
          activity_type: 'videochat_model',
        }),
      })
        .then(res => {
          if (!res.ok) console.warn("⚠️ Heartbeat falló", res.status);
        })
        .catch(err => console.error("❌ Heartbeat error:", err));
    }, 30000);

    return () => clearInterval(interval);
  }, [roomName]);


  // Estados de carga y error
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="animate-spin rounded-full h-20 w-20 sm:h-32 sm:w-32 border-b-2 border-[#ff007a] mx-auto mb-4"></div>
          <p className="text-lg sm:text-xl">Conectando a la videollamada...</p>
          <p className="text-sm text-gray-400 mt-2">👩‍💼 Modo Modelo</p>
          {modelo && (
            <div className="mt-4 text-sm text-gray-400">
              <p>Eres: {modelo.nombre} {modelo.pais}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <p className="text-red-500 text-lg sm:text-xl mb-4">Error: {error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/precallmodel')}
              className="bg-[#ff007a] px-6 py-3 rounded-full text-white font-medium"
            >
              🎰 Volver a Inicio
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="bg-gray-600 px-6 py-3 rounded-full text-white font-medium"
            >
              Atrás
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 RENDER PRINCIPAL
  return (
    <LiveKitRoom
      video={cameraEnabled}
      audio={micEnabled}
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="default"
      onConnected={handleRoomConnected}
      onDisconnected={handleRoomDisconnected}
      className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white lg:block flex flex-col"
      options={{
        videoCaptureDefaults: selectedCamera ? { deviceId: selectedCamera } : undefined,
        audioCaptureDefaults: selectedMic ? { deviceId: selectedMic } : undefined,
      }}
    >
      <RoomAudioRenderer />
        
      {memoizedRoomName && memoizedUserName && (
        <SimpleChat
          key={`${memoizedRoomName}-${memoizedUserName}`}
          userName={userData.name}
          userRole={userData.role}
          roomName={memoizedRoomName}
          onMessageReceived={handleMessageReceived}
          onGiftReceived={handleGiftReceived}
          onUserLoaded={handleUserLoadedFromChat}
          onParticipantsUpdated={(participants) => {
            console.log('👥 Todos los participantes:', participants);
          }}
        />
      )}

      <MediaControls 
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        setMicEnabled={setMicEnabled}
        setCameraEnabled={setCameraEnabled}
      />
      
      <div className="p-2 sm:p-4">
        <Header />

        {/* MÓVIL/TABLET - Video pantalla completa */}
        <div className="lg:hidden bg-[#1f2125] rounded-2xl overflow-hidden relative mt-4 h-[80vh]">
          <VideoDisplay onCameraSwitch={cambiarCamara} mainCamera={camaraPrincipal} />
          
          <FloatingMessages messages={messages} />
          
          {/* Input de chat móvil */}
          <div className="absolute bottom-4 left-2 right-2 z-20">
            <div className="bg-black/70 backdrop-blur-sm rounded-full p-2 flex items-center gap-1 border border-[#ff007a]/20">
              <button
                className="text-[#ff007a] hover:text-white p-1 flex-shrink-0"
                onClick={() => setMostrarRegalos(!mostrarRegalos)}
              >
                <Gift size={16} />
              </button>
              <button className="text-[#ff007a] hover:text-white p-1 flex-shrink-0">
                <Smile size={16} />
              </button>
              <input
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Responde..."
                className="flex-1 bg-transparent px-2 py-2 outline-none text-white text-xs placeholder-white/50 min-w-0"
              />
              <button 
                className="text-[#ff007a] hover:text-white p-1 flex-shrink-0"
                onClick={enviarMensaje}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP - Header con información de la llamada */}
        <div className="hidden lg:flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm text-white/70 mt-4 mb-2 font-mono gap-2">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#ff007a]" />
            <span>Tiempo: </span>
            <span className="text-[#ff007a] font-bold">{formatoTiempo()}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#ff007a] font-bold text-xs">∞ Ilimitado</span>
            {connected && (
              <span className="text-green-400 text-xs">🟢 Conectada</span>
            )}
            <span className="text-blue-400 text-xs">👩‍💼 Modelo</span>
          </div>
        </div>

        {/* DESKTOP - Layout principal */}
        <div className="hidden lg:flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* ZONA VIDEO */}
          <div className="flex-1 bg-[#1f2125] rounded-xl lg:rounded-2xl overflow-hidden relative flex items-center justify-center h-[300px] sm:h-[400px] lg:h-[500px] transition-all duration-500">
            <VideoDisplay onCameraSwitch={cambiarCamara} mainCamera={camaraPrincipal} />
          </div>

          {/* PANEL DERECHO - Desktop */}
          <div className="w-[340px] bg-[#1f2125] rounded-2xl flex flex-col justify-between relative">
            <div className="flex justify-between items-center p-4 border-b border-[#ff007a]/20">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-sm sm:text-base">
                    {getDisplayName()}
                  </p>
                  {shouldShowSpinner() && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-[#ff007a]"></div>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {getDisplayRole()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-green-400" title="Verificado" />
                <button title="Favorito" className="text-[#ff007a] hover:scale-110 transition">
                  <Heart size={16} />
                </button>
                <button title="Bloquear" className="text-red-400 hover:scale-110 transition">
                  <Ban size={16} />
                </button>
              </div>
            </div>

            {/* Chat */}
            <div 
              ref={messagesContainerRef}
              className="max-h-[360px] p-4 space-y-3 overflow-y-auto custom-scroll"
            >
              {messages.filter(msg => msg.id > 2).reverse().map((msg, index) => (
                <div key={msg.id} className={msg.type === 'local' ? 'text-right' : 'text-xs sm:text-sm'}>
                  {msg.type === 'local' ? (
                    <p className="bg-[#ff007a] inline-block px-3 py-2 mt-1 rounded-xl text-white max-w-[280px] text-xs sm:text-sm break-words">
                      {msg.text}
                    </p>
                  ) : msg.type === 'system' ? (
                    <>
                      <span className="font-bold text-green-400">🎰 Sistema</span>
                      <p className="bg-[#1f2937] inline-block px-3 py-2 mt-1 rounded-xl border border-green-400/30 max-w-[280px] break-words">
                        {msg.text}
                      </p>
                    </>
                  ) : msg.type === 'remote' ? (
                    <>
                      <p className="bg-[#2b2d31] inline-block px-3 py-2 mt-1 rounded-xl max-w-[280px] break-words">
                        {msg.text}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-blue-400"></span>
                      <p className="bg-[#2b2d31] inline-block px-3 py-2 mt-1 rounded-xl max-w-[280px] break-words">
                        {msg.text}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Modal de regalos */}
            {mostrarRegalos && (
              <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 bg-[#1a1c20] p-3 sm:p-5 rounded-xl shadow-2xl w-[280px] sm:w-[300px] max-h-[300px] sm:max-h-[360px] overflow-y-auto z-50 border border-[#ff007a]/30">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-semibold text-xs sm:text-sm">🎁 Regalos</h3>
                  <button onClick={() => setMostrarRegalos(false)} className="text-white/50 hover:text-white text-sm">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { nombre: "🌹 Rosa", valor: 10 },
                    { nombre: "💖 Corazón", valor: 20 },
                    { nombre: "🍾 Champán", valor: 30 },
                    { nombre: "💍 Anillo", valor: 50 },
                    { nombre: "🍰 Pastel", valor: 15 },
                    { nombre: "🐻 Peluche", valor: 25 },
                    { nombre: "🎸 Canción", valor: 35 },
                    { nombre: "🚗 Coche", valor: 70 },
                    { nombre: "📱 Celular", valor: 80 },
                    { nombre: "💎 Diamante", valor: 100 },
                  ].map((regalo, i) => (
                    <div 
                      key={i} 
                      className="bg-[#2b2d31] px-2 sm:px-3 py-2 rounded-xl flex items-center justify-between hover:bg-[#383c44] cursor-pointer transition"
                      onClick={() => enviarRegalo(regalo)}
                    >
                      <span className="text-xs sm:text-sm text-white">{regalo.nombre}</span>
                      <span className="text-[10px] sm:text-xs text-[#ff007a] font-bold">+{regalo.valor}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input de chat */}
            <div className="border-t border-[#ff007a]/20 p-3 flex gap-2 items-center">
              <button
                className="text-[#ff007a] hover:text-white transition"
                onClick={() => setMostrarRegalos(!mostrarRegalos)}
              >
                <Gift size={18} />
              </button>
              <button className="text-[#ff007a] hover:text-white transition">
                <Smile size={18} />
              </button>
              <input
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Responde al cliente..."
                className="flex-1 bg-[#131418] px-3 sm:px-4 py-2 rounded-full outline-none text-white text-xs sm:text-sm"
              />
              <button 
                className="text-[#ff007a] hover:text-white transition"
                onClick={enviarMensaje}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLES RESPONSIVOS */}
        <div className="flex justify-center items-center gap-4 sm:gap-6 lg:gap-10 mt-4 lg:mt-6 px-4">
          <button 
            className={`p-3 sm:p-4 rounded-full transition ${
              micEnabled 
                ? 'bg-[#2b2d31] hover:bg-[#3a3d44]' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
            onClick={() => setMicEnabled(!micEnabled)}
            title={micEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
          >
            {micEnabled ? <Mic size={18} className="lg:hidden" /> : <MicOff size={18} className="lg:hidden" />}
            {micEnabled ? <Mic size={22} className="hidden lg:block" /> : <MicOff size={22} className="hidden lg:block" />}
          </button>

          <button 
            className={`p-3 sm:p-4 rounded-full transition ${
              cameraEnabled 
                ? 'bg-[#2b2d31] hover:bg-[#3a3d44]' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
            onClick={() => setCameraEnabled(!cameraEnabled)}
            title={cameraEnabled ? 'Apagar cámara' : 'Encender cámara'}
          >
            {cameraEnabled ? <Video size={18} className="lg:hidden" /> : <VideoOff size={18} className="lg:hidden" />}
            {cameraEnabled ? <Video size={22} className="hidden lg:block" /> : <VideoOff size={22} className="hidden lg:block" />}
          </button>

          <button
            className="bg-blue-500 hover:bg-blue-600 p-3 sm:p-4 rounded-full transition"
            onClick={siguientePersona}
            title="Siguiente persona"
            disabled={loading}
          >
            <SkipForward size={18} className="lg:hidden" />
            <SkipForward size={22} className="hidden lg:block" />
          </button>

          <button 
            className="bg-red-500 hover:bg-red-600 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-white text-sm sm:text-base lg:text-lg font-semibold transition flex items-center gap-2"
            onClick={finalizarChat}
            title="Finalizar chat"
          >
            <Square size={16} className="lg:hidden" />
            <Square size={18} className="hidden lg:block" />
            <span className="lg:hidden">Stop</span>
            <span className="hidden lg:inline">🛑 Finalizar</span>
          </button>
        </div>
      </div>

      {/* ❌ ELIMINAR ESTA LÍNEA: */}
      {/* <SearchingUserLoading userRole={userData.role} isVisible={isSearchingUser} /> */}
    </LiveKitRoom>
  );
}

// ✅ COMPONENTE PARA CONTROLAR MEDIA - CONTINUACIÓN
const MediaControls = ({ micEnabled, cameraEnabled, setMicEnabled, setCameraEnabled }) => {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(micEnabled);
    }
  }, [micEnabled, localParticipant]);

  useEffect(() => {
    if (localParticipant) {
      localParticipant.setCameraEnabled(cameraEnabled);
    }
  }, [cameraEnabled, localParticipant]);

  return null;
};

// 🔥 FUNCIÓN PARA DEBUGGING
window.debugUserCache = () => {
  console.log('🔍 Cache actual:', Array.from(USER_CACHE.entries()));
  console.log('🔍 Cantidad de entradas:', USER_CACHE.size);
};