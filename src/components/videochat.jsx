import React, { useState, useEffect } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import {
  Mic,
  Video,
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

// ✅ COMPONENTE CORREGIDO PARA LA MODELO
const VideoDisplay = ({ onCameraSwitch, mainCamera }) => {
  const participants = useParticipants();
  
  // Obtener todos los tracks de video disponibles
  const videoTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  console.log("🎥 VideoDisplay Debug:", {
    participants: participants.length,
    videoTracks: videoTracks.length,
    mainCamera,
    participantIds: participants.map(p => ({ identity: p.identity, isLocal: p.isLocal }))
  });

  // Separar participantes
  const localParticipant = participants.find(p => p.isLocal);
  const remoteParticipant = participants.find(p => !p.isLocal);

  // Obtener tracks específicos
  const localVideoTrack = videoTracks.find(
    track => track.participant.isLocal
  );
  
  const remoteVideoTrack = videoTracks.find(
    track => !track.participant.isLocal
  );

  console.log("🎥 Tracks encontrados:", {
    localVideoTrack: !!localVideoTrack,
    remoteVideoTrack: !!remoteVideoTrack,
    localIdentity: localVideoTrack?.participant?.identity,
    remoteIdentity: remoteVideoTrack?.participant?.identity
  });

  // ✅ FUNCIÓN PARA VIDEO PRINCIPAL
  const getMainVideo = () => {
    if (mainCamera === "local" && localVideoTrack) {
      console.log("📺 Mostrando LOCAL en principal");
      return (
        <VideoTrack 
          trackRef={localVideoTrack}
          className="w-full h-full object-cover"
        />
      );
    } else if (mainCamera === "remote" && remoteVideoTrack) {
      console.log("📺 Mostrando REMOTO en principal");
      return (
        <VideoTrack 
          trackRef={remoteVideoTrack}
          className="w-full h-full object-cover"
        />
      );
    }

    // Fallback - mostrar info de debug
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎥</div>
          <p className="text-xl mb-4">Video Chat</p>
          
          <div className="space-y-2 text-sm">
            <p className="text-green-400">
              ✅ Conectado al servidor LiveKit
            </p>
            <p className="text-gray-400">
              👥 Total participantes: {participants.length}
            </p>
            <p className="text-gray-400">
              🎬 Video tracks: {videoTracks.length}
            </p>
            
            {localParticipant && (
              <div className="mt-2 p-2 bg-blue-900/30 rounded">
                <p className="text-blue-400">
                  🟦 TÚ: {localParticipant.identity}
                </p>
                <p className="text-xs text-gray-300">
                  Video local: {localVideoTrack ? "✅" : "❌"}
                </p>
              </div>
            )}
            
            {remoteParticipant && (
              <div className="mt-2 p-2 bg-pink-900/30 rounded">
                <p className="text-pink-400">
                  🟪 CONECTADO: {remoteParticipant.identity}
                </p>
                <p className="text-xs text-gray-300">
                  Video remoto: {remoteVideoTrack ? "✅" : "❌"}
                </p>
              </div>
            )}
            
            {!remoteParticipant && participants.length === 1 && (
              <p className="text-yellow-400 mt-2">
                ⏳ Esperando que se conecte otra persona...
              </p>
            )}

            <div className="mt-4 text-xs text-gray-500">
              <p>Vista principal: {mainCamera === "local" ? "TU CÁMARA" : "CÁMARA REMOTA"}</p>
              <p>Haz clic en la vista mini para cambiar</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ FUNCIÓN PARA VIDEO MINI
  const getMiniVideo = () => {
    // Mostrar lo contrario al video principal
    if (mainCamera === "local" && remoteVideoTrack) {
      return (
        <VideoTrack 
          trackRef={remoteVideoTrack}
          className="w-full h-full object-cover"
        />
      );
    } else if (mainCamera === "remote" && localVideoTrack) {
      return (
        <VideoTrack 
          trackRef={localVideoTrack}
          className="w-full h-full object-cover"
        />
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-600 text-white text-xs">
        <div className="text-center">
          <p>Mini</p>
          <p className="text-[10px]">
            {mainCamera === "local" ? "Remoto" : "Local"}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* VIDEO PRINCIPAL */}
      <div className="w-full h-full relative">
        {getMainVideo()}
        
        {/* Indicador de vista activa */}
        <div className="absolute top-4 right-4 bg-black/50 px-2 py-1 rounded text-xs text-white">
          {mainCamera === "local" ? "TU VISTA" : "VISTA REMOTA"}
        </div>
      </div>

      {/* VIDEO MINI */}
      <div
        className="absolute bottom-4 left-4 w-40 h-28 rounded-lg overflow-hidden border-2 border-[#ff007a] shadow-lg cursor-pointer hover:border-white transition-colors"
        onClick={onCameraSwitch}
        title="Haz clic para cambiar vista"
      >
        {getMiniVideo()}
        
        {/* Indicador en mini */}
        <div className="absolute top-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[10px] text-white">
          {mainCamera === "local" ? "REMOTO" : "TU VISTA"}
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
          <button
            onClick={() => navigate(-1)}
            className="bg-[#ff007a] px-6 py-3 rounded-full text-white mr-2"
          >
            Volver
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-600 px-6 py-3 rounded-full text-white"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video
      audio
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="default"
      onConnected={handleRoomConnected}
      onDisconnected={handleRoomDisconnected}
      className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white p-4"
    >
      <RoomAudioRenderer />
      <Header />

      <div className="flex justify-between items-center text-sm text-white/70 mt-4 mb-2 font-mono px-2">
        <div>
          ⏱ Tiempo de llamada:{" "}
          <span className="text-[#ff007a] font-bold">{formatoTiempo()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#ff007a]" />
          <span className="text-[#ff007a] font-bold">12 min restantes</span>
          {connected && (
            <span className="text-green-400 text-xs ml-2">🟢 Conectada</span>
          )}
          <span className="text-blue-400 text-xs ml-2">👩‍💼 Modelo</span>
        </div>
      </div>

      <div className="flex gap-6 mt-4">
        {/* ZONA VIDEO */}
        <div className="flex-1 bg-[#1f2125] rounded-2xl overflow-hidden relative flex items-center justify-center h-[500px]">
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
              <ShieldCheck size={18} className="text-green-400" />
              <Heart className="text-[#ff007a] hover:scale-110 cursor-pointer" />
              <Ban className="text-red-400 hover:scale-110 cursor-pointer" />
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
                  <div key={i} className="bg-[#2b2d31] px-3 py-2 rounded-xl flex items-center justify-between hover:bg-[#383c44] cursor-pointer">
                    <span className="text-sm text-white">{regalo.nombre}</span>
                    <span className="text-xs text-[#ff007a] font-bold">+{regalo.valor} min</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[#ff007a]/20 p-3 flex gap-2 items-center">
            <Gift size={20} className="text-[#ff007a] hover:text-white cursor-pointer" onClick={() => setMostrarRegalos(!mostrarRegalos)} />
            <Smile size={20} className="text-[#ff007a] hover:text-white cursor-pointer" />
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

      {/* Controles */}
      <div className="flex justify-center gap-10 mt-6">
        <button className="bg-[#2b2d31] p-4 rounded-full hover:bg-[#3a3d44]"><Mic size={22} /></button>
        <button className="bg-[#2b2d31] p-4 rounded-full hover:bg-[#3a3d44]"><Video size={22} /></button>
        <button className="bg-[#ff007a] p-4 rounded-full hover:bg-[#e6006e]" onClick={cambiarCamara}><Repeat size={22} /></button>
        <button className="bg-[#ff007a] hover:bg-[#e6006e] px-6 py-3 rounded-full text-white text-lg font-semibold">Siguiente</button>
      </div>
    </LiveKitRoom>
  );
}