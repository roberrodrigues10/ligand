import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logoproncipal from "./imagenes/logoprincipal.png";

export default function InicioVerificacion() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Dancing+Script&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const aceptarTerminos = () => {
    setMostrarModal(false);
    navigate("/verificacion");
  };

  return (
    <div className="min-h-screen bg-ligand-mix-dark flex flex-col items-center justify-center px-4 py-10">
      {/* Logo y título */}
      <div className="flex items-center justify-center gap-1 mb- mt-[-25px]">
        <img src={logoproncipal} alt="Logo" className="w-16 h-16" />
        <span className="text-2xl font-pacifico text-zorrofucsia ml-[-10px]">Ligand</span>
      </div>

      <h1 className="text-white text-3xl font-bold mb-4">Verificación de identidad</h1>
      <p className="text-white/70 mb-6 text-center max-w-md">
        Para comenzar, debes aceptar nuestros Términos y Condiciones.
      </p>

      <button
        onClick={() => setMostrarModal(true)}
        className="bg-[#ff007a] hover:bg-[#e6006e] text-white font-bold py-3 px-6 rounded-xl transition"
      >
        Empezar verificación
      </button>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div
            className="bg-[#1a1c20] rounded-2xl p-8 max-w-md w-full relative shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white text-xl font-bold mb-4">Términos y Condiciones</h2>
            <div className="text-white/70 text-sm mb-6 max-h-64 overflow-y-auto">
              <p className="mb-2">
                Al continuar con la verificación, aceptas que la información proporcionada es veraz y que los documentos
                enviados son válidos. Nos reservamos el derecho de rechazar cualquier intento de verificación sospechoso
                o fraudulento.
              </p>
              <p className="mb-2">
                Tus datos serán utilizados únicamente para validar tu identidad con fines de seguridad en la plataforma.
              </p>
              <p>
                Si estás de acuerdo con estos términos, haz clic en "Aceptar y continuar".
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setMostrarModal(false)}
                className="text-white bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={aceptarTerminos}
                className="bg-[#ff007a] hover:bg-[#e6006e] text-white px-4 py-2 rounded-lg font-semibold"
              >
                Aceptar y continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
