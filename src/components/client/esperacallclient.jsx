import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./headercliente";

export default function PreCallLobby() {
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [roomName, setRoomName] = useState(""); // Nuevo: nombre de la sala
  const [userName, setUserName] = useState(""); // Nuevo: nombre del usuario
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

    // Generar datos para la sesión
    const generateSessionData = () => {
      // Aquí puedes obtener estos datos de tu sistema de autenticación
      // Por ejemplo, desde el localStorage, context, o props
      const userId = localStorage.getItem('user_id') || 'user_' + Math.random().toString(36).substr(2, 9);
      const room = 'room_' + Math.random().toString(36).substr(2, 9); // O desde tu backend
      
      setUserName(userId);
      setRoomName(room);
    };

    initDevices();
    generateSessionData();
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

  const handleStartCall = () => {
    // Limpiar stream actual antes de navegar
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    // Navegar pasando los parámetros necesarios para LiveKit
    navigate("/videochatclient", {
      state: {
        roomName,
        userName,
        selectedCamera,
        selectedMic
      }
    });
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
            <h2 className="text-xl font-semibold">Mandy, 23</h2>
            <p className="text-green-400 text-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Active
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
              >
                {microphones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || "Mic"}
                  </option>
                ))}
              </select>
            </div>

            {/* Mostrar información de sesión (opcional, para debug) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-white/50">
                <p>Room: {roomName}</p>
                <p>User: {userName}</p>
              </div>
            )}
          </div>

          {/* Botón iniciar */}
          <button
            className="mt-6 w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-3 rounded-full text-lg font-semibold transition"
            onClick={handleStartCall}
            disabled={!roomName || !userName}
          >
            Start Call
          </button>
        </div>
      </div>
    </div>
  );
}