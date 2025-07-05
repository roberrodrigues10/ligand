import React, { useRef, useState, useEffect } from "react";

export default function VideoRecorder({ onRecorded, onCancel }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isFinalized, setIsFinalized] = useState(false);

  useEffect(() => {
    const iniciarCamara = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
      }
    };

    iniciarCamara();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const empezarGrabacion = () => {
    // 🔧 DETERMINAR EL FORMATO MÁS COMPATIBLE
    let mimeType = 'video/webm';
    let extension = 'webm';
    
    // Verificar qué formatos soporta el navegador
    if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
      extension = 'mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    }
    
    console.log("🎥 Formato de video seleccionado:", mimeType);
    
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    setChunks([]);
    setRecordingTime(0);

    // Iniciar contador de tiempo
    const id = setInterval(() => {
      setRecordingTime(prevTime => prevTime + 1);
    }, 1000);
    setIntervalId(id);

    mediaRecorder.ondataavailable = (e) => setChunks((prev) => [...prev, e.data]);

    mediaRecorder.onstop = () => {
      // 🔧 CREAR BLOB CON TIPO EXPLÍCITO
      const blob = new Blob(chunks, { type: mimeType });
      console.log("📹 Blob creado - Tipo:", blob.type, "Tamaño:", blob.size);
      
      if (blob.size > 0) {
        setRecordedBlob(blob);
        setPreview(URL.createObjectURL(blob));
      } else {
        alert("El video grabado está vacío. Intenta nuevamente.");
      }
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const detenerGrabacion = () => {
    if (recordingTime < 2) {
      alert("Graba al menos 2 segundos antes de detener.");
      return;
    }

    mediaRecorderRef.current?.stop();
    setRecording(false);

    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  const volverAGrabar = () => {
    setPreview(null);
    setRecordedBlob(null);
    setIsFinalized(false);
    setRecordingTime(0);
    empezarGrabacion();
  };

  const finalizarGrabacion = () => {
    if (recordedBlob) {
      // 🔧 CREAR FILE CON TIPO CORRECTO
      const fileName = recordedBlob.type.includes('mp4') 
        ? 'verificacion_video.mp4' 
        : 'verificacion_video.webm';
      
      const file = new File([recordedBlob], fileName, { 
        type: recordedBlob.type,
        lastModified: Date.now()
      });
      
      console.log("📁 Archivo final creado:", {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      setIsFinalized(true);
      onRecorded(file); // Enviar el File, no el blob
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Video Preview */}
      {preview ? (
        <div className="relative w-full">
          <video src={preview} controls className="w-full rounded-lg" />
        </div>
      ) : (
        <div className="relative w-full">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full rounded-lg border border-gray-600"
          />
          {/* Overlay con información de grabación */}
          {recording && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-bold">REC</span>
                <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estado de grabación */}
      {recording && (
        <div className="text-center">
          <p className="text-[#ff007a] font-bold animate-pulse">🎥 Grabando...</p>
          <p className="text-gray-600 text-sm mt-1">
            Tiempo: {formatTime(recordingTime)}
          </p>
        </div>
      )}

      {/* Botones de control */}
      <div className="flex gap-4 flex-wrap justify-center">
        {/* Botón inicial de grabación - solo aparece al principio */}
        {!recording && !preview && !isFinalized && !recordedBlob && (
          <button
            onClick={empezarGrabacion}
            className="bg-[#ff007a] text-white px-4 py-2 rounded-lg hover:bg-[#e6006e] transition-colors"
          >
            Empezar grabación
          </button>
        )}

        {/* Botón para detener grabación - solo durante grabación */}
        {recording && (
          <button
            onClick={detenerGrabacion}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Detener grabación
          </button>
        )}

        {/* Botones después de grabar - solo con preview y antes de finalizar */}
        {preview && !isFinalized && recordedBlob && (
          <>
            <button
              onClick={volverAGrabar}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Volver a grabar
            </button>
            <button
              onClick={finalizarGrabacion}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Finalizar y enviar
            </button>
          </>
        )}

        {/* Estado final - solo después de finalizar */}
        {isFinalized && (
          <div className="text-center">
            <p className="text-green-600 font-bold mb-2">✅ Video enviado correctamente</p>
            <button
              onClick={onCancel}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Botón cancelar - solo al principio */}
        {!preview && !recording && !isFinalized && !recordedBlob && (
          <button
            onClick={onCancel}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}