import React, { useState, useEffect } from "react";
import EjemploSelfie from "./imagenes/selfie.png";
import EjemploDocumento from "./imagenes/documento.png";
import EjemploSelfieDocumento from "./imagenes/fotodocu.png";
import logoproncipal from './imagenes/logoprincipal.png';

export default function VerificacionIdentidad() {
  const [paso, setPaso] = useState(1);
  const [imagenes, setImagenes] = useState({
    selfie: null,
    documento: null,
    selfieDoc: null,
  });
  const [mostrarModalVideo, setMostrarModalVideo] = useState(false);

  const handleImagen = (e, tipo) => {
    const file = e.target.files[0];
    if (file) {
      setImagenes({ ...imagenes, [tipo]: URL.createObjectURL(file) });
      if (tipo === "selfie") setPaso(2);
      else if (tipo === "documento") setPaso(3);
    }
  };

  const calcularProgreso = () => {
    if (imagenes.selfie && imagenes.documento && imagenes.selfieDoc) return "100%";
    if (imagenes.selfie && imagenes.documento) return "66%";
    if (imagenes.selfie) return "33%";
    return "0%";
  };

  const pasosCompletos = imagenes.selfie && imagenes.documento && imagenes.selfieDoc;

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-ligand-mix-dark flex flex-col items-center justify-center px-4 py-10 relative">
      {/* Logo */}
      <div className="flex items-center justify-center">
        <img src={logoproncipal} alt="Logo" className="w-16 h-16 mt-[-35px]" />
        <span className="text-2xl text-zorrofucsia font-pacifico ml-[-5px] mt-[-30px]">Ligand</span>
      </div>

      <h1 className="text-white text-3xl font-bold mb-6">Verificar identidad</h1>

      {/* Barra de progreso */}
      <div className="w-full max-w-lg mb-8">
        <div className="w-full h-2 bg-gray-700 rounded-full">
          <div
            className="h-2 bg-[#ff007a] rounded-full transition-all duration-300"
            style={{ width: calcularProgreso() }}
          ></div>
        </div>
      </div>

      {/* Pasos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {[
          { label: "Selfie", tipo: "selfie", pasoMinimo: 1, imagen: EjemploSelfie },
          { label: "Documento de identidad", tipo: "documento", pasoMinimo: 2, imagen: EjemploDocumento },
          { label: "Selfie con documento", tipo: "selfieDoc", pasoMinimo: 3, imagen: EjemploSelfieDocumento },
        ].map(({ label, tipo, pasoMinimo, imagen }) => (
          <div
            key={tipo}
            className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center ${
              paso >= pasoMinimo ? "border-[#ff007a] bg-[#2b2d31]" : "border-gray-600 bg-[#1f2125] opacity-50"
            }`}
          >
            <div className="text-center mb-3 text-white font-semibold">{label}</div>
            <div className="w-32 h-32 bg-[#1a1c20] rounded-md mb-3 overflow-hidden flex items-center justify-center border border-dashed border-gray-500">
              <img
                src={imagenes[tipo] || imagen}
                alt={label}
                className="object-cover w-full h-full"
              />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImagen(e, tipo)}
              disabled={paso !== pasoMinimo}
              className="w-full file:py-2 file:px-4 file:rounded-lg file:border-none file:bg-[#ff007a] file:text-white cursor-pointer"
            />
          </div>
        ))}
      </div>

      {/* Botón flotante de video */}
      {pasosCompletos && (
        <button
          onClick={() => setMostrarModalVideo(true)}
          className="fixed bottom-8 right-8 bg-[#ff007a] hover:bg-[#e6006e] text-white font-bold px-6 py-3 rounded-full shadow-lg transition"
        >
          Grabar video con documento
        </button>
      )}

      {/* Modal video */}
      {mostrarModalVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#1a1c20] p-8 rounded-2xl shadow-xl w-full max-w-lg">
            <h2 className="text-white text-xl font-bold mb-4">Graba un video con tu documento</h2>
            <p className="text-white/70 mb-4 text-sm">
              Muestra tu rostro claramente y sostén tu documento de identidad frente a la cámara.
              Asegúrate de que esté bien iluminado y legible.
            </p>

            {/* Simulación de video (puedes usar react-webcam aquí) */}
            <div className="bg-black w-full h-56 mb-4 rounded-lg flex items-center justify-center text-white/30">
              [ Vista previa del video aquí ]
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setMostrarModalVideo(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => alert("Grabando...")}
                className="bg-[#ff007a] hover:bg-[#e6006e] text-white px-4 py-2 rounded-lg font-semibold"
              >
                Empezar grabación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
