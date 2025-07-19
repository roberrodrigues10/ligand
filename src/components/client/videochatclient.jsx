import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ParticipantTile,
  useTracks,
  useParticipants,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
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
import Header from "../header";

// Componente personalizado para manejar los videos
const VideoDisplay = ({ onCameraSwitch, mainCamera }) => {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);
  
  const participants = useParticipants();
  const localParticipant = participants.find(p => p.isLocal);
  const remoteParticipant = participants.find(p => !p.isLocal);

  const getMainVideo = () => {
    if (mainCamera === "local" && localParticipant) {
      return (
        <ParticipantTile 
          participant={localParticipant} 
          className="w-full h-full"
          displayName={false}
        />
      );
    } else if (remoteParticipant) {
      return (
        <ParticipantTile 
          participant={remoteParticipant} 
          className="w-full h-full"
          displayName={false}
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <p className="text-white">Esperando conexión...</p>
      </div>
    );
  };

  const getMiniVideo = () => {
    if (mainCamera === "local" && remoteParticipant) {
      return (
        <ParticipantTile 
          participant={remoteParticipant} 
          className="w-full h-full"
          displayName={false}
        />
      );
    } else if (localParticipant) {
      return (
        <ParticipantTile 
          participant={localParticipant} 
          className="w-full h-full"
          displayName={false}
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-600">
        <p className="text-white text-xs">Tu video</p>
      </div>
    );
  };

  return (
    <>
      {/* Cámara principal */}
      <div className="w-full h-full">
        {getMainVideo()}
      </div>

      {/* Cámara mini flotante */}
      <div className="absolute bottom-4 left-4 w-40 h-28 rounded-lg overflow-hidden border-2 border-[#ff007a] shadow-lg cursor-pointer"
           onClick={onCameraSwitch}>
        {getMiniVideo()}
      </div>
    </>
  );
};

export default function VideoChat() {
  const location = useLocation();
  const { roomName, userName, selectedCamera, selectedMic } = location.state || {};
  
  const [tiempo, setTiempo] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [camaraPrincipal, setCamaraPrincipal] = useState("remote"); // "local" o "remote"
  const [mostrarRegalos, setMostrarRegalos] = useState(false);
  
  // Estados para LiveKit
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const getToken = async () => {
      try {
        const authToken = localStorage.getItem('auth_token'); // Tu token de autenticación
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/livekit/token`, {
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
          throw new Error('Failed to get token');
        }

        const data = await response.json();
        setToken(data.token);
        setServerUrl(data.serverUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error getting token:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (roomName && userName) {
      getToken();
    } else {
      setError('Faltan parámetros de la sala');
      setLoading(false);
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
    setCamaraPrincipal((prev) => (prev === "remote" ? "local" : "remote"));
  };

  const handleRoomConnected = () => {
    setConnected(true);
    console.log('Conectado a la sala LiveKit');
  };

  const handleRoomDisconnected = () => {
    setConnected(false);
    console.log('Desconectado de la sala LiveKit');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#ff007a] mx-auto mb-4"></div>
          <p className="text-xl">Conectando a la videollamada...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">Error: {error}</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-[#ff007a] px-6 py-3 rounded-full text-white"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="default"
      onConnected={handleRoomConnected}
      onDisconnected={handleRoomDisconnected}
      className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white p-4"
    >
      <RoomAudioRenderer />
      
      <Header />

      {/* Temporizador y minutos restantes */}
      <div className="flex justify-between items-center text-sm text-white/70 mt-4 mb-2 font-mono px-2">
        <div>
          ⏱ Tiempo de llamada:{" "}
          <span className="text-[#ff007a] font-bold">{formatoTiempo()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#ff007a]" />
          <span className="text-[#ff007a] font-bold">12 min restantes</span>
          {connected && (
            <span className="text-green-400 text-xs ml-2">🟢 Conectado</span>
          )}
        </div>
      </div>

      <div className="flex gap-6 mt-4">
        {/* ZONA VIDEO */}
        <div className="flex-1 bg-[#1f2125] rounded-2xl overflow-hidden relative flex items-center justify-center h-[500px] transition-all duration-500">
          <VideoDisplay 
            onCameraSwitch={cambiarCamara}
            mainCamera={camaraPrincipal}
          />
        </div>

        {/* PANEL DERECHO */}
        <div className="w-[340px] bg-[#1f2125] rounded-2xl flex flex-col justify-between relative">
          {/* Info del usuario */}
          <div className="flex justify-between items-center p-4 border-b border-[#ff007a]/20">
            <div>
              <p className="font-semibold text-white">Lucas</p>
              <p className="text-sm text-white/60">🇵🇭 Filipinas</p>
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
            <div className="text-sm">
              <span className="font-bold text-white">Lucas 🇵🇭</span>
              <p className="bg-[#2b2d31] inline-block px-3 py-1 mt-1 rounded-xl">
                Hi, how are you?
              </p>
            </div>
            <div className="text-right">
              <p className="bg-[#ff007a] inline-block px-3 py-1 mt-1 rounded-xl text-white">
                Good, and you?
              </p>
            </div>
          </div>

          {/* Modal de regalos */}
          {mostrarRegalos && (
            <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 bg-[#1a1c20] p-5 rounded-xl shadow-2xl w-[300px] max-h-[360px] overflow-y-auto z-50 border border-[#ff007a]/30 scrollbar-thin scrollbar-thumb-[#ff007a88] scrollbar-track-[#2b2d31]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-semibold text-sm">
                  🎁 Elige un regalo para pedir
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
              placeholder="Escribe un mensaje"
              className="flex-1 bg-[#131418] px-4 py-2 rounded-full outline-none text-white text-sm"
            />
            <button className="text-[#ff007a] hover:text-white">
              <svg
                className="w-5 h-5 transform rotate-45"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Controles inferiores */}
      <div className="flex justify-center gap-10 mt-6">
        <button className="bg-[#2b2d31] p-4 rounded-full hover:bg-[#3a3d44]">
          <Mic size={22} />
        </button>
        <button className="bg-[#2b2d31] p-4 rounded-full hover:bg-[#3a3d44]">
          <Video size={22} />
        </button>
        <button
          className="bg-[#ff007a] p-4 rounded-full hover:bg-[#e6006e]"
          onClick={cambiarCamara}
          title="Intercambiar cámara"
        >
          <Repeat size={22} />
        </button>
        <button className="bg-[#ff007a] hover:bg-[#e6006e] px-6 py-3 rounded-full text-white text-lg font-semibold">
          Siguiente
        </button>
      </div>
    </LiveKitRoom>
  );
}