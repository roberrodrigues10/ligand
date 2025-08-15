// VideoChatClient.jsx - Componente Principal Mejorado COMPLETO
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useRoomContext,        
} from "@livekit/components-react";
import "@livekit/components-styles";

// Componentes modularizados para cliente
import Header from "./headercliente.jsx";
import VideoDisplayImprovedClient from "./components/VideoDisplayImprovedClient";
import FloatingMessagesImprovedClient from "./components/FloatingMessagesImprovedClient";
import DesktopChatPanelClient from "./components/DesktopChatPanelClient";
import MobileControlsImprovedClient from "./components/MobileControlsImprovedClient";
import DesktopControlsImprovedClient from "./components/DesktopControlsImprovedClient";
import TimeDisplayImprovedClient from "./components/TimeDisplayImprovedClient";
import NotificationSystemImprovedClient from "./components/NotificationSystemImprovedClient";
import DisconnectionScreenImprovedClient from "./components/DisconnectionScreenImprovedClient";
import MediaControlsImprovedClient from "./components/MediaControlsImprovedClient";

// Componentes originales necesarios
import SimpleChat from "../messages.jsx";
import { useVideoChatGifts } from '../../components/GiftSystem/useVideoChatGifts';
import { GiftsModal } from '../../components/GiftSystem/giftModal.jsx';
import { GiftMessageComponent } from '../../components/GiftSystem/GiftMessageComponent.jsx';
import { GiftNotificationOverlay } from '../../components/GiftSystem/GiftNotificationOverlay';
import {
  useTranslation as useCustomTranslation,
  TranslationSettings,
  TranslatedMessage
} from '../../utils/translationSystem.jsx';
import CameraAudioSettings from '../modelo/utils/cameraaudiosettings.jsx';  

// Utilities y contextos
import { getUser } from "../../utils/auth";
import { useSessionCleanup } from '../closesession.jsx';
import { useSearching } from '../../contexts/SearchingContext';
import { ProtectedPage } from '../hooks/usePageAccess.jsx';
import { useVideoChatHeartbeat } from '../../utils/heartbeat';

// Configuraciones
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const USER_CACHE = new Map();

// Función para generar clave única de la sala
const getRoomCacheKey = (roomName, currentUserName) => {
  return `${roomName}_${currentUserName}`;
};
const RoomCapture = ({ onRoomReady }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  
  useEffect(() => {
    if (room && localParticipant) {
      console.log('🏠 Room capturada exitosamente!');
      onRoomReady(room);
    }
  }, [room, localParticipant, onRoomReady]);
  
  return null;
};

// 🔥 FUNCIONES PARA ESPEJO
const applyMirrorToAllVideos = (shouldMirror) => {
  console.log('🪞 Aplicando espejo global en videochat cliente:', shouldMirror);
  
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
export default function VideoChatClient() {
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
  const [modeloDisconnected, setModeloDisconnected] = useState(false);
  const [modeloWentNext, setModeloWentNext] = useState(false);
  const [receivedNotification, setReceivedNotification] = useState(false);
  const [isProcessingLeave, setIsProcessingLeave] = useState(false);

  // Estados de controles
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [volumeEnabled, setVolumeEnabled] = useState(true);
  const [camaraPrincipal, setCamaraPrincipal] = useState("remote");

  // Estados de UI
  const [tiempo, setTiempo] = useState(0);

  // Estados de mensajes
  const [messages, setMessages] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Estados de desconexión
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
  const [isMonitoringBalance, setIsMonitoringBalance] = useState(false);
  const [availableGifts, setAvailableGifts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCameraDevice, setSelectedCameraDevice] = useState('');
  const [selectedMicrophoneDevice, setSelectedMicrophoneDevice] = useState('');
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const handleRoomReady = (roomInstance) => {
    console.log('✅ Room lista:', !!roomInstance);
    setRoom(roomInstance);
    setConnected(true);
  };




  // Estados de notificaciones
  const [notifications, setNotifications] = useState([]);

  // Estados de espejo
  const [mirrorMode, setMirrorMode] = useState(() => {
    const saved = localStorage.getItem("mirrorMode");
    return saved ? JSON.parse(saved) : true;
  });

  // Estados de balance
  const [userBalance, setUserBalance] = useState(0);        // Balance de COINS (monedas)
  const [remainingMinutes, setRemainingMinutes] = useState(0);

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
    userBalance: giftBalance,
    loading: giftLoading,
    acceptGift,
    rejectGift,
    loadGifts,
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

  // Usar heartbeat
  useVideoChatHeartbeat(roomName, 'cliente');

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
      senderRole: newMessage.senderRole || 'modelo'
    };
    
    setMessages(prev => [formattedMessage, ...prev]);
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

  const handleUserLoadedFromChat = (user) => {
    console.log('📥 Usuario recibido desde SimpleChat:', user);
    updateOtherUser(user);
  };

  // 🔥 FUNCIÓN PARA ACTUALIZAR BALANCE
 const updateBalance = async () => {
  try {
    const authToken = sessionStorage.getItem('token');
    if (!authToken) return;

    // 1️⃣ OBTENER BALANCE DE COINS (monedas generales)
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
        setUserBalance(coinsData.total_coins);      // Balance de COINS
        setRemainingMinutes(coinsData.remaining_minutes);
      }
    }

    // 2️⃣ OBTENER BALANCE DE GIFTS (regalos específicos)
    const giftsResponse = await fetch(`${API_BASE_URL}/api/gifts/my-balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (giftsResponse.ok) {
      const giftsData = await giftsResponse.json();
      if (giftsData.success) {
        setGiftBalance(giftsData.gift_balance);     // Balance de GIFTS
      }
    }

  } catch (error) {
    console.error('Error actualizando balances:', error);
  }
};

  // 🔥 FUNCIONES DE NAVEGACIÓN MEJORADAS
  const siguientePersona = async () => {
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
      role: 'cliente',
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
      
      // Finalizar sesión de monedas
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
      
      // Notificar al partner
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
      
      // Limpiar datos
      console.log('🧹 [CLIENTE] Limpiando datos...');
      
      const itemsToRemove = [
        'roomName', 'userName', 'currentRoom', 
        'inCall', 'callToken', 'videochatActive'
      ];
      
      itemsToRemove.forEach(item => sessionStorage.removeItem(item));
      
      // Limpiar cache
      if (typeof clearUserCache === 'function') {
        clearUserCache();
      }
      
      // Actualizar heartbeat
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
      
      // Navegar
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
  }, [roomName, otherUser, navigate, setMessages]);

  // 🔥 FUNCIÓN DE DESCONEXIÓN MEJORADA
  const handleModeloDisconnected = (reason = 'stop', customMessage = '') => {
    setLoading(false);
    setConnected(false);
    
    if (reason === 'next' || reason === 'partner_went_next') {
      setModeloWentNext(true);
      setDisconnectionType('next');
      setDisconnectionReason(customMessage || 'La modelo te saltó y fue a la siguiente persona');
    } else if (reason === 'stop' || reason === 'partner_left_session') {
      setModeloDisconnected(true);
      setDisconnectionType('stop');
      setDisconnectionReason(customMessage || 'La modelo se desconectó de la videollamada');
    } else {
      setModeloDisconnected(true);
      setDisconnectionType('left');
      setDisconnectionReason(customMessage || 'La modelo salió de la sesión');
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
        siguientePersona();
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
    
    return "Esperando modelo...";
  };

  // 🔥 FUNCIÓN PARA ACEPTAR REGALO (CLIENTE)
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
            
            // ✅ MENSAJE MEJORADO CON DATOS COMPLETOS
            const giftMessage = {
                id: Date.now(),
                type: 'gift_sent',
                text: `🎁 Enviaste: ${result.giftInfo?.name}`,
                timestamp: Date.now(),
                isOld: false,
                sender: userData.name,
                senderRole: userData.role,
                // 🔥 DATOS COMPLETOS DEL REGALO
                gift_data: {
                    gift_name: result.giftInfo?.name,
                    gift_image: result.giftInfo?.image,
                    gift_price: result.giftInfo?.price || result.giftInfo?.amount,
                    action_text: "Enviaste",
                    recipient_name: otherUser?.name || "Modelo"  // ← NOMBRE DEL RECEPTOR
                },
                extra_data: {
                    gift_name: result.giftInfo?.name,
                    gift_image: result.giftInfo?.image,
                    gift_price: result.giftInfo?.price || result.giftInfo?.amount,
                    action_text: "Enviaste",
                    recipient_name: otherUser?.name || "Modelo"  // ← NOMBRE DEL RECEPTOR
                }
            };
            setMessages(prev => [giftMessage, ...prev]);
            
            // Actualizar balance
            updateBalance();
            
            return { success: true };
        } else {
            console.error('❌ [CLIENTE] Error aceptando regalo:', result.error);
            addNotification('error', 'Error', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('❌ [CLIENTE] Error de conexión:', error);
        addNotification('error', 'Error', 'Error de conexión');
        return { success: false, error: 'Error de conexión' };
    } finally {
        setProcessingGift(null);
    }
  }

  // 🔥 FUNCIÓN PARA RECHAZAR REGALO (CLIENTE)
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
        addNotification('error', 'Error', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ [CLIENTE] Error de conexión:', error);
      addNotification('error', 'Error', 'Error de conexión');
      return { success: false, error: 'Error de conexión' };
    }
  };
 
  const loadDevices = async () => {
  setIsLoadingDevices(true);
  try {
    console.log('🎥 Cargando dispositivos disponibles...');
    
    // Solicitar permisos primero
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    
    // Obtener lista de dispositivos
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log('📱 Dispositivos encontrados:', devices.length);
    
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const audioDevices = devices.filter(device => device.kind === 'audioinput');
    
    setCameras(videoDevices);
    setMicrophones(audioDevices);
    
    console.log('🎥 Cámaras:', videoDevices.length);
    console.log('🎤 Micrófonos:', audioDevices.length);
    
    // Establecer dispositivos seleccionados actuales
    if (videoDevices.length > 0 && !selectedCameraDevice) {
      const defaultCamera = selectedCamera || videoDevices[0].deviceId;
      setSelectedCameraDevice(defaultCamera);
      console.log('🎥 Cámara por defecto:', defaultCamera);
    }
    
    if (audioDevices.length > 0 && !selectedMicrophoneDevice) {
      const defaultMic = selectedMic || audioDevices[0].deviceId;
      setSelectedMicrophoneDevice(defaultMic);
      console.log('🎤 Micrófono por defecto:', defaultMic);
    }
    
    // Cerrar el stream temporal
    stream.getTracks().forEach(track => track.stop());
    
  } catch (error) {
    console.error('❌ Error obteniendo dispositivos:', error);
    addNotification('error', 'Error', 'No se pudieron obtener los dispositivos de audio/video');
  } finally {
    setIsLoadingDevices(false);
  }
};

const handleCameraChange = (deviceId) => {
  console.log('🎥 [SYNC] Seleccionando cámara:', deviceId);
  
  // Solo actualizar el estado, el cambio real lo hace el useEffect
  setSelectedCameraDevice(deviceId);
};

// 2️⃣ REEMPLAZAR handleMicrophoneChange - VERSION SINCRONIZADA  
const handleMicrophoneChange = (deviceId) => {
  console.log('🎤 [SYNC] Seleccionando micrófono:', deviceId);
  
  // Solo actualizar el estado, el cambio real lo hace el useEffect
  setSelectedMicrophoneDevice(deviceId);
};

// 3️⃣ AGREGAR useEffect PARA CAMBIO REAL DE CÁMARA
useEffect(() => {
  if (!selectedCameraDevice || !room?.localParticipant || !cameraEnabled) {
    console.log('🎥 [EFFECT] Condiciones no cumplidas para cámara');
    return;
  }

  const changeCameraDevice = async () => {
    try {
      console.log('🎥 [EFFECT] Cambiando cámara a:', selectedCameraDevice);
      
      const localParticipant = room.localParticipant;
      
      // Detener cámara actual
      const currentVideoTrack = localParticipant.getTrackPublication('camera')?.track;
      if (currentVideoTrack) {
        console.log('🛑 [EFFECT] Deteniendo cámara actual...');
        currentVideoTrack.stop();
        await localParticipant.unpublishTrack(currentVideoTrack);
      }

      // Crear nueva cámara
      console.log('🎬 [EFFECT] Creando stream con deviceId:', selectedCameraDevice);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: selectedCameraDevice },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('📤 [EFFECT] Publicando nueva cámara...');
        await localParticipant.publishTrack(videoTrack, {
          name: 'camera',
          source: 'camera'
        });
        
        console.log('✅ [EFFECT] Cámara cambiada exitosamente');
        addNotification('success', 'Cámara Cambiada', 'Dispositivo actualizado');
        
        // Re-aplicar espejo
        setTimeout(() => {
          console.log('🪞 [EFFECT] Aplicando espejo...');
          applyMirrorToAllVideos(mirrorMode);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ [EFFECT] Error cambiando cámara:', error);
      addNotification('error', 'Error', `Error: ${error.message}`);
    }
  };

  // Pequeño delay para evitar llamadas muy rápidas
  const timer = setTimeout(changeCameraDevice, 200);
  return () => clearTimeout(timer);

}, [selectedCameraDevice, room, cameraEnabled, mirrorMode]); // ← DEPENDENCIAS

// 4️⃣ AGREGAR useEffect PARA CAMBIO REAL DE MICRÓFONO
useEffect(() => {
  if (!selectedMicrophoneDevice || !room?.localParticipant || !micEnabled) {
    console.log('🎤 [EFFECT] Condiciones no cumplidas para micrófono');
    return;
  }

  const changeMicrophoneDevice = async () => {
    try {
      console.log('🎤 [EFFECT] Cambiando micrófono a:', selectedMicrophoneDevice);
      
      const localParticipant = room.localParticipant;
      
      // Detener micrófono actual
      const currentAudioTrack = localParticipant.getTrackPublication('microphone')?.track;
      if (currentAudioTrack) {
        console.log('🛑 [EFFECT] Deteniendo micrófono actual...');
        currentAudioTrack.stop();
        await localParticipant.unpublishTrack(currentAudioTrack);
      }

      // Crear nuevo micrófono
      console.log('🎙️ [EFFECT] Creando stream con deviceId:', selectedMicrophoneDevice);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId: { exact: selectedMicrophoneDevice },
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        console.log('📤 [EFFECT] Publicando nuevo micrófono...');
        await localParticipant.publishTrack(audioTrack, {
          name: 'microphone',
          source: 'microphone'
        });
        
        console.log('✅ [EFFECT] Micrófono cambiado exitosamente');
        addNotification('success', 'Micrófono Cambiado', 'Dispositivo actualizado');
      }
    } catch (error) {
      console.error('❌ [EFFECT] Error cambiando micrófono:', error);
      addNotification('error', 'Error', `Error: ${error.message}`);
    }
  };

  // Pequeño delay para evitar llamadas muy rápidas
  const timer = setTimeout(changeMicrophoneDevice, 200);
  return () => clearTimeout(timer);

}, [selectedMicrophoneDevice, room, micEnabled]); // ← DEPENDENCIAS

// 4️⃣ EFECTO PARA CARGAR DISPOSITIVOS INICIALMENTE (agregar después de otros useEffect)
useEffect(() => {
  // Cargar dispositivos cuando el componente se monta
  loadDevices();
  
  // Listener para detectar cambios en dispositivos
  const handleDeviceChange = () => {
    console.log('🔄 Dispositivos cambiaron, recargando...');
    setTimeout(() => loadDevices(), 1000);
  };
  
  navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
  
  return () => {
    navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  };
}, []);

// 5️⃣ EFECTO PARA CONFIGURAR ROOM INSTANCE (agregar después del efecto anterior)
useEffect(() => {
  // Listener global para establecer la instancia de room
  const handleRoomReady = (event) => {
    if (event.detail && event.detail.room) {
      console.log('🏠 Room instancia recibida desde LiveKit');
      setRoom(event.detail.room);
    }
  };
  
  // Escuchar evento personalizado
  window.addEventListener('livekitRoomReady', handleRoomReady);
  
  // También verificar si ya existe globalmente
  if (window.livekitRoom && !room) {
    console.log('🏠 Room encontrada globalmente');
    setRoom(window.livekitRoom);
  }
  
  return () => {
    window.removeEventListener('livekitRoomReady', handleRoomReady);
  };
}, [room]);

// 6️⃣ EFECTO PARA APLICAR CONFIGURACIONES CUANDO CAMBIA LA ROOM (agregar después del efecto anterior)
useEffect(() => {
  if (room && connected) {
    console.log('🔧 Room conectada, configurando dispositivos...');
    
    // Pequeño delay para asegurar que todo esté listo
    setTimeout(() => {
      // Re-aplicar dispositivos seleccionados
      if (selectedCameraDevice && cameraEnabled) {
        handleCameraChange(selectedCameraDevice);
      }
      
      if (selectedMicrophoneDevice && micEnabled) {
        handleMicrophoneChange(selectedMicrophoneDevice);
      }
      
      // Re-aplicar modo espejo
      applyMirrorToAllVideos(mirrorMode);
    }, 2000);
  }
}, [room, connected]);
    // 🔥 FUNCIÓN PARA ENVIAR REGALO DIRECTAMENTE (CLIENTE)
  const handleSendGift = async (giftId, recipientId, roomName, message) => {
    try {
      console.log('🎁 [CLIENTE] Enviando regalo directamente:', {
        giftId,
        recipientId,
        roomName,
        message,
        userBalance
      });

      const authToken = sessionStorage.getItem('token');
      if (!authToken) {
        throw new Error('No hay token de autenticación');
      }

      // 🔥 ENVIAR REGALO DIRECTAMENTE AL ENDPOINT
      const response = await fetch(`${API_BASE_URL}/api/gifts/send-direct`, {
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
          sender_type: 'cliente'  // Especificar que es un cliente
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ [CLIENTE] Regalo enviado exitosamente:', result);
        
        // 🔥 ACTUALIZAR SALDO LOCAL INMEDIATAMENTE
        const giftPrice = result.gift_price || result.amount || 0;
        setUserBalance(prev => Math.max(0, prev - giftPrice));
        
        // 🔥 AGREGAR MENSAJE AL CHAT CON DATOS COMPLETOS
        const giftMessage = {
          id: Date.now(),
          type: 'gift_sent',
          text: `🎁 Enviaste: ${result.gift_name}`,
          timestamp: Date.now(),
          isOld: false,
          sender: userData.name,
          senderRole: userData.role,
          // 🔥 DATOS COMPLETOS DEL REGALO
          gift_data: {
            gift_name: result.gift_name,
            gift_image: result.gift_image,
            gift_price: giftPrice,
            action_text: "Enviaste",
            recipient_name: otherUser?.name || "Modelo"
          },
          extra_data: {
            gift_name: result.gift_name,
            gift_image: result.gift_image,
            gift_price: giftPrice,
            action_text: "Enviaste",
            recipient_name: otherUser?.name || "Modelo"
          }
        };
        
        setMessages(prev => [giftMessage, ...prev]);
        
        // 🔥 ACTUALIZAR BALANCE DESDE SERVIDOR (VERIFICACIÓN)
        setTimeout(() => {
          updateBalance();
        }, 1000);
        
        // 🔥 NOTIFICACIÓN DE ÉXITO
        addNotification(
          'success', 
          '🎁 Regalo Enviado', 
          `${result.gift_name} enviado a ${otherUser?.name || 'Modelo'}`
        );
        
        return { 
          success: true, 
          gift_name: result.gift_name,
          gift_price: giftPrice
        };
        
      } else {
        console.error('❌ [CLIENTE] Error del servidor:', result.error);
        
        // 🔥 MANEJO DE ERRORES ESPECÍFICOS
        if (result.error?.includes('saldo insuficiente') || result.error?.includes('insufficient balance')) {
          addNotification('error', 'Saldo Insuficiente', 'No tienes suficientes monedas para este regalo');
        } else if (result.error?.includes('no encontrado') || result.error?.includes('not found')) {
          addNotification('error', 'Regalo No Disponible', 'Este regalo ya no está disponible');
        } else {
          addNotification('error', 'Error', result.error || 'Error enviando regalo');
        }
        
        return { 
          success: false, 
          error: result.error || 'Error desconocido' 
        };
      }
      
    } catch (error) {
      console.error('❌ [CLIENTE] Error de conexión enviando regalo:', error);
      
      addNotification('error', 'Error de Conexión', 'No se pudo enviar el regalo. Verifica tu conexión.');
      
      return { 
        success: false, 
        error: 'Error de conexión' 
      };
    }
  };

  // 🔥 FUNCIÓN DE RATE LIMITING
  const handleRateLimit = useCallback((error, context = 'general') => {
    if (error?.response?.status === 429) {
      console.warn(`⚠️ Rate limit detectado en VideoChat CLIENTE (${context})`);
      
      navigate('/rate-limit-wait', {
        state: {
          message: `Servidor ocupado en videochat cliente, reintentando...`,
          waitTime: 12000,
          fallbackRoute: "/homecliente",
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
    addNotification('success', 'Conectado', 'Conexión establecida exitosamente');
  };

  const handleRoomDisconnected = () => {
    setConnected(false);
    addNotification('warning', 'Desconectado', 'Se perdió la conexión');
  };

  // 🔥 MANEJO DE TECLAS
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      enviarMensaje();
    }
  };

  // 🔥 EFECTOS DE INICIALIZACIÓN

  // Efecto para cargar usuario
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getUser(false);
        const name = user.alias || user.name || user.username || "";
        const role = user.rol || user.role || "cliente";
        
        setUserData({ name, role, id: user.id });
        
        // Cargar balance inicial
        updateBalance();
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
  useEffect(() => {
  const loadAvailableGifts = async () => {
    try {
      const authToken = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/gifts/available`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setAvailableGifts(data.gifts);
        console.log('🎁 Regalos disponibles cargados:', data.gifts.length);
      }
    } catch (error) {
      console.error('Error cargando regalos:', error);
    }
  };
  
  if (userData.id) {
    loadAvailableGifts();
  }
  }, [userData.id]);

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

        console.log("🎥 CLIENTE - Obteniendo token para:", {
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
        console.log("✅ CLIENTE - Token obtenido exitosamente");

        if (isMounted) {
          setToken(data.token);
          setServerUrl(data.serverUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ CLIENTE - Error al obtener token:', err);
        
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
      console.log('🎉 [VIDEOCHAT CLIENTE] ¡Usuario encontrado! Quitando loading...', {
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

  // Efecto para notificaciones de regalo
  useEffect(() => {
    if (pendingRequests.length > 0 && userData.role === 'cliente') {
      setShowGiftNotification(true);
      console.log('🎁 [CLIENTE] Mostrando notificación de regalo:', pendingRequests[0]);
    } else {
      setShowGiftNotification(false);
    }
  }, [pendingRequests, userData.role]);

  // Efecto para notificaciones
  useEffect(() => {
    if (!roomName || !userName || !connected) {
      return;
    }

    console.log('🔔 [CLIENTE] Iniciando polling de notificaciones');

    let isPolling = true;
    let pollInterval = 3000;
    let consecutiveEmpty = 0;

    const checkNotifications = async () => {
      if (!isPolling) return;

      try {
        const authToken = sessionStorage.getItem('token');
        if (!authToken) {
          console.warn('⚠️ [CLIENTE] No hay token - deteniendo polling');
          return;
        }

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
            console.log('📨 [CLIENTE] Notificación recibida:', notification.type);
            
            isPolling = false;
            
            if (notification.type === 'partner_went_next') {
              console.log('🔄 [CLIENTE] Modelo fue a siguiente - mostrando mensaje');
              
              handleModeloDisconnected('next', 'La modelo fue a la siguiente persona');
              
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
              
              setTimeout(() => {
                navigate(`/usersearch?${urlParams}`, { replace: true });
              }, 3000);
            }
            
            if (notification.type === 'partner_left_session') {
              console.log('🛑 [CLIENTE] Modelo terminó sesión - mostrando mensaje');
              
              handleModeloDisconnected('stop', 'La modelo finalizó la videollamada');
              
              setTimeout(() => {
                setReceivedNotification(true);
                clearUserCache();
                
                sessionStorage.removeItem('roomName');
                sessionStorage.removeItem('userName');
                sessionStorage.removeItem('currentRoom');
                sessionStorage.removeItem('inCall');
                sessionStorage.removeItem('videochatActive');
                
                startSearching();
                
                const urlParams = new URLSearchParams({
                  role: 'cliente',
                  from: 'model_stopped_session',
                  action: 'find_new_model',
                  reason: 'previous_model_left',
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
        console.log('⚠️ [CLIENTE] Error en polling:', error);
      }
      
      if (isPolling) {
        setTimeout(checkNotifications, pollInterval);
      }
    };

    checkNotifications();

    return () => {
      console.log('🛑 [CLIENTE] Deteniendo polling de notificaciones');
      isPolling = false;
    };
  }, [roomName, userName, connected, navigate, selectedCamera, selectedMic]);

  // Efecto para monitoreo de balance automático
  useEffect(() => {
    if (roomName && connected && !isMonitoringBalance) {
      console.log('🟢 [CLIENTE] Iniciando monitoreo de saldo...');
      setIsMonitoringBalance(true);
    } else if ((!roomName || !connected) && isMonitoringBalance) {
      console.log('🔴 [CLIENTE] Deteniendo monitoreo de saldo...');
      setIsMonitoringBalance(false);
    }
  }, [roomName, connected, isMonitoringBalance]);

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

        // Actualizar estados
        setUserBalance(totalCoins);
        setRemainingMinutes(remainingMinutes);
        
        // Verificar condición de finalización
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

    // Iniciar verificación inmediata
    timeoutId = setTimeout(() => {
      if (isActive && isMonitoringBalance) {
        executeBalanceCheck();
        
        // Luego establecer intervalo regular
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
  }, [isMonitoringBalance, finalizarChat]);

  // Efecto para timer legacy
  useEffect(() => {
    const intervalo = setInterval(() => setTiempo((prev) => prev + 1), 1000);
    
    return () => {
      clearInterval(intervalo);
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

  // 🔥 RENDER CONDICIONAL PARA ESTADOS DE DESCONEXIÓN
  if (modeloDisconnected || modeloWentNext) {
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
    <ProtectedPage requiredConditions={{
      emailVerified: true,
      profileComplete: true,
      role: "cliente",
      requiresCallToken: true
    }}>
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white">
        {/* Sistema de notificaciones */}
        <NotificationSystemImprovedClient
          notifications={notifications}
          onRemove={removeNotification}
        />
        
        {/* Modal de regalos */}
        <GiftsModal
          isOpen={showGiftsModal}
          onClose={() => setShowGiftsModal(false)}
          recipientName={otherUser?.name}
          recipientId={otherUser?.id}
          roomName={roomName}
          userRole="cliente"           // ← Cambiar a 'cliente'
          gifts={availableGifts}
          onSendGift={handleSendGift}  // ← Nueva función para enviar
          userBalance={userBalance}    // ← Saldo actual
        />

        {/* Overlay de notificación de regalo */}
        <GiftNotificationOverlay
          pendingRequests={pendingRequests}
          onAccept={handleAcceptGift}
          onReject={handleRejectGift}
          onClose={() => setShowGiftNotification(false)}
          isVisible={showGiftNotification && userData.role === 'cliente'}
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
                  onClick={() => navigate('/precallclient')}
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
            <RoomCapture onRoomReady={handleRoomReady} />

            
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
            <MediaControlsImprovedClient 
              micEnabled={micEnabled}
              cameraEnabled={cameraEnabled}
              setMicEnabled={setMicEnabled}
              setCameraEnabled={setCameraEnabled}
            />
            
            <div className="p-2 sm:p-4">
              <Header />
              
              {/* Tiempo/Balance mejorado - visible entre header y cámara */}
              <TimeDisplayImprovedClient
                connected={connected}
                otherUser={otherUser}
                roomName={roomName}
                userBalance={userBalance}
                giftBalance={giftBalance}           // Balance de GIFTS  
                remainingMinutes={remainingMinutes}
                t={t}
              />
              
                {/* MÓVIL - Video adaptativo entre tiempo y chat */}
                <div className="lg:hidden bg-[#1f2125] rounded-2xl overflow-hidden relative mt-4" 
                    style={{height: 'calc(100vh - 360px)'}}>                
                <VideoDisplayImprovedClient
                  onCameraSwitch={cambiarCamara}
                  mainCamera={camaraPrincipal}
                  connected={connected}
                  hadRemoteParticipant={otherUser !== null}
                  otherUser={otherUser}
                  isDetectingUser={isDetectingUser}
                  t={t}
                />
                
                {/* Mensajes flotantes mejorados */}
                <FloatingMessagesImprovedClient
                  messages={messages}
                  userData={userData}
                  userBalance={userBalance}
                  handleAcceptGift={handleAcceptGift}
                  handleRejectGift={handleRejectGift}
                  t={t}
                />
                
                {/* Controles móviles mejorados para cliente */}
                <MobileControlsImprovedClient
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
                volumeEnabled={volumeEnabled}          // ← NUEVA
                setVolumeEnabled={setVolumeEnabled}    // ← NUEVA
                onCameraSwitch={onCameraSwitch}
                onEndCall={finalizarChat}
                siguientePersona={siguientePersona}
                finalizarChat={finalizarChat}
                userBalance={userBalance}
                giftBalance={giftBalance}
                cameras={cameras}
                microphones={microphones}
                selectedCamera={selectedCameraDevice}
                selectedMicrophone={selectedMicrophoneDevice}
                isLoadingDevices={isLoadingDevices}
                onCameraChange={handleCameraChange}
                onMicrophoneChange={handleMicrophoneChange}
                onLoadDevices={loadDevices}
                
                // 🔥 AGREGAR ESTAS 2 PROPS PARA CONFIGURACIÓN:
                showMainSettings={showMainSettings}     // ← NUEVA
                setShowMainSettings={setShowMainSettings} // ← NUEVA
              />
              </div>
              
              
              {/* DESKTOP - Layout principal */}
              <div className="hidden lg:flex flex-col lg:flex-row lg:gap-6 mx-4">
                {/* ZONA VIDEO */}
                <div className="flex-1 bg-[#1f2125] rounded-xl lg:rounded-2xl overflow-hidden relative flex items-center justify-center h-[500px]">
                  <VideoDisplayImprovedClient 
                    onCameraSwitch={cambiarCamara}
                    mainCamera={camaraPrincipal}
                    connected={connected}
                    hadRemoteParticipant={otherUser !== null}
                    otherUser={otherUser}
                    isDetectingUser={isDetectingUser}
                    t={t}
                  />
                </div>
                
                {/* PANEL DERECHO - Desktop para Cliente */}
                <DesktopChatPanelClient
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
                  userBalance={userBalance}
                  giftBalance={giftBalance}           // Balance de GIFTS  
                  handleAcceptGift={handleAcceptGift}
                  handleRejectGift={handleRejectGift}
                  t={t}
                />
              </div>
              
              {/* CONTROLES PRINCIPALES MEJORADOS PARA CLIENTE */}
              <DesktopControlsImprovedClient
                micEnabled={micEnabled}
                setMicEnabled={setMicEnabled}
                cameraEnabled={cameraEnabled}
                setCameraEnabled={setCameraEnabled}
                volumeEnabled={volumeEnabled}
                setVolumeEnabled={setVolumeEnabled}
                siguientePersona={siguientePersona}
                finalizarChat={finalizarChat}
                showMainSettings={showMainSettings}
                setShowMainSettings={setShowMainSettings}
                loading={loading}
                t={t}
                // 🔥 NUEVAS PROPS PARA DISPOSITIVOS
                cameras={cameras}
                microphones={microphones}
                selectedCamera={selectedCameraDevice}
                selectedMicrophone={selectedMicrophoneDevice}
                isLoadingDevices={isLoadingDevices}
                onCameraChange={handleCameraChange}
                onMicrophoneChange={handleMicrophoneChange}
                onLoadDevices={loadDevices}
              />
            </div>
          </LiveKitRoom>
        )}
      </div>
    </ProtectedPage>
  );
}
