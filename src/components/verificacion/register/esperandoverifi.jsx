import React from "react";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next"; //idioma

export default function EsperandoVerificacion() {
  const { t } = useTranslation(); //idioma

  return (
    <div className="min-h-screen bg-ligand-mix-dark flex flex-col items-center justify-center px-4 py-10 text-center">
      {/* Título estilizado Ligand */}
      <h1 className="font-pacifico text-fucsia text-9xl bg-backgroundDark rounded-lg">Ligand</h1>

      {/* Subtítulo */}
      <h2 className="text-white text-5xl font-semibold mb-5 mt-4">
        {t("esperandoVerificacion.titulo")} //idioma
      </h2>

      {/* Mensaje */}
      <p className="text-white/70 text-base mb-8 leading-relaxed">
        {t("esperandoVerificacion.mensajeLinea1")}<br /> //idioma
        {t("esperandoVerificacion.mensajeLinea2")} //idioma
      </p>

      {/* Icono de candado centrado */}
      <div className="p-4 rounded-full mb-10">
        <Lock size={48} color="#ffffff" strokeWidth={2.2} />
      </div>

      {/* Botón deshabilitado */}
      <button
        disabled
        className="bg-[#ff007a] text-white text-base font-semibold py-3 px-6 rounded-full opacity-95 cursor-not-allowed"
      >
        {t("esperandoVerificacion.boton")} //idioma
      </button>
    </div>
  );
}