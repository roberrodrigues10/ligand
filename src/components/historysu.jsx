import React, { useRef, useState, useEffect } from "react";
import {
  UploadCloud,
  Camera,
  Trash,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Sparkles,
  Video,
  Square,
  RotateCcw,
  Heart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "./header";
import axios from "../api/axios";

export default function SubirHistoria() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Estados para historia existente
  const [existingStory, setExistingStory] = useState(null);
  const [loadingStory, setLoadingStory] = useState(true);
  const [showCamera, setShowCamera] = useState(false);

  // Estados para grabación de video
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [recording, setRecording] = useState(false);
  const streamRef = useRef(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [isFlipped, setIsFlipped] = useState(true);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // Verificar si ya existe una historia
  useEffect(() => {
    checkExistingStory();
  }, []);

  const checkExistingStory = async () => {
    try {
      setLoadingStory(true);
      
      const token = sessionStorage.getItem('token');
      
      console.log('=== TOKEN DEBUG ===');
      console.log('🔑 Token exists:', !!token);
      console.log('🔑 Token length:', token?.length);
      console.log('🔑 Token preview:', token?.substring(0, 50) + '...');
      console.log('🔑 Token type:', typeof token);
      console.log('🔑 Is token empty string?', token === '');
      console.log('🔑 Is token null?', token === null);
      console.log('🔑 Is token undefined?', token === undefined);
      
      if (!token || token === 'null' || token === 'undefined') {
        console.warn('❌ Token inválido o no encontrado');
        return;
      }
      
      const config = {
        skipInterceptor: true,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false,
      };
      
      console.log('=== REQUEST DEBUG ===');
      console.log('🌐 URL:', "/api/stories/my-story");
      console.log('🔗 Base URL:', import.meta.env.VITE_API_BASE_URL);
      console.log('📤 Headers:', config.headers);
      console.log('🔑 Authorization header:', config.headers.Authorization);
      
      const response = await axios.get("/api/stories/my-story", config);
      
      console.log('✅ Response received:', response.data);
      
      if (response.data) {
        setExistingStory(response.data);
      }
    } catch (error) {
      console.log('=== ERROR DEBUG ===');
      console.error('❌ Full error object:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error response headers:', error.response?.headers);
      console.error('❌ Error config:', error.config);
      console.error('❌ Request URL:', error.config?.url);
      console.error('❌ Request headers:', error.config?.headers);
      
      if (error.response?.status === 401) {
        console.error('🚫 401 Unauthorized - Posibles causas:');
        console.error('   1. Token expirado');
        console.error('   2. Token inválido');
        console.error('   3. Middleware no aplicado en la ruta');
        console.error('   4. Usuario no existe en la base de datos');
        console.error('   5. Configuración incorrecta de Sanctum');
      }
    } finally {
      setLoadingStory(false);
    }
  };

  // Inicializar cámara cuando se activa el modo grabación
  useEffect(() => {
    if (showCamera) {
      initCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [showCamera]);

  const initCamera = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === "videoinput");

      setDevices(videoDevices);

      if (videoDevices.length > 0) {
        const defaultDeviceId = videoDevices[0].deviceId;
        setSelectedDeviceId(defaultDeviceId);
        await startCamera(defaultDeviceId);
      } else {
        alert("No se encontró ninguna cámara disponible.");
      }
    } catch (error) {
      console.error("❌ Error al enumerar dispositivos:", error);
      alert("Hubo un problema al acceder a la cámara/micrófono.");
    }
  };

  const startCamera = async (deviceId) => {
    if (!videoRef.current) return;

    setRecording(false);

    try {
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: true,
      };

      console.log("🎥 Solicitando acceso a cámara y micrófono...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      console.log("✅ Cámara y micrófono iniciados");
    } catch (err) {
      console.error("❌ Error accediendo a la cámara:", err);
      if (err.name === "NotAllowedError") {
        alert("Permiso denegado. Por favor, permite acceso en tu navegador.");
      } else if (err.name === "NotFoundError") {
        alert("No se encontró cámara o micrófono.");
      } else {
        alert("Error al acceder: " + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  useEffect(() => {
    if (selectedDeviceId && showCamera) {
      startCamera(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const startRecording = () => {
    setRecordingTime(0);

    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);

    if (!streamRef.current) {
      alert("No hay acceso a la cámara");
      return;
    }

    const chunks = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm; codecs=vp9",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      if (chunks.length === 0) {
        console.warn("No se grabó ningún dato.");
        return;
      }

      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);

      setFile(blob);
      setPreviewUrl(url);
      setRecording(false);
      setShowCamera(false);
    };

    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
    console.log("Grabación iniciada");
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      console.log("Grabación detenida");
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const switchCamera = () => {
    const currentIndex = devices.findIndex(device => device.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  const handleVideoUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const isImage = selectedFile.type.startsWith("image/");
    const isVideo = selectedFile.type.startsWith("video/");

    if (!isImage && !isVideo) {
      alert("Solo se permiten imágenes o videos.");
      return;
    }

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
        setShowCamera(false);
      };
      video.src = URL.createObjectURL(selectedFile);
    } else {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setShowCamera(false);
    }
  };

  const handleCameraClick = () => {
    setShowCamera(true);
    setFile(null);
    setPreviewUrl(null);
  };

  const deleteRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setPreviewUrl(null);
    setFile(null);
    setVideoBlob(null);
    setMediaRecorder(null);
    setRecording(false);
    setRecordingTime(0);
    setShowCamera(false);
    console.log("Grabación eliminada");
  };

  const handleSubmit = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("source_type", file instanceof Blob ? "record" : "upload");

    try {
      setLoading(true);
      const res = await axios.post("api/stories", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: false,
      });

      alert("✅ Historia subida correctamente, esperando aprobación");
      await checkExistingStory();
      setFile(null);
      setPreviewUrl(null);
    } catch (error) {
      if (error.response?.status === 422) {
        const message = error.response.data.message;
        if (message.includes('esperando aprobación')) {
          alert("❌ Ya tienes una historia esperando aprobación.");
        } else {
          alert("❌ Ya tienes una historia activa.");
        }
      } else if (error.response?.status === 403) {
        alert("❌ No estás autorizado para subir historias.");
      } else {
        alert("❌ Error al subir la historia");
      }
    } finally {
      setLoading(false);
    }
  };

  const viewStory = () => {
    if (existingStory?.file_url) {
      window.open(existingStory.file_url, '_blank');
    }
  };

  const deleteStory = async () => {
    if (!confirm("¿Estás seguro de eliminar tu historia?")) return;

    try {
      await axios.delete(`/api/stories/${existingStory.id}`, {
        withCredentials: false,
      });
      alert("✅ Historia eliminada correctamente");
      setExistingStory(null);
    } catch (error) {
      alert("❌ Error al eliminar la historia");
    }
  };

  // Componente de Loading
  const LoadingComponent = () => (
    <div className="min-h-screen bg-ligand-mix-dark text-white flex items-center justify-center">
      <div className="bg-[#1f2125] rounded-2xl p-8 shadow-xl max-w-sm mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ff007a] mx-auto mb-4"></div>
          <p className="text-white/70">Cargando...</p>
        </div>
      </div>
    </div>
  );

  // Componente de Estado de Historia Existente
  const ExistingStoryStatus = ({ story }) => {
    const isApproved = story.status === 'approved';
    const isPending = story.status === 'pending';
    const isRejected = story.status === 'rejected';

    return (
      <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-sm mx-auto mb-6">
        <div className="bg-[#2b2d31] border border-yellow-500/30 rounded-xl p-4 text-center">
          {isPending && (
            <>
              <Clock className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-yellow-500 mb-1">
                Esperando Aprobación
              </h2>
              <p className="text-white/70 text-sm">
                Tu historia está siendo revisada. Te notificaremos cuando sea aprobada.
              </p>
            </>
          )}

          {isApproved && (
            <>
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-green-500 mb-1">
                ¡Historia Aprobada!
              </h2>
              <p className="text-white/70 text-sm mb-2">
                Tu historia ha sido aprobada y está visible para otros usuarios.
              </p>
              {story.views_count > 0 && (
                <p className="text-[#ff007a] font-semibold text-sm">
                  👁️ {story.views_count} visualizaciones
                </p>
              )}
            </>
          )}

          {isRejected && (
            <>
              <XCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-red-500 mb-1">
                Historia Rechazada
              </h2>
              <p className="text-white/70 text-sm mb-2">
                {story.rejection_reason || "Tu historia no cumplió con nuestras políticas."}
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  // Componente de Vista Previa de Historia
  const StoryPreview = ({ story }) => (
    <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-sm mx-auto mb-6">
      {story?.file_url && (
        <div className="bg-[#2b2d31] rounded-2xl overflow-hidden">
          {story.file_url.includes('.mp4') || story.file_url.includes('.webm') ? (
            <video 
              src={`${import.meta.env.VITE_API_BASE_URL}${story.file_url}`}
              className="w-full h-[300px] object-cover"
              controls={story.status === 'approved'}
            />
          ) : (
            <img 
              src={story.file_url} 
              alt="Historia" 
              className="w-full object-cover"
            />
          )}
        </div>
      )}
    </div>
  );

  // Componente de Botones de Acciones para Historia Existente
  const StoryActions = ({ story }) => {
    const isApproved = story.status === 'approved';
    const isPending = story.status === 'pending';
    const isRejected = story.status === 'rejected';

    return (
      <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-sm mx-auto">
        <div className="flex gap-4 justify-center">
          {isApproved && (
            <button
              onClick={viewStory}
              className="bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-colors"
            >
              <Eye size={18} />
              Ver Historia
            </button>
          )}

          {isRejected && (
            <button
              onClick={deleteStory}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-colors"
            >
              <Trash size={18} />
              Eliminar y Crear Nueva
            </button>
          )}

          {(isPending || isApproved) && (
            <button
              onClick={deleteStory}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-full font-bold flex items-center gap-2 transition-colors"
            >
              <Trash size={16} />
              Eliminar
            </button>
          )}
        </div>
      </div>
    );
  };

  // Componente de Encabezado Principal
  const MainTitle = () => (
    <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-xl mx-auto mb-6">
      <div className="flex items-center gap-3 justify-center">
        <Sparkles className="w-8 h-8 text-[#ff007a]" />
        <h2 className="text-2xl font-bold text-[#ff007a]">
          {t("subirHistoria.titulo") || "Subir Historia"}
        </h2>
      </div>
    </div>
  );

  // Componente de Cámara
  const CameraComponent = () => (
    <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-xl mx-auto mb-6">
      {/* Selector de cámara */}
      {devices.length > 1 && (
        <div className="bg-[#2b2d31] rounded-xl p-3 mb-3 border border-[#ff007a]/30">
          <label className="block text-xs font-semibold text-white/70 mb-2 flex items-center gap-2">
            <Camera className="w-3 h-3 text-[#ff007a]" />
            Selecciona tu cámara
          </label>
          <select
            value={selectedDeviceId || ""}
            onChange={e => setSelectedDeviceId(e.target.value)}
            className="w-full p-2 bg-[#1f2125] border border-[#ff007a]/40 rounded-lg text-white text-sm focus:border-[#ff007a] focus:outline-none transition-colors"
          >
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Cámara ${device.deviceId}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Área de video */}
      <div className="relative w-full h-80 bg-[#2b2d31] rounded-2xl overflow-hidden mb-4">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          className={`w-full h-full object-cover ${isFlipped ? 'scale-x-[-1]' : ''}`}
        />
        
        {/* Overlay de grabación */}
        {recording && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-3 py-2 rounded-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold">REC</span>
            </div>
            <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-full">
              <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
            </div>
          </div>
        )}

        {/* Botón cambiar cámara */}
        {devices.length > 1 && (
          <button
            onClick={switchCamera}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-10"
            disabled={recording}
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Controles de grabación */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-4 z-10">
          {!recording && (
            <button
              onClick={startRecording}
              className="w-16 h-16 bg-[#ff007a] hover:bg-[#e6006e] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transform transition-all duration-200"
            >
              <Video className="w-7 h-7 text-white" />
            </button>
          )}

          {recording && (
            <button
              onClick={stopRecording}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transform transition-all duration-200"
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          )}
        </div>
      </div>

      {/* Botón cancelar */}
      <button
        onClick={() => setShowCamera(false)}
        className="w-full bg-[#2b2d31] hover:bg-[#373a3f] text-white px-4 py-2 rounded-xl border border-[#ff007a]/40 transition-colors text-sm"
      >
        Cancelar
      </button>
    </div>
  );

  // Componente de Vista Previa de Archivo
  const FilePreview = () => (
    <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-xl mx-auto mb-6">
      <div className="relative w-full">
        <div className="w-full h-80 bg-[#2b2d31] rounded-2xl overflow-hidden">
          {file && file.type && file.type.startsWith("video/") ? (
            <video src={previewUrl} controls className="w-full h-full object-cover" />
          ) : (
            <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
          )}
        </div>
        <button
          onClick={deleteRecording}
          className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full hover:bg-black/70 transition-colors z-10"
        >
          <Trash size={18} className="text-white" />
        </button>
      </div>
    </div>
  );

  // Componente de Botones de Acción Principal
  const ActionButtons = () => (
    <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-xl mx-auto mb-6">
      <div className="flex flex-col gap-3 items-center">
        <button
          onClick={handleCameraClick}
          className="bg-[#ff007a] hover:bg-[#e6006e] w-full px-6 py-3 rounded-xl flex items-center justify-center gap-3 font-semibold transition-colors"
        >
          <Camera size={20} /> {t("subirHistoria.grabar") || "Grabar Video"}
        </button>

        <button
          onClick={() => fileInputRef.current.click()}
          className="bg-[#2b2d31] hover:bg-[#373a3f] w-full px-6 py-3 rounded-xl flex items-center justify-center gap-3 border border-[#ff007a]/40 transition-colors"
        >
          <UploadCloud size={20} /> {t("subirHistoria.subir") || "Subir Archivo"}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,video/*"
          className="hidden"
          onChange={handleVideoUpload}
        />
      </div>
    </div>
  );

  // Componente de Botón de Publicar
  const PublishButton = () => (
    <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-xl mx-auto mb-6">
      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-[#ff007a] hover:bg-[#e6006e] text-white px-8 py-3 rounded-full font-bold disabled:opacity-50 transition-colors w-full"
        >
          {loading
            ? t("subirHistoria.cargando") || "Subiendo..."
            : t("subirHistoria.publicar") || "Publicar Historia"}
        </button>
      </div>
    </div>
  );

  // Componente de Consejo
  const TipComponent = () => (
    <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-xl mx-auto">
      <div className="bg-[#2b2d31] border border-[#ff007a]/30 rounded-xl p-4 text-center">
        <p className="text-white text-sm mb-2 font-semibold flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-[#ff007a]" />
          📱 Consejo
        </p>
        <p className="text-white/70 text-sm">
          Las historias pasan por aprobación antes de ser públicas. Los videos no pueden durar más de 5 segundos.
        </p>
      </div>
    </div>
  );

  // Renderizado principal
  if (loadingStory) {
    return (
      <div className="min-h-screen bg-ligand-mix-dark text-white flex items-center justify-center p-6">
        <div className="bg-[#1f2125] rounded-2xl p-8 shadow-xl max-w-sm w-full mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ff007a] mx-auto mb-4"></div>
            <p className="text-white/70">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si ya existe una historia
  if (existingStory) {
    const isApproved = existingStory.status === 'approved';
    const isPending = existingStory.status === 'pending';
    const isRejected = existingStory.status === 'rejected';

    return (
      <div className="min-h-screen bg-ligand-mix-dark text-white p-6">
        <Header />
        
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
          {/* Contenedor principal único para historia existente */}
          <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-sm w-full mx-auto">
            {/* Estado de la historia */}
            <div className="bg-[#2b2d31] border border-yellow-500/30 rounded-xl p-4 text-center mb-6">
              {isPending && (
                <>
                  <Clock className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <h2 className="text-lg font-bold text-yellow-500 mb-1">
                    Esperando Aprobación
                  </h2>
                  <p className="text-white/70 text-sm">
                    Tu historia está siendo revisada. Te notificaremos cuando sea aprobada.
                  </p>
                </>
              )}

              {isApproved && (
                <>
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <h2 className="text-lg font-bold text-green-500 mb-1">
                    ¡Historia Aprobada!
                  </h2>
                  <p className="text-white/70 text-sm mb-2">
                    Tu historia ha sido aprobada y está visible para otros usuarios.
                  </p>
                  {existingStory.views_count > 0 && (
                    <p className="text-[#ff007a] font-semibold text-sm">
                      👁️ {existingStory.views_count} visualizaciones
                    </p>
                  )}
                </>
              )}

              {isRejected && (
                <>
                  <XCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <h2 className="text-lg font-bold text-red-500 mb-1">
                    Historia Rechazada
                  </h2>
                  <p className="text-white/70 text-sm mb-2">
                    {existingStory.rejection_reason || "Tu historia no cumplió con nuestras políticas."}
                  </p>
                </>
              )}
            </div>

            {/* Vista previa de la historia */}
            {existingStory?.file_url && (
              <div className="bg-[#2b2d31] rounded-2xl overflow-hidden mb-6">
                {existingStory.file_url.includes('.mp4') || existingStory.file_url.includes('.webm') ? (
                  <video 
                    src={`${import.meta.env.VITE_API_BASE_URL}${existingStory.file_url}`}
                    className="w-full h-[300px] object-cover"
                    controls={isApproved}
                  />
                ) : (
                  <img 
                    src={existingStory.file_url} 
                    alt="Historia" 
                    className="w-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-4 justify-center">
              {isApproved && (
                <button
                  onClick={viewStory}
                  className="bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-colors"
                >
                  <Eye size={18} />
                  Ver Historia
                </button>
              )}

              {isRejected && (
                <button
                  onClick={deleteStory}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-colors"
                >
                  <Trash size={18} />
                  Eliminar y Crear Nueva
                </button>
              )}

              {(isPending || isApproved) && (
                <button
                  onClick={deleteStory}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-full font-bold flex items-center gap-2 transition-colors"
                >
                  <Trash size={16} />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista principal para subir historia
  return (
    <div className="min-h-screen bg-ligand-mix-dark text-white p-6">
      <Header />
      
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
        {/* Contenedor principal único */}
        <div className="bg-[#1f2125] rounded-2xl p-8 shadow-xl max-w-xl w-full mx-auto">
          {/* Título */}
          <div className="flex items-center gap-3 justify-center mb-8">
            <Sparkles className="w-8 h-8 text-[#ff007a]" />
            <h2 className="text-2xl font-bold text-[#ff007a]">
              {t("subirHistoria.titulo") || "Sube o graba tu historia"}
            </h2>
          </div>
          
          {/* Contenido dinámico según el estado */}
          {showCamera && (
            <>
              {/* Selector de cámara */}
              {devices.length > 1 && (
                <div className="bg-[#2b2d31] rounded-xl p-3 mb-3 border border-[#ff007a]/30">
                  <label className="block text-xs font-semibold text-white/70 mb-2 flex items-center gap-2">
                    <Camera className="w-3 h-3 text-[#ff007a]" />
                    Selecciona tu cámara
                  </label>
                  <select
                    value={selectedDeviceId || ""}
                    onChange={e => setSelectedDeviceId(e.target.value)}
                    className="w-full p-2 bg-[#1f2125] border border-[#ff007a]/40 rounded-lg text-white text-sm focus:border-[#ff007a] focus:outline-none transition-colors"
                  >
                    {devices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Cámara ${device.deviceId}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Área de video */}
              <div className="relative w-full h-80 bg-[#2b2d31] rounded-2xl overflow-hidden mb-4">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  className={`w-full h-full object-cover ${isFlipped ? 'scale-x-[-1]' : ''}`}
                />
                
                {/* Overlay de grabación */}
                {recording && (
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-3 py-2 rounded-full">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold">REC</span>
                    </div>
                    <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-full">
                      <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                    </div>
                  </div>
                )}

                {/* Botón cambiar cámara */}
                {devices.length > 1 && (
                  <button
                    onClick={switchCamera}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-10"
                    disabled={recording}
                  >
                    <RotateCcw className="w-5 h-5 text-white" />
                  </button>
                )}

                {/* Controles de grabación */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-4 z-10">
                  {!recording && (
                    <button
                      onClick={startRecording}
                      className="w-16 h-16 bg-[#ff007a] hover:bg-[#e6006e] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transform transition-all duration-200"
                    >
                      <Video className="w-7 h-7 text-white" />
                    </button>
                  )}

                  {recording && (
                    <button
                      onClick={stopRecording}
                      className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transform transition-all duration-200"
                    >
                      <Square className="w-6 h-6 text-white fill-white" />
                    </button>
                  )}
                </div>
              </div>

              {/* Botón cancelar */}
              <button
                onClick={() => setShowCamera(false)}
                className="w-full bg-[#2b2d31] hover:bg-[#373a3f] text-white px-4 py-2 rounded-xl border border-[#ff007a]/40 transition-colors text-sm"
              >
                Cancelar
              </button>
            </>
          )}
          
          {previewUrl && !showCamera && (
            <>
              {/* Vista previa del archivo */}
              <div className="relative w-full mb-4">
                <div className="w-full h-80 bg-[#2b2d31] rounded-2xl overflow-hidden">
                  {file && file.type && file.type.startsWith("video/") ? (
                    <video src={previewUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <button
                  onClick={deleteRecording}
                  className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full hover:bg-black/70 transition-colors z-10"
                >
                  <Trash size={18} className="text-white" />
                </button>
              </div>
              
              {/* Botón de publicar */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 transition-colors mb-4"
              >
                {loading
                  ? t("subirHistoria.cargando") || "Subiendo..."
                  : t("subirHistoria.publicar") || "Publicar Historia"}
              </button>
            </>
          )}
          
          {!previewUrl && !showCamera && (
            <>
              {/* Botones de acción principal */}
              <div className="flex flex-col gap-3 mb-6">
                <button
                  onClick={handleCameraClick}
                  className="bg-[#ff007a] hover:bg-[#e6006e] w-full px-6 py-3 rounded-xl flex items-center justify-center gap-3 font-semibold transition-colors"
                >
                  <Camera size={20} /> {t("subirHistoria.grabar") || "Grabar historia"}
                </button>

                <button
                  onClick={() => fileInputRef.current.click()}
                  className="bg-[#2b2d31] hover:bg-[#373a3f] w-full px-6 py-3 rounded-xl flex items-center justify-center gap-3 border border-[#ff007a]/40 transition-colors"
                >
                  <UploadCloud size={20} /> {t("subirHistoria.subir") || "Subir desde tu dispositivo"}
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </div>
            </>
          )}
          
          {/* Consejo - siempre visible */}
          <div className="bg-[#2b2d31] border border-[#ff007a]/30 rounded-xl p-4 text-center">
            <p className="text-white text-sm mb-2 font-semibold flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ff007a]" />
              📱 Consejo
            </p>
            <p className="text-white/70 text-sm">
              Las historias pasan por aprobación antes de ser públicas. Los videos no pueden durar más de 5 segundos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
