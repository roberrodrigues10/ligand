import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./headercliente";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔥 AGREGAR IMPORT DEL CONTEXTO DE BÚSQUEDA
import { useSearching } from '../../contexts/SearchingContext.jsx';

export default function PreCallLobbyClient() {
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const isNavigatingRef = useRef(false); // 🔥 NUEVO: Flag para saber si está navegando
  
  // 🔥 AGREGAR HOOK DE SEARCHING CONTEXT
  const { startSearching, stopSearching } = useSearching();
  const navigate = useNavigate();

  useEffect(() => {
    const initDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        const audioInputs = devices.filter((d) => d.kind === "audioinput");

        setCameras(videoInputs);
        setMicrophones(audioInputs);

        if (videoInputs[0]) setSelectedCamera(videoInputs[0].deviceId);
        if (audioInputs[0]) setSelectedMic(audioInputs[0].deviceId);
      } catch (err) {
        console.error("Error enumerando dispositivos:", err);
      }
    };

    initDevices();
  }, []);

  useEffect(() => {
    const startStream = async () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedCamera ? { exact: selectedCamera } : undefined },
          audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined },
        });

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accediendo cámara/micrófono:", err);
      }
    };

    if (selectedCamera || selectedMic) {
      startStream();
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedCamera, selectedMic]);

  useEffect(() => {
    const requestMediaPermissions = async () => {
      try {
        console.log('🎥 Solicitando permisos de cámara y micrófono...');
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        console.log('✅ Permisos concedidos');
        
        stream.getTracks().forEach(track => track.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter(d => d.kind === "videoinput"));
        setMicrophones(devices.filter(d => d.kind === "audioinput"));
        
      } catch (err) {
        console.error('❌ Error solicitando permisos:', err);
        
        if (err.name === 'NotAllowedError') {
          alert('Necesitas permitir el acceso a cámara y micrófono para continuar.');
        }
      }
    };

    requestMediaPermissions();
  }, []);
  useEffect(() => {
    const sendBrowsingHeartbeat = async () => {
      try {
        const authToken = sessionStorage.getItem('token');
        if (!authToken) return;

        await fetch(`${API_BASE_URL}/api/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            activity_type: 'browsing', // ✅ Disponible para emparejamiento
            room: null
          })
        });

        console.log('💓 [PRECALL] Heartbeat browsing enviado');
      } catch (error) {
        console.log('⚠️ [PRECALL] Error enviando heartbeat:', error);
      }
    };

    // Heartbeat inicial
    sendBrowsingHeartbeat();

    // Heartbeat cada 20 segundos
    const interval = setInterval(sendBrowsingHeartbeat, 20000);

    return () => clearInterval(interval);
  }, []);

  // 🔥 FUNCIÓN ADAPTADA DEL MODELO - NAVEGAR A USERSEARCH (IGUAL QUE MODELO)
  const iniciarRuleta = async () => {
    console.log('🎰 [PRECALL] Botón clickeado - iniciando ruleta...');
    setLoading(true);
    
    try {
      // 🔥 DETENER STREAM DE CÁMARA
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      
      // 🔥 MARCAR QUE ESTÁ NAVEGANDO
      isNavigatingRef.current = true;
      
      // 🔥 NAVEGAR A PÁGINA DE BÚSQUEDA CON PARÁMETROS (IGUAL QUE MODELO)
      console.log('🧭 [PRECALL] Navegando a /usersearch...');
      navigate(`/usersearch?role=cliente&selectedCamera=${selectedCamera}&selectedMic=${selectedMic}`);
      
    } catch (error) {
      console.error('❌ [PRECALL] Error:', error);
      setLoading(false);
      isNavigatingRef.current = false;
    }
  };

  // 🔥 CLEANUP MODIFICADO - Solo si NO está navegando (IGUAL QUE MODELO)
  useEffect(() => {
    return () => {
      if (!isNavigatingRef.current) {
        console.log('🧹 [PRECALL] Componente desmontándose SIN navegación - limpiando...');
        stopSearching();
      } else {
        console.log('🧭 [PRECALL] Componente desmontándose por NAVEGACIÓN - manteniendo loading...');
      }
    };
  }, [stopSearching]);

  return (
    <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white">
      <div className="w-full px-6 pt-6">
        <Header />
      </div>

      <div className="flex justify-center items-center px-6 mt-[-20px]">
        <div className="bg-[#1f2125] rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-md w-full mt-6">
          <div className="w-full h-60 rounded-xl overflow-hidden mb-4 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="object-cover w-full h-full"
            />
          </div>

          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold">👨‍💻 ¡Listo para la ruleta!</h2>
            <p className="text-blue-400 text-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Cliente conectado
            </p>
          </div>

          <div className="w-full space-y-4">
            <div>
              <label className="text-sm text-white/70">Camera</label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg bg-[#2b2d31] text-white outline-none"
                disabled={loading}
              >
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || "Camera"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-white/70">Microphone</label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg bg-[#2b2d31] text-white outline-none"
                disabled={loading}
              >
                {microphones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || "Mic"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="mt-6 w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-3 rounded-full text-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={iniciarRuleta}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Buscando modelo...
              </div>
            ) : (
              "🎰 Iniciar Ruleta"
            )}
          </button>

          <div className="mt-4 text-center text-xs text-white/50">
            <p>🎲 Te conectarás con un modelo aleatorio</p>
            <p>💫 ¡Sistema Omegle para clientes!</p>
          </div>
        </div>
      </div>
    </div>
  );
}