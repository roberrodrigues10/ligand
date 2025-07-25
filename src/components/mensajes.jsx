import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // idioma
import Header from "./header";
 
 import {
  MessageSquare,
  Home,
  Star,
  Trash2,
  MoreVertical,
  Pencil,
  Ban,
  Languages,
} from "lucide-react";

export default function InterfazMensajes() {
  const { t } = useTranslation(); // idioma
  const [mensajes, setMensajes] = useState([
    { id: 1, texto: "¡Hola!", emisor: "usuario" },
    { id: 2, texto: "¿Cómo estás?", emisor: "usuario" },
    { id: 3, texto: "Muy bien, ¿y tú?", emisor: "otro" },
  ]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  const eliminarMensaje = (id) => {
    setMensajes((prev) => prev.filter((m) => m.id !== id));
  };

  const enviarMensaje = () => {
    if (nuevoMensaje.trim() === "") return;
    setMensajes((prev) => [
      ...prev,
      { id: Date.now(), texto: nuevoMensaje, emisor: "usuario" },
    ]);
    setNuevoMensaje("");
  };
  const navigate = useNavigate();
  

  return (
    <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white p-6">
      {/* Navegador superior */}
      <Header />
      {/* Contenedor del chat */}
      <div className="flex rounded-xl overflow-hidden shadow-lg h-[83vh] border border-[#ff007a]/10">
        {/* Sidebar de usuarios */}
        <aside className="w-1/3 bg-[#2b2d31] p-4 overflow-y-auto">
          <input
            type="text"
            placeholder={t('interfazMensajes.searchPlaceholder')}
            className="w-full mb-4 p-2 rounded-lg bg-[#1a1c20] text-white placeholder-white/60 outline-none"
          />
          {["SofiSweet", "Mia88", "JuanXtreme"].map((user, index) => (
            <div
              key={index}
              onClick={() => setMostrarOpciones(!mostrarOpciones)}
              className="flex justify-between items-center px-3 py-2 hover:bg-[#3a3d44] rounded-lg cursor-pointer"
            >
              <div>
                <p className="font-semibold">{user}</p>
                <p className="text-xs text-white/50">{t("interfazMensajes.previewMessage")}</p> // idioma
              </div>
              <span className="text-xs text-white/30">
                {["14:20", "13:02", t("interfazMensajes.yesterday")][index]} // idioma
              </span> 
            </div>
          ))}
        </aside>

        {/* Panel de conversación */}
        <section className="w-2/3 bg-[#0a0d10] flex flex-col justify-between">
          {/* Header contacto */}
          <div className="bg-[#2b2d31] px-5 py-3 flex justify-between items-center border-b border-[#ff007a]/20">
            <div className="flex items-center gap-3">
              <img
                src="https://i.pravatar.cc/40"
                className="w-10 h-10 rounded-full"
                alt="avatar"
              />
              <span className="font-semibold">SofiSweet</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setMostrarOpciones(!mostrarOpciones)}
                className="text-white hover:text-[#ff007a]"
              >
                <MoreVertical />
              </button>
              {mostrarOpciones && (
                <div className="absolute right-0 mt-2 bg-[#1f2125] border border-[#ff007a]/30 rounded-xl shadow-lg z-50 w-48">
                  <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm">
                    <Pencil size={16} /> {t("interfazMensajes.rename")} // idioma
                  </button> 
                  <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm text-red-400">
                    <Ban size={16} /> {t("interfazMensajes.block")} // idioma
                  </button>
                  <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm">
                    <Languages size={16} /> {t("interfazMensajes.translate")} // idioma
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.emisor === "usuario" ? "justify-end" : "justify-start"} group`}
              >
                <div
                  className={`relative px-4 py-2 rounded-2xl max-w-xs text-sm ${
                    m.emisor === "usuario"
                      ? "bg-[#ff007a] text-white rounded-br-none"
                      : "bg-[#2b2d31] text-white/80 rounded-bl-none"
                  }`}
                >
                  {m.texto}
                  <button
                    onClick={() => eliminarMensaje(m.id)}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition text-white/50 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Input mensaje */}
          <div className="bg-[#2b2d31] p-4 border-t border-[#ff007a]/20 flex gap-3">
            <input
              type="text"
              placeholder={t('interfazMensajes.inputPlaceholder')}
              className="flex-1 bg-[#1a1c20] text-white px-4 py-2 rounded-full outline-none"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
            />
            <button
              onClick={enviarMensaje}
              className="bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-2 rounded-full font-semibold"
            >
              {t("interfazMensajes.send")} // idioma
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}