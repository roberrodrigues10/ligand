import React, { useState, useEffect } from "react";
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
  Square, // Para el botón de Stop
} from "lucide-react";
import Header from "./header";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
        // Mostrar video local en grande (la modelo se ve a sí misma)
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
        // Mostrar video remoto en grande (ve al cliente) - VISTA POR DEFECTO
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

    // Fallback cuando no hay video
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white p-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="animate-pulse text-4xl sm:text-6xl mb-4">👩‍💼</div>
          <p className="text-lg sm:text-xl mb-2">Vista de la Modelo</p>
          <div className="space-y-2 text-xs sm:text-sm">
            <p className="text-green-400">
              ✅ Conectada al servidor LiveKit
            </p>
            <p className="text-gray-400">
              👥 Participantes: {participants.length}
            </p>
            {localParticipant && (
              <p className="text-blue-400">
                🟦 Tú (Modelo): {localParticipant.identity}
              </p>
            )}
            {remoteParticipant && (
              <p className="text-pink-400">
                🟪 Cliente: {remoteParticipant.identity}
              </p>
            )}
            {!remoteParticipant && participants.length === 1 && (
              <p className="text-yellow-400">
                ⏳ Esperando que se conecte el cliente...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getMiniVideo = () => {
    try {
      if (mainCamera === "local" && remoteParticipant) {
        // Mostrar video remoto en mini
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
        // Mostrar video local en mini
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
      {/* Mini video responsive - CORREGIDO */}
      <div
        className="absolute top-4 right-2 w-20 h-28 lg:bottom-4 lg:left-4 lg:top-auto lg:right-auto lg:w-40 lg:h-28 rounded-lg overflow-hidden border-2 border-[#ff007a] shadow-lg cursor-pointer transition-all hover:scale-105"
        onClick={onCameraSwitch}
      >
        {getMiniVideo()}
        
        {/* Indicador en mini - CORREGIDO */}
        <div className="absolute top-0.5 left-0.5 right-0.5 bg-black/80 px-1 py-0.5 rounded text-[8px] text-white text-center truncate">
          {mainCamera === "local" ? "CLIENTE" : "YO"}
        </div>
      </div>
    </>
  );
};

// ✅ COMPONENTE PARA MENSAJES FLOTANTES - CORREGIDO
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

export default function VideoChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Estado para el panel lateral en móvil
  const [showSidePanel, setShowSidePanel] = useState(false);
  
  // 🔥 AGREGAR ESTE useEffect DESPUÉS DE const navigate = useNavigate();
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const roomName = sessionStorage.getItem('roomName');
    
    if (token && roomName) {
      // Función que se ejecuta constantemente
      const enforceVideoChat = () => {
        const current = window.location.pathname;
        const blocked = ['/homellamadas', '/esperando', '/mensajes', '/favorites', '/historysu', '/esperandocall', '/configuracion', '/home', '/'];
        
        if (blocked.includes(current)) {
          // FUERZA el cambio inmediato
          window.stop();
          window.location.href = '/videochat';
        }
      };
      
      // Ejecutar cada 25ms para ser súper agresivo
      const aggressive = setInterval(enforceVideoChat, 25);
      
      return () => clearInterval(aggressive);
    }
  }, []);
  
  // Obtener info del modelo de la ruleta
  const modelo = location.state?.modelo;

  // Mejorar la función getParam con más debugging
  const getParam = (key) => {
    const stateValue = location.state?.[key];
    const sessionValue = sessionStorage.getItem(key);
    const urlValue = searchParams.get(key);
    
    return stateValue || sessionValue || urlValue;
  };

  const roomName = getParam("roomName");
  const userName = getParam("userName");

  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  
  // ✅ ESTADOS PARA CONTROLES
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  
  // ✅ ESTADOS PARA MENSAJES Y CHAT
  const [camaraPrincipal, setCamaraPrincipal] = useState("remote");
  const [tiempo, setTiempo] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [mostrarRegalos, setMostrarRegalos] = useState(false);
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

  // Al montar, guarda en sessionStorage si roomName y userName están presentes
  useEffect(() => {
    if (roomName && roomName !== 'null' && roomName !== 'undefined') {
      sessionStorage.setItem("roomName", roomName);
    }
    if (userName && userName !== 'null' && userName !== 'undefined') {
      sessionStorage.setItem("userName", userName);
    }
  }, [roomName, userName]);

  // Obtiene el token
  useEffect(() => {
    const getToken = async () => {
      try {
        if (!roomName || !userName || roomName.trim() === '' || userName.trim() === '') {
          throw new Error(`Parámetros inválidos - roomName: "${roomName}", userName: "${userName}"`);
        }

        console.log("🎥 MODELO - Obteniendo token para:", { roomName, userName });

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

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorData = await response.text();
          console.error("Error response:", errorData);
          throw new Error(`Error ${response.status}: ${errorData}`);
        }
        
        const data = await response.json();
        console.log("✅ MODELO - Token obtenido exitosamente");

        setToken(data.token);
        setServerUrl(data.serverUrl);
        setLoading(false);
      } catch (err) {
        console.error('❌ MODELO - Error completo al obtener token:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (!roomName || !userName || 
        roomName === 'null' || userName === 'null' ||
        roomName === 'undefined' || userName === 'undefined' ||
        roomName.trim() === '' || userName.trim() === '') {
      
      console.error("Parámetros faltantes o inválidos:", { roomName, userName });
      setError(`Faltan parámetros de la sala. roomName: "${roomName}", userName: "${userName}"`);
      setLoading(false);
    } else {
      getToken();
    }
  }, [roomName, userName]);

  useEffect(() => {
    const intervalo = setInterval(() => setTiempo((prev) => prev + 1), 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages(prev => prev.map(msg => ({ ...msg, isOld: true })));
    }, 3000);

    return () => clearTimeout(timer);
  }, [messages]);

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

  // 🔥 NUEVA FUNCIÓN: Buscar siguiente persona/sala
  const siguientePersona = async () => {
    try {
      setLoading(true);
      
      // Mostrar mensaje de búsqueda
      const mensajeBusqueda = {
        id: Date.now(),
        type: 'system',
        text: '🔄 Buscando siguiente persona...',
        timestamp: Date.now(),
        isOld: false
      };
      setMessages(prev => [...prev, mensajeBusqueda]);

      // Simular búsqueda (aquí irías a buscar una nueva sala/usuario)
      // Por ahora, simplemente reiniciamos con una nueva sala
      const authToken = sessionStorage.getItem('token');
      
      // Llamar a tu API para obtener una nueva sala
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
        
        // Actualizar con nueva sala
        sessionStorage.setItem("roomName", data.newRoomName);
        
        // Recargar el componente con nueva sala
        window.location.reload();
      } else {
        throw new Error('No se encontraron más usuarios disponibles');
      }
      
    } catch (error) {
      console.error('Error al buscar siguiente persona:', error);
      
      const mensajeError = {
        id: Date.now(),
        type: 'system',
        text: '❌ No se encontraron más usuarios disponibles. Intenta más tarde.',
        timestamp: Date.now(),
        isOld: false
      };
      setMessages(prev => [...prev, mensajeError]);
      
      setLoading(false);
    }
  };

  // 🔥 NUEVA FUNCIÓN: Stop/Finalizar y eliminar sala
  const finalizarLlamada = async () => {
    try {
      console.log("🛑 Finalizando llamada y eliminando sala...");
      
      const authToken = sessionStorage.getItem('token');
      
      // Llamar a tu API para eliminar/finalizar la sala
      await fetch(`${API_BASE_URL}/api/livekit/end-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          roomName: roomName,
          userName: userName 
        }),
      });

      // Limpiar sessionStorage
      sessionStorage.removeItem('roomName');
      sessionStorage.removeItem('userName');
      
      // Navegar de vuelta a la página principal de modelos
      navigate('/precallmodel'); // o la ruta que uses para modelos
      
    } catch (error) {
      console.error('Error al finalizar llamada:', error);
      // Aún así navegar de vuelta
      navigate('/precallmodel');
    }
  };

  // 🔥 DETECTAR CUANDO SE CIERRA LA PESTAÑA/VENTANA
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      // Llamar a la API para limpiar la sala cuando se cierre la pestaña
      const authToken = sessionStorage.getItem('token');
      
      if (authToken && roomName) {
        navigator.sendBeacon(`${API_BASE_URL}/api/livekit/cleanup-room`, 
          JSON.stringify({
            roomName: roomName,
            userName: userName,
            reason: 'tab_closed'
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomName, userName]);

  const enviarMensaje = () => {
    if (mensaje.trim()) {
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
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      enviarMensaje();
    }
  };

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
    >
      <RoomAudioRenderer />
      
      {/* ✅ COMPONENTE PARA CONTROLES */}
      <MediaControls 
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        setMicEnabled={setMicEnabled}
        setCameraEnabled={setCameraEnabled}
      />
      
      <div className="p-2 sm:p-4">
        <Header />

        {/* MÓVIL/TABLET - Video pantalla completa - CORREGIDO */}
        <div className="lg:hidden bg-[#1f2125] rounded-2xl overflow-hidden relative mt-4 h-[80vh]">
          <VideoDisplay onCameraSwitch={cambiarCamara} mainCamera={camaraPrincipal} />
          
          {/* Mensajes flotantes */}
          <FloatingMessages messages={messages} />
          
          {/* Modal de regalos móvil */}
          {mostrarRegalos && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-[#1a1c20]/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl w-[90%] max-w-[300px] max-h-[300px] overflow-y-auto z-50 border border-[#ff007a]/30">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-semibold text-sm">🎁 Regalos Recibidos</h3>
                <button
                  className="text-white/50 hover:text-white text-sm"
                  onClick={() => setMostrarRegalos(false)}
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                    className="bg-[#2b2d31] px-2 py-2 rounded-lg flex flex-col items-center justify-center hover:bg-[#383c44] cursor-pointer transition"
                    onClick={() => setMostrarRegalos(false)}
                  >
                    <span className="text-xs text-white text-center">{regalo.nombre}</span>
                    <span className="text-xs text-[#ff007a] font-bold">
                      +{regalo.valor}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Input de chat móvil - CORREGIDO */}
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

        {/* DESKTOP - Header responsive con información de la llamada */}
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

        {/* DESKTOP - Layout principal responsive */}
        <div className="hidden lg:flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* ZONA VIDEO - Responsive */}
          <div className="flex-1 bg-[#1f2125] rounded-xl lg:rounded-2xl overflow-hidden relative flex items-center justify-center h-[300px] sm:h-[400px] lg:h-[500px] transition-all duration-500">
            <VideoDisplay onCameraSwitch={cambiarCamara} mainCamera={camaraPrincipal} />
          </div>

          {/* PANEL DERECHO - Desktop */}
          <div className="w-[340px] bg-[#1f2125] rounded-2xl flex flex-col justify-between relative">
            {/* Usuario */}
            <div className="flex justify-between items-center p-4 border-b border-[#ff007a]/20">
              <div>
                <p className="font-semibold text-white text-sm sm:text-base">Cliente Conectado</p>
                <p className="text-xs sm:text-sm text-white/60">🌎 Online</p>
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
            <div class="max-h-[300px] p-4 space-y-3 overflow-y-auto custom-scroll">
              {/* ✅ MENSAJE DE CONFIRMACIÓN */}
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-green-400">🎰 Sistema</span>
                <p className="bg-[#1f2937] inline-block px-3 py-2 mt-1 rounded-xl border border-green-400/30 max-w-[280px]">
                  ¡Cliente conectado! Comienza tu show 🎥
                </p>
              </div>
              
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-blue-400">Cliente</span>
                <p className="bg-[#2b2d31] inline-block px-3 py-2 mt-1 rounded-xl max-w-[280px]">¡Hola! ¿Cómo estás?</p>
              </div>
              
              <div className="text-right">
                <p className="bg-[#ff007a] inline-block px-3 py-2 mt-1 rounded-xl text-white max-w-[280px] text-xs sm:text-sm">¡Hola guapo! ¡Muy bien! 😘</p>
              </div>
              
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-purple-400">ℹ️ Sala</span>
                <p className="bg-[#4c1d95]/20 inline-block px-3 py-2 mt-1 rounded-xl border border-purple-400/30 text-purple-200 max-w-[280px] break-all">
                  Sala: {roomName}
                </p>
              </div>

              {/* Mensajes dinámicos */}
              {messages.filter(msg => msg.id > 2).map((msg, index) => (
                <div key={msg.id} className={msg.type === 'local' ? 'text-right' : 'text-xs sm:text-sm'}>
                  {msg.type === 'local' ? (
                    <p className="bg-[#ff007a] inline-block px-3 py-2 mt-1 rounded-xl text-white max-w-[280px] text-xs sm:text-sm">
                      {msg.text}
                    </p>
                  ) : msg.type === 'system' ? (
                    <>
                      <span className="font-bold text-green-400">🎰 Sistema</span>
                      <p className="bg-[#1f2937] inline-block px-3 py-2 mt-1 rounded-xl border border-green-400/30 max-w-[280px]">
                        {msg.text}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-blue-400">Cliente</span>
                      <p className="bg-[#2b2d31] inline-block px-3 py-2 mt-1 rounded-xl max-w-[280px]">
                        {msg.text}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Regalos overlay responsivo */}
            {mostrarRegalos && (
              <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 bg-[#1a1c20] p-3 sm:p-5 rounded-xl shadow-2xl w-[280px] sm:w-[300px] max-h-[300px] sm:max-h-[360px] overflow-y-auto z-50 border border-[#ff007a]/30">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-semibold text-xs sm:text-sm">🎁 Regalos Recibidos</h3>
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
                    <div key={i} className="bg-[#2b2d31] px-2 sm:px-3 py-2 rounded-xl flex items-center justify-between hover:bg-[#383c44] cursor-pointer transition">
                      <span className="text-xs sm:text-sm text-white">{regalo.nombre}</span>
                      <span className="text-[10px] sm:text-xs text-[#ff007a] font-bold">+{regalo.valor}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
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

        {/* ✅ CONTROLES RESPONSIVOS - ACTUALIZADOS */}
        <div className="flex justify-center items-center gap-4 sm:gap-6 lg:gap-10 mt-4 lg:mt-6 px-4">
          {/* Botón Micrófono */}
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

          {/* Botón Cámara */}
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

          {/* 🔥 BOTÓN SIGUIENTE PERSONA - ACTUALIZADO */}
          <button
            className="bg-blue-500 hover:bg-blue-600 p-3 sm:p-4 rounded-full transition"
            onClick={siguientePersona}
            title="Siguiente persona"
            disabled={loading}
          >
            <SkipForward size={18} className="lg:hidden" />
            <SkipForward size={22} className="hidden lg:block" />
          </button>

          {/* 🔥 BOTÓN STOP/FINALIZAR - ACTUALIZADO */}
          <button 
            className="bg-red-500 hover:bg-red-600 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-white text-sm sm:text-base lg:text-lg font-semibold transition flex items-center gap-2"
            onClick={finalizarLlamada}
            title="Finalizar y eliminar sala"
          >
            <Square size={16} className="lg:hidden" />
            <Square size={18} className="hidden lg:block" />
            <span className="lg:hidden">Stop</span>
            <span className="hidden lg:inline">🛑 Finalizar</span>
          </button>
        </div>
      </div>
    </LiveKitRoom>
  );
}

// ✅ COMPONENTE PARA CONTROLAR MEDIA
const MediaControls = ({ micEnabled, cameraEnabled, setMicEnabled, setCameraEnabled }) => {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (localParticipant) {
      // Controlar micrófono
      localParticipant.setMicrophoneEnabled(micEnabled);
    }
  }, [micEnabled, localParticipant]);

  useEffect(() => {
    if (localParticipant) {
      // Controlar cámara
      localParticipant.setCameraEnabled(cameraEnabled);
    }
  }, [cameraEnabled, localParticipant]);

  return null; // Componente invisible, solo para lógica
};