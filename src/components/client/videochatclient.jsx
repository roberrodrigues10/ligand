import React, { useState, useEffect } from "react";
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
  Square, // Para el botón de Stop
} from "lucide-react";
import Header from "./headercliente";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ✅ COMPONENTE CON VIDEO REAL
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
        // Mostrar video local en grande
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
        // Mostrar video remoto en grande
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
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎰</div>
          <p className="text-xl mb-2">Ruleta de Video Chat</p>
          <div className="space-y-2">
            <p className="text-sm text-green-400">
              ✅ Conectado al servidor LiveKit
            </p>
            <p className="text-sm text-gray-400">
              👥 Participantes: {participants.length}
            </p>
            {localParticipant && (
              <p className="text-sm text-blue-400">
                🟦 Tú (Cliente): {localParticipant.identity}
              </p>
            )}
            {remoteParticipant && (
              <p className="text-sm text-pink-400">
                🟪 Conectado: {remoteParticipant.identity}
              </p>
            )}
            {!remoteParticipant && participants.length === 1 && (
              <p className="text-sm text-yellow-400">
                ⏳ Esperando conexión...
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
      <div
        className="absolute bottom-4 left-4 md:bottom-4 md:left-4 top-1 right-4 md:top-auto md:right-auto w-24 h-32 md:w-40 md:h-28 rounded-lg overflow-hidden border-2 border-[#ff007a] shadow-lg cursor-pointer"
        onClick={onCameraSwitch}
      >
        {getMiniVideo()}
      </div>
    </>
  );
};

// ✅ COMPONENTE PARA MENSAJES FLOTANTES
const FloatingMessages = ({ messages, modelo }) => {
  return (
    <div className="md:hidden absolute top-4 left-4 right-4 max-h-[100%] overflow-y-auto z-10 space-y-2">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`transition-opacity duration-300 ${
            msg.isOld ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {msg.type === 'system' ? (
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-green-400/30">
              <span className="font-bold text-green-400 text-sm">🎰 Sistema</span>
              <p className="text-white text-sm mt-1">{msg.text}</p>
            </div>
          ) : msg.type === 'remote' ? (
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
              <span className="font-bold text-white text-sm">
                {modelo?.nombre || 'Usuario'} {modelo?.pais || ''}
              </span>
              <p className="text-white text-sm mt-1">{msg.text}</p>
            </div>
          ) : (
            <div className="flex justify-end">
              <div className="bg-[#ff007a]/80 backdrop-blur-sm rounded-lg p-2 max-w-[70%]">
                <p className="text-white text-sm">{msg.text}</p>
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
  
  // ✅ OBTENER DATOS DE LA RULETA
  const { 
    roomName, 
    userName, 
    selectedCamera, 
    selectedMic, 
    modelo // Info del modelo de la ruleta
  } = location.state || {};
  
  const [tiempo, setTiempo] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [camaraPrincipal, setCamaraPrincipal] = useState("remote");
  const [mostrarRegalos, setMostrarRegalos] = useState(false);
  
  // ✅ ESTADOS PARA CONTROLES
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  
  // Estados para LiveKit
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      text: '¡Conexión establecida! Disfruta tu videochat 🎥',
      timestamp: Date.now(),
      isOld: false
    },
    {
      id: 2,
      type: 'remote',
      text: '¡Hola! ¿Cómo estás? 😊',
      timestamp: Date.now(),
      isOld: false
    }
  ]);

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

  useEffect(() => {
    const getToken = async () => {
      try {
        const authToken = sessionStorage.getItem('token');
        
        if (!authToken) {
          throw new Error('No hay token de autenticación');
        }

        console.log("🎰 CLIENTE - Obteniendo token de LiveKit para:", { roomName, userName });

        const response = await fetch(`${API_BASE_URL}/api/livekit/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            room: roomName,
            identity: userName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Error ${response.status}: ${errorData}`);
        }

        const data = await response.json();
        console.log("✅ CLIENTE - Token de LiveKit obtenido exitosamente");
        
        setToken(data.token);
        setServerUrl(data.serverUrl);
        setLoading(false);
      } catch (err) {
        console.error('❌ CLIENTE - Error getting token:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (roomName && userName) {
      getToken();
    } else {
      setError('Faltan parámetros de la sala - Intenta hacer otra ruleta');
      setLoading(false);
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
    setCamaraPrincipal((prev) => (prev === "remote" ? "local" : "remote"));
  };

  const handleRoomConnected = () => {
    setConnected(true);
    console.log('🟢 CLIENTE - Conectado a la sala LiveKit');
  };

  const handleRoomDisconnected = () => {
    setConnected(false);
    console.log('🔴 CLIENTE - Desconectado de la sala LiveKit');
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
        
        console.log('🎉 CLIENTE - Nueva persona encontrada:', data);
        
        // Recargar el componente con nueva sala
        window.location.reload();
      } else {
        throw new Error('No se encontraron más usuarios disponibles');
      }
      
    } catch (error) {
      console.error('❌ CLIENTE - Error al buscar siguiente persona:', error);
      
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

  // 🔥 NUEVA FUNCIÓN: Stop/Finalizar y salir completamente
  const finalizarChat = async () => {
    try {
      console.log("🛑 CLIENTE - Finalizando chat completamente...");
      
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

      console.log("✅ CLIENTE - Chat finalizado exitosamente");
      
      // Navegar de vuelta a la página principal de clientes
      navigate('/precallclient');
      
    } catch (error) {
      console.error('❌ CLIENTE - Error al finalizar chat:', error);
      // Aún así navegar de vuelta
      navigate('/precallclient');
    }
  };

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
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#ff007a] mx-auto mb-4"></div>
          <p className="text-xl">Conectando a la videollamada...</p>
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
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">Error: {error}</p>
          <div className="space-x-4">
            <button 
              onClick={() => navigate('/precallclient')}
              className="bg-[#ff007a] px-6 py-3 rounded-full text-white"
            >
              🎰 Nueva Ruleta
            </button>
            <button 
              onClick={() => window.history.back()}
              className="bg-gray-600 px-6 py-3 rounded-full text-white"
            >
              Volver
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
      className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white p-4 md:block flex flex-col"
    >
      <RoomAudioRenderer />
      
      {/* ✅ COMPONENTE PARA CONTROLES */}
      <MediaControls 
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        setMicEnabled={setMicEnabled}
        setCameraEnabled={setCameraEnabled}
      />
      
      <Header />

      {/* MÓVIL - Video pantalla completa */}
      <div className="md:hidden flex-1 bg-[#1f2125] rounded-2xl overflow-hidden relative mt-4 mb-4">
        <VideoDisplay 
          onCameraSwitch={cambiarCamara}
          mainCamera={camaraPrincipal}
        />
        
        {/* Mensajes flotantes */}
        <FloatingMessages messages={messages} modelo={modelo} />
        
        {/* Modal de regalos móvil */}
        {mostrarRegalos && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-[#1a1c20]/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl w-[90%] max-w-[300px] max-h-[300px] overflow-y-auto z-50 border border-[#ff007a]/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-semibold text-sm">🎁 Regalos</h3>
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
                    {regalo.valor} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
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

      {/* DESKTOP - Temporizador y minutos restantes */}
      <div className="hidden md:flex justify-between items-center text-sm text-white/70 mt-4 mb-2 font-mono px-2">
        <div>
          ⏱ Tiempo de llamada:{" "}
          <span className="text-[#ff007a] font-bold">{formatoTiempo()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#ff007a]" />
          <span className="text-[#ff007a] font-bold">∞ Tiempo ilimitado</span>
          {connected && (
            <span className="text-green-400 text-xs ml-2">🟢 Conectado</span>
          )}
          <span className="text-blue-400 text-xs">👤 Cliente</span>
        </div>
      </div>

      {/* DESKTOP - Video y panel */}
      <div className="hidden md:flex gap-6 mt-4">
        {/* ZONA VIDEO */}
        <div className="flex-1 bg-[#1f2125] rounded-2xl overflow-hidden relative flex items-center justify-center h-[500px] transition-all duration-500">
          <VideoDisplay 
            onCameraSwitch={cambiarCamara}
            mainCamera={camaraPrincipal}
          />
        </div>

        {/* PANEL DERECHO */}
        <div className="w-[340px] bg-[#1f2125] rounded-2xl flex flex-col justify-between relative">
          {/* ✅ INFO DEL MODELO DE LA RULETA */}
          <div className="flex justify-between items-center p-4 border-b border-[#ff007a]/20">
            <div>
              <p className="font-semibold text-white">{modelo?.nombre || 'Usuario'}</p>
              <p className="text-sm text-white/60">{modelo?.pais || '🌎'} Online</p>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-400" title="Verificado" />
              <button title="Favorito" className="text-[#ff007a] hover:scale-110">
                <Heart />
              </button>
              <button title="Bloquear" className="text-red-400 hover:scale-110">
                <Ban />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto relative custom-scroll">
            {/* ✅ MENSAJE DE CONFIRMACIÓN DE RULETA */}
            <div className="text-sm">
              <span className="font-bold text-green-400">🎰 Sistema</span>
              <p className="bg-[#1f2937] inline-block px-3 py-1 mt-1 rounded-xl border border-green-400/30">
                ¡Conexión establecida! Disfruta tu videochat 🎥
              </p>
            </div>
            
            <div className="text-sm">
              <span className="font-bold text-white">{modelo?.nombre || 'Usuario'} {modelo?.pais || ''}</span>
              <p className="bg-[#2b2d31] inline-block px-3 py-1 mt-1 rounded-xl">
                ¡Hola! ¿Cómo estás? 😊
              </p>
            </div>
            <div className="text-right">
              <p className="bg-[#ff007a] inline-block px-3 py-1 mt-1 rounded-xl text-white">
                ¡Muy bien! ¿Qué tal tú?
              </p>
            </div>
            
            <div className="text-sm">
              <span className="font-bold text-blue-400">ℹ️ Info</span>
              <p className="bg-[#1e3a8a]/20 inline-block px-3 py-1 mt-1 rounded-xl border border-blue-400/30 text-blue-200">
                Sala: {roomName}
              </p>
            </div>

            {/* Mensajes dinámicos */}
            {messages.filter(msg => msg.id > 2).map((msg, index) => (
              <div key={msg.id} className={msg.type === 'local' ? 'text-right' : 'text-sm'}>
                {msg.type === 'local' ? (
                  <p className="bg-[#ff007a] inline-block px-3 py-1 mt-1 rounded-xl text-white">
                    {msg.text}
                  </p>
                ) : msg.type === 'system' ? (
                  <>
                    <span className="font-bold text-green-400">🎰 Sistema</span>
                    <p className="bg-[#1f2937] inline-block px-3 py-1 mt-1 rounded-xl border border-green-400/30">
                      {msg.text}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-white">{modelo?.nombre || 'Usuario'} {modelo?.pais || ''}</span>
                    <p className="bg-[#2b2d31] inline-block px-3 py-1 mt-1 rounded-xl">
                      {msg.text}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Modal de regalos */}
          {mostrarRegalos && (
            <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 bg-[#1a1c20] p-5 rounded-xl shadow-2xl w-[300px] max-h-[360px] overflow-y-auto z-50 border border-[#ff007a]/30 scrollbar-thin scrollbar-thumb-[#ff007a88] scrollbar-track-[#2b2d31]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-semibold text-sm">
                  🎁 Regalos
                </h3>
                <button
                  className="text-white/50 hover:text-white text-sm"
                  onClick={() => setMostrarRegalos(false)}
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                    className="bg-[#2b2d31] px-3 py-2 rounded-xl flex items-center justify-between hover:bg-[#383c44] cursor-pointer transition"
                  >
                    <span className="text-sm text-white">{regalo.nombre}</span>
                    <span className="text-xs text-[#ff007a] font-bold">
                      {regalo.valor} min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input de mensaje */}
          <div className="border-t border-[#ff007a]/20 p-3 flex gap-2 items-center relative">
            <button
              className="text-[#ff007a] hover:text-white"
              onClick={() => setMostrarRegalos(!mostrarRegalos)}
            >
              <Gift size={20} />
            </button>
            <button className="text-[#ff007a] hover:text-white">
              <Smile size={20} />
            </button>
            <input
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-[#131418] px-4 py-2 rounded-full outline-none text-white text-sm"
            />
            <button 
              className="text-[#ff007a] hover:text-white"
              onClick={enviarMensaje}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ✅ CONTROLES ACTUALIZADOS CON SIGUIENTE Y STOP */}
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

        {/* 🔥 BOTÓN SIGUIENTE PERSONA - NUEVO */}
        <button
          className="bg-blue-500 hover:bg-blue-600 p-3 sm:p-4 rounded-full transition"
          onClick={siguientePersona}
          title="Siguiente persona"
          disabled={loading}
        >
          <SkipForward size={18} className="lg:hidden" />
          <SkipForward size={22} className="hidden lg:block" />
        </button>

        {/* 🔥 BOTÓN STOP/FINALIZAR - NUEVO */}
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