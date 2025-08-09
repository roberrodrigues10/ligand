    import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
    import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
    import { useTranslation } from 'react-i18next';  
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
    import Header from "./header";
    import SimpleChat from "./messages";
    import { getUser } from "../utils/auth";
    import { useSessionCleanup } from './closesession';
    import { 
      useTranslation as useCustomTranslation, 
      TranslationSettings, 
      TranslatedMessage 
    } from '../utils/translationSystem.jsx';
    import CameraAudioSettings from '../utils/cameraaudiosettings.jsx';
    import ClientRemainingMinutes  from './ClientRemainingMinutes.jsx';
    import { useSearching } from '../contexts/SearchingContext.jsx';
    import { useVideoChatGifts } from '../components/GiftSystem/useVideoChatGifts';
    import { GiftsModal } from '../components/GiftSystem/giftModal.jsx'; 
    import { GiftMessageComponent } from '../components/GiftSystem/GiftMessageComponent.jsx'; 

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // 🔥 CACHE GLOBAL PERSISTENTE
    const USER_CACHE = new Map();

    // Función para generar clave única de la sala
    const getRoomCacheKey = (roomName, currentUserName) => {
      return `${roomName}_${currentUserName}`;
    };

    // ✅ COMPONENTE CON VIDEO REAL PARA LA MODELO - RESPONSIVE
      const VideoDisplay = ({ onCameraSwitch, mainCamera, connected, hadRemoteParticipant }) => {
      const participants = useParticipants();
      const localParticipant = participants.find(p => p.isLocal);
      const remoteParticipant = participants.find(p => !p.isLocal);
      const { t } = useTranslation();
      
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

        // 🔥 FUNCIÓN PARA DETERMINAR EL ESTADO DE CONEXIÓN (FUERA DEL TRY-CATCH)
        const getConnectionStatus = () => {

          if (participants.length === 1 && localParticipant && !remoteParticipant && !hadRemoteParticipant) {
            return {
              icon: '👤',
              title: 'Esperando cliente',
              message: 'Sala lista para recibir cliente',
              submessage: 'Esperando conexión...',
              bgColor: 'bg-blue-600/20',
              borderColor: 'border-blue-500/40',
              textColor: 'text-blue-200',
              submessageColor: 'text-blue-300'
            };
          }
          
          // Estado 2: Ya había un cliente y ahora no está - DESCONEXIÓN
          return {
            icon: '⚠️',
            title: 'Esperando conexión',
            message: 'Puede que el usuario te haya saltado o se desconectó',
            submessage: 'Verificando en tiempo real...',
            bgColor: 'bg-yellow-600/20',
            borderColor: 'border-yellow-500/40',
            textColor: 'text-yellow-200',
            submessageColor: 'text-yellow-300'
          };
        };

        const status = getConnectionStatus();

        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white p-4">
            <div className="text-center max-w-sm mx-auto">
              <div className="animate-pulse text-4xl sm:text-6xl mb-4">{status.icon}</div>
              <p className="text-lg sm:text-xl mb-2">{status.title}</p>
              <div className={`${status.bgColor} border ${status.borderColor} rounded-xl p-4 mt-4`}>
                <p className={`${status.textColor} text-sm text-center`}>
                  {status.message}
                  <br />
                  <span className={`text-xs ${status.submessageColor}`}>{status.submessage}</span>
                </p>
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
    const FloatingMessages = ({ messages, translationSettings }) => {
    return (
      <div className="lg:hidden absolute top-4 left-2 right-2 max-h-[82%] overflow-y-auto z-10 flex flex-col-reverse space-y-2 space-y-reverse">
        {messages.map((msg, index) => (
          <div
            key={msg.id || index}
            className={`
              transition-opacity duration-300
              ${msg.isOld ? 'opacity-30' : 'opacity-100'}
              flex ${msg.type === 'local' ? 'justify-end' : 'justify-start'}
            `}
          >
            {msg.type === 'system' ? (
              <div className="backdrop-blur-sm rounded-lg p-2 border border-green-400/30 max-w-[70%] w-fit break-words text-xs">
                {msg.text}
              </div>
            ) : msg.type === 'local' ? (
              <div className="backdrop-blur-sm rounded-lg p-2 border border-[#ff007a] max-w-[70%] w-fit bg-[#ff007a] text-white text-xs break-words">
                <TranslatedMessage 
                  message={msg} 
                  settings={translationSettings}
                  className="text-white"
                />
              </div>
            ) : (
              <div className="backdrop-blur-sm rounded-lg p-2 border-blue-400/30 max-w-[70%] w-fit text-xs break-words whitespace-pre-line text-white">
                <TranslatedMessage 
                  message={msg} 
                  settings={translationSettings}
                  className="text-white"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
    const applyMirrorToAllVideos = (shouldMirror) => {
      console.log('🪞 Aplicando espejo global en videochat:', shouldMirror);
      
      // Selectores específicos para LiveKit
      const selectors = [
        '[data-lk-participant-video]', // Videos principales de LiveKit
        'video[data-participant="local"]', // Videos locales
        '.lk-participant-tile video', // Videos en tiles
        '.lk-video-track video', // Videos en tracks
        'video[autoplay][muted]', // Videos de preview
        'video[class*="object-cover"]', // Videos con clases de objeto
        '.VideoTrack video', // Videos del componente VideoTrack
        '[class*="VideoDisplay"] video' // Videos en el componente VideoDisplay
      ];
      
      selectors.forEach(selector => {
        const videos = document.querySelectorAll(selector);
        videos.forEach(video => {
          if (video && video.style) {
            video.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
            video.style.webkitTransform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
            
            // Agregar clase para identificar videos con espejo
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
      
      // También aplicar a contenedores padre
      const parentSelectors = [
        '[data-lk-participant]',
        '.lk-participant-tile',
        '.participant-container'
      ];
      
      parentSelectors.forEach(selector => {
        const containers = document.querySelectorAll(selector);
        containers.forEach(container => {
          const videos = container.querySelectorAll('video');
          videos.forEach(video => {
            if (video && video.style) {
              video.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
              video.style.webkitTransform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
            }
          });
        });
      });
    };

    // Observer para videos que se crean dinámicamente
    let mirrorObserver = null;

    const setupMirrorObserver = (shouldMirror) => {
      // Limpiar observer anterior
      if (mirrorObserver) {
        mirrorObserver.disconnect();
      }
      
      mirrorObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Solo elementos
              // Si el nodo agregado es un video
              if (node.tagName === 'VIDEO') {
                node.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
                node.style.webkitTransform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
              }
              
              // Si el nodo contiene videos
              const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
              videos.forEach(video => {
                video.style.transform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
                video.style.webkitTransform = shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
              });
            }
          });
        });
      });
      
      // Observar todo el documento
      mirrorObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    };


    // 🔥 COMPONENTE PRINCIPAL COMPLETAMENTE CORREGIDO
    export default function VideoChat() {
      const location = useLocation();
      const navigate = useNavigate();
      const [searchParams] = useSearchParams();
      const { t } = useTranslation();
      

      // 🔥 HOOK DE SEARCHING CONTEXT
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

      const [isBlocking, setIsBlocking] = useState(false);
      const [isAddingFavorite, setIsAddingFavorite] = useState(false);
      const [isFavorite, setIsFavorite] = useState(false);
      const [showCameraAudioModal, setShowCameraAudioModal] = useState(false);
      const [clientDisconnected, setClientDisconnected] = useState(false);
      const [clientWentNext, setClientWentNext] = useState(false);
      const [disconnectionReason, setDisconnectionReason] = useState('');
      const [disconnectionType, setDisconnectionType] = useState(''); // 'stop', 'next', 'left'
      const [redirectCountdown, setRedirectCountdown] = useState(0);
      const [showClientBalance, setShowClientBalance] = useState(true);
      const [showGiftsModal, setShowGiftsModal] = useState(false);
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
      const [room, setRoom] = useState(null);
      const [modeloStoppedWorking, setModeloStoppedWorking] = useState(false);
      const [receivedNotification, setReceivedNotification] = useState(false);
      const [isProcessingLeave, setIsProcessingLeave] = useState(false);

      // Estados para controles
      const [micEnabled, setMicEnabled] = useState(true);
      const [cameraEnabled, setCameraEnabled] = useState(true);
      
      // Estados para UI
      const [camaraPrincipal, setCamaraPrincipal] = useState("remote");
      const [tiempo, setTiempo] = useState(0);
      const [tiempoReal, setTiempoReal] = useState(0); // ✅ Inicializar siempre en 0
      const tiempoInicioRef = useRef(null);
      const tiempoGuardadoRef = useRef(0);     
      const tiempoIntervalRef = useRef(null);
      const [mensaje, setMensaje] = useState("");
      const [mostrarRegalos, setMostrarRegalos] = useState(false);
      const [showSidePanel, setShowSidePanel] = useState(false);
      const { finalizarSesion, limpiarDatosSession } = useSessionCleanup(roomName, connected);
      const [messages, setMessages] = useState([]);
      const [isSendingMessage, setIsSendingMessage] = useState(false); // 🔥 AGREGAR ESTA LÍNEA

      const [isDetectingUser, setIsDetectingUser] = useState(() => {
        if (!roomName || !userName) return false;
        const cacheKey = getRoomCacheKey(roomName, userName);
        const hasCache = USER_CACHE.has(cacheKey);
        console.log('🔍 Estado inicial de detección:', !hasCache);
        return !hasCache;
      });
      
      // 🔥 HEARTBEAT PERSONALIZADO
      useEffect(() => {
        if (!roomName || modeloStoppedWorking) {
          console.log('🛑 [HOOK] useVideoChatHeartbeat detenido por modeloStoppedWorking');
          return;
        }

        console.log('🚀 [HOOK] Iniciando useVideoChatHeartbeat personalizado');
        
        // Heartbeat inicial
        sendHeartbeat('videochat');

        const interval = setInterval(() => {
          if (modeloStoppedWorking) {
            console.log('🛑 [HOOK] Deteniendo interval por modeloStoppedWorking');
            clearInterval(interval);
            return;
          }
          sendHeartbeat('videochat');
        }, 15000);

        return () => {
          console.log('🧹 [HOOK] Cleanup useVideoChatHeartbeat');
          clearInterval(interval);
          if (!modeloStoppedWorking) {
            sendHeartbeat('browsing');
          }
        };
      }, [roomName, modeloStoppedWorking]);
      
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

      const [chatFunctions, setChatFunctions] = useState(null);
      const messagesContainerRef = useRef(null);

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
        checkIfFavorite(user.id); // Verificar si es favorito cuando se carga

        
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

          const handleClientDisconnected = (reason = 'stop', customMessage = '') => {
            console.log('🛑 Cliente se desconectó:', reason);
            
            // Detener loading normal
            setLoading(false);
            setConnected(false);
            console.log('🛑 [DEBUG] Estados después:', { 
              loading: false, 
              clientDisconnected: reason !== 'next',
              clientWentNext: reason === 'next' 
            });
            
            if (reason === 'next' || reason === 'partner_went_next') {
              setClientWentNext(true);
              setDisconnectionType('next');
              setDisconnectionReason(customMessage || 'El usuario te saltó y fue a la siguiente persona');
            } else if (reason === 'stop' || reason === 'partner_left_session') {
              setClientDisconnected(true);
              setDisconnectionType('stop');
              setDisconnectionReason(customMessage || 'El usuario se desconectó de la videollamada');
            } else if (reason === 'left' || reason === 'client_left') {
              setClientDisconnected(true);
              setDisconnectionType('left');
              setDisconnectionReason(customMessage || 'El usuario salió de la sesión');
            } else {
              setClientDisconnected(true);
              setDisconnectionType('unknown');
              setDisconnectionReason(customMessage || 'El usuario finalizó la sesión');
            }
            
            // Iniciar countdown para redirección
            startRedirectCountdown();
              return isFavorite ? `⭐ ${name}` : name;
          };

  // 🔥 FUNCIÓN PARA COUNTDOWN DE REDIRECCIÓN
      const startRedirectCountdown = () => {
        let timeLeft = 3; // 3 segundos
        setRedirectCountdown(timeLeft);
        
        const countdownInterval = setInterval(() => {
          timeLeft--;
          setRedirectCountdown(timeLeft);
          
          if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            // La redirección ya se maneja en los useEffect existentes
          }
        }, 1000);
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
      // 🔥 REEMPLAZAR ESTA FUNCIÓN
      const formatoTiempo = () => {
        const minutos = Math.floor(tiempoReal / 60).toString().padStart(2, "0");
        const segundos = (tiempoReal % 60).toString().padStart(2, "0");
        return `${minutos}:${segundos}`;
      };
      const iniciarTiempoReal = () => {
        console.log('⏱️ Iniciando contador de tiempo real');

        // Limpiar cualquier contador anterior
        if (tiempoIntervalRef.current) {
          clearInterval(tiempoIntervalRef.current);
          tiempoIntervalRef.current = null;
        }

        // Establecer tiempo de inicio
        tiempoInicioRef.current = Date.now();
        setTiempoReal(0); // Empezar siempre en 0

        console.log('⏱️ Contador iniciado desde 0');
        
        // Iniciar contador limpio
        tiempoIntervalRef.current = setInterval(() => {
          const tiempoTranscurrido = Math.floor((Date.now() - tiempoInicioRef.current) / 1000);
          setTiempoReal(tiempoTranscurrido);
        }, 1000);
      };

        const detenerTiempoReal = () => {
          if (tiempoIntervalRef.current) {
            clearInterval(tiempoIntervalRef.current);
            tiempoIntervalRef.current = null;
            
            // Calcular tiempo final exacto
            const tiempoFinal = tiempoInicioRef.current ? 
              Math.floor((Date.now() - tiempoInicioRef.current) / 1000) : tiempoReal;
            
            // 🔥 VALIDACIÓN ADICIONAL
            if (tiempoFinal <= 0) {
              console.warn('⚠️ Tiempo final <= 0, usando tiempo actual:', tiempoReal);
              const tiempoSeguro = Math.max(tiempoReal, 30); // Mínimo 30 segundos
              console.log(`⏹️ Tiempo final seguro: ${tiempoSeguro}s`);
              setTiempoReal(tiempoSeguro);
              return tiempoSeguro;
            }
            
            console.log(`⏹️ Tiempo final: ${tiempoFinal}s (${Math.floor(tiempoFinal/60)}:${(tiempoFinal%60).toString().padStart(2, '0')})`);
            
            setTiempoReal(tiempoFinal);
            return tiempoFinal;
          }
          
          // Si no hay interval, usar tiempo actual
          const tiempoActual = Math.max(tiempoReal, 30);
          console.log(`⏹️ Sin interval activo, usando tiempo actual: ${tiempoActual}s`);
          return tiempoActual;
        };
      const enviarTiempoReal = async (sessionId, tiempoEspecifico = null) => {
        // Obtener tiempo exacto
        let tiempoAEnviar;
        
        if (tiempoEspecifico !== null) {
          tiempoAEnviar = tiempoEspecifico;
        } else if (tiempoInicioRef.current) {
          tiempoAEnviar = Math.floor((Date.now() - tiempoInicioRef.current) / 1000);
        } else {
          tiempoAEnviar = tiempoReal;
        }
        
        // 🔥 VALIDACIÓN MEJORADA
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
          minutos: (tiempoAEnviar / 60).toFixed(2),
          origen: tiempoEspecifico !== null ? 'especifico' : tiempoInicioRef.current ? 'calculado' : 'actual'
        });

        try {
          const token = sessionStorage.getItem('token');
          if (!token) {
            console.error('❌ No hay token de autenticación');
            return;
          }

          // 🔥 CONFIGURACIÓN PARA PRUEBAS
          const TEST_MODE = false; // ⚠️ CAMBIAR A false PARA USAR TIEMPO REAL
          const TEST_DURATION = 3600; // 1 hora = 3600 segundos para pruebas
          
          const requestBody = {
            session_id: sessionId,
            duration_seconds: TEST_MODE ? TEST_DURATION : tiempoAEnviar
          };

          console.log(`📤 MODO: ${TEST_MODE ? 'PRUEBA (1 hora fija)' : 'PRODUCCIÓN (tiempo real)'}`);
          console.log('📋 Datos enviados:', requestBody);

          const response = await fetch(`${API_BASE_URL}/api/earnings/update-duration`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          console.log('📡 Response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status, errorText);
            return;
          }

          const data = await response.json();
          console.log('📥 Response data:', data);

          if (data.success) {
            const timeUsed = TEST_MODE ? TEST_DURATION : tiempoAEnviar;
            console.log(`✅ Tiempo enviado exitosamente: ${Math.floor(timeUsed/60)}:${(timeUsed%60).toString().padStart(2, '0')}`);
            console.log('💰 Ganancias calculadas:', data.model_earnings || 'N/A');
            console.log(`🔧 Duración: ${data.duration_formatted || 'N/A'}`);
            console.log(`⭐ Califica: ${data.qualifying ? 'SÍ' : 'NO'}`);
          } else {
            console.error('❌ Error del servidor:', data.error);
          }
        } catch (error) {
          console.error('❌ Error enviando tiempo:', error);
        }
      };
      const cambiarCamara = () => {
        setCamaraPrincipal(prev => prev === "remote" ? "local" : "remote");
      };
      const toggleMirrorMode = useCallback(() => {
    const newMirrorMode = !mirrorMode;
    setMirrorMode(newMirrorMode);
    localStorage.setItem("mirrorMode", JSON.stringify(newMirrorMode));
    
    // Aplicar inmediatamente a todos los videos
    applyMirrorToAllVideos(newMirrorMode);
    setupMirrorObserver(newMirrorMode);
    
    console.log('🪞 Espejo cambiado a:', newMirrorMode);
      }, [mirrorMode]);

  // Función para forzar aplicar espejo
  const forceApplyMirror = useCallback(() => {
    console.log('🔄 Forzando aplicación de espejo:', mirrorMode);
    applyMirrorToAllVideos(mirrorMode);
    setupMirrorObserver(mirrorMode);
  }, [mirrorMode]);

  // 5. AGREGAR ESTOS USEEFFECTS después de los existentes

  // Cargar estado del espejo al inicializar
  useEffect(() => {
    const savedMirrorMode = localStorage.getItem("mirrorMode");
    const shouldMirror = savedMirrorMode ? JSON.parse(savedMirrorMode) : true;
    
    setMirrorMode(shouldMirror);
    
    // Aplicar al cargar (con delay para que los videos estén listos)
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

  // Aplicar espejo cuando esté conectado y tenga participantes
  useEffect(() => {
    if (connected && token) {
      const timer = setTimeout(() => {
        console.log('🔄 Aplicando espejo después de conexión');
        applyMirrorToAllVideos(mirrorMode);
        setupMirrorObserver(mirrorMode);
      }, 3000); // 3 segundos para asegurar que LiveKit esté listo
      
      return () => clearTimeout(timer);
    }
  }, [connected, token, mirrorMode]);

  // Re-aplicar espejo cuando cambien los participantes o tracks
  useEffect(() => {
    if (chatFunctions && chatFunctions.participantsCount > 0) {
      const timer = setTimeout(() => {
        console.log('🔄 Re-aplicando espejo por cambio de participantes');
        forceApplyMirror();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [chatFunctions?.participantsCount, forceApplyMirror]);

      const handleRoomConnected = () => {
        console.log("🟢 MODELO - Conectada a LiveKit!");
        setConnected(true);
        iniciarTiempoReal();
      };
      
      const handleRoomDisconnected = () => {
        console.log("🔴 MODELO - Desconectada de LiveKit");
        setConnected(false);
        detenerTiempoReal();
      };

      const enviarMensaje = async () => {
    if (mensaje.trim() && !isSendingMessage) {
      setIsSendingMessage(true);
      console.log('🚀 Intentando enviar mensaje:', mensaje.trim());
      
      const messageToSend = mensaje.trim();
      
      // Enviar mensaje original al chat
      if (chatFunctions?.sendMessage) {
        console.log('📡 Llamando a chatFunctions.sendMessage...');
        const success = chatFunctions.sendMessage(messageToSend);
        
        if (success) {
          // Crear mensaje local con formato correcto
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
          console.log('✅ Mensaje enviado y guardado localmente');
        }
      } else {
        // Fallback si no hay chatFunctions
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
        console.log('✅ Mensaje guardado localmente (modo fallback)');
      }
      
      setIsSendingMessage(false);
    }
      };

      // 3. 🔧 USEEFFECT PARA TRADUCIR MENSAJES AUTOMÁTICAMENTE
      // ⭐ AGREGAR ESTE USEEFFECT DESPUÉS DE LA LÍNEA 403:

      useEffect(() => {
        // Procesar mensajes para traducción automática
        const processMessagesForTranslation = async () => {
          if (!translationSettings?.enabled) return;        
          for (const message of messages) {
            if (!message.processed) {
              try {
                const result = await translateMessage(message);
                if (result) {
                  console.log(`✅ Mensaje traducido: "${message.text}" → "${result.translated}"`);
                  // Marcar como procesado para evitar re-traducir
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

      // ✅ FUNCIÓN handleMessageReceived (mantener igual, solo agregar log)
      const handleMessageReceived = (newMessage) => {
        console.log('🎯 handleMessageReceived llamado con:', newMessage);
        console.log('🔍 [DEBUG] Translation settings enabled:', translationSettings.enabled);
        
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
      // Función para bloquear usuario
      const blockCurrentUser = async () => {
        if (!otherUser?.id || isBlocking) {
          console.log('❌ No hay usuario para bloquear o ya está bloqueando');
          return;
        }

        const reason = prompt(`¿Por qué quieres bloquear a ${otherUser.name}?`, '');
        if (reason === null) return; // Usuario canceló

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
            console.log('✅ Usuario bloqueado exitosamente');
            
            // Mensaje de confirmación
            const blockMessage = {
              id: Date.now(),
              type: 'system',
              text: `Has bloqueado a ${otherUser.name}`,
              timestamp: Date.now(),
              isOld: false
            };
            setMessages(prev => [blockMessage, ...prev]);

            // Ir automáticamente al siguiente usuario
            setTimeout(() => {
              siguientePersona();
            }, 1500);
          } else {
            alert('Error: ' + data.error);
          }
        } catch (error) {
          console.error('❌ Error bloqueando usuario:', error);
          alert('Error de conexión');
        } finally {
          setIsBlocking(false);
        }
      };
      // Función para agregar/remover favoritos
      const toggleFavorite = async () => {
        if (!otherUser?.id || isAddingFavorite) {
          console.log('❌ No hay usuario para favoritos o ya está procesando');
          return;
        }

        setIsAddingFavorite(true);

        try {
          const authToken = sessionStorage.getItem('token');
          
          if (isFavorite) {
            // Remover de favoritos
            const response = await fetch(`${API_BASE_URL}/api/favorites/remove`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                favorite_user_id: otherUser.id
              })
            });

            const data = await response.json();
            if (data.success) {
              setIsFavorite(false);
              console.log('✅ Removido de favoritos');
            } else {
              alert('Error: ' + data.error);
            }
          } else {
            // Agregar a favoritos
            const note = prompt(`Agregar una nota sobre ${otherUser.name} (opcional):`, '') || '';
            
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
              console.log('✅ Agregado a favoritos');
              
              // Mensaje de confirmación
              const favMessage = {
                id: Date.now(),
                type: 'system',
                text: `Has agregado a ${otherUser.name} a favoritos ⭐`,
                timestamp: Date.now(),
                isOld: false
              };
              setMessages(prev => [favMessage, ...prev]);
            } else {
              alert('Error: ' + data.error);
            }
          }
        } catch (error) {
          console.error('❌ Error con favorito:', error);
          alert('Error de conexión');
        } finally {
          setIsAddingFavorite(false);
        }
      };

      // Verificar si usuario es favorito cuando se carga
      const checkIfFavorite = async (userId) => {
        try {
          const authToken = sessionStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/favorites/list`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            }
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

      const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
          enviarMensaje();
        }
      };

      // 🔥 FUNCIÓN SIGUIENTE PERSONA - NAVEGACIÓN INSTANTÁNEA
    const siguientePersona = async () => {
    console.log('🔄 Siguiente persona iniciado');
    
    const tiempoFinalSesion = detenerTiempoReal();

    // 🔥 CORRECCIÓN: Enviar con roomName como sessionId
    if (roomName && tiempoFinalSesion > 0) {
      console.log('📤 Enviando tiempo final siguiente:', {
        sessionId: roomName,
        tiempoSegundos: tiempoFinalSesion
      });
      
      try {
        await enviarTiempoReal(roomName, tiempoFinalSesion);
        console.log('✅ Tiempo enviado exitosamente al siguiente');
      } catch (error) {
        console.error('❌ Error enviando tiempo al siguiente:', error);
      }
    } else {
      console.warn('⚠️ No se envió tiempo - datos faltantes:', {
        roomName,
        tiempoFinalSesion
      });
    }
    
    // Limpiar referencias
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
    const finalizarChat = useCallback(async () => {
    console.log('🛑 [MODELO] Stop presionado - NAVEGACIÓN INMEDIATA');
    
    // Detener contador y obtener tiempo final
    const tiempoFinalSesion = detenerTiempoReal();
    
    // 🔥 CORRECCIÓN: Enviar tiempo con mejor logging
    if (roomName && tiempoFinalSesion > 0) {
      console.log('📤 Enviando tiempo final stop:', {
        sessionId: roomName,
        tiempoSegundos: tiempoFinalSesion,
        tiempoFormateado: `${Math.floor(tiempoFinalSesion/60)}:${(tiempoFinalSesion%60).toString().padStart(2, '0')}`
      });
      
      try {
        await enviarTiempoReal(roomName, tiempoFinalSesion);
        console.log('✅ Tiempo enviado exitosamente al finalizar');
      } catch (error) {
        console.error('❌ Error enviando tiempo al finalizar:', error);
      }
    } else {
      console.warn('⚠️ No se envió tiempo al finalizar - datos faltantes:', {
        roomName,
        tiempoFinalSesion
      });
    }
    
    // Limpiar referencias
    tiempoInicioRef.current = null;
    setTiempoReal(0);

  
      
      setTimeout(() => {
        console.log('💰 Ganancias procesadas');
      }, 2000);
      
      // Resto del código igual...
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
      
      setModeloStoppedWorking(true);
      setReceivedNotification(true);
      clearUserCache();
      
      sessionStorage.removeItem('roomName');
      sessionStorage.removeItem('userName');
      sessionStorage.removeItem('currentRoom');
      sessionStorage.removeItem('inCall');
      
      navigate('/homellamadas', { replace: true });
    }, [roomName, userName, otherUser, navigate, isProcessingLeave]);

    useEffect(() => {
      return () => {
        // Limpieza al desmontar componente
        if (tiempoIntervalRef.current) {
          clearInterval(tiempoIntervalRef.current);
          tiempoIntervalRef.current = null;
        }
        tiempoInicioRef.current = null;
      };
    }, []);

    // 🔥 FUNCIÓN sendHeartbeat CORREGIDA - VIDEOCHAT.JSX (MODELO)
    const sendHeartbeat = async (activityType = 'videochat') => {
      try {
        // 🔥 VERIFICAR FLAG ANTES DE ENVIAR
        if (modeloStoppedWorking && activityType === 'videochat') {
          console.log('🛑 [MODELO] Heartbeat videochat bloqueado por flag de stop');
          return;
        }

        const authToken = sessionStorage.getItem('token');
        if (!authToken) return;

        // 🔥 FIRE-AND-FORGET - SIN AWAIT, SIN MANEJO DE ERRORES
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
        }).catch(() => {}); // 🔥 Ignorar errores completamente

        console.log(`💓 [VIDEOCHAT] Heartbeat enviado: ${activityType}`);
      } catch (error) {
        // 🔥 NO HACER NADA - CONTINUAR SIN HEARTBEAT
        console.log('⚠️ [VIDEOCHAT] Error enviando heartbeat (ignorado):', error);
      }
    };

  // 🔥 USEEFFECT DEL HEARTBEAT CORREGIDO - VIDEOCHAT.JSX (MODELO)
  useEffect(() => {
    if (!roomName || modeloStoppedWorking) {
      console.log('🛑 [HOOK] useVideoChatHeartbeat detenido por modeloStoppedWorking');
      return;
    }

    console.log('🚀 [HOOK] Iniciando useVideoChatHeartbeat personalizado');
    
    // 🔥 HEARTBEAT INICIAL FIRE-AND-FORGET
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
      }).catch(() => {}); // 🔥 Ignorar errores
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
        }).catch(() => {}); // 🔥 Ignorar errores
      }
    }, 15000); // 15 segundos

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
          }).catch(() => {}); // 🔥 Ignorar errores
        }
      }
    };
  }, [roomName, modeloStoppedWorking]);



      useEffect(() => {
        if (!roomName || !userName || !connected || modeloStoppedWorking) {
          return;
        }

        console.log('🔔 [MODELO] Iniciando polling de notificaciones');

        let isPolling = true;
        let pollInterval = 3000; // 3 segundos
        let consecutiveEmpty = 0;

        const checkNotifications = async () => {
          if (!isPolling || modeloStoppedWorking) return;

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
                return; // Continuar polling sin detenerse
              }


            if (response.ok) {
              const data = await response.json();
              
              if (data.success && data.has_notifications) {
                consecutiveEmpty = 0;
                const notification = data.notification;
                console.log('📨 [MODELO] Notificación recibida:', notification.type);
                
                // Detener polling al recibir notificación
                isPolling = false;
                
                if (notification.type === 'partner_went_next') {
                  console.log('🔄 [MODELO] Cliente fue a siguiente - mostrando mensaje');
                  
                  // 🔥 MOSTRAR MENSAJE ESPECÍFICO INMEDIATAMENTE
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
                  
                  // 🔥 DELAY PARA MOSTRAR EL MENSAJE (3 segundos)
                  setTimeout(() => {
                    navigate(`/usersearch?${urlParams}`, { replace: true });
                  }, 3000);
                }
                
              // 🔥 AGREGAR ESTA LÓGICA FALTANTE:

              if (notification.type === 'partner_left_session') {
                console.log('🛑 [MODELO] Cliente terminó sesión - mostrando mensaje');
                
                // 🔥 MOSTRAR MENSAJE ESPECÍFICO INMEDIATAMENTE
                handleClientDisconnected('stop', 'El cliente finalizó la videollamada');
                
                // 🔥 AGREGAR UN PEQUEÑO DELAY ANTES DE LIMPIAR
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
                  
                  // 🔥 DELAY PARA MOSTRAR EL MENSAJE (3 segundos)
                  setTimeout(() => {
                    navigate(`/usersearch?${urlParams}`, { replace: true });
                  }, 3000);
                }, 100); // 🔥 100ms de delay para que se actualice el render
              }
                
              } else {
                consecutiveEmpty++;
                // Aumentar intervalo si no hay notificaciones
                if (consecutiveEmpty >= 3) {
                  pollInterval = Math.min(pollInterval + 1000, 8000); // Max 8s
                }
              }
            }
          } catch (error) {
            console.log('⚠️ [MODELO] Error en polling:', error);
          }

          // Programar siguiente verificación
          if (isPolling && !modeloStoppedWorking) {
            setTimeout(checkNotifications, pollInterval);
          }
        };

        // Iniciar polling
        checkNotifications();

        return () => {
          console.log('🛑 [MODELO] Deteniendo polling de notificaciones');
          isPolling = false;
        };
      }, [roomName, userName, connected, modeloStoppedWorking, navigate, selectedCamera, selectedMic]);


      // 🔥 DETENER heartbeats cuando modelo para de trabajar
      useEffect(() => {
        if (modeloStoppedWorking) {
          console.log('🛑 [MODELO] Modelo paró - deteniendo todos los heartbeats');
          
          // Enviar heartbeat final de "browsing" y luego detener
          const finalHeartbeat = async () => {
            try {
              await sendHeartbeat('browsing');
              console.log('✅ [MODELO] Heartbeat final enviado');
            } catch (error) {
              console.log('⚠️ [MODELO] Error en heartbeat final:', error);
            }
          };
          
          finalHeartbeat();
          return;
        }
      }, [modeloStoppedWorking]);
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

      // 🔥 SSE CONNECTION CON MEJOR MANEJO DE ERRORES
      useEffect(() => {
        if (!userData.id || !roomName) return;

        let eventSource = null;
        let reconnectTimer = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 3;

        const connectSSE = () => {
          console.log(`📡 [MODELO] Conectando SSE (intento ${reconnectAttempts + 1})`);
          
          const authToken = sessionStorage.getItem('token');
          if (!authToken) {
            console.error('❌ [MODELO] No se encontró token de autenticación');
            return;
          }
          
          eventSource = new EventSource(
            `${API_BASE_URL}/api/notifications/${userData.id}?token=${encodeURIComponent(authToken)}`,
            { withCredentials: false }
          );
          
          // 🚀 TIMEOUT PARA SSE
          const sseTimeout = setTimeout(() => {
            console.warn('⏰ [MODELO] SSE timeout - cerrando conexión');
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          }, 10000);
          
          eventSource.onopen = () => {
            console.log('✅ [MODELO] SSE conectado exitosamente');
            clearTimeout(sseTimeout);
            reconnectAttempts = 0;
          };

          eventSource.onmessage = (event) => {
            clearTimeout(sseTimeout);
            try {
              const data = JSON.parse(event.data);
              console.log('📨 [MODELO] Notificación SSE recibida:', data);
              
              if (data.type === 'connected') {
                console.log('🔗 [MODELO] Confirmación de conexión SSE');
                return;
              }
              
              if (data.type === 'client_left') {
                console.log(`👤 [MODELO] Cliente se fue via SSE - mostrando mensaje`);
                
                // 🔥 MOSTRAR MENSAJE ESPECÍFICO INMEDIATAMENTE
                handleClientDisconnected('left', 'El cliente se desconectó inesperadamente');
                
                if (eventSource) {
                  eventSource.close();
                  eventSource = null;
                }
                
                const urlParams = new URLSearchParams({
                  role: 'modelo',
                  currentRoom: roomName,
                  userName: userName,
                  selectedCamera: selectedCamera || '',
                  selectedMic: selectedMic || '',
                  ...data.data?.redirect_params
                });
                
                console.log('🧭 [MODELO] Navegando via SSE con delay');
                // 🔥 DELAY PARA MOSTRAR EL MENSAJE (3 segundos)
                setTimeout(() => {
                  navigate(`/usersearch?${urlParams}`, { replace: true });
                }, 3000);
              }
            } catch (error) {
              console.error('❌ [MODELO] Error procesando notificación SSE:', error);
            }
          };

          eventSource.onerror = (error) => {
            console.error('❌ [MODELO] Error SSE:', error);
            clearTimeout(sseTimeout);
            
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            
            // 🚀 RECONEXIÓN MÁS RÁPIDA O FALLAR
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              const delay = 1000 * reconnectAttempts;
              console.log(`🔄 [MODELO] Reconectando SSE en ${delay}ms... (${reconnectAttempts}/${maxReconnectAttempts})`);
              
              reconnectTimer = setTimeout(() => {
                connectSSE();
              }, delay);
            } else {
              console.error('❌ [MODELO] Max intentos SSE alcanzados - continuando sin SSE');
            }
          };
        };

        connectSSE();

        return () => {
          console.log('🔌 [MODELO] Cerrando SSE');
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
        };
      }, [userData.id, roomName, navigate, userName, selectedCamera, selectedMic]);
            
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

      // Memoized values
      const memoizedRoomName = useMemo(() => {
        const room = getParam("roomName");
        return room && room !== 'null' && room !== 'undefined' ? room : null;
      }, [location.state, searchParams]);

      const memoizedUserName = useMemo(() => {
        const user = getParam("userName");
        return user && user !== 'null' && user !== 'undefined' ? user : null;
      }, [location.state, searchParams]);

      // 🔥 FIX: Obtener token con rate limiting protection
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

      // 🔥 RESETEAR FLAG AL CAMBIAR DE SALA
      // 🔥 RESETEAR FLAGS Y ESTADOS AL CAMBIAR DE SALA
      useEffect(() => {
        setModeloStoppedWorking(false);
        setReceivedNotification(false);
        // 🔥 RESET ESTADOS DE DESCONEXIÓN
        setClientDisconnected(false);
        setClientWentNext(false);
        setDisconnectionReason('');
        setDisconnectionType('');
        setRedirectCountdown(0);
      }, [roomName]);

      // Timer
      useEffect(() => {
        // Mantener el timer legacy para compatibilidad
        const intervalo = setInterval(() => setTiempo((prev) => prev + 1), 1000);
        
        return () => {
          clearInterval(intervalo);
          // 🔥 LIMPIAR TIEMPO REAL AL DESMONTAR
          if (tiempoIntervalRef.current) {
            clearInterval(tiempoIntervalRef.current);
          }
        };
      }, []);
      
      useEffect(() => {
        if (otherUser?.id) {
          checkIfFavorite(otherUser.id);
        } else {
          setIsFavorite(false);
        }
      }, [otherUser?.id]);

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
       // 🎁 FUNCIÓN PARA SOLICITAR REGALO (MODELO)
      const handleRequestGift = async (giftId, recipientId, roomName, message) => {
        console.log('🎁 [MODELO] Solicitando regalo:', {
          giftId,
          recipientId,
          roomName,
          message
        });

    try {
      const result = await requestGift(giftId, message);
      
      if (result.success) {
        console.log('✅ [MODELO] Regalo solicitado exitosamente');
        
        // Agregar mensaje al chat local
        if (result.chatMessage) {
          setMessages(prev => [result.chatMessage, ...prev]);
        }
        
        // Mostrar notificación
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

      // Estados de carga y error
  // 🔥 SOLO MOSTRAR LOADING SI NO HAY DESCONEXIÓN Y REALMENTE ESTÁ LOADING
      if ((loading && !clientDisconnected && !clientWentNext) || clientDisconnected || clientWentNext) {
          console.log('🖼️ [RENDER DEBUG]:', {
          loading,
          clientDisconnected,
          clientWentNext,
          disconnectionType,
          disconnectionReason,
          shouldShowDisconnection: clientDisconnected || clientWentNext,
          willShowLoading: loading && !clientDisconnected && !clientWentNext
        });

        return (
          <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="text-center max-w-sm mx-auto">
              
              {/* SOLO MOSTRAR DESCONEXIÓN SI HAY DESCONEXIÓN */}
              {(clientDisconnected || clientWentNext) && (
                <div className="space-y-6">
                  {/* 🔥 AGREGAR LOG AQUÍ TAMBIÉN */}
                  {console.log('🖼️ [RENDER] Mostrando mensaje de desconexión:', disconnectionType)}
                  
                  {/* Icono según el tipo de desconexión */}
                  <div className="text-8xl mb-4">
                    {disconnectionType === 'next' ? '⏭️' : 
                    disconnectionType === 'stop' ? '🛑' : 
                    disconnectionType === 'left' ? '👋' : '💔'}
                  </div>
              
              {/* Mensaje principal */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  {disconnectionType === 'next' ? t('videochat.userSkippedYou') : 
                  disconnectionType === 'stop' ? t('videochat.clientDisconnected') : 
                  disconnectionType === 'left' ? t('videochat.userLeft') : t('videochat.sessionEnded')}
                </h2>
                
                <p className="text-lg text-gray-300">
                  {disconnectionReason}
                </p>
              </div>
              
              {/* Mensaje de acción */}
              <div className="bg-[#1f2125] rounded-xl p-4 border border-[#ff007a]/20">
                <p className="text-sm text-gray-400 mb-2">
                  {t('videochat.dontWorry')}
                </p>
                
                {/* Countdown */}
                {redirectCountdown > 0 && (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff007a]"></div>
                    <span className="text-[#ff007a] font-bold">
                      {t('videochat.redirectingIn', { seconds: redirectCountdown })}
                    </span>
                  </div>
                )}
                
                {redirectCountdown === 0 && (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff007a]"></div>
                    <span className="text-[#ff007a] font-bold">
                      Conectando...
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* LOADING NORMAL - SOLO SI NO HAY DESCONEXIÓN */}
        
          
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
              <VideoDisplay 
                onCameraSwitch={cambiarCamara} 
                mainCamera={camaraPrincipal}
                connected={connected}
                hadRemoteParticipant={otherUser !== null}
              />            
              <FloatingMessages 
                messages={messages} 
                translationSettings={translationSettings} 
              />
              
              {/* Input de chat móvil */}
              <div className="absolute bottom-4 left-2 right-2 z-20">
                <div className="bg-black/70 backdrop-blur-sm rounded-full p-2 flex items-center gap-1 border border-[#ff007a]/20">
                  {/* NUEVOS BOTONES MÓVILES */}
                  <button
                    onClick={toggleFavorite}
                    disabled={isAddingFavorite || !otherUser}
                    className={`
                      p-1 flex-shrink-0 transition disabled:opacity-50
                      ${isFavorite ? 'text-yellow-400' : 'text-gray-400'}
                      ${isAddingFavorite ? 'animate-pulse' : ''}
                    `}
                  >
                    <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  
                  <button
                    onClick={blockCurrentUser}
                    disabled={isBlocking || !otherUser}
                    className={`
                      text-red-400 hover:text-red-300 p-1 flex-shrink-0 transition disabled:opacity-50
                      ${isBlocking ? 'animate-pulse' : ''}
                    `}
                  >
                    <UserX size={16} />
                  </button>
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
            <div className="flex items-center gap-4">
              {/* Tiempo de la llamada */}
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#ff007a]" />
                <span>{t('time.callDuration')}: </span>
                <span className="text-[#ff007a] font-bold">{formatoTiempo()}</span>
              </div>
              
              {/* 🔥 MINUTOS RESTANTES DEL CLIENTE - AL LADO DEL TIEMPO */}
              {otherUser && (
                <ClientRemainingMinutes 
                  roomName={roomName}
                  clientUserId={otherUser.id}
                  connected={connected}
                />
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {connected && (
                <span className="text-green-400 text-xs">🟢 {t('status.online')}</span>
              )}
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
                  </div>
                  <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-green-400" title="Verificado" />
                  {/* 🎁 BOTÓN DE REGALOS PARA MODELO */}
                  <button 
                    onClick={() => setShowGiftsModal(true)}
                    disabled={!otherUser}
                    title="Pedir regalo"
                    className={`
                      hover:scale-110 transition disabled:opacity-50
                      ${!otherUser ? 'text-gray-400' : 'text-[#ff007a] hover:text-pink-300'}
                    `}
                  >
                    <Gift size={16} />
                  </button>
                  {/* Botón de Favorito */}
                  <button 
                    onClick={toggleFavorite}
                    disabled={isAddingFavorite || !otherUser}
                    title={isFavorite ? "Remover de favoritos" : "Agregar a favoritos"}
                    className={`
                      hover:scale-110 transition disabled:opacity-50
                      ${isFavorite ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}
                      ${isAddingFavorite ? 'animate-pulse' : ''}
                    `}
                  >
                    <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  
                  {/* Botón de Bloquear */}
                  <button 
                    onClick={blockCurrentUser}
                    disabled={isBlocking || !otherUser}
                    title="Bloquear usuario"
                    className={`
                      text-red-400 hover:text-red-300 hover:scale-110 transition disabled:opacity-50
                      ${isBlocking ? 'animate-pulse' : ''}
                    `}
                  >
                    <UserX size={16} />
                  </button>
                </div>
                </div>            
                <div 
                  ref={messagesContainerRef}
                  className="max-h-[360px] p-4 space-y-3 overflow-y-auto custom-scroll"
                >
                  {messages.filter(msg => msg.id > 2).reverse().map((msg, index) => (
                    <div key={msg.id}>
                      {/* 🎁 RENDERIZAR MENSAJES DE REGALO */}
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
                          isClient={false}
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
                  {/* 🎁 BOTÓN DE REGALOS EN INPUT */}
                  <button
                    className="text-[#ff007a] hover:text-white transition"
                    onClick={() => setShowGiftsModal(true)}
                    disabled={!otherUser}
                    title="Pedir regalo"
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
                    placeholder={t('chat.respondToClient')}
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