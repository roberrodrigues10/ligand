import React, { useState } from "react";
import EjemploSelfie from "../../imagenes/selfie.png";
import EjemploDocumento from "../../imagenes/documento.png";
import EjemploSelfieDocumento from "../../imagenes/fotodocu.png";
import logoproncipal from '../../imagenes/logoprincipal.png';
import VideoRecorder from "./recorderGen";
import api from "../../../api/axios";
import Header from "../../header";
import { useNavigate } from "react-router-dom";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function VerificacionIdentidad() {
  const [paso, setPaso] = useState(1);
  const [imagenes, setImagenes] = useState({
    selfie: null,
    documento: null,
    selfieDoc: null,
  });
  const [previewImagenes, setPreviewImagenes] = useState({
    selfie: null,
    documento: null,
    selfieDoc: null,
  });
  const [mostrarModalVideo, setMostrarModalVideo] = useState(false);
  const [video, setVideo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const [mensaje, setMensaje] = useState(null);

  const handleImagen = (e, tipo) => {
    const file = e.target.files[0];
    if (file) {
      setImagenes(prev => ({ ...prev, [tipo]: file }));
      setPreviewImagenes(prev => ({ ...prev, [tipo]: URL.createObjectURL(file) }));
      if (tipo === "selfie") setPaso(2);
      else if (tipo === "documento") setPaso(3);
    }
  };

  const calcularProgreso = () => {
    const completas = Object.values(imagenes).filter(Boolean).length;
    return completas === 3 ? "100%" : completas === 2 ? "66%" : completas === 1 ? "33%" : "0%";
  };

  const pasosCompletos = imagenes.selfie && imagenes.documento && imagenes.selfieDoc;

  const handleEnviarVerificacion = async () => {
    if (!video || !pasosCompletos) {
      alert("Por favor completa todos los pasos antes de enviar.");
      return;
    }

    const tiposVideoValidos = ['video/webm', 'video/mp4'];
    if (!tiposVideoValidos.includes(video.type)) {
      alert(`El tipo de video '${video.type}' no es válido. Se requiere: video/webm o video/mp4`);
      return;
    }

    const formData = new FormData();
    formData.append("selfie", imagenes.selfie);
    formData.append("documento", imagenes.documento);
    formData.append("selfie_doc", imagenes.selfieDoc);
    formData.append("video", video);

    try {
      setEnviando(true);
      const response = await api.post(`${API_BASE_URL}/api/verificacion`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImagenes({ selfie: null, documento: null, selfieDoc: null });
      setPreviewImagenes({ selfie: null, documento: null, selfieDoc: null });
      setVideo(null);
      setPaso(1);
      setMensaje({ tipo: "exito", texto: "✅ Verificación enviada correctamente. Serás redirigido..." });
      
      // ✅ CORRECCIÓN: Agregar los paréntesis para ejecutar la función
      setTimeout(() => {
        window.location.reload();
      }, 2000); // Esperar 2 segundos antes de recargar
      
    } catch (error) {
      console.error("❌ Error al enviar verificación:", error);
      if (error.response?.status === 422) {
        const errores = error.response.data.errors || {};
        let mensajeError = "Errores de validación encontrados:\n\n";
        Object.keys(errores).forEach(campo => {
          mensajeError += `• ${campo}: ${errores[campo].join(', ')}\n`;
        });
        alert(mensajeError);
      } else if (error.response?.status === 413) {
        alert("Los archivos son demasiado grandes. Por favor reduce el tamaño del video.");
      } else {
        alert("Error al enviar la verificación. Por favor intenta nuevamente.");
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-ligand-mix-dark min-h-screen flex flex-col">
      {/* ✅ Header arriba */}
      <Header />

      {/* Contenido principal centrado */}
      <div className="flex-grow flex flex-col items-center justify-center px-4 py-10">

        <h1 className="text-white text-3xl font-bold mb-6">Verificar identidad</h1>

        <div className="w-full max-w-lg mb-8">
          <div className="w-full h-2 bg-gray-700 rounded-full">
            <div
              className="h-2 bg-[#ff007a] rounded-full transition-all duration-300"
              style={{ width: calcularProgreso() }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-6">
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
                  src={previewImagenes[tipo] || imagen}
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

        {/* Mostrar mensaje de éxito si existe */}
        {mensaje && mensaje.tipo === "exito" && (
          <div className="mb-4 p-4 bg-green-900 bg-opacity-50 rounded-lg border border-green-500">
            <p className="text-green-300 text-center">{mensaje.texto}</p>
          </div>
        )}

        {video && (
          <div className="mb-4 p-4 bg-green-900 bg-opacity-50 rounded-lg border border-green-500">
            <p className="text-green-300 text-center">
              ✅ Video grabado correctamente ({(video.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          </div>
        )}

        {pasosCompletos && !video && (
          <button
            onClick={() => setMostrarModalVideo(true)}
            className="mb-6 bg-[#ff007a] hover:bg-[#e6006e] text-white font-bold px-6 py-3 rounded-full shadow-lg transition"
          >
            Grabar video con documento
          </button>
        )}

        {pasosCompletos && video && (
          <button
            onClick={handleEnviarVerificacion}
            disabled={enviando}
            className="mt-4 bg-[#ff007a] hover:bg-[#e6006e] text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? "Enviando..." : "Enviar verificación"}
          </button>
        )}
      </div>

      {/* Modal para grabar video */}
      {mostrarModalVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1c20] p-8 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-xl font-bold mb-4">Graba un video con tu documento</h2>
            <p className="text-white/70 mb-4 text-sm">
              Muestra tu rostro claramente y sostén tu documento de identidad frente a la cámara.
              Asegúrate de que esté bien iluminado y legible.
            </p>
            <VideoRecorder
              onRecorded={(file) => {
                setVideo(file);
                setMostrarModalVideo(false);
              }}
              onCancel={() => setMostrarModalVideo(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}