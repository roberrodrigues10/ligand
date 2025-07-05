import React, { useEffect } from "react";
import { Lock } from "lucide-react";

export default function EsperandoVerificacion() {

  return (
    <div className="min-h-screen bg-ligand-mix-dark flex flex-col items-center justify-center px-4 py-10 text-center">
      {/* Título estilizado Ligand */}
       <h1 className="font-pacifico text-fucsia text-9xl bg-backgroundDark rounded-lg">Ligand</h1>


      {/* Subtítulo */}
      <h2 className="text-white text-5xl font-semibold mb-5 mt-4">
        Esperando verificación
      </h2>

      {/* Mensaje */}
      <p className="text-white/70 text-base mb-8 leading-relaxed">
        Gracias por registrarte.<br />
        Te notificaremos cuando ya estés verificada.
      </p>

      {/* Icono de candado centrado */}
      <div className=" p-4 rounded-full mb-10">
        <Lock size={48} color="#ffffff" strokeWidth={2.2} />
      </div>

      {/* Botón deshabilitado */}
      <button
        disabled
        className="bg-[#ff007a] text-white text-base font-semibold py-3 px-6 rounded-full opacity-95 cursor-not-allowed"
      >
        En proceso de verificación
      </button>
    </div>
  );
}
