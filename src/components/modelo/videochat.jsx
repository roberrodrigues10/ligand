// VideoChat.jsx - Componente Principal Mejorado COMPLETO
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";

// Componentes modularizados
import Header from "../header";
import VideoDisplayImproved from "./components/VideoDisplayImproved";
import FloatingMessagesImproved from "./components/FloatingMessagesImproved";
import DesktopChatPanel from "./components/DesktopChatPanel";
import MobileControlsImproved from "./components/MobileControlsImproved";
import DesktopControlsImproved from "./components/DesktopControlsImproved";
import TimeDisplayImproved from "./components/TimeDisplayImproved";
import NotificationSystemImproved from "./components/NotificationSystemImproved";
import DisconnectionScreenImproved from "./components/DisconnectionScreenImproved";
import MediaControlsImproved from "./components/MediaControlsImproved";

// Componentes originales necesarios
import SimpleChat from "../messages.jsx";
import { useVideoChatGifts } from '../../components/GiftSystem/useVideoChatGifts';
import { GiftsModal } from '../../components/GiftSystem/giftModal.jsx';
import { GiftMessageComponent } from '../../components/GiftSystem/GiftMessageComponent.jsx';
import {
  useTranslation as useCustomTranslation,
  TranslationSettings,
  TranslatedMessage
} from '../../utils/translationSystem.jsx';
import CameraAudioSettings from './utils/cameraaudiosettings.jsx';  

// Utilities y contextos
import { getUser } from "../../utils/auth";
import { useSessionCleanup } from '../closesession.jsx';
import { useSearching } from '../../contexts/SearchingContext';
import { GlobalTranslationProvider, useGlobalTranslation } from './contexts/GlobalTranslationContext';

// Configuraciones
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const USER_CACHE = new Map();

// Función para generar clave única de la sala
const getRoomCacheKey = (roomName, currentUserName) => {
  return `${roomName}_${currentUserName}`;
};

// 🔥 FUNCIONES PARA ESPEJO
const applyMirrorToAllVideos = (shouldMirror) => {
  console.log('🪞 Aplicando espejo global en videochat:', shouldMirror);
  
  const selectors = [
    '[data-lk-participant-video]',
    'video[data-participant="local"]',
    '.lk-participant-tile video',
    '.lk-video-track video',
    'video[autoplay][muted]',
    'video[class*="object-cover"]',
    '.VideoTrack video',
    '[class*="VideoDisplay"] video'
  ];
  
  selectors.forEach(selector => {
    const videos = document.querySelectorAll(selector);
    videos.forEach(video => {
      if (video && video.style) {
        video.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
        video.style.webkitTransform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
        
        if (shouldMirror) {
          video.classList.add('mirror-video');
          video.classList.remove('normal-video');
        } else {
          video.classList.add('normal-video');
          video.classList.remove('mirror-video');
        }
      }
    });
  });
};

let mirrorObserver = null;

const setupMirrorObserver = (shouldMirror) => {
  if (mirrorObserver) {
    mirrorObserver.disconnect();
  }
  
  mirrorObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.tagName === 'VIDEO') {
            node.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
            node.style.webkitTransform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
          }
          
          const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
          videos.forEach(video => {
            video.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
            video.style.webkitTransform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
          });
        }
      });
    });
  });
  
  mirrorObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// 🔥 COMPONENTE PRINCIPAL CON ESTRUCTURA MODULAR
export default function VideoChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  
  // 🔥 HOOKS Y CONTEXTOS
  const { startSearching, stopSearching, forceStopSearching } = useSearching();
  const { finalizarSesion, limpiarDatosSession } = useSessionCleanup();
  
  // 🔥 PARÁMETROS DE LA SALA
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

  // 🔥 ESTADOS PRINCIPALES
  const [userData, setUserData] = useState({
    name: "",
    role: "",
    id: null,
  });

  const [otherUser, setOtherUser] = useState(() => {
    if (!roomName || !userName) return null;
    const cacheKey = getRoomCacheKey(roomName, userName);
    const cached = USER_CACHE.get(cacheKey);
    return cached || null;
  });

  // Estados de conexión
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [modeloStoppedWorking, setModeloStoppedWorking] = useState(false);
  const [receivedNotification, setReceivedNotification] = useState(false);
  const [isProcessingLeave, setIsProcessingLeave] = useState(false);

  // Estados de controles
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [camaraPrincipal, setCamaraPrincipal] = useState("remote");

  // Estados de UI
  const [tiempo, setTiempo] = useState(0);
  const [tiempoReal, setTiempoReal] = useState(0);
  const tiempoInicioRef = useRef(null);
  const tiempoGuardadoRef = useRef(0);
  const tiempoIntervalRef = useRef(null);

  // Estados de mensajes
  const [messages, setMessages] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Estados de desconexión
  const [clientDisconnected, setClientDisconnected] = useState(false);
  const [clientWentNext, setClientWentNext] = useState(false);
  const [disconnectionReason, setDisconnectionReason] = useState('');
  const [disconnectionType, setDisconnectionType] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(0);

  // Estados de detección
  const [isDetectingUser, setIsDetectingUser] = useState(() => {
    if (!roomName || !userName) return false;
    const cacheKey = getRoomCacheKey(roomName, userName);
    const hasCache = USER_CACHE.has(cacheKey);
    return !hasCache;
  });

  // Estados de configuración
  const [showSettings, setShowSettings] = useState(false);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [showMainSettings, setShowMainSettings] = useState(false);
  const [showCameraAudioModal, setShowCameraAudioModal] = useState(false);
  const [showGiftsModal, setShowGiftsModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [showClientBalance, setShowClientBalance] = useState(true);
  const [mostrarRegalos, setMostrarRegalos] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);

  // Estados de notificaciones
  const [notifications, setNotifications] = useState([]);

  // Estados de espejo
  const [mirrorMode, setMirrorMode] = useState(() => {
    const saved = localStorage.getItem("mirrorMode");
    return saved ? JSON.parse(saved) : true;
  });

  // Chat functions
  const [chatFunctions, setChatFunctions] = useState(null);
  const messagesContainerRef = useRef(null);

  // Sistema de traducción
  const {
    settings: translationSettings = { enabled: false },
    setSettings: setTranslationSettings,
    translateMessage,
    clearProcessedMessages,
    languages = {}
  } = useCustomTranslation() || {};

  // Sistema de regalos
  const {
    gifts,
    pendingRequests,
    userBalance,
    loading: giftLoading,
    requestGift,
    loadGifts,
    loadUserBalance
  } = useVideoChatGifts(
    roomName,
    { id: userData.id, role: userData.role, name: userData.name },
    otherUser ? { id: otherUser.id, name: otherUser.name } : null
  );

  // 🔥 SISTEMA DE NOTIFICACIONES MEJORADO
  const addNotification = useCallback((type, title, message, duration = 5000) => {
    const id = Date.now();
    const notification = {
      id,
      type, // 'success', 'error', 'warning', 'info'
      title,
      message,
      timestamp: Date.now(),
      duration
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove después del duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
    
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // 🔥 FUNCIONES DE TIEMPO MEJORADAS
  const formatoTiempo = () => {
    const minutos = Math.floor(tiempoReal / 60).toString().padStart(2, "0");
    const segundos = (tiempoReal % 60).toString().padStart(2, "0");
    return `${minutos}:${segundos}`;
  };

  const iniciarTiempoReal = () => {
    console.log('⏱️ Iniciando contador de tiempo real');
    if (tiempoIntervalRef.current) {
      clearInterval(tiempoIntervalRef.current);
      tiempoIntervalRef.current = null;
    }
    tiempoInicioRef.current = Date.now();
    setTiempoReal(0);
    
    tiempoIntervalRef.current = setInterval(() => {
      const tiempoTranscurrido = Math.floor((Date.now() - tiempoInicioRef.current) / 1000);
      setTiempoReal(tiempoTranscurrido);
    }, 1000);
  };

  const detenerTiempoReal = () => {
    if (tiempoIntervalRef.current) {
      clearInterval(tiempoIntervalRef.current);
      tiempoIntervalRef.current = null;
      
      const tiempoFinal = tiempoInicioRef.current ?
        Math.floor((Date.now() - tiempoInicioRef.current) / 1000) : tiempoReal;
      
      if (tiempoFinal <= 0) {
        const tiempoSeguro = Math.max(tiempoReal, 30);
        setTiempoReal(tiempoSeguro);
        return tiempoSeguro;
      }
      
      setTiempoReal(tiempoFinal);
      return tiempoFinal;
    }
    
    const tiempoActual = Math.max(tiempoReal, 30);
    return tiempoActual;
  };

  // 🔥 FUNCIÓN PARA ENVIAR TIEMPO REAL
  const enviarTiempoReal = async (sessionId, tiempoEspecifico = null) => {
    let tiempoAEnviar;
    
    if (tiempoEspecifico !== null) {
      tiempoAEnviar = tiempoEspecifico;
    } else if (tiempoInicioRef.current) {
      tiempoAEnviar = Math.floor((Date.now() - tiempoInicioRef.current) / 1000);
    } else {
      tiempoAEnviar = tiempoReal;
    }
    
    if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
      console.error('❌ SessionId inválido:', sessionId);
      return;
    }
    
    if (tiempoAEnviar <= 0) {
      console.error('❌ Tiempo inválido:', tiempoAEnviar);
      return;
    }

    console.log('🚀 ENVIANDO TIEMPO DETALLADO:', {
      sessionId,
      segundos: tiempoAEnviar,
      formateado: `${Math.floor(tiempoAEnviar/60)}:${(tiempoAEnviar%60).toString().padStart(2, '0')}`,
      minutos: (tiempoAEnviar / 60).toFixed(2)
    });

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('❌ No hay token de autenticación');
        return;
      }

      const requestBody = {
        session_id: sessionId,
        duration_seconds: tiempoAEnviar
      };

      const response = await fetch(`${API_BASE_URL}/api/earnings/update-duration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error HTTP:', response.status, errorText);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Tiempo enviado exitosamente: ${Math.floor(tiempoAEnviar/60)}:${(tiempoAEnviar%60).toString().padStart(2, '0')}`);
        console.log('💰 Ganancias calculadas:', data.model_earnings || 'N/A');
      } else {
        console.error('❌ Error del servidor:', data.error);
      }
    } catch (error) {
      console.error('❌ Error enviando tiempo:', error);
    }
  };

  // 🔥 FUNCIONES DE CACHE MEJORADAS
  const updateOtherUser = (user) => {
    if (!user || !roomName || !userName) return;
    
    const cacheKey = getRoomCacheKey(roomName, userName);
    USER_CACHE.set(cacheKey, user);
    setOtherUser(user);
    setIsDetectingUser(false);
    checkIfFavorite(user.id);
  };

  const clearUserCache = () => {
    if (!roomName || !userName) return;
    const cacheKey = getRoomCacheKey(roomName, userName);
    USER_CACHE.delete(cacheKey);
    setOtherUser(null);
    setIsDetectingUser(true);
  };

  // 🔥 FUNCIONES DE CONTROL MEJORADAS
  const cambiarCamara = () => {
    setCamaraPrincipal(prev => prev === "remote" ? "local" : "remote");
  };

  const toggleMirrorMode = useCallback(() => {
    const newMirrorMode = !mirrorMode;
    setMirrorMode(newMirrorMode);
    localStorage.setItem("mirrorMode", JSON.stringify(newMirrorMode));
    
    applyMirrorToAllVideos(newMirrorMode);
    setupMirrorObserver(newMirrorMode);
    
    console.log('🪞 Espejo cambiado a:', newMirrorMode);
  }, [mirrorMode]);

  const forceApplyMirror = useCallback(() => {
    console.log('🔄 Forzando aplicación de espejo:', mirrorMode);
    applyMirrorToAllVideos(mirrorMode);
    setupMirrorObserver(mirrorMode);
  }, [mirrorMode]);

  const enviarMensaje = async () => {
    if (mensaje.trim() && !isSendingMessage) {
      setIsSendingMessage(true);
      const messageToSend = mensaje.trim();
      
      if (chatFunctions?.sendMessage) {
        const success = chatFunctions.sendMessage(messageToSend);
        
        if (success) {
          const nuevoMensaje = {
            id: Date.now(),
            type: 'local',
            text: messageToSend,
            timestamp: Date.now(),
            isOld: false,
            sender: userData.name,
            senderRole: userData.role
          };
          
          setMessages(prev => [nuevoMensaje, ...prev]);
          setMensaje("");
        }
      }
      
      setIsSendingMessage(false);
    }
  };

  const handleMessageReceived = (newMessage) => {
    const formattedMessage = {
      ...newMessage,
      id: newMessage.id || Date.now() + Math.random(),
      type: 'remote',
      senderRole: newMessage.senderRole || 'chico' // 🔥 CAMBIO: chico en lugar de cliente
    };
    
    setMessages(prev => [formattedMessage, ...prev]);
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

  const handleUserLoadedFromChat = (user) => {
    console.log('📥 Usuario recibido desde SimpleChat:', user);
    updateOtherUser(user);
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

  // 🔥 FUNCIONES DE NAVEGACIÓN MEJORADAS
  const siguientePersona = async () => {
    const tiempoFinalSesion = detenerTiempoReal();
    
    if (roomName && tiempoFinalSesion > 0) {
      try {
        await enviarTiempoReal(roomName, tiempoFinalSesion);
        addNotification('success', 'Sesión guardada', 'Tiempo de sesión registrado correctamente');
      } catch (error) {
        addNotification('error', 'Error', 'No se pudo guardar el tiempo de sesión');
      }
    }
    
    tiempoInicioRef.current = null;
    setTiempoReal(0);
    clearUserCache();
    startSearching();

    if (otherUser?.id && roomName) {
      fetch(`${API_BASE_URL}/api/livekit/notify-partner-next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
        },
        body: JSON.stringify({ roomName })
      }).catch(() => {});
    }
    
    const urlParams = new URLSearchParams({
      role: 'modelo',
      action: 'siguiente',
      from: 'videochat_siguiente',
      excludeUser: otherUser?.id || '',
      excludeUserName: otherUser?.name || '',
      selectedCamera: selectedCamera || '',
      selectedMic: selectedMic || ''
    });
    
    navigate(`/usersearch?${urlParams}`, { replace: true });
  };

  const onCameraSwitch = useCallback(() => {
    cambiarCamara();
  }, []);

    
 const finalizarChat = useCallback(async () => {
  console.log('🛑 [MODELO] FINALIZANDO CHAT - Deteniendo todo inmediatamente');
  
  // 🔥 DETENER TODO INMEDIATAMENTE
  setModeloStoppedWorking(true);
  setClientDisconnected(false);  // Evitar pantallas de desconexión
  setClientWentNext(false);      // Evitar pantallas de desconexión
  
  const tiempoFinalSesion = detenerTiempoReal();
  
  if (roomName && tiempoFinalSesion > 0) {
    try {
      await enviarTiempoReal(roomName, tiempoFinalSesion);
      addNotification('success', 'Sesión finalizada', 'Tiempo registrado correctamente');
    } catch (error) {
      addNotification('error', 'Error', 'No se pudo guardar el tiempo');
    }
  }
  
  tiempoInicioRef.current = null;
  setTiempoReal(0);
  clearUserCache();

  // 🔥 NOTIFICAR AL CLIENTE (opcional)
  if (otherUser?.id && roomName) {
    fetch(`${API_BASE_URL}/api/livekit/notify-partner-stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
      },
      body: JSON.stringify({ roomName })
    }).catch(() => {});
  }

  // 🔥 LIMPIAR STORAGE
  sessionStorage.removeItem('roomName');
  sessionStorage.removeItem('userName');
  sessionStorage.removeItem('currentRoom');
  sessionStorage.removeItem('inCall');
  
  // 🔥 NAVEGAR INMEDIATAMENTE
  console.log('🏠 [MODELO] Navegando a home inmediatamente');
  navigate('/homellamadas', { replace: true });
  }, [roomName, navigate, addNotification, otherUser]);
  // 🔥 FUNCIÓN DE DESCONEXIÓN MEJORADA
  const handleClientDisconnected = (reason = 'stop', customMessage = '') => {
    setLoading(false);
    setConnected(false);
    
    if (reason === 'next' || reason === 'partner_went_next') {
      setClientWentNext(true);
      setDisconnectionType('next');
      setDisconnectionReason(customMessage || 'El chico te saltó y fue a la siguiente persona'); // 🔥 CAMBIO: chico
    } else if (reason === 'stop' || reason === 'partner_left_session') {
      setClientDisconnected(true);
      setDisconnectionType('stop');
      setDisconnectionReason(customMessage || 'El chico se desconectó de la videollamada'); // 🔥 CAMBIO: chico
    } else {
      setClientDisconnected(true);
      setDisconnectionType('left');
      setDisconnectionReason(customMessage || 'El chico salió de la sesión'); // 🔥 CAMBIO: chico
    }
    
    startRedirectCountdown();
  };

  const startRedirectCountdown = () => {
    let timeLeft = 3;
    setRedirectCountdown(timeLeft);
    
    const countdownInterval = setInterval(() => {
      timeLeft--;
      setRedirectCountdown(timeLeft);
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);
  };

  // 🔥 FUNCIONES DE FAVORITOS Y BLOQUEO MEJORADAS
  const toggleFavorite = async () => {
    if (!otherUser?.id || isAddingFavorite) return;
    
    setIsAddingFavorite(true);
    
    try {
      const authToken = sessionStorage.getItem('token');
      
      if (isFavorite) {
        const response = await fetch(`${API_BASE_URL}/api/favorites/remove`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ favorite_user_id: otherUser.id })
        });
        
        const data = await response.json();
        if (data.success) {
          setIsFavorite(false);
          addNotification('success', 'Favorito removido', `${otherUser.name} removido de favoritos`);
        }
      } else {
        const note = '';
        
        const response = await fetch(`${API_BASE_URL}/api/favorites/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            favorite_user_id: otherUser.id,
            note: note
          })
        });
        
        const data = await response.json();
        if (data.success) {
          setIsFavorite(true);
          addNotification('success', 'Favorito agregado', `${otherUser.name} agregado a favoritos ⭐`);
        }
      }
    } catch (error) {
      addNotification('error', 'Error', 'Error de conexión con favoritos');
    } finally {
      setIsAddingFavorite(false);
    }
  };

  const blockCurrentUser = async () => {
    if (!otherUser?.id || isBlocking) return;
    
    const reason = 'Comportamiento inapropiado';
    
    setIsBlocking(true);
    
    try {
      const authToken = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/blocks/block-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          blocked_user_id: otherUser.id,
          reason: reason,
          current_room: roomName
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addNotification('success', 'Usuario bloqueado', `Has bloqueado a ${otherUser.name}`);
        
        setTimeout(() => {
          siguientePersona();
        }, 1500);
      } else {
        addNotification('error', 'Error', data.error || 'Error al bloquear usuario');
      }
    } catch (error) {
      addNotification('error', 'Error', 'Error de conexión');
    } finally {
      setIsBlocking(false);
    }
  };

  const checkIfFavorite = async (userId) => {
    try {
      const authToken = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/favorites/list`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const data = await response.json();
      if (data.success) {
        const isFav = data.favorites.some(fav => fav.id == userId);
        setIsFavorite(isFav);
      }
    } catch (error) {
      console.log('⚠️ Error verificando favorito:', error);
    }
  };

  // 🔥 FUNCIÓN PARA OBTENER NOMBRE DISPLAY MEJORADA
  const getDisplayName = () => {
    if (!roomName || !userName) return "Configurando...";
    
    const cacheKey = getRoomCacheKey(roomName, userName);
    const cached = USER_CACHE.get(cacheKey);
    
    if (cached) return cached.name;
    if (otherUser) return otherUser.name;
    if (isDetectingUser) return "Conectando...";
    
    return "Esperando chico..."; // 🔥 CAMBIO: chico en lugar de usuario
  };

  // 🔥 FUNCIÓN PARA SOLICITAR REGALO
  const handleRequestGift = async (giftId, recipientId, roomName, message) => {
    console.log('🎁 [MODELO] Solicitando regalo:', {
      giftId, recipientId, roomName, message
    });

    try {
      const result = await requestGift(giftId, message);
      
      if (result.success) {
        console.log('✅ [MODELO] Regalo solicitado exitosamente');
        
        if (result.chatMessage) {
          setMessages(prev => [result.chatMessage, ...prev]);
        }
        
        if (Notification.permission === 'granted') {
          new Notification('🎁 Solicitud Enviada', {
            body: `Solicitaste ${result.giftInfo?.name} a ${otherUser?.name}`,
            icon: '/favicon.ico'
          });
        }
        
        return { success: true };
      } else {
        console.error('❌ [MODELO] Error solicitando regalo:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ [MODELO] Error de conexión:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // 🔥 FUNCIÓN HEARTBEAT
  const sendHeartbeat = async (activityType = 'videochat') => {
    try {
      if (modeloStoppedWorking && activityType === 'videochat') {
        console.log('🛑 [MODELO] Heartbeat videochat bloqueado por flag de stop');
        return;
      }

      const authToken = sessionStorage.getItem('token');
      if (!authToken) return;

      fetch(`${API_BASE_URL}/api/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          activity_type: activityType,
          room: activityType === 'browsing' ? null : roomName
        })
      }).catch(() => {});

      console.log(`💓 [VIDEOCHAT] Heartbeat enviado: ${activityType}`);
    } catch (error) {
      console.log('⚠️ [VIDEOCHAT] Error enviando heartbeat (ignorado):', error);
    }
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

  // 🔥 EVENTOS DE CONEXIÓN
  const handleRoomConnected = () => {
    setConnected(true);
    iniciarTiempoReal();
    addNotification('success', 'Conectado', 'Conexión establecida exitosamente');
  };

  const handleRoomDisconnected = () => {
    setConnected(false);
    detenerTiempoReal();
    addNotification('warning', 'Desconectado', 'Se perdió la conexión');
  };

  // 🔥 MANEJO DE TECLAS
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      enviarMensaje();
    }
  };

  // 🔥 EFECTOS DE INICIALIZACIÓN

  // Efecto para heartbeat
  useEffect(() => {
    if (!roomName || modeloStoppedWorking) {
      console.log('🛑 [HOOK] useVideoChatHeartbeat detenido por modeloStoppedWorking');
      return;
    }

    console.log('🚀 [HOOK] Iniciando useVideoChatHeartbeat personalizado');

    const authToken = sessionStorage.getItem('token');
    if (authToken) {
      fetch(`${API_BASE_URL}/api/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          activity_type: 'videochat',
          room: roomName
        })
      }).catch(() => {});
    }

    const interval = setInterval(() => {
      if (modeloStoppedWorking) {
        console.log('🛑 [HOOK] Deteniendo interval por modeloStoppedWorking');
        clearInterval(interval);
        return;
      }
      
      const token = sessionStorage.getItem('token');
      if (token) {
        fetch(`${API_BASE_URL}/api/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            activity_type: 'videochat',
            room: roomName
          })
        }).catch(() => {});
      }
    }, 15000);

    return () => {
      console.log('🧹 [HOOK] Cleanup useVideoChatHeartbeat');
      clearInterval(interval);
      
      if (!modeloStoppedWorking) {
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
          }).catch(() => {});
        }
      }
    };
  }, [roomName, modeloStoppedWorking]);

  // Efecto para cargar usuario
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getUser(false);
        const name = user.alias || user.name || user.username || "";
        const role = user.rol || user.role || "modelo";
        
        setUserData({ name, role, id: user.id });
      } catch (err) {
        console.error("Error al obtener usuario:", err);
        
        const wasRateLimited = handleRateLimit(err, 'getUser');
        if (wasRateLimited) {
          return;
        }
        
        addNotification('error', 'Error', 'No se pudo cargar la información del usuario');
      }
    };
    
    fetchUser();
  }, [addNotification, handleRateLimit]);

  // Efecto para obtener token
  const memoizedRoomName = useMemo(() => {
    const room = getParam("roomName");
    return room && room !== 'null' && room !== 'undefined' ? room : null;
  }, [location.state, searchParams]);

  const memoizedUserName = useMemo(() => {
    const user = getParam("userName");
    return user && user !== 'null' && user !== 'undefined' ? user : null;
  }, [location.state, searchParams]);

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
  }, [memoizedRoomName, memoizedUserName, handleRateLimit, selectedCamera, selectedMic]);

  // Efecto para espejo
  useEffect(() => {
    const savedMirrorMode = localStorage.getItem("mirrorMode");
    const shouldMirror = savedMirrorMode ? JSON.parse(savedMirrorMode) : true;
    
    setMirrorMode(shouldMirror);
    
    const timer = setTimeout(() => {
      applyMirrorToAllVideos(shouldMirror);
      setupMirrorObserver(shouldMirror);
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      if (mirrorObserver) {
        mirrorObserver.disconnect();
      }
    };
  }, []);

  // Efecto para aplicar espejo cuando conecta
  useEffect(() => {
    if (connected && token) {
      const timer = setTimeout(() => {
        console.log('🔄 Aplicando espejo después de conexión');
        applyMirrorToAllVideos(mirrorMode);
        setupMirrorObserver(mirrorMode);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [connected, token, mirrorMode]);

  // Efecto para re-aplicar espejo cuando cambien participantes
  useEffect(() => {
    if (chatFunctions && chatFunctions.participantsCount > 0) {
      const timer = setTimeout(() => {
        console.log('🔄 Re-aplicando espejo por cambio de participantes');
        forceApplyMirror();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [chatFunctions?.participantsCount, forceApplyMirror]);


  // Efecto para traducir mensajes
  useEffect(() => {
    const processMessagesForTranslation = async () => {
      if (!translationSettings?.enabled) return;
      
      for (const message of messages) {
        if (!message.processed) {
          try {
            const result = await translateMessage(message);
            if (result) {
              console.log(`✅ Mensaje traducido: "${message.text}" → "${result.translated}"`);
              message.processed = true;
            }
          } catch (error) {
            console.warn('Error traduciendo mensaje:', error);
          }
        }
      }
    };
    
    processMessagesForTranslation();
  }, [messages, translateMessage, translationSettings.enabled]);

  // Efecto para detener loading cuando conecta
  useEffect(() => {
    const shouldStopLoading = 
      connected && 
      token && 
      chatFunctions && 
      (
        chatFunctions.participantsCount > 1 || 
        chatFunctions.hasOtherParticipant || 
        !chatFunctions.isDetecting
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
    }
  }, [connected, token, chatFunctions, forceStopSearching]);

  // Efecto para configurar chatFunctions
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

  // Efecto para notificaciones
  useEffect(() => {
    if (!roomName || !userName || !connected || modeloStoppedWorking) {
      return;
    }

    console.log('🔔 [MODELO] Iniciando polling de notificaciones');

    let isPolling = true;
    let pollInterval = 3000;
    let consecutiveEmpty = 0;

    const checkNotifications = async () => {
      
      if (!isPolling || modeloStoppedWorking) {
          console.log('🛑 [MODELO] Polling detenido por flag o estado');
          return;
        }
      try {
        const authToken = sessionStorage.getItem('token');
        if (!authToken) return;

        const response = await fetch(`${API_BASE_URL}/api/status/updates`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.log(`⚠️ Response ${response.status} en polling - continuando`);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.has_notifications) {
            consecutiveEmpty = 0;
            const notification = data.notification;
            console.log('📨 [MODELO] Notificación recibida:', notification.type);
            
            isPolling = false;
            
            if (notification.type === 'partner_went_next') {
              console.log('🔄 [MODELO] Cliente fue a siguiente - mostrando mensaje');
              
              handleClientDisconnected('next', 'El cliente fue a la siguiente modelo');
              
              clearUserCache();
              startSearching();
              
              const redirectParams = notification.data.redirect_params || {};
              const urlParams = new URLSearchParams({
                role: 'modelo',
                from: 'partner_went_next',
                action: 'siguiente',
                excludeUser: redirectParams.excludeUser || '',
                excludeUserName: redirectParams.excludeUserName || '',
                selectedCamera: selectedCamera || '',
                selectedMic: selectedMic || ''
              });
              
              setTimeout(() => {
                navigate(`/usersearch?${urlParams}`, { replace: true });
              }, 3000);
            }
            
            if (notification.type === 'partner_left_session') {
              console.log('🛑 [MODELO] Cliente terminó sesión - mostrando mensaje');
              
              handleClientDisconnected('stop', 'El cliente finalizó la videollamada');
              
              setTimeout(() => {
                setModeloStoppedWorking(true);
                setReceivedNotification(true);
                clearUserCache();
                
                sessionStorage.removeItem('roomName');
                sessionStorage.removeItem('userName');
                sessionStorage.removeItem('currentRoom');
                sessionStorage.removeItem('inCall');
                sessionStorage.removeItem('videochatActive');
                
                startSearching();
                
                const urlParams = new URLSearchParams({
                  role: 'modelo',
                  from: 'client_stopped_session',
                  action: 'find_new_client',
                  reason: 'previous_client_left',
                  selectedCamera: selectedCamera || '',
                  selectedMic: selectedMic || ''
                });
                
                setTimeout(() => {
                  navigate(`/usersearch?${urlParams}`, { replace: true });
                }, 3000);
              }, 100);
            }
          } else {
            consecutiveEmpty++;
            if (consecutiveEmpty >= 3) {
              pollInterval = Math.min(pollInterval + 1000, 8000);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ [MODELO] Error en polling:', error);
      }
      
      if (isPolling && !modeloStoppedWorking) {
        setTimeout(checkNotifications, pollInterval);
      }
    };

    checkNotifications();

    return () => {
      console.log('🛑 [MODELO] Deteniendo polling de notificaciones');
      isPolling = false;
    };
  }, [roomName, userName, connected, modeloStoppedWorking, navigate, selectedCamera, selectedMic]);

  // Efecto para resetear flags
  useEffect(() => {
    setModeloStoppedWorking(false);
    setReceivedNotification(false);
    setClientDisconnected(false);
    setClientWentNext(false);
    setDisconnectionReason('');
    setDisconnectionType('');
    setRedirectCountdown(0);
  }, [roomName]);

  // Efecto para timer legacy
  useEffect(() => {
    const intervalo = setInterval(() => setTiempo((prev) => prev + 1), 1000);
    
    return () => {
      clearInterval(intervalo);
      if (tiempoIntervalRef.current) {
        clearInterval(tiempoIntervalRef.current);
      }
    };
  }, []);

  // Efecto para verificar favoritos
  useEffect(() => {
    if (otherUser?.id) {
      checkIfFavorite(otherUser.id);
    } else {
      setIsFavorite(false);
    }
  }, [otherUser?.id]);

  // Efecto para scroll de mensajes
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Efecto para clicks fuera de settings
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMainSettings && !event.target.closest('.settings-dropdown')) {
        setShowMainSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMainSettings]);

  // Efecto para guardar parámetros
  useEffect(() => {
    if (roomName && roomName !== 'null' && roomName !== 'undefined') {
      sessionStorage.setItem("roomName", roomName);
    }
    if (userName && userName !== 'null' && userName !== 'undefined') {
      sessionStorage.setItem("userName", userName);
    }
  }, [roomName, userName]);

  // Efecto de cleanup
  useEffect(() => {
    return () => {
      if (tiempoIntervalRef.current) {
        clearInterval(tiempoIntervalRef.current);
        tiempoIntervalRef.current = null;
      }
      tiempoInicioRef.current = null;
    };
  }, []);

  // 🔥 RENDER CONDICIONAL PARA ESTADOS DE DESCONEXIÓN
  if (clientDisconnected || clientWentNext) {
    return (
      <DisconnectionScreenImproved
        disconnectionType={disconnectionType}
        disconnectionReason={disconnectionReason}
        redirectCountdown={redirectCountdown}
        t={t}
      />
    );
  }


  // 🔥 RENDER PRINCIPAL
  return (
    //<GlobalTranslationProvider>
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white">
        {/* Sistema de notificaciones */}
        <NotificationSystemImproved
          notifications={notifications}
          onRemove={removeNotification}
        />
        
        {/* Modal de regalos */}
        <GiftsModal
          isOpen={showGiftsModal}
          onClose={() => setShowGiftsModal(false)}
          recipientName={getDisplayName()}
          recipientId={otherUser?.id}
          roomName={roomName}
          userRole="modelo"
          gifts={gifts}
          onRequestGift={handleRequestGift}
          loading={giftLoading}
        />
        
        {/* Configuración de traducción */}
        <TranslationSettings
          isOpen={showTranslationSettings}
          onClose={() => setShowTranslationSettings(false)}
          settings={translationSettings}
          onSettingsChange={setTranslationSettings}
          languages={languages}
        />
        
        {/* Configuración de cámara y audio */}
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
        
        {loading && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff007a] mx-auto mb-4"></div>
              <p className="text-white">Conectando...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center max-w-md mx-auto">
              <p className="text-red-500 text-lg mb-4">Error: {error}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => navigate('/precallmodel')}
                  className="bg-[#ff007a] px-6 py-3 rounded-full text-white font-medium"
                >
                  Volver a Inicio
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
        )}
        
        {!loading && !error && token && (
          <LiveKitRoom
            video={cameraEnabled}
            audio={micEnabled}
            token={token}
            serverUrl={serverUrl}
            data-lk-theme="default"
            onConnected={handleRoomConnected}
            onDisconnected={handleRoomDisconnected}
            className="min-h-screen"
            options={{
              videoCaptureDefaults: selectedCamera ? { deviceId: selectedCamera } : undefined,
              audioCaptureDefaults: selectedMic ? { deviceId: selectedMic } : undefined,
            }}
          >
            <RoomAudioRenderer />
            
            {/* SimpleChat original */}
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
            
            {/* Controles de media ocultos */}
            <MediaControlsImproved
              micEnabled={micEnabled}
              cameraEnabled={cameraEnabled}
              setMicEnabled={setMicEnabled}
              setCameraEnabled={setCameraEnabled}
            />
            
            <div className="p-2 sm:p-4">
              <Header />
              
              {/* Tiempo mejorado - visible entre header y cámara */}
              <TimeDisplayImproved
                tiempoReal={tiempoReal}
                formatoTiempo={formatoTiempo}
                connected={connected}
                otherUser={otherUser}
                roomName={roomName}
                t={t}
              />
              
                {/* MÓVIL - Video adaptativo entre tiempo y chat */}
                <div className="lg:hidden bg-[#1f2125] rounded-2xl overflow-hidden relative mt-4" 
                    style={{height: 'calc(100vh - 360px)'}}>                
                <VideoDisplayImproved
                  onCameraSwitch={cambiarCamara}
                  mainCamera={camaraPrincipal}
                  connected={connected}
                  hadRemoteParticipant={otherUser !== null}
                  otherUser={otherUser}
                  isDetectingUser={isDetectingUser}
                  t={t}
                />
                
                {/* Mensajes flotantes mejorados */}
                <FloatingMessagesImproved
                  messages={messages}
                  t={t}
                />
                
                {/* Controles móviles mejorados */}
                <MobileControlsImproved
                  // Props existentes...
                  mensaje={mensaje}
                  setMensaje={setMensaje}
                  enviarMensaje={enviarMensaje}
                  handleKeyPress={handleKeyPress}
                  toggleFavorite={toggleFavorite}
                  blockCurrentUser={blockCurrentUser}
                  isFavorite={isFavorite}
                  isAddingFavorite={isAddingFavorite}
                  isBlocking={isBlocking}
                  otherUser={otherUser}
                  setShowGiftsModal={setShowGiftsModal}
                  micEnabled={micEnabled}
                  setMicEnabled={setMicEnabled}
                  cameraEnabled={cameraEnabled}
                  setCameraEnabled={setCameraEnabled}
                  onCameraSwitch={onCameraSwitch}
                  onEndCall={finalizarChat}
                  siguientePersona={siguientePersona}
                />
              </div>
              
              
              {/* DESKTOP - Layout principal */}
              <div className="hidden lg:flex flex-col lg:flex-row lg:gap-6 mx-4">
                {/* ZONA VIDEO */}
                <div className="flex-1 bg-[#1f2125] rounded-xl lg:rounded-2xl overflow-hidden relative flex items-center justify-center h-[500px]">
                  <VideoDisplayImproved
                    onCameraSwitch={cambiarCamara}
                    mainCamera={camaraPrincipal}
                    connected={connected}
                    hadRemoteParticipant={otherUser !== null}
                    otherUser={otherUser}
                    isDetectingUser={isDetectingUser}
                    t={t}
                  />
                </div>
                
                {/* PANEL DERECHO - Desktop */}
                <DesktopChatPanel
                  getDisplayName={getDisplayName}
                  isDetectingUser={isDetectingUser}
                  toggleFavorite={toggleFavorite}
                  blockCurrentUser={blockCurrentUser}
                  isFavorite={isFavorite}
                  isAddingFavorite={isAddingFavorite}
                  isBlocking={isBlocking}
                  otherUser={otherUser}
                  setShowGiftsModal={setShowGiftsModal}
                  messages={messages}
                  mensaje={mensaje}
                  setMensaje={setMensaje}
                  enviarMensaje={enviarMensaje}
                  handleKeyPress={handleKeyPress}
                  userData={userData}
                  t={t}
                />
              </div>
              
              {/* CONTROLES PRINCIPALES MEJORADOS */}
              <DesktopControlsImproved
                micEnabled={micEnabled}
                setMicEnabled={setMicEnabled}
                cameraEnabled={cameraEnabled}
                setCameraEnabled={setCameraEnabled}
                siguientePersona={siguientePersona}
                finalizarChat={finalizarChat}
                showMainSettings={showMainSettings}
                setShowMainSettings={setShowMainSettings}
                setShowTranslationSettings={setShowTranslationSettings}
                setShowCameraAudioModal={setShowCameraAudioModal}
                translationSettings={translationSettings}
                languages={languages}
                loading={loading}
                t={t}
              />
            </div>
          </LiveKitRoom>
        )}
      </div>
    //</GlobalTranslationProvider>
  );
}