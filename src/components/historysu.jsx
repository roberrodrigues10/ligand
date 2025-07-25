import React, { useRef, useState } from "react";
import { Home, MessageSquare, Star, UploadCloud, Camera, Trash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // idioma
import Header from "./header";

export default function SubirHistoria() {
  const { t } = useTranslation(); // idioma
  const [videoSrc, setVideoSrc] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
    }
  };

  const handleCameraClick = () => {
    alert(t("subirHistoria.alerta_grabacion")); // idioma
  };

  return (
    <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white p-6">
      {/* Header */}
      <Header />

      {/* Contenido */}
      <main className="bg-[#1f2125] rounded-2xl p-8 shadow-xl flex flex-col items-center max-w-xl mx-auto mt-32">
        <h2 className="text-2xl font-bold text-center mb-4 text-[#ff007a]">
          {t("subirHistoria.titulo")} // idioma
        </h2>

        {/* Vista previa */}
        {videoSrc ? (
          <div className="relative w-full mb-4">
            <video src={videoSrc} controls className="rounded-xl w-full" />
            <button
              onClick={() => setVideoSrc(null)}
              className="absolute top-2 right-2 bg-black/50 p-2 rounded-full hover:bg-black/70"
            >
              <Trash size={18} className="text-white" />
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4 items-center">
            <button
              onClick={handleCameraClick}
              className="bg-[#ff007a] hover:bg-[#e6006e] w-full px-6 py-4 rounded-xl flex items-center justify-center gap-3 font-semibold"
            >
              <Camera size={20} /> {t("subirHistoria.grabar")} // idioma
            </button>

            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-[#2b2d31] hover:bg-[#373a3f] w-full px-6 py-4 rounded-xl flex items-center justify-center gap-3 border border-[#ff007a]/40"
            >
              <UploadCloud size={20} /> {t("subirHistoria.subir")} // idioma
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              className="hidden"
              onChange={handleVideoUpload}
            />
          </div>
        )}

        {/* Botón publicar */}
        {videoSrc && (
          <button className="mt-6 bg-[#ff007a] hover:bg-[#e6006e] text-white px-8 py-3 rounded-full font-bold">
            {t("subirHistoria.publicar")} // idioma
          </button>
        )}
      </main>
    </div>
  );
}