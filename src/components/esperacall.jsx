import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./header";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function PreCallLobbyModelo() {
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
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

  // ✅ FUNCIÓN PRINCIPAL: Iniciar ruleta (IGUAL QUE CLIENTE)
  const iniciarRuleta = async () => {
    setLoading(true);
    
    try {
      const authToken = sessionStorage.getItem('token');
      if (!authToken) {
        throw new Error('No hay token de autenticación');
      }

      console.log("👩‍💻 Modelo iniciando ruleta...");

      // Llamar al MISMO endpoint de ruleta
      const response = await fetch(`${API_BASE_URL}/api/ruleta/iniciar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      
      console.log("✅ Ruleta exitosa:", data);

      // Detener el stream actual
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Navegar al videochat del modelo
      navigate("/videochat", {
        state: {
          roomName: data.roomName,
          userName: data.userName,
          selectedCamera,
          selectedMic,
          ruletaData: data, // Toda la info de la ruleta
          // Si hay match, info del otro usuario
          matchedWith: data.matched_with || null,
          type: data.type // 'match_found' o 'waiting'
        }
      });

    } catch (error) {
      console.error('❌ Error en ruleta:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white">
      <div className="w-full px-6 pt-6">
        <Header />
      </div>

      <div className="flex justify-center items-center px-6 mt-[-20px]">
        <div className="bg-[#1f2125] rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-md w-full mt-6">
          {/* Vista previa real */}
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
            <h2 className="text-xl font-semibold">👩‍💻 ¡Lista para la ruleta!</h2>
            <p className="text-green-400 text-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Modelo conectada
            </p>
          </div>

          {/* Selector dinámico */}
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

          {/* ✅ BOTÓN DE RULETA - IGUAL QUE CLIENTE */}
          <button
            className="mt-6 w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-3 rounded-full text-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={iniciarRuleta}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Buscando cliente...
              </div>
            ) : (
              "🎰 Iniciar Ruleta"
            )}
          </button>

          {/* Info adicional para modelo */}
          <div className="mt-4 text-center text-xs text-white/50">
            <p>🎲 Te conectarás con un cliente aleatorio</p>
            <p>💫 ¡Sistema Omegle para modelos!</p>
          </div>
        </div>
      </div>
    </div>
  );
}