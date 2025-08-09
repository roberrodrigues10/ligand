  import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
  import { useLocation, useNavigate } from "react-router-dom";
  import { useTranslation } from 'react-i18next';  
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
    ArrowRight,
    Settings,
     Globe,      
    Languages,   
    Eye,         
    EyeOff,      
    Wrench,      
    Camera,      
    Users,       
    Mic2,        
    Volume2,
    UserX,
    Star,
  } from "lucide-react";
  import Header from "./headercliente";
  import SimpleChat from "../messages";
  import { getUser } from "../../utils/auth";
  import { useSessionCleanup } from '../closesession';
  import { ProtectedPage } from '../hooks/usePageAccess.jsx';
  import { updateHeartbeatRoom } from '../../utils/auth';
  import { sendHeartbeat, useVideoChatHeartbeat  } from '../../utils/heartbeat';
  import { initHeartbeatSync } from '../../utils/heartbeatManager';
  import { 
    useTranslation as useCustomTranslation, 
    TranslationSettings, 
    TranslatedMessage 
  } from '../../utils/translationSystem.jsx';
  import CameraAudioSettings from '../../utils/cameraaudiosettings.jsx';
  import { useVideoChatGifts } from '../../components/GiftSystem/useVideoChatGifts'; // ← AGREGAR IMPORT
  import { GiftNotificationOverlay } from '../../components/GiftSystem/GiftNotificationOverlay'; // ← AGREGAR IMPORT
  import { GiftMessageComponent } from '../../components/GiftSystem/GiftMessageComponent.jsx'; // ← AGREGAR IMPORT


  // 🔥 IMPORT DEL CONTEXTO DE BÚSQUEDA
  import { useSearching } from '../../contexts/SearchingContext.jsx';

  export function useBrowsingHeartbeat() {
    useEffect(() => {
      initHeartbeatSync('browsing', null, 30000); // 30s para navegación
    }, []);
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // 🔥 CACHE GLOBAL PERSISTENTE
  const USER_CACHE = new Map();

  // Función para generar clave única de la sala
  const getRoomCacheKey = (roomName, currentUserName) => {
    return `${roomName}_${currentUserName}`;
  };

  // ✅ COMPONENTE CON VIDEO REAL - RESPONSIVE
  const VideoDisplay  = React.memo(({ onCameraSwitch, mainCamera }) => {
    const participants = useParticipants();
    const localParticipant = participants.find(p => p.isLocal);
    const remoteParticipant = participants.find(p => !p.isLocal);
    const { t } = useTranslation();

    // Obtener tracks de video
    const tracks = useTracks(
      [{ source: Track.Source.Camera, withPlaceholder: true }],
      { onlySubscribed: false }
    );

    const getMainVideo = () => {
      try {
        if (mainCamera === "local" && localParticipant) {
          const localVideoTrack = tracks.find(
            trackRef =>
              trackRef.participant.sid === localParticipant.sid &&
              trackRef.source === Track.Source.Camera
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
            trackRef =>
              trackRef.participant.sid === remoteParticipant.sid &&
              trackRef.source === Track.Source.Camera
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
            trackRef =>
              trackRef.participant.sid === remoteParticipant.sid &&
              trackRef.source === Track.Source.Camera
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
            trackRef =>
              trackRef.participant.sid === localParticipant.sid &&
              trackRef.source === Track.Source.Camera
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
  });

  // ✅ COMPONENTE PARA MENSAJES FLOTANTES
  const FloatingMessages = React.memo(function FloatingMessages({ messages, modelo }) {
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
  });

  // 🔥 COMPONENTE PRINCIPAL CON LÓGICA DEL MODELO IMPLEMENTADA
  export default function VideoChat() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();


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
    const [showSettings, setShowSettings] = useState(false);
    const [showTranslationSettings, setShowTranslationSettings] = useState(false);
    const [showMainSettings, setShowMainSettings] = useState(false);
    const { 
      settings: translationSettings = { enabled: false }, 
      setSettings: setTranslationSettings,
      translateMessage,
      clearProcessedMessages,
      languages = {}
    } = useCustomTranslation() || {};
    const [mirrorMode, setMirrorMode] = useState(() => {
      const saved = localStorage.getItem("mirrorMode");
      return saved ? JSON.parse(saved) : true;
    });
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
    // 🔥 ESTADOS BÁSICOS
    const [token, setToken] = useState('');
    const [serverUrl, setServerUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [connected, setConnected] = useState(false);
    const { finalizarSesion, limpiarDatosSession } = useSessionCleanup(roomName, connected);
    const [room, setRoom] = useState(null);
    const [modeloDisconnected, setModeloDisconnected] = useState(false);
    const [modeloWentNext, setModeloWentNext] = useState(false);
    const [disconnectionReason, setDisconnectionReason] = useState('');
    const [disconnectionType, setDisconnectionType] = useState('');
    const [redirectCountdown, setRedirectCountdown] = useState(0);
    const [isBlocking, setIsBlocking] = useState(false);
    const [isAddingFavorite, setIsAddingFavorite] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showCameraAudioModal, setShowCameraAudioModal] = useState(false);
    const [isMonitoringBalance, setIsMonitoringBalance] = useState(false);
    

    
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

    // 🎁 HOOK DE REGALOS VIDEOCHAT
    const {
      gifts,
      pendingRequests,
      userBalance,
      loading: giftLoading,
      acceptGift,
      rejectGift,
      loadPendingRequests,
      loadUserBalance,
      setPendingRequests
    } = useVideoChatGifts(
      roomName,
      { id: userData.id, role: userData.role, name: userData.name },
      otherUser ? { id: otherUser.id, name: otherUser.name } : null
    );

    // Estados para notificaciones de regalo
    const [showGiftNotification, setShowGiftNotification] = useState(false);
    const [processingGift, setProcessingGift] = useState(null);

    const [isDetectingUser, setIsDetectingUser] = useState(() => {
      if (!roomName || !userName) return false;
      const cacheKey = getRoomCacheKey(roomName, userName);
      const hasCache = USER_CACHE.has(cacheKey);
      console.log('🔍 [CLIENTE] Estado inicial de detección:', !hasCache);
      return !hasCache;
    });

    const [chatFunctions, setChatFunctions] = useState(null);
    const messagesContainerRef = useRef(null);
    const lastHeartbeatRef = useRef(0);
    const [isRateLimited, setIsRateLimited] = useState(false);

  //
    useVideoChatHeartbeat(roomName, 'cliente');



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

    const handleMessageReceived = useCallback((newMessage) => {
      const formattedMessage = {
        ...newMessage,
        id: newMessage.id || Date.now() + Math.random(),
        type: 'remote',
        senderRole: newMessage.senderRole || 'modelo'
      };
      
      setMessages(prev => {
        const updated = [formattedMessage, ...prev.slice(0, 49)]; // ✅ LIMITAR A 50 MENSAJES
        return updated;
      });
    }, []);
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

    const cambiarCamara = useCallback(() => {
      setCamaraPrincipal(prev => prev === "remote" ? "local" : "remote");
    },[]);
    const toggleMirrorMode = useCallback(() => {
      const newMirrorMode = !mirrorMode;
      setMirrorMode(newMirrorMode);
      localStorage.setItem("mirrorMode", JSON.stringify(newMirrorMode));
      
      // Aplicar inmediatamente a todos los videos
      applyMirrorToAllVideos(newMirrorMode);
      setupMirrorObserver(newMirrorMode);
      
      console.log('🪞 Espejo cambiado a:', newMirrorMode);
    }, [mirrorMode]);
    

    const handleRoomConnected = () => {
      console.log("🟢 [CLIENTE] Conectado a LiveKit!");
      setConnected(true);
    };
    
    const handleRoomDisconnected = () => {
      console.log("🔴 [CLIENTE] Desconectado de LiveKit");
      setConnected(false);
    };

    const enviarMensaje = useCallback(() => {
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
    }, [mensaje, chatFunctions]);

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

    // 🔥 FUNCIÓN SIGUIENTE PERSONA CORREGIDA
    const siguientePersona = useCallback(async () => {
      console.log('🔄 [CLIENTE] Siguiente persona...');
      
      try {
        const authToken = sessionStorage.getItem('token'); // ✅ OBTENER TOKEN AQUÍ
        
        if (otherUser?.id && roomName && authToken) {
          fetch(`${API_BASE_URL}/api/livekit/notify-partner-next`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ roomName })
          }).catch(() => {});
        }

        clearUserCache();
        startSearching();
        
        const urlParams = new URLSearchParams({
          role: 'cliente',
          action: 'siguiente',
          from: 'videochat_siguiente',
          excludeUser: otherUser?.id || '',
          excludeUserName: otherUser?.name || '',
          selectedCamera: selectedCamera || '',
          selectedMic: selectedMic || ''
        });
        
        navigate(`/usersearch?${urlParams}`, { replace: true });

      } catch (error) {
        console.error('❌ [CLIENTE] Error:', error);
        clearUserCache();
        startSearching();
        navigate(`/usersearch?role=cliente`, { replace: true });
      }
    }, [otherUser, roomName, selectedCamera, selectedMic, startSearching, navigate]);
    
    const handleModeloDisconnected = (reason = 'stop', customMessage = '') => {
      console.log('🛑 Modelo se desconectó:', reason);
      
      setLoading(false);
      setConnected(false);
      
      if (reason === 'next') {
        setModeloWentNext(true);
        setDisconnectionType('next');
        setDisconnectionReason(customMessage || 'La modelo te saltó y fue a la siguiente persona');
      } else if (reason === 'stop') {
        setModeloDisconnected(true);
        setDisconnectionType('stop'); 
        setDisconnectionReason(customMessage || 'La modelo finalizó la videollamada');
      }
      
      startRedirectCountdown();
    };

  useEffect(() => {
    if (pendingRequests.length > 0 && userData.role === 'cliente') {
      setShowGiftNotification(true);
      console.log('🎁 [CLIENTE] Mostrando notificación de regalo:', pendingRequests[0]);
    } else {
      setShowGiftNotification(false);
    }
  }, [pendingRequests, userData.role]);

  // 🎁 FUNCIÓN PARA ACEPTAR REGALO (CLIENTE)
  const handleAcceptGift = async (requestId, securityHash) => {
    if (processingGift === requestId) {
      console.warn('⚠️ [CLIENTE] Regalo ya siendo procesado');
      return;
    }

    try {
      setProcessingGift(requestId);
      console.log('✅ [CLIENTE] Aceptando regalo:', { requestId, hasHash: !!securityHash });
      
      const result = await acceptGift(requestId, securityHash);
      
      if (result.success) {
        console.log('✅ [CLIENTE] Regalo aceptado exitosamente');
        
        // Cerrar notificación
        setShowGiftNotification(false);
        
        // Agregar mensaje al chat
        const giftMessage = {
          id: Date.now(),
          type: 'gift_sent',
          text: `🎁 Enviaste: ${result.giftInfo?.name}`,
          timestamp: Date.now(),
          isOld: false,
          sender: userData.name,
          senderRole: userData.role
        };
        setMessages(prev => [giftMessage, ...prev]);
        
        // Actualizar balance en el estado si es necesario
        if (result.newBalance !== undefined) {
          console.log('💰 [CLIENTE] Nuevo balance:', result.newBalance);
        }
        
        return { success: true };
      } else {
        console.error('❌ [CLIENTE] Error aceptando regalo:', result.error);
        alert(`Error: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ [CLIENTE] Error de conexión:', error);
      alert('Error de conexión');
      return { success: false, error: 'Error de conexión' };
    } finally {
      setProcessingGift(null);
    }
  };

  // 🎁 FUNCIÓN PARA RECHAZAR REGALO (CLIENTE)
  const handleRejectGift = async (requestId, reason = '') => {
    try {
      console.log('❌ [CLIENTE] Rechazando regalo:', requestId);
      
      const result = await rejectGift(requestId, reason);
      
      if (result.success) {
        console.log('✅ [CLIENTE] Regalo rechazado exitosamente');
        
        // Cerrar notificación
        setShowGiftNotification(false);
        
        // Agregar mensaje al chat
        const rejectMessage = {
          id: Date.now(),
          type: 'gift_rejected',
          text: '❌ Rechazaste una solicitud de regalo',
          timestamp: Date.now(),
          isOld: false,
          sender: userData.name,
          senderRole: userData.role
        };
        setMessages(prev => [rejectMessage, ...prev]);
        
        return { success: true };
      } else {
        console.error('❌ [CLIENTE] Error rechazando regalo:', result.error);
        alert(`Error: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ [CLIENTE] Error de conexión:', error);
      alert('Error de conexión');
      return { success: false, error: 'Error de conexión' };
    }
  };
    


    const finalizarChat = useCallback(async (forceEnd = false) => {
      console.log('🛑 [CLIENTE] finalizarChat iniciado...', { 
        forceEnd,
        roomName,
        otherUserId: otherUser?.id,
        timestamp: new Date().toISOString()
      });
      
      // Prevenir ejecuciones múltiples
      if (window.finalizandoChat) {
        console.log('⚠️ [CLIENTE] finalizarChat ya en proceso - ignorando');
        return;
      }
      
      window.finalizandoChat = true;
      
      try {
        const authToken = sessionStorage.getItem('token');
        
        if (!authToken) {
          console.warn('⚠️ [CLIENTE] No hay token de auth');
          throw new Error('No auth token');
        }

        // Mostrar mensaje si es automático
        if (forceEnd) {
          console.log('🚨 [CLIENTE] FINALIZACIÓN AUTOMÁTICA - SALDO AGOTADO');
          
          setMessages(prev => [{
            id: Date.now(),
            type: 'system', 
            text: '⚠️ Sesión finalizando automáticamente - saldo insuficiente',
            timestamp: Date.now(),
            isOld: false
          }, ...prev]);
        }
        
        // 1. Finalizar sesión de monedas
        if (roomName && authToken) {
          try {
            console.log('💰 [CLIENTE] Finalizando sesión de monedas...');
            
            const endResponse = await Promise.race([
              fetch(`${API_BASE_URL}/api/livekit/end-coin-session`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ 
                  roomName,
                  reason: forceEnd ? 'balance_exhausted' : 'user_ended'
                })
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            if (endResponse.ok) {
              console.log('✅ [CLIENTE] Sesión finalizada');
            } else {
              console.warn('⚠️ [CLIENTE] Error:', endResponse.status);
            }
            
          } catch (error) {
            console.warn('⚠️ [CLIENTE] Error finalizando sesión:', error.message);
          }
        }
        
        // 2. Notificar al partner
        if (otherUser?.id && roomName && authToken) {
          try {
            console.log('📡 [CLIENTE] Notificando partner...');
            
            const notifyResponse = await Promise.race([
              fetch(`${API_BASE_URL}/api/livekit/notify-partner-stop`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ 
                  roomName,
                  reason: forceEnd ? 'client_balance_exhausted' : 'client_ended_session'
                })
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            if (notifyResponse.ok) {
              console.log('✅ [CLIENTE] Partner notificado');
            }
            
          } catch (error) {
            console.warn('⚠️ [CLIENTE] Error notificando:', error.message);
          }
        }
        
        // 3. Limpiar datos
        console.log('🧹 [CLIENTE] Limpiando datos...');
        
        const itemsToRemove = [
          'roomName', 'userName', 'currentRoom', 
          'inCall', 'callToken', 'videochatActive'
        ];
        
        itemsToRemove.forEach(item => sessionStorage.removeItem(item));
        
        // 4. Limpiar cache
        if (typeof clearUserCache === 'function') {
          clearUserCache();
        }
        
        // 5. Actualizar heartbeat
        try {
          await Promise.race([
            fetch(`${API_BASE_URL}/api/heartbeat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                activity_type: 'browsing',
                room: null
              })
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          
          console.log('✅ [CLIENTE] Heartbeat actualizado');
        } catch (error) {
          console.warn('⚠️ [CLIENTE] Error heartbeat:', error.message);
        }
        
        // 6. Navegar
        console.log('🏠 [CLIENTE] Navegando...');
        
        const stateData = forceEnd ? {
          message: 'Tu sesión terminó automáticamente porque se agotaron las monedas o el tiempo disponible.',
          type: 'warning',
          autoEnded: true
        } : undefined;
        
        // Navegar inmediatamente
        navigate('/homecliente', { 
          replace: true,
          state: stateData
        });
        
        console.log('✅ [CLIENTE] finalizarChat completado');
        
      } catch (error) {
        console.error('❌ [CLIENTE] Error crítico:', error);
        
        // Fallback
        try {
          sessionStorage.clear();
          navigate('/homecliente', { replace: true });
        } catch (fallbackError) {
          console.error('❌ Fallback error:', fallbackError);
          window.location.href = '/homecliente';
        }
      } finally {
        // Limpiar flag después de un delay
        setTimeout(() => {
          window.finalizandoChat = false;
        }, 3000);
      }
    }, [roomName, otherUser, navigate, setMessages]); // 🔥 DEPENDENCIAS MÍNIMAS NECESARIAS

    // 🔧 Función de debug para testing
    window.testFinalizarChat = (autoEnd = false) => {
      console.log('🧪 TESTING finalizarChat con autoEnd:', autoEnd);
      finalizarChat(autoEnd);
    };
    useEffect(() => {
  if (roomName && connected && !isMonitoringBalance) {
    console.log('🟢 [CLIENTE] Iniciando monitoreo de saldo...');
    setIsMonitoringBalance(true);
  } else if ((!roomName || !connected) && isMonitoringBalance) {
    console.log('🔴 [CLIENTE] Deteniendo monitoreo de saldo...');
    setIsMonitoringBalance(false);
  }
    }, [roomName, connected, isMonitoringBalance]);

    // 3️⃣ TERCERO: useEffect separado para el monitoreo real
    useEffect(() => {
      if (!isMonitoringBalance) return;

      console.log('🔄 [CLIENTE] Iniciando loop de monitoreo automático...');
      
      let intervalId;
      let timeoutId;
      let isActive = true;

      const executeBalanceCheck = async () => {
        if (!isActive || !isMonitoringBalance) {
          console.log('🛑 [CLIENTE] Monitoreo inactivo - saliendo');
          return;
        }

        try {
          const authToken = sessionStorage.getItem('token');
          
          if (!authToken) {
            console.warn('⚠️ [CLIENTE] No hay token - deteniendo monitoreo');
            setIsMonitoringBalance(false);
            return;
          }

          console.log('🔍 [CLIENTE] Ejecutando verificación de saldo...');
          
          const response = await fetch(`${API_BASE_URL}/api/client-balance/my-balance/quick`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.warn('❌ [CLIENTE] Error en verificación:', response.status);
            return;
          }

          const data = await response.json();
          
          if (!data.success) {
            console.warn('⚠️ [CLIENTE] Respuesta sin datos válidos');
            return;
          }

          const totalCoins = data.total_coins;
          const remainingMinutes = data.remaining_minutes;
          
          console.log('💰 [CLIENTE] Estado actual:', {
            coins: totalCoins,
            minutes: remainingMinutes,
            shouldEnd: totalCoins <= 25 || remainingMinutes <= 2
          });
          
          // 🚨 VERIFICAR CONDICIÓN DE FINALIZACIÓN
          if (totalCoins <= 25 || remainingMinutes <= 2) {
            console.log('🚨 [CLIENTE] ¡SALDO CRÍTICO! Finalizando sesión automáticamente...');
            
            // Detener monitoreo inmediatamente
            isActive = false;
            setIsMonitoringBalance(false);
            
            // Clear intervals
            if (intervalId) clearInterval(intervalId);
            if (timeoutId) clearTimeout(timeoutId);
            
            // Ejecutar finalización con delay mínimo
            setTimeout(() => {
              console.log('🔚 [CLIENTE] Ejecutando finalizarChat(true)...');
              finalizarChat(true);
            }, 500);
            
            return;
          }
          
          // Advertencia si está cerca
          if (totalCoins <= 50 || remainingMinutes <= 5) {
            console.log('⚠️ [CLIENTE] Advertencia - saldo bajo');
          }
          
        } catch (error) {
          console.error('❌ [CLIENTE] Error en monitoreo:', error);
        }
      };

      // 🔥 INICIAR VERIFICACIÓN INMEDIATA
      timeoutId = setTimeout(() => {
        if (isActive && isMonitoringBalance) {
          executeBalanceCheck();
          
          // 🔥 LUEGO ESTABLECER INTERVALO REGULAR
          intervalId = setInterval(() => {
            if (isActive && isMonitoringBalance) {
              executeBalanceCheck();
            }
          }, 8000); // Cada 8 segundos
        }
      }, 3000); // Esperar solo 3 segundos inicial

      // Cleanup
      return () => {
        console.log('🧹 [CLIENTE] Limpiando monitoreo de saldo');
        isActive = false;
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [isMonitoringBalance, finalizarChat]); // 🔥 DEPENDENCIAS CORRECTAS

    // 4️⃣ CUARTO: Función debug mejorada
    useEffect(() => {
      // Exponer funciones de debug globalmente
      window.debugBalance = async () => {
        console.log('🔍 [DEBUG] Estado del monitoreo:');
        console.log('- roomName:', roomName);
        console.log('- connected:', connected);
        console.log('- isMonitoringBalance:', isMonitoringBalance);
        
        try {
          const authToken = sessionStorage.getItem('token');
          if (!authToken) {
            console.log('❌ No hay token');
            return;
          }
          
          const response = await fetch(`${API_BASE_URL}/api/client-balance/my-balance/quick`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('💰 SALDO ACTUAL:', data.total_coins, 'monedas');
            console.log('⏰ TIEMPO:', data.remaining_minutes, 'minutos');
            console.log('🚨 ¿Debería finalizar?', (data.total_coins <= 25 || data.remaining_minutes <= 2) ? 'SÍ' : 'NO');
          }
        } catch (error) {
          console.error('❌ Error:', error);
        }
      };

      window.forceBalance = () => {
        console.log('🧪 [DEBUG] Forzando verificación de saldo...');
        setIsMonitoringBalance(false);
        setTimeout(() => setIsMonitoringBalance(true), 1000);
      };

      window.forceEnd = () => {
        console.log('🚨 [DEBUG] Forzando finalización...');
        finalizarChat(true);
      };

      // Cleanup
      return () => {
        delete window.debugBalance;
        delete window.forceBalance; 
        delete window.forceEnd;
      };
    }, [roomName, connected, isMonitoringBalance, finalizarChat]);

    // 5️⃣ QUINTO: Log inicial para debugging
    useEffect(() => {
      console.log('🎛️ [CLIENTE] VideoChat montado - estado inicial:', {
        roomName,
        connected,
        isMonitoringBalance
      });
    }, []);

    // 🔧 INSTRUCCIONES DE DEBUG
    console.log('🔧 [CLIENTE] Funciones de debug disponibles:');
    console.log('- window.debugBalance() // Ver estado actual');
    console.log('- window.forceBalance() // Reiniciar monitoreo'); 
    console.log('- window.forceEnd() // Forzar finalización');


    

    useEffect(() => {
    if (!roomName) return;

    // 🔥 HEARTBEAT INICIAL
    const authToken = sessionStorage.getItem('token');
    if (authToken) {
      fetch(`${API_BASE_URL}/api/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          activity_type: 'videochat_client',
          room: roomName
        })
      }).catch(() => {}); // 🔥 Ignorar errores
    }

    // 🔥 INTERVALO DE HEARTBEAT MÁS LARGO: 30 segundos
    const heartbeatInterval = setInterval(() => {
      const token = sessionStorage.getItem('token');
      if (token) {
        fetch(`${API_BASE_URL}/api/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            activity_type: 'videochat_client',
            room: roomName
          })
        }).catch(() => {}); // 🔥 Ignorar errores
      }
    }, 30000); // 30 segundos

    return () => {
      clearInterval(heartbeatInterval);
      
      // 🔥 HEARTBEAT FINAL AL SALIR
      const token = sessionStorage.getItem('token');
      if (token) {
        fetch(`${API_BASE_URL}/api/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            activity_type: 'browsing',
            room: null
          })
        }).catch(() => {}); // 🔥 Ignorar errores
      }
    };
    }, [roomName]);
    useEffect(() => {
    if (!roomName || !userName || !connected) {
      return;
    }

    console.log('🔔 [CLIENTE] Iniciando polling de notificaciones');

    let isPolling = true;
    let pollInterval = 3000; // 3 segundos
    let consecutiveEmpty = 0;

    const checkNotifications = async () => {
      if (!isPolling) return;

      try {
        // ✅ AGREGAR TOKEN DE AUTENTICACIÓN
        const authToken = sessionStorage.getItem('token');
        if (!authToken) {
          console.warn('⚠️ [CLIENTE] No hay token - deteniendo polling');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/status/updates`, {
          method: 'GET',
          headers: {
            // ✅ HEADERS FALTANTES - ESTO RESUELVE EL 403
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
        });

        if (!response.ok) {
          console.log(`⚠️ Response ${response.status} en polling - continuando`);
          return; // Continuar polling sin detenerse
        }

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.has_notifications) {
            consecutiveEmpty = 0;
            const notification = data.notification;
            console.log('📨 [CLIENTE] Notificación recibida:', notification.type);
            
            // Detener polling al recibir notificación
            isPolling = false;
            
            if (notification.type === 'partner_went_next') {
              console.log('🔄 [CLIENTE] Modelo fue a siguiente - navegando');
              
              clearUserCache();
              startSearching();
              
              const redirectParams = notification.data.redirect_params || {};
              const urlParams = new URLSearchParams({
                role: 'cliente',
                from: 'partner_went_next',
                action: 'siguiente',
                excludeUser: redirectParams.excludeUser || '',
                excludeUserName: redirectParams.excludeUserName || '',
                selectedCamera: selectedCamera || '',
                selectedMic: selectedMic || ''
              });
              
              navigate(`/usersearch?${urlParams}`, { replace: true });
            }
            
            if (notification.type === 'partner_left_session') {
              console.log('🛑 [CLIENTE] Modelo terminó sesión - buscando nueva modelo');
              
              // Limpiar datos de la sesión anterior
              sessionStorage.removeItem('roomName');
              sessionStorage.removeItem('userName');
              sessionStorage.removeItem('currentRoom');
              sessionStorage.removeItem('inCall');
              sessionStorage.removeItem('videochatActive');
              
              clearUserCache();
              startSearching();
              
              // Construir parámetros para usersearch
              const urlParams = new URLSearchParams({
                role: 'cliente',
                from: 'partner_stopped_session',
                action: 'find_new_model',
                reason: 'previous_model_left',
                selectedCamera: selectedCamera || '',
                selectedMic: selectedMic || ''
              });
              
              navigate(`/usersearch?${urlParams}`, { replace: true });
            }
            
          } else {
            consecutiveEmpty++;
            // Aumentar intervalo si no hay notificaciones
            if (consecutiveEmpty >= 3) {
              pollInterval = Math.min(pollInterval + 1000, 8000); // Max 8s
            }
          }
        } else {
          console.warn(`⚠️ [CLIENTE] Response ${response.status} en polling`);
        }
      } catch (error) {
        console.log('⚠️ [CLIENTE] Error en polling:', error);
      }

      // Programar siguiente verificación
      if (isPolling) {
        setTimeout(checkNotifications, pollInterval);
      }
    };

    // Iniciar polling
    checkNotifications();

    return () => {
      console.log('🛑 [CLIENTE] Deteniendo polling de notificaciones');
      isPolling = false;
    };
    }, [roomName, userName, connected, navigate, selectedCamera, selectedMic]);

    
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


    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100); // ⏰ DEBOUNCE de 100ms

    return () => clearTimeout(timeoutId); // 🧹 Limpia timeout anterior
  }, [messages.length]); // 🎯 SOLO cuando cambia la CANTIDAD de mensajes

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
    // ❌ FALTA: Render de estados de desconexión
    if ((loading && !modeloDisconnected && !modeloWentNext) || modeloDisconnected || modeloWentNext) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="text-center max-w-sm mx-auto">
            
            {(modeloDisconnected || modeloWentNext) && (
              <div className="space-y-6">
                {/* Icono según el tipo */}
                <div className="text-8xl mb-4">
                  {disconnectionType === 'next' ? '⏭️' : 
                  disconnectionType === 'stop' ? '🛑' : '💔'}
                </div>
                
                {/* Mensaje principal */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">
                    {disconnectionType === 'next' ? 'La modelo te saltó' : 
                    disconnectionType === 'stop' ? 'Modelo desconectada' : 'Sesión terminada'}
                  </h2>
                  
                  <p className="text-lg text-gray-300">
                    {disconnectionReason}
                  </p>
                </div>
                
                {/* Countdown */}
                {redirectCountdown > 0 && (
                  <div className="bg-[#1f2125] rounded-xl p-4 border border-[#ff007a]/20">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff007a]"></div>
                      <span className="text-[#ff007a] font-bold">
                        Buscando nueva modelo en {redirectCountdown}s...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

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
        <GiftNotificationOverlay
          pendingRequests={pendingRequests}
          onAccept={handleAcceptGift}
          onReject={handleRejectGift}
          onClose={() => setShowGiftNotification(false)}
          isVisible={showGiftNotification && userData.role === 'cliente'}
        />
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
                  {/* 💰 MOSTRAR BALANCE DE REGALOS */}
                  {userBalance > 0 && (
                    <div className="flex items-center gap-1 bg-[#ff007a]/20 px-2 py-1 rounded-full">
                      <Gift size={12} className="text-[#ff007a]" />
                      <span className="text-[#ff007a] text-xs font-bold">{userBalance}</span>
                    </div>
                  )}
                  <button title="Favorito" className="text-[#ff007a] hover:scale-110 transition">
                    <Heart size={16} />
                  </button>
                  <button title="Bloquear" className="text-red-400 hover:scale-110 transition">
                    <Ban size={16} />
                  </button>
                </div>
              </div>

              <div 
                ref={messagesContainerRef}
                className="max-h-[360px] p-4 space-y-3 overflow-y-auto custom-scroll"
              >
                {messages.filter(msg => msg.id > 2).reverse().map((msg, index) => (
                  <div key={msg.id}>
                    {/* 🎁 RENDERIZAR MENSAJES DE REGALO PARA CLIENTE */}
                    {msg.type === 'gift_request' && (
                      <GiftMessageComponent
                        giftRequest={{
                          id: msg.id,
                          gift: {
                            name: msg.extra_data?.gift_name || 'Regalo',
                            image: msg.extra_data?.gift_image || '',
                            price: msg.extra_data?.gift_price || 0
                          },
                          message: msg.extra_data?.original_message || '',
                          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min
                        }}
                        isClient={true}
                        onAccept={handleAcceptGift}
                        onReject={handleRejectGift}
                        className="mb-3"
                      />
                    )}
                    
                    {/* MENSAJES NORMALES */}
                    {msg.type !== 'gift_request' && (
                      <div className={msg.type === 'local' ? 'text-right' : 'text-xs sm:text-sm'}>
                        {msg.type === 'local' ? (
                          <p className="bg-[#ff007a] inline-block px-3 py-2 mt-1 rounded-xl text-white max-w-[280px] text-xs sm:text-sm break-words">
                            <TranslatedMessage 
                              message={msg} 
                              settings={translationSettings}
                              className="text-white"
                            />
                          </p>
                        ) : msg.type === 'system' ? (
                          <>
                            <span className="font-bold text-green-400">🎰 Sistema</span>
                            <p className="bg-[#1f2937] inline-block px-3 py-2 mt-1 rounded-xl border border-green-400/30 max-w-[280px] break-words text-white">
                              {msg.text}
                            </p>
                          </>
                        ) : (
                          <p className="bg-[#2b2d31] inline-block px-3 py-2 mt-1 rounded-xl max-w-[280px] break-words text-white">
                            <TranslatedMessage 
                              message={msg} 
                              settings={translationSettings}
                              className="text-white"
                            />
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

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
          <div className="flex justify-center items-center gap-4 sm:gap-6 lg:gap-10 mt-4 lg:mt-6 px-4 relative">
                    {/* MICRÓFONO */}
                    <div className="relative">
                      <button
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-[#ff007a] hover:bg-[#ff007a] hover:text-white transition`}
                        onClick={() => setMicEnabled(!micEnabled)}
                        title={micEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
                      >
                        {micEnabled ? <Mic size={30} /> : <MicOff size={32} />}
                      </button>
                    </div>
          
                    {/* CÁMARA */}
                    <div className="relative">
                      <button
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-[#ff007a] hover:bg-[#ff007a] hover:text-white transition`}
                        onClick={() => setCameraEnabled(!cameraEnabled)}
                        title={cameraEnabled ? 'Apagar cámara' : 'Encender cámara'}
                      >
                        {cameraEnabled ? <Video size={32} /> : <VideoOff size={32} />}
                      </button>
                    </div>
          
                    {/* SIGUIENTE */}
                    <button
                      onClick={siguientePersona}
                      title="Siguiente persona"
                      disabled={loading}
                      className={`
                        w-16 h-16 rounded-full flex items-center justify-center
                        text-[#ff007a] hover:bg-[#ff007a] hover:text-white
                        transition duration-300 ease-in-out
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <ArrowRight size={30} />
                    </button>
          
                    {/* FINALIZAR */}
                    <button
                      className="w-14 h-14 rounded-full flex items-center justify-center text-[#ff007a] hover:bg-[#ff007a] hover:text-white transition"
                      onClick={finalizarChat}
                      title="Finalizar chat"
                    >
                      <Square size={30} />
                    </button>
          
                    {/* CONFIGURACIÓN */}
                    <div className="relative">
                      <button
                        className="w-14 h-14 rounded-full flex items-center justify-center text-[#ff007a] hover:bg-[#ff007a] hover:text-white transition"
                        onClick={() => setShowMainSettings(!showMainSettings)}
                        title="Configuración"
                      >
                        <Settings size={30} />
                      </button>
                      
                      {/* DROPDOWN MENÚ DE CONFIGURACIÓN */}
                      {showMainSettings && (
                        <div className="settings-dropdown absolute bottom-16 right-0 bg-[#1f2125] rounded-xl p-4 shadow-2xl z-50 min-w-[240px] border border-[#ff007a]/20 animate-fadeIn">
                          <div className="space-y-1">
                            <div className="px-2 py-1 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-600 mb-3">
                              {t('navigation.settings')}
                            </div>
                            
                            <button
                              onClick={() => {
                                setShowTranslationSettings(true);
                                setShowMainSettings(false);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-[#2b2d31] rounded-lg transition text-left group"
                            >
                              <Globe className="text-[#ff007a] group-hover:scale-110 transition-transform" size={20} />
                              <div className="flex-1">
                                <span className="text-white text-sm font-medium">{t('translation.title')}</span>
                                <div className="text-xs text-gray-400">
                                  {translationSettings.enabled ? 
                                    `${t('translation.translationActive')} (${languages[translationSettings.targetLanguage]?.name})` : 
                                       t('translation.translationInactive')
                                  }
                                </div>
                              </div>
                              <ArrowRight className="text-gray-400 group-hover:text-white" size={16} />
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowCameraAudioModal(true); // ← Cambiar esta línea
                                setShowMainSettings(false);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-[#2b2d31] rounded-lg transition text-left group"
                            >
                              <Camera className="text-[#ff007a] group-hover:scale-110 transition-transform" size={20} />
                              <div className="flex-1">
                                <span className="text-white text-sm font-medium">{t('controls.camera')} y {t('controls.microphone')}</span>
                                <div className="text-xs text-gray-400">
                                </div>
                              </div>
                              <ArrowRight className="text-gray-400 group-hover:text-white" size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
          </div>
        </div>
            <TranslationSettings
              isOpen={showTranslationSettings}
              onClose={() => setShowTranslationSettings(false)}
              settings={translationSettings}
              onSettingsChange={setTranslationSettings}
              languages={languages}
            />
            <CameraAudioSettings
              isOpen={showCameraAudioModal}
              onClose={() => setShowCameraAudioModal(false)}
              cameraEnabled={cameraEnabled}
              micEnabled={micEnabled}
              setCameraEnabled={setCameraEnabled}
              setMicEnabled={setMicEnabled}
              mirrorMode={mirrorMode}
              setMirrorMode={setMirrorMode}
              onMirrorToggle={toggleMirrorMode}
            />
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