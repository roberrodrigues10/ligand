// SubirHistoria.jsx - Versión actualizada con control de 24 horas
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
  Heart,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "./header";
import axios from "../api/axios";
import { useAppNotifications } from "../contexts/NotificationContext";

export default function SubirHistoria() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const MAX_RECORDING_TIME = 15;
  
  const notifications = useAppNotifications();
  
  // Estados para historia existente
  const [existingStory, setExistingStory] = useState(null);
  const [loadingStory, setLoadingStory] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  
  // 🆕 Estados para control de tiempo
  const [canUpload, setCanUpload] = useState(true);
  const [uploadRestriction, setUploadRestriction] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Estados para grabación de video
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [recording, setRecording] = useState(false);
  const streamRef = useRef(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [isFlipped, setIsFlipped] = useState(true);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // 🆕 Verificar si puede subir historia
  const checkCanUpload = async () => {
    try {
      const token = sessionStorage.getItem('token');
      
      if (!token || token === 'null' || token === 'undefined') {
        console.warn('❌ Token inválido o no encontrado');
        return;
      }
      
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false,
      };
      
      const response = await axios.get("/api/stories/can-upload", config);
      
      if (response.data.can_upload) {
        setCanUpload(true);
        setUploadRestriction(null);
      } else {
        setCanUpload(false);
        setUploadRestriction(response.data);
        
        // Si hay tiempo de expiración, calcular tiempo restante
        if (response.data.expires_at) {
          calculateTimeRemaining(response.data.expires_at);
        }
      }
    } catch (error) {
      console.error('❌ Error verificando si puede subir:', error);
      if (error.response?.status === 401) {
        notifications.unauthorized();
      }
    }
  };

  // 🆕 Calcular tiempo restante
  const calculateTimeRemaining = (expiresAt) => {
    const updateTime = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCanUpload(true);
        setUploadRestriction(null);
        setTimeRemaining(null);
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining({
        hours,
        minutes,
        seconds,
        total: diff
      });
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    // Limpiar intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  };

  // Verificar historia existente
  const checkExistingStory = async () => {
    try {
      setLoadingStory(true);
      
      const token = sessionStorage.getItem('token');
      
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
      
      const response = await axios.get("/api/stories/my-story", config);
      
      if (response.data) {
        setExistingStory(response.data);
        
        // Si tiene tiempo restante, calcular countdown
        if (response.data.time_remaining?.expires_at) {
          calculateTimeRemaining(response.data.time_remaining.expires_at);
        }
      }
    } catch (error) {
      console.error('❌ Error al verificar historia existente:', error);
      
      if (error.response?.status === 401) {
        notifications.unauthorized();
      }
    } finally {
      setLoadingStory(false);
    }
  };

  // useEffects
  useEffect(() => {
    checkExistingStory();
    checkCanUpload();
  }, []);

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

  // ... (mantener todas las funciones de cámara existentes)
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
        notifications.error("No se encontró ninguna cámara disponible");
      }
    } catch (error) {
      console.error("❌ Error al enumerar dispositivos:", error);
      notifications.error("Hubo un problema al acceder a la cámara/micrófono");
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

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

    } catch (err) {
      console.error("❌ Error accediendo a la cámara:", err);
      if (err.name === "NotAllowedError") {
        notifications.error("Permiso denegado. Por favor, permite acceso a la cámara en tu navegador");
      } else if (err.name === "NotFoundError") {
        notifications.error("No se encontró cámara o micrófono");
      } else {
        notifications.error(`Error al acceder a la cámara: ${err.message}`);
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
      recordingIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    setRecording(false);
    setRecordingTime(0);
  };

  useEffect(() => {
    if (selectedDeviceId && showCamera) {
      startCamera(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const startRecording = () => {
    setRecordingTime(0);
    notifications.recordingStarted();

    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;
        
        if (newTime >= MAX_RECORDING_TIME) {
          notifications.recordingLimit();
          stopRecording();
          return MAX_RECORDING_TIME;
        }
        
        return newTime;
      });
    }, 1000);

    if (!streamRef.current) {
      notifications.error("No hay acceso a la cámara");
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
        notifications.warning("No se grabó ningún contenido");
        return;
      }

      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);

      setFile(blob);
      setPreviewUrl(url);
      setRecording(false);
      setShowCamera(false);
      
      mediaRecorderRef.current = null;
      notifications.recordingStopped();
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setRecording(false);
  };

  const switchCamera = () => {
    const currentIndex = devices.findIndex(device => device.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  const handleVideoUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > maxSize) {
      notifications.fileSizeLimit();
      return;
    }

    const isImage = selectedFile.type.startsWith("image/");
    const isVideo = selectedFile.type.startsWith("video/");

    if (!isImage && !isVideo) {
      notifications.invalidFile();
      return;
    }

    if (isVideo) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 15) {
          notifications.videoDuration();
          return;
        }
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setShowCamera(false);
        
        notifications.fileLoaded('video');
      };
      video.src = URL.createObjectURL(selectedFile);
    } else {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setShowCamera(false);
      
      notifications.fileLoaded('image');
    }
  };

  const handleCameraClick = () => {
    if (!canUpload) {
      if (uploadRestriction?.reason === 'pending_story') {
        notifications.storyPending();
      } else if (uploadRestriction?.reason === 'active_story') {
        notifications.warning(uploadRestriction.message);
      }
      return;
    }
    
    setShowCamera(true);
    setFile(null);
    setPreviewUrl(null);
  };

  const deleteRecording = () => {
    notifications.confirmDeleteContent(
      () => {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        
        setPreviewUrl(null);
        setFile(null);
        setVideoBlob(null);
        mediaRecorderRef.current = null;
        setRecording(false);
        setRecordingTime(0);
        setShowCamera(false);
        
        notifications.fileRemoved();
      },
      () => {
        notifications.info("Operación cancelada");
      }
    );
  };

  const handleSubmit = async () => {
    if (!file) return;
    
    if (!canUpload) {
      if (uploadRestriction?.reason === 'pending_story') {
        notifications.storyPending();
      } else if (uploadRestriction?.reason === 'active_story') {
        notifications.warning(uploadRestriction.message);
      }
      return;
    }

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

      notifications.storyUploaded();
      await checkExistingStory();
      await checkCanUpload();
      setFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error uploading story:', error);
      
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        
        if (errorData.error_type === 'pending_story') {
          notifications.storyPending();
        } else if (errorData.error_type === 'active_story') {
          notifications.warning(errorData.message);
        } else {
          notifications.uploadError();
        }
      } else if (error.response?.status === 403) {
        notifications.unauthorized();
      } else {
        notifications.uploadError();
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
    notifications.confirmDelete(
      async () => {
        try {
          await axios.delete(`/api/stories/${existingStory.id}`, {
            withCredentials: false,
          });
          notifications.storyDeleted();
          setExistingStory(null);
          await checkCanUpload();
        } catch (error) {
          notifications.deleteError();
        }
      },
      () => {
        notifications.info("Operación cancelada");
      }
    );
  };

  // 🆕 Componente de restricción de tiempo
  const TimeRestrictionCard = () => {
    if (!uploadRestriction || canUpload) return null;

    return (
      <div className="bg-[#1f2125] rounded-2xl p-6 shadow-xl max-w-xl w-full mx-auto mb-6">
        <div className="bg-[#2b2d31] border border-yellow-400/40 rounded-xl p-4 text-center">
          <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          
          {uploadRestriction.reason === 'pending_story' ? (
            <>
              <h3 className="text-lg font-bold text-yellow-400 mb-2">
                Historia Pendiente de Aprobación
              </h3>
              <p className="text-white/80 text-sm mb-4">
                Tu historia está siendo revisada por nuestro equipo. Debes esperar a que sea procesada antes de subir otra.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-yellow-400 mb-2">
                Historia Activa - Tiempo de Espera
              </h3>
              <p className="text-white/80 text-sm mb-4">
                Ya tienes una historia activa. Podrás subir una nueva cuando expire la actual.
              </p>
              
              {timeRemaining && (
                <div className="bg-[#1f2125] rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-[#ff007a]" />
                    <span className="text-white font-bold text-lg">
                      {timeRemaining.hours.toString().padStart(2, '0')}:
                      {timeRemaining.minutes.toString().padStart(2, '0')}:
                      {timeRemaining.seconds.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs">
                    Tiempo restante para subir nueva historia
                  </p>
                </div>
              )}
            </>
          )}
          
          <button
            onClick={() => navigate('/mensajes')}
            className="bg-[#ff007a] hover:bg-[#e6006e] text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Ir a Mensajes
          </button>
        </div>
      </div>
    );
  };

  // Loading component
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
                  <CheckCircle className="w-10 h-10 text-[#ff007a] mx-auto mb-2" />
                  <h2 className="text-lg font-bold text-[#ff007a] mb-1">
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
                  
                  {/* Mostrar tiempo restante si está disponible */}
                  {timeRemaining && (
                    <div className="mt-3 p-2 bg-[#ff007a]/10 border border-[#ff007a]/30 rounded-lg">
                      <p className="text-xs text-white/80">
                        ⏰ Expira en {timeRemaining.hours}h {timeRemaining.minutes}m
                      </p>
                    </div>
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
        {/* Mostrar restricción de tiempo si aplica */}
        <TimeRestrictionCard />
        
        {/* Contenedor principal único */}
        <div className="bg-[#1f2125] rounded-2xl p-8 shadow-xl max-w-xl w-full mx-auto">
          {/* Título */}
          <div className="flex items-center gap-3 justify-center mb-8">
            <Sparkles className="w-8 h-8 text-[#ff007a]" />
            <h2 className="text-2xl font-bold text-[#ff007a]">
              {canUpload ? "Sube o graba tu historia" : "Historia no disponible"}
            </h2>
          </div>
          
          {/* Contenido dinámico según el estado */}
          {showCamera && canUpload && (
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
          
          {previewUrl && !showCamera && canUpload && (
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
                disabled={loading || !canUpload}
                className="w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 transition-colors mb-4"
              >
                {loading
                  ? "Subiendo..."
                  : "Publicar Historia"}
              </button>
            </>
          )}
          
          {!previewUrl && !showCamera && (
            <>
              {/* Botones de acción principal */}
              <div className="flex flex-col gap-3 mb-6">
                <button
                  onClick={handleCameraClick}
                  disabled={!canUpload}
                  className={`w-full px-6 py-3 rounded-xl flex items-center justify-center gap-3 font-semibold transition-colors ${
                    canUpload 
                      ? 'bg-[#ff007a] hover:bg-[#e6006e] text-white' 
                      : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Camera size={20} />
                  {canUpload ? "Grabar historia" : "No disponible"}
                </button>

                <button
                  onClick={() => canUpload && fileInputRef.current.click()}
                  disabled={!canUpload}
                  className={`w-full px-6 py-3 rounded-xl flex items-center justify-center gap-3 border transition-colors ${
                    canUpload 
                      ? 'bg-[#2b2d31] hover:bg-[#373a3f] text-white border-[#ff007a]/40' 
                      : 'bg-gray-500/20 text-gray-400 border-gray-500/20 cursor-not-allowed'
                  }`}
                >
                  <UploadCloud size={20} />
                  {canUpload ? "Subir desde tu dispositivo" : "No disponible"}
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
              📱 {canUpload ? "Consejo" : "Información"}
            </p>
            <p className="text-white/70 text-sm">
              {canUpload 
                ? "Las historias pasan por aprobación antes de ser públicas. Los videos no pueden durar más de 15 segundos."
                : "Solo puedes tener una historia activa a la vez. Cada historia dura 24 horas desde su aprobación."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}