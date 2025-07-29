import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./headercliente";
import { useTranslation } from "react-i18next"; // 🔥 AGREGAR IMPORT
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔥 AGREGAR IMPORT DEL CONTEXTO DE BÚSQUEDA
import { useSearching } from '../../contexts/SearchingContext.jsx';

export default function PreCallLobbyClient() {
  // 🔥 AGREGAR HOOK DE TRADUCCIÓN
  const { t, i18n } = useTranslation();
  
  // 🔥 AGREGAR EFECTO PARA CARGAR IDIOMA GUARDADO
  useEffect(() => {
    const savedLang = localStorage.getItem("lang");
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mirrorMode, setMirrorMode] = useState(() => {
    const saved = localStorage.getItem("mirrorMode");
    return saved ? JSON.parse(saved) : true;
  });
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const isNavigatingRef = useRef(false); // 🔥 NUEVO: Flag para saber si está navegando
  
  // 🔥 AGREGAR HOOK DE SEARCHING CONTEXT
  const { startSearching, stopSearching } = useSearching();
  const navigate = useNavigate();

  // Función para alternar modo espejo
  const toggleMirrorMode = () => {
    const newMirrorMode = !mirrorMode;
    setMirrorMode(newMirrorMode);
    localStorage.setItem("mirrorMode", JSON.stringify(newMirrorMode));
  };

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
          alert(t("permission_alert", "Necesitas permitir el acceso a cámara y micrófono para continuar."));
        }
      }
    };

    requestMediaPermissions();
  }, [t]); // 🔥 AGREGAR t COMO DEPENDENCIA

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
      {/* Header */}
      <div className="w-full px-6 pt-6">
        <Header />
      </div>

      {/* Container principal */}
      <div className="flex justify-center items-center px-6 mt-[-30px]">
        <div className="bg-[#1f2125] rounded-2xl p-6 shadow-2xl flex flex-col items-center max-w-md w-full">
          
          {/* Video container */}
          <div className="w-full h-60 rounded-xl overflow-hidden mb-4 bg-black relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`object-cover w-full h-full ${mirrorMode ? 'scale-x-[-1]' : ''}`}
            />
            
            {/* Botón de modo espejo */}
            <button
              onClick={toggleMirrorMode}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              title={mirrorMode ? t("mirror.disable", "Desactivar espejo") : t("mirror.enable", "Activar espejo")}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 3v18m0-18l4 4m-4-4L8 7"/>
                <path d="M12 21l4-4m-4 4L8 17"/>
              </svg>
            </button>

            {/* Indicador de estado del espejo */}
            {mirrorMode && (
              <div className="absolute bottom-2 left-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
                {t("mirror.active", "Espejo activo")}
              </div>
            )}
          </div>

          {/* Título y estado */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold">
              {t("roulette_cliente.titulo")}
            </h2>
            <p className="text-blue-400 text-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              {t("roulette_cliente.estado")}
            </p>
          </div>

          {/* Controles */}
          <div className="w-full space-y-4">
            {/* Selector de cámara */}
            <div>
              <label className="text-sm text-white/70">
                {t("roulette_cliente.camera_label")}
              </label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg bg-[#2b2d31] text-white outline-none"
                disabled={loading}
              >
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Cámara ${cameras.indexOf(cam) + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de micrófono */}
            <div>
              <label className="text-xs sm:text-sm text-white/70 block mb-1 sm:mb-0">
                {t("roulette_cliente.mic_label")}
              </label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg bg-[#2b2d31] text-white text-sm sm:text-base outline-none"
                disabled={loading}
              >
                {microphones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Micrófono ${microphones.indexOf(mic) + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Control de modo espejo responsive */}
            <div className="flex items-center justify-between py-2">
              <label className="text-xs sm:text-sm text-white/70">
                {t("mirror.label", "Modo espejo")}
              </label>
              <button
                onClick={toggleMirrorMode}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors ${
                  mirrorMode ? 'bg-[#ff007a]' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                    mirrorMode ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Botón principal */}
          <button
            className="mt-6 w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-3 rounded-full text-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={iniciarRuleta}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                {t("roulette_cliente.searching_user")}
              </div>
            ) : (
              t("roulette_cliente.start_button")
            )}
          </button>

          {/* Texto informativo */}
          <div className="mt-4 text-center text-xs text-white/50">
            <p>{t('roulette_cliente.random_user_notice')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}