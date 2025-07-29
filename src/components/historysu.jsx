import React, { useRef, useState } from "react";
import {
  Home,
  MessageSquare,
  Star,
  UploadCloud,
  Camera,
  Trash,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "./header";
import axios from "../api/axios"; // Asegúrate que este sea tu axios con withCredentials

export default function SubirHistoria() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleVideoUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const isImage = selectedFile.type.startsWith("image/");
    const isVideo = selectedFile.type.startsWith("video/");

    if (!isImage && !isVideo) {
      alert("Solo se permiten imágenes o videos.");
      return;
    }

    // Validación de duración del video (máximo 5s)
    if (isVideo) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 5) {
          alert("El video no puede durar más de 5 segundos.");
          return;
        }
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
      };
      video.src = URL.createObjectURL(selectedFile);
    } else {
      // Si es imagen
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleCameraClick = () => {
    navigate("/VideoRecorderUpload");
  };

  const handleSubmit = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("source_type", "upload");

    try {
      setLoading(true);
      const res = await axios.post("/stories", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });

      alert("✅ Historia subida correctamente");
    } catch (error) {
      if (error.response?.status === 422) {
        alert("❌ Ya tienes una historia activa.");
      } else if (error.response?.status === 403) {
        alert("❌ No estás autorizado para subir historias.");
      } else {
        alert("❌ Error al subir la historia");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ligand-mix-dark text-white p-6">
      <Header />

      <main className="bg-[#1f2125] rounded-2xl p-8 shadow-xl flex flex-col items-center max-w-xl mx-auto mt-32">
        <h2 className="text-2xl font-bold text-center mb-4 text-[#ff007a]">
          {t("subirHistoria.titulo")}
        </h2>

        {previewUrl ? (
          <div className="relative w-full mb-4">
            {file.type.startsWith("video/") ? (
              <video src={previewUrl} controls className="rounded-xl w-full" />
            ) : (
              <img src={previewUrl} alt="preview" className="rounded-xl w-full" />
            )}
            <button
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
              }}
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
              <Camera size={20} /> {t("subirHistoria.grabar")}
            </button>

            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-[#2b2d31] hover:bg-[#373a3f] w-full px-6 py-4 rounded-xl flex items-center justify-center gap-3 border border-[#ff007a]/40"
            >
              <UploadCloud size={20} /> {t("subirHistoria.subir")}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              className="hidden"
              onChange={handleVideoUpload}
            />
          </div>
        )}

        {file && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 bg-[#ff007a] hover:bg-[#e6006e] text-white px-8 py-3 rounded-full font-bold disabled:opacity-50"
          >
            {loading
              ? t("subirHistoria.cargando") || "Subiendo..."
              : t("subirHistoria.publicar")}
          </button>
        )}
      </main>
    </div>
  );
}