import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./header";

export default function PreCallLobby() {
  const [selectedCamera, setSelectedCamera] = useState("Facetime HD Camera");
  const [selectedMic, setSelectedMic] = useState("Micrófono interno");
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white">
      {/* HEADER full width */}
      <div className="w-full px-6 pt-6">
        <Header />
      </div>

      {/* CENTRO de la pantalla */}
      <div className="flex justify-center items-center px-6 mt-[-20px]">
        <div className="bg-[#1f2125] rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-md w-full mt-6">
          {/* Simulación de cámara */}
          <div className="w-full h-60 rounded-xl overflow-hidden mb-4 bg-black/30">
            <img
              src="https://i.pravatar.cc/400"
              alt="preview"
              className="object-cover w-full h-full"
            />
          </div>

          {/* Nombre y estado */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold">Mandy, 23</h2>
            <p className="text-green-400 text-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Active
            </p>
          </div>

          {/* Selector de dispositivos */}
          <div className="w-full space-y-4">
            <div>
              <label className="text-sm text-white/70">Camera</label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg bg-[#2b2d31] text-white outline-none"
              >
                <option>Facetime HD Camera</option>
                <option>Logitech C920</option>
                <option>Cam virtual OBS</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-white/70">Microphone</label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg bg-[#2b2d31] text-white outline-none"
              >
                <option>Micrófono interno</option>
                <option>Blue Yeti</option>
                <option>Micrófono USB</option>
              </select>
            </div>
          </div>

          {/* Botón iniciar */}
          <button className="mt-6 w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-3 rounded-full text-lg font-semibold transition"
          onClick={() => navigate("/videochat")}
          >
            Start Call
          </button>
        </div>
      </div>
    </div>
  );
}