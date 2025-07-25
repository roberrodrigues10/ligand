import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./header";
import { useTranslation } from "react-i18next"; // idioma


import {
  Home,
  MessageSquare,
  Star,
  MoreVertical,
  PhoneCall,
  Ban,
  Trash2,
} from "lucide-react";
import logoproncipal from "./imagenes/logoprincipal.png";

export default function Favoritos() {
  const [favoritos, setFavoritos] = useState([
    { nombre: "Mia88", descripcionKey: "niceConnection", estadoKey: "online" },
    { nombre: "LeoFlex", descripcionKey: "interestingChat", estadoKey: "offline" },
    { nombre: "ValePink", descripcionKey: "veryFunny", estadoKey: "online" },
  ]);

  const { t } = useTranslation(); // idioma
  const [opcionesAbiertas, setOpcionesAbiertas] = useState(null);
  const navigate = useNavigate();

  const eliminarFavorito = (index) => {
    setFavoritos((prev) => prev.filter((_, i) => i !== index));
  };

  const bloquearUsuario = (nombre) => {
    alert(`Usuario ${nombre} bloqueado.`);
  };
  return (
    <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white p-6">
      {/* Header */}
        <Header />
      {/* Título */}
      <h2 className="text-2xl font-bold mb-4 text-center text-[#ff007a]">{t("favorites.title")}</h2>

      {/* Lista de favoritos */}
      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        {favoritos.map((fav, index) => (
          <div
            key={index}
            className="bg-[#1f2125] rounded-xl p-5 shadow-lg border border-[#ff007a]/10 relative"
          >
            {/* Parte superior */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#ff007a] rounded-full flex items-center justify-center font-bold text-black text-lg">
                  {fav.nombre.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-base">{fav.nombre}</p>
                  <p
                    className={`text-sm ${
                      fav.estado === "Online" ? "text-green-400" : "text-gray-400"
                    }`}
                  >
                    {t(`favorites.status.${fav.estadoKey}`)}
                  </p>
                </div>
              </div>

              {/* Botón de opciones */}
              <div className="relative">
                <button
                  onClick={() =>
                    setOpcionesAbiertas(opcionesAbiertas === index ? null : index)
                  }
                  className="text-white/50 hover:text-white"
                >
                  <MoreVertical size={20} />
                </button>

                {opcionesAbiertas === index && (
                  <div className="absolute right-0 mt-2 bg-[#2b2d31] border border-[#ff007a]/30 rounded-xl shadow-xl w-44 z-50">
                    <button
                      onClick={() => bloquearUsuario(fav.nombre)}
                      className="flex items-center w-full px-4 py-2 gap-2 hover:bg-[#373a40] text-sm text-red-400"
                    >
                      <Ban size={16} /> {t("favorites.block")}
                    </button>
                    <button
                      onClick={() => eliminarFavorito(index)}
                      className="flex items-center w-full px-4 py-2 gap-2 hover:bg-[#373a40] text-sm"
                    >
                      <Trash2 size={16} /> {t("favorites.remove")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Descripción */}
            <p className="text-white/70 text-sm italic mb-4">{t(`favorites.description.${fav.descripcionKey}`)}</p>

            {/* Botones */}
            <div className="flex gap-3">
              <button className="flex-1 bg-[#ff007a] hover:bg-[#e6006e] text-white px-3 py-2 rounded-full text-sm">
                {t("favorites.chat")}
              </button>
              <button className="flex-1 bg-[#2b2d31] hover:bg-[#373a40] text-white/80 px-3 py-2 rounded-full text-sm flex items-center justify-center gap-1">
                <PhoneCall size={16} /> {t("favorites.call")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
