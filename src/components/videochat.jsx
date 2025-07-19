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
  Repeat,
  Heart,
  Ban,
  Gift,
  Smile,
  ShieldCheck,
  Clock,
} from "lucide-react";
import Header from "./header";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ✅ COMPONENTE CON VIDEO REAL PARA LA MODELO
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
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">👩‍💼</div>
          <p className="text-xl mb-2">Vista de la Modelo</p>
          <div className="space-y-2">
            <p className="text-sm text-green-400">
              ✅ Conectada al servidor LiveKit
            </p>
            <p className="text-sm text-gray-400">
              👥 Participantes: {participants.length}
            </p>
            {localParticipant && (
              <p className="text-sm text-blue-400">
                🟦 Tú (Modelo): {localParticipant.identity}
              </p>
            )}
            {remoteParticipant && (
              <p className="text-sm text-pink-400">
                🟪 Cliente: {remoteParticipant.identity}
              </p>
            )}
            {!remoteParticipant && participants.length === 1 && (
              <p className="text-sm text-yellow-400">
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
      <div
        className="absolute bottom-4 left-4 w-40 h-28 rounded-lg overflow-hidden border-2 border-[#ff007a] shadow-lg cursor-pointer"
        onClick={onCameraSwitch}
      >
        {getMiniVideo()}
        
        {/* Indicador en mini */}
        <div className="absolute top-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[10px] text-white">
          {mainCamera === "local" ? "CLIENTE" : "TU VISTA"}
        </div>
      </div>
    </>
  );
};

export default function VideoChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  
  // ✅ ESTADOS PARA CONTROLES (IGUAL QUE EL CLIENTE)
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  
  // ✅ CORRIGIDO: La modelo inicia viendo al cliente por defecto
  const [camaraPrincipal, setCamaraPrincipal] = useState("remote");
  const [tiempo, setTiempo] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [mostrarRegalos, setMostrarRegalos] = useState(false);

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

  const nuevaRuleta = () => {
    // Navegar a la página de inicio de ruleta para modelos
    navigate('/precallmodel'); // o la ruta que uses para modelos
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#ff007a] mx-auto mb-4"></div>
          <p className="text-xl">Conectando a la videollamada...</p>
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
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-500 text-xl mb-4">Error: {error}</p>
          <div className="space-x-4">
            <button 
              onClick={nuevaRuleta}
              className="bg-[#ff007a] px-6 py-3 rounded-full text-white"
            >
              🎰 Nueva Ruleta
            </button>
            <button 
              onClick={() => navigate(-1)}
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
      className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white p-4"
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

      <div className="flex justify-between items-center text-sm text-white/70 mt-4 mb-2 font-mono px-2">
        <div>
          ⏱ Tiempo de llamada:{" "}
          <span className="text-[#ff007a] font-bold">{formatoTiempo()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#ff007a]" />
          <span className="text-[#ff007a] font-bold">∞ Tiempo ilimitado</span>
          {connected && (
            <span className="text-green-400 text-xs ml-2">🟢 Conectada</span>
          )}
          <span className="text-blue-400 text-xs ml-2">👩‍💼 Modelo</span>
        </div>
      </div>

      <div className="flex gap-6 mt-4">
        {/* ZONA VIDEO */}
        <div className="flex-1 bg-[#1f2125] rounded-2xl overflow-hidden relative flex items-center justify-center h-[500px] transition-all duration-500">
          <VideoDisplay onCameraSwitch={cambiarCamara} mainCamera={camaraPrincipal} />
        </div>

        {/* PANEL DERECHO */}
        <div className="w-[340px] bg-[#1f2125] rounded-2xl flex flex-col justify-between relative">
          {/* Usuario - ✅ MOSTRAR INFO DE LA RULETA */}
          <div className="flex justify-between items-center p-4 border-b border-[#ff007a]/20">
            <div>
              <p className="font-semibold text-white">Cliente Conectado</p>
              <p className="text-sm text-white/60">🌎 Online</p>
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

          {/* Chat */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scroll">
            {/* ✅ MENSAJE DE CONFIRMACIÓN */}
            <div className="text-sm">
              <span className="font-bold text-green-400">🎰 Sistema</span>
              <p className="bg-[#1f2937] inline-block px-3 py-1 mt-1 rounded-xl border border-green-400/30">
                ¡Cliente conectado! Comienza tu show 🎥
              </p>
            </div>
            
            <div className="text-sm">
              <span className="font-bold text-blue-400">Cliente</span>
              <p className="bg-[#2b2d31] inline-block px-3 py-1 mt-1 rounded-xl">¡Hola! ¿Cómo estás?</p>
            </div>
            <div className="text-right">
              <p className="bg-[#ff007a] inline-block px-3 py-1 mt-1 rounded-xl text-white">¡Hola guapo! ¡Muy bien! 😘</p>
            </div>
            
            <div className="text-sm">
              <span className="font-bold text-purple-400">ℹ️ Sala</span>
              <p className="bg-[#4c1d95]/20 inline-block px-3 py-1 mt-1 rounded-xl border border-purple-400/30 text-purple-200">
                Sala: {roomName}
              </p>
            </div>
          </div>

          {/* Regalos */}
          {mostrarRegalos && (
            <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 bg-[#1a1c20] p-5 rounded-xl shadow-2xl w-[300px] max-h-[360px] overflow-y-auto z-50 border border-[#ff007a]/30 scrollbar-thin scrollbar-thumb-[#ff007a88] scrollbar-track-[#2b2d31]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-semibold text-sm">🎁 Regalos Recibidos</h3>
                <button onClick={() => setMostrarRegalos(false)} className="text-white/50 hover:text-white text-sm">✕</button>
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
                  <div key={i} className="bg-[#2b2d31] px-3 py-2 rounded-xl flex items-center justify-between hover:bg-[#383c44] cursor-pointer transition">
                    <span className="text-sm text-white">{regalo.nombre}</span>
                    <span className="text-xs text-[#ff007a] font-bold">+{regalo.valor} min</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[#ff007a]/20 p-3 flex gap-2 items-center">
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
              placeholder="Responde al cliente..."
              className="flex-1 bg-[#131418] px-4 py-2 rounded-full outline-none text-white text-sm"
            />
            <button className="text-[#ff007a] hover:text-white">
              <svg className="w-5 h-5 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ CONTROLES FUNCIONALES IGUALES AL CLIENTE */}
      <div className="flex justify-center gap-10 mt-6">
        {/* Botón Micrófono */}
        <button 
          className={`p-4 rounded-full transition ${
            micEnabled 
              ? 'bg-[#2b2d31] hover:bg-[#3a3d44]' 
              : 'bg-red-500 hover:bg-red-600'
          }`}
          onClick={() => setMicEnabled(!micEnabled)}
          title={micEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
        >
          {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        {/* Botón Cámara */}
        <button 
          className={`p-4 rounded-full transition ${
            cameraEnabled 
              ? 'bg-[#2b2d31] hover:bg-[#3a3d44]' 
              : 'bg-red-500 hover:bg-red-600'
          }`}
          onClick={() => setCameraEnabled(!cameraEnabled)}
          title={cameraEnabled ? 'Apagar cámara' : 'Encender cámara'}
        >
          {cameraEnabled ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        {/* Cambiar vista */}
        <button
          className="bg-[#ff007a] p-4 rounded-full hover:bg-[#e6006e]"
          onClick={cambiarCamara}
          title="Intercambiar vista"
        >
          <Repeat size={22} />
        </button>

        {/* Nueva Ruleta */}
        <button 
          className="bg-[#ff007a] hover:bg-[#e6006e] px-6 py-3 rounded-full text-white text-lg font-semibold"
          onClick={nuevaRuleta}
        >
          🎰 Nueva Ruleta
        </button>
      </div>
    </LiveKitRoom>
  );
}

// ✅ COMPONENTE PARA CONTROLAR MEDIA (IGUAL QUE EL CLIENTE)
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