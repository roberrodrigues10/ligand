import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoproncipal from "../../imagenes/logoprincipal.png";
import { useTranslation } from "react-i18next";

export default function InicioVerificacion() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

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

      <h1 className="text-white text-3xl font-bold mb-4">{t("verificacion.titulo")}</h1>
      <p className="text-white/70 mb-6 text-center max-w-md">{t("verificacion.descripcion")}</p>

      <button
        onClick={() => setMostrarModal(true)}
        className="bg-[#ff007a] hover:bg-[#e6006e] text-white font-bold py-3 px-6 rounded-xl transition"
      >
        {t("verificacion.boton")}
      </button>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div
            className="bg-[#1a1c20] rounded-2xl p-8 max-w-md w-full relative shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white text-xl font-bold mb-4">{t("verificacion.modal.titulo")}</h2>
            <div className="text-white/70 text-sm mb-6 max-h-64 overflow-y-auto">
              <p className="mb-2">{t("verificacion.modal.parrafo1")}</p>
              <p className="mb-2">{t("verificacion.modal.parrafo2")}</p>
              <p>{t("verificacion.modal.parrafo3")}</p>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setMostrarModal(false)}
                className="text-white bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg"
              >
                {t("verificacion.modal.cancelar")}
              </button>
              <button
                onClick={aceptarTerminos}
                className="bg-[#ff007a] hover:bg-[#e6006e] text-white px-4 py-2 rounded-lg font-semibold"
              >
                {t("verificacion.modal.aceptar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
