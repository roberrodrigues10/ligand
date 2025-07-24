import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  VideoTrack,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
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
  Send,
  Square,
} from "lucide-react";
import Header from "./headercliente";
import SimpleChat from "../messages";
import { getUser } from "../../utils/auth";
import { useSessionCleanup } from '../closesession';
import { ProtectedPage } from '../usePageAccess';
import { updateHeartbeatRoom } from '../../utils/auth';
import { useVideoChatHeartbeat } from '../../utils/heartbeat';

// 🔥 IMPORT DEL CONTEXTO DE BÚSQUEDA
import { useSearching } from '../../contexts/SearchingContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔥 CACHE GLOBAL PERSISTENTE
const USER_CACHE = new Map();

// Función para generar clave única de la sala
const getRoomCacheKey = (roomName, currentUserName) => {
  return `${roomName}_${currentUserName}`;
};

// ✅ COMPONENTE CON VIDEO REAL - RESPONSIVE
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
          <div className="animate-pulse text-4xl sm:text-6xl mb-4">🎰</div>
          <p className="text-lg sm:text-xl mb-2">Ruleta de Video Chat</p>
          <div className="space-y-2 text-xs sm:text-sm">
            <p className="text-green-400">✅ Conectado al servidor LiveKit</p>
            <p className="text-gray-400">👥 Participantes: {participants.length}</p>
            {localParticipant && (
              <p className="text-blue-400">🟦 Tú (Cliente): {localParticipant.identity}</p>
            )}
            {remoteParticipant && (
              <p className="text-pink-400">🟪 Modelo: {remoteParticipant.identity}</p>
            )}
            {!remoteParticipant && participants.length === 1 && (
              <p className="text-yellow-400">⏳ Esperando que se conecte el modelo...</p>
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
          {mainCamera === "local" ? "MODELO" : "YO"}
        </div>
      </div>
    </>
  );
};

// ✅ COMPONENTE PARA MENSAJES FLOTANTES
const FloatingMessages = ({ messages, modelo }) => {
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
              <span className="font-bold text-pink-400 text-xs">
                {modelo?.nombre || 'Modelo'}
              </span>
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

// 🔥 COMPONENTE PRINCIPAL CON LÓGICA DEL MODELO IMPLEMENTADA
export default function VideoChat() {
  const location = useLocation();
  const navigate = useNavigate();


  // 🔥 HOOK DE SEARCHING CONTEXT
  const { startSearching, stopSearching } = useSearching();

  // 🔥 OBTENER PARÁMETROS DE LA URL Y ESTADO
  const getParamsFromUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      roomName: searchParams.get('roomName'),
      userName: searchParams.get('userName'),
      forced: searchParams.get('forced')
    };
  };

  const stateData = location.state || {};
  const urlParams = getParamsFromUrl();

  const roomName = stateData.roomName || urlParams.roomName;
  const userName = stateData.userName || urlParams.userName;
  const modelo = stateData.modelo;
  const selectedCamera = stateData.selectedCamera || location.state?.selectedCamera;
  const selectedMic = stateData.selectedMic || location.state?.selectedMic;

  // 🔥 ESTADOS BÁSICOS
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const { finalizarSesion, limpiarDatosSession } = useSessionCleanup(roomName, connected);
  const [room, setRoom] = useState(null);

  // Estados para controles
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  useVideoChatHeartbeat(roomName, 'cliente');

  
  // Estados para UI
  const [camaraPrincipal, setCamaraPrincipal] = useState("remote");
  const [tiempo, setTiempo] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [mostrarRegalos, setMostrarRegalos] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      text: '🎰 ¡Conectado! Disfruta tu chat en vivo',
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
    console.log('🔄 [CLIENTE] Inicializando VideoChat con cache:', cached);
    return cached || null;
  });

  const [isDetectingUser, setIsDetectingUser] = useState(() => {
    if (!roomName || !userName) return false;
    const cacheKey = getRoomCacheKey(roomName, userName);
    const hasCache = USER_CACHE.has(cacheKey);
    console.log('🔍 [CLIENTE] Estado inicial de detección:', !hasCache);
    return !hasCache;
  });

  const [chatFunctions, setChatFunctions] = useState(null);
  const messagesContainerRef = useRef(null);
  const sendHeartbeat = async (activityType = 'videochat_client') => {
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
          activity_type: activityType, // 🔥 'videochat_client' = NO disponible
          room: roomName
        })
      });

      if (response.ok) {
        console.log(`💓 [VIDEOCHAT-CLIENT] Heartbeat enviado: ${activityType}`);
      }
    } catch (error) {
      console.log('⚠️ [VIDEOCHAT-CLIENT] Error enviando heartbeat:', error);
    }
  };

  // Mismo useEffect que arriba
  useEffect(() => {
    if (!roomName) return;

    sendHeartbeat('videochat_client');

    const heartbeatInterval = setInterval(() => {
      sendHeartbeat('videochat_client');
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
      sendHeartbeat('browsing');
    };
  }, [roomName]);


  // 🔥 FUNCIONES DE CACHE MEJORADAS
  const updateOtherUser = (user) => {
    if (!user || !roomName || !userName) {
      console.log('⚠️ [CLIENTE] updateOtherUser: Parámetros faltantes', { user, roomName, userName });
      return;
    }
    
    const cacheKey = getRoomCacheKey(roomName, userName);
    console.log('💾 [CLIENTE] Guardando usuario en cache:', { user, cacheKey });
    
    USER_CACHE.set(cacheKey, user);
    setOtherUser(user);
    setIsDetectingUser(false);
    
    console.log('✅ [CLIENTE] Usuario actualizado y guardado en cache:', user.name);
  };

  const clearUserCache = () => {
    if (!roomName || !userName) return;
    const cacheKey = getRoomCacheKey(roomName, userName);
    console.log('🧹 [CLIENTE] Limpiando cache para:', cacheKey);
    USER_CACHE.delete(cacheKey);
    setOtherUser(null);
    setIsDetectingUser(true);
  };

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
    
    return "Esperando modelo...";
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
      return "Buscando modelo";
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
    console.log('📥 [CLIENTE] Usuario recibido desde SimpleChat:', user);
    updateOtherUser(user);
  };

  const handleMessageReceived = (newMessage) => {
    console.log('🎯 [CLIENTE] handleMessageReceived llamado con:', newMessage);
    
    const formattedMessage = {
      ...newMessage,
      id: newMessage.id || Date.now() + Math.random(),
      type: 'remote',
      senderRole: newMessage.senderRole || 'modelo'
    };
    
    console.log('💾 [CLIENTE] Mensaje formateado para guardar:', formattedMessage);
    
    setMessages(prev => {
      console.log('📝 [CLIENTE] Mensajes antes:', prev.length);
      const updated = [formattedMessage, ...prev];
      console.log('📝 [CLIENTE] Mensajes después:', updated.length);
      return updated;
    });
  };

  const handleGiftReceived = (gift) => {
    const giftMessage = {
      id: Date.now(),
      type: 'system',
      text: `¡Enviaste ${gift.nombre}! -${gift.valor} monedas 💰`,
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
    console.log("🟢 [CLIENTE] Conectado a LiveKit!");
    setConnected(true);
  };
  
  const handleRoomDisconnected = () => {
    console.log("🔴 [CLIENTE] Desconectado de LiveKit");
    setConnected(false);
  };

  const enviarMensaje = () => {
    if (mensaje.trim()) {
      console.log('🚀 [CLIENTE] Intentando enviar mensaje:', mensaje.trim());
      
      if (chatFunctions?.sendMessage) {
        console.log('📡 [CLIENTE] Llamando a chatFunctions.sendMessage...');
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

  // 🔥 FUNCIÓN SIGUIENTE PERSONA - ADAPTADA DEL MODELO
  const siguientePersona = async () => {
    console.log('🔄 [CLIENTE] Siguiente persona (lógica modelo)...');
    
    // 🔥 USAR CONTEXTO GLOBAL PERO COMO CLIENTE
    startSearching('cliente');
    
    try {
      const authToken = sessionStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/livekit/next-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          currentRoom: roomName,
          userName: userName 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎉 [CLIENTE] Respuesta del servidor:', data);
        
        if (data.success) {
          if (data.type === 'match_found' || data.type === 'direct_match') {
            // 🔥 NUEVA CONEXIÓN ENCONTRADA
            console.log('🎯 [CLIENTE] Nueva conexión encontrada:', data.roomName || data.room_name);
            
            clearUserCache();
            
            navigate("/videochatclient", {
              state: {
                roomName: data.roomName || data.room_name,
                userName: userName,
                selectedCamera: selectedCamera,
                selectedMic: selectedMic,
              },
              replace: true
            });
          } else if (data.type === 'waiting') {
            // 🔥 EN ESPERA - USAR CONTEXTO DE BÚSQUEDA
            console.log('⏳ [CLIENTE] En espera de conexión...');
            
            clearUserCache();
            
            navigate("/videochatclient", {
              state: {
                roomName: data.roomName || data.room_name,
                userName: userName,
                selectedCamera: selectedCamera,
                selectedMic: selectedMic,
              },
              replace: true
            });
          } else {
            console.log('⚠️ [CLIENTE] Respuesta inesperada del servidor:', data);
            stopSearching();
          }
        } else {
          console.error('❌ [CLIENTE] Error del servidor:', data.error);
          stopSearching();
        }
      } else {
        console.error('❌ [CLIENTE] Error HTTP:', response.status);
        stopSearching();
      }
    } catch (error) {
      console.error('❌ [CLIENTE] Error en siguiente persona:', error);
      stopSearching();
    }
  };

  // 🔥 FUNCIÓN FINALIZAR CHAT ADAPTADA DEL MODELO
  const finalizarChat = useCallback(async () => {
  console.log('🛑 [MODELO] Stop presionado - MODELO deja de trabajar...');
  
  
  try {
    // 🔥 FINALIZAR SESIÓN ACTUAL
    if (finalizarSesion) {
      console.log('🚪 [MODELO] Finalizando sesión...');
      await finalizarSesion('modelo_stop_working');
    }
    
    // Limpiar cache
    clearUserCache();
    
    
    // 🔥 MODELO VA A SU PÁGINA DE ESPERA (no trabaja más)
    navigate('/esperandocallcliente', { replace: true });
    
  } catch (error) {
    console.error('❌ [MODELO] Error al dejar de trabajar:', error);
    navigate('/esperandocallcliente', { replace: true });
  }
}, [
  finalizarSesion, 
  clearUserCache,
  navigate
  ]);

  // 🔥 USEEFFECTS CORREGIDOS

  // Cargar usuario inicial
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('👤 [CLIENTE] Cargando datos del usuario...');
        const user = await getUser();
        const name = user.alias || user.name || user.username || "";
        const role = user.rol || user.role || "cliente";

        console.log('✅ [CLIENTE] Usuario cargado:', { name, role, id: user.id });

        setUserData({
          name,
          role,
          id: user.id,
        });
      } catch (err) {
        console.error("❌ [CLIENTE] Error al obtener usuario en VideoChat:", err);
      }
    };

    fetchUser();
  }, []);

  // 🔥 NUEVO: Detener búsqueda cuando se conecta (COMO EL MODELO)
  useEffect(() => {
    if (connected && token) {
      console.log('✅ [CLIENTE] VideoChat conectado - quitando loading global');
      stopSearching();
    }
  }, [connected, token, stopSearching]);

  // 🔥 NUEVO: POLLING PARA VERIFICAR NUEVAS CONEXIONES (ADAPTADO DEL MODELO)
  useEffect(() => {
    if (!roomName || !userName || !connected) return;

    console.log('🔍 [CLIENTE] Iniciando polling para verificar nuevas conexiones...');

    const interval = setInterval(async () => {
      try {
        const authToken = sessionStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/api/livekit/check-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            currentRoom: roomName,
            userName: userName
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.shouldRedirect && data.newRoomName && data.newRoomName !== roomName) {
            console.log('🔄 [CLIENTE] Polling detectó nueva sala:', data.newRoomName);
            
            clearUserCache();
            
            navigate("/videochatclient", {
              state: {
                roomName: data.newRoomName,
                userName: userName,
                selectedCamera: selectedCamera,
                selectedMic: selectedMic,
              },
              replace: true
            });
          }
        }
      } catch (error) {
        console.log('⚠️ [CLIENTE] Error en polling de verificación:', error);
      }
    }, 5000); // Cada 5 segundos

    return () => {
      console.log('🛑 [CLIENTE] Deteniendo polling de verificación');
      clearInterval(interval);
    };
  }, [roomName, userName, connected, navigate, selectedCamera, selectedMic]);

  // 🔥 NUEVO: VERIFICACIÓN INICIAL DEL ESTADO DE LA SALA (ADAPTADO DEL MODELO)
  useEffect(() => {
    if (!roomName || !userName) return;

    const checkInitialRoomState = async () => {
      try {
        const authToken = sessionStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/api/livekit/check-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            currentRoom: roomName,
            userName: userName
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.shouldRedirect && data.newRoomName && data.newRoomName !== roomName) {
            console.log('🔄 [CLIENTE] Verificación inicial detectó nueva sala:', data.newRoomName);
            
            clearUserCache();
            
            navigate("/videochatclient", {
              state: {
                roomName: data.newRoomName,
                userName: userName,
                selectedCamera: selectedCamera,
                selectedMic: selectedMic,
              },
              replace: true
            });
          }
        }
      } catch (error) {
        console.log('⚠️ [CLIENTE] Error en verificación inicial de sala:', error);
      }
    };

    // Verificar estado inicial después de 2 segundos
    const timeout = setTimeout(checkInitialRoomState, 2000);
    
    return () => clearTimeout(timeout);
  }, [roomName, userName]);

  useEffect(() => {
    if (!roomName) return;

    const token = sessionStorage.getItem("token");
    if (!token) return;

    console.log("💓 Iniciando heartbeat automático desde VideoChat...");

    const interval = setInterval(() => {
      updateHeartbeatRoom(roomName);
    }, 30000);

    return () => {
      console.log("🛑 Deteniendo heartbeat automático de VideoChat");
      clearInterval(interval);
    };
  }, [roomName]);

  // Configurar chatFunctions
  useEffect(() => {
    console.log('🔧 [CLIENTE] Configurando chatFunctions para:', { roomName, userName });
    
    window.livekitChatFunctions = (functions) => {
      console.log('📡 [CLIENTE] Recibiendo chatFunctions:', {
        hasOtherParticipant: !!functions.otherParticipant,
        isDetecting: functions.isDetecting,
        participantsCount: functions.participants?.length || 0
      });
      
      setChatFunctions(functions);
      
      if (functions.otherParticipant && !otherUser) {
        console.log('👥 [CLIENTE] Recibiendo participante desde chatFunctions:', functions.otherParticipant);
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
        console.log('🧹 [CLIENTE] Limpiando cache - cambio de sala detectado');
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

  // Obtener token
  useEffect(() => {
    const getToken = async () => {
      try {
        if (!roomName || !userName || roomName.trim() === '' || userName.trim() === '') {
          throw new Error(`Parámetros inválidos - roomName: "${roomName}", userName: "${userName}"`);
        }

        console.log("🎥 [CLIENTE] Obteniendo token para:", { roomName, userName });

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
            room: roomName.trim(), 
            identity: userName.trim() 
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Error ${response.status}: ${errorData}`);
        }
        
        const data = await response.json();
        console.log("✅ [CLIENTE] Token obtenido exitosamente");

        setToken(data.token);
        setServerUrl(data.serverUrl);
        setLoading(false);
      } catch (err) {
        console.error('❌ [CLIENTE] Error al obtener token:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (!roomName || !userName || 
        roomName === 'null' || userName === 'null' ||
        roomName === 'undefined' || userName === 'undefined' ||
        roomName.trim() === '' || userName.trim() === '') {
      
      console.error("[CLIENTE] Parámetros faltantes o inválidos:", { roomName, userName });
      setError(`Faltan parámetros de la sala. roomName: "${roomName}", userName: "${userName}"`);
      setLoading(false);
    } else {
      getToken();
    }
  }, [roomName, userName]);


  // Timer
  useEffect(() => {
    const intervalo = setInterval(() => setTiempo((prev) => prev + 1), 1000);
    return () => clearInterval(intervalo);
  }, []);

  // Scroll de mensajes
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

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
          activity_type: 'videochat_client',
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
          <p className="text-sm text-gray-400 mt-2">👤 Modo Cliente</p>
          {modelo && (
            <div className="mt-4 text-sm text-gray-400">
              <p>🎰 Conectando con: <span className="text-[#ff007a]">{modelo.nombre}</span> {modelo.pais}</p>
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
              onClick={() => navigate('/precallclient')}
              className="bg-[#ff007a] px-6 py-3 rounded-full text-white font-medium"
            >
              🎰 Nueva Ruleta
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
    <ProtectedPage requiredConditions={{
      emailVerified: true,
      profileComplete: true,
      role: "cliente",
      requiresCallToken: true
    }}>
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
      
      <SimpleChat
        userName={userData.name}
        userRole={userData.role}
        roomName={roomName}
        onMessageReceived={handleMessageReceived}
        onGiftReceived={handleGiftReceived}
        onUserLoaded={handleUserLoadedFromChat}
        onParticipantsUpdated={(participants) => {
          console.log('👥 [CLIENTE] Todos los participantes:', participants);
        }}
      />

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
          
          <FloatingMessages messages={messages} modelo={modelo} />
          
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
                placeholder="Escribe un mensaje..."
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
              <span className="text-green-400 text-xs">🟢 Conectado</span>
            )}
            <span className="text-blue-400 text-xs">👤 Cliente</span>
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
              {messages.filter(msg => msg.id > 1).reverse().map((msg, index) => (
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
                      <span className="font-bold text-pink-400">Modelo</span>
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
                      <span className="text-[10px] sm:text-xs text-[#ff007a] font-bold">{regalo.valor}m</span>
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
                placeholder="Escribe un mensaje..."
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
    </LiveKitRoom>
    </ProtectedPage>
  );
}

// ✅ COMPONENTE PARA CONTROLAR MEDIA
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
  console.log('🔍 [CLIENTE] Cache actual:', Array.from(USER_CACHE.entries()));
  console.log('🔍 [CLIENTE] Cantidad de entradas:', USER_CACHE.size);
};