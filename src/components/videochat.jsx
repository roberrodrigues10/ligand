import React, { useState, useEffect } from "react";
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

export default function VideoChat() {
  const [tiempo, setTiempo] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [camaraPrincipal, setCamaraPrincipal] = useState("modelo");
  const [mostrarRegalos, setMostrarRegalos] = useState(false);

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
    setCamaraPrincipal((prev) => (prev === "modelo" ? "usuario" : "modelo"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white p-4">
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
        </div>
      </div>

      <div className="flex gap-6 mt-4">
        {/* ZONA VIDEO */}
        <div className="flex-1 bg-[#1f2125] rounded-2xl overflow-hidden relative flex items-center justify-center h-[500px] transition-all duration-500">
          {/* Cámara principal */}
          <img
            src={
              camaraPrincipal === "modelo"
                ? "https://i.pravatar.cc/800"
                : "https://i.pravatar.cc/700?u=client"
            }
            className="w-full h-full object-cover transition-all duration-500"
            alt="video principal"
          />

          {/* Cámara mini flotante */}
          <div className="absolute bottom-4 left-4 w-40 h-28 rounded-lg overflow-hidden border-2 border-[#ff007a] shadow-lg">
            <img
              src={
                camaraPrincipal === "modelo"
                  ? "https://i.pravatar.cc/700?u=client"
                  : "https://i.pravatar.cc/800"
              }
              className="w-full h-full object-cover"
              alt="video mini"
            />
          </div>
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

          {/* Modal de regalos (pedir regalos) */}
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

    </div>
  );
}
