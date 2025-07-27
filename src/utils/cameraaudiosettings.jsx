import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, X, RotateCcw, Volume2, Settings, Check, RefreshCw } from 'lucide-react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';

/**
 * Componente de configuración de cámara y audio
 * Se integra con LiveKit para cambiar dispositivos en tiempo real
 */
const CameraAudioSettings = ({ 
  isOpen, 
  onClose, 
  cameraEnabled, 
  micEnabled, 
  setCameraEnabled, 
  setMicEnabled 
}) => {
  // Hooks de LiveKit
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  // Estados para dispositivos
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados de configuración actuales
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMicrophone, setSelectedMicrophone] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isTesting, setIsTesting] = useState({ mic: false, speaker: false });

  // Referencias
  const videoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micTestIntervalRef = useRef(null);

  // Obtener dispositivos disponibles
  const getDevices = async () => {
    try {
      setLoading(true);
      
      // Pedir permisos primero
      const tempStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      tempStream.getTracks().forEach(track => track.stop());

      // Enumerar dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
      const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
      
      setCameras(videoDevices);
      setMicrophones(audioInputDevices);
      setSpeakers(audioOutputDevices);

      // Obtener dispositivos actuales de LiveKit si están disponibles
      if (localParticipant) {
        const currentVideoTrack = localParticipant.videoTrackPublications.values().next().value;
        const currentAudioTrack = localParticipant.audioTrackPublications.values().next().value;
        
        if (currentVideoTrack?.track?.mediaStreamTrack) {
          const settings = currentVideoTrack.track.mediaStreamTrack.getSettings();
          if (settings.deviceId) {
            setSelectedCamera(settings.deviceId);
          }
        }
        
        if (currentAudioTrack?.track?.mediaStreamTrack) {
          const settings = currentAudioTrack.track.mediaStreamTrack.getSettings();
          if (settings.deviceId) {
            setSelectedMicrophone(settings.deviceId);
          }
        }
      }

      // Si no hay dispositivos seleccionados, usar los primeros disponibles
      if (!selectedCamera && videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
      if (!selectedMicrophone && audioInputDevices.length > 0) {
        setSelectedMicrophone(audioInputDevices[0].deviceId);
      }
      if (!selectedSpeaker && audioOutputDevices.length > 0) {
        setSelectedSpeaker(audioOutputDevices[0].deviceId);
      }

    } catch (error) {
      console.error('Error obteniendo dispositivos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Preview de cámara
  const startCameraPreview = async () => {
    try {
      // Detener preview anterior
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (selectedCamera && cameraEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: { exact: selectedCamera },
            width: { ideal: 320 },
            height: { ideal: 240 }
          },
          audio: false
        });
        
        previewStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (error) {
      console.error('Error iniciando preview de cámara:', error);
    }
  };

  // Cambiar cámara usando getUserMedia y reconfiguración
  const changeCameraInLiveKit = async (deviceId) => {
    try {
      if (!localParticipant) return;

      setLoading(true);
      console.log('🎥 Cambiando cámara a:', deviceId);
      
      // Método 1: Usar navigator.mediaDevices para aplicar el cambio
      // Esto funciona reconfigurando el mediaStream subyacente
      
      // Primero, obtener el nuevo stream con el dispositivo seleccionado
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      // Obtener el track de video actual del participante
      const videoTrack = localParticipant.videoTrackPublications.values().next().value;
      
      if (videoTrack?.track?.mediaStreamTrack) {
        // Reemplazar el track subyacente
        const sender = videoTrack.track.sender;
        if (sender && sender.replaceTrack) {
          await sender.replaceTrack(newStream.getVideoTracks()[0]);
          console.log('✅ Track de cámara reemplazado exitosamente');
        } else {
          // Fallback: reiniciar cámara completamente
          await localParticipant.setCameraEnabled(false);
          await new Promise(resolve => setTimeout(resolve, 300));
          await localParticipant.setCameraEnabled(true);
          console.log('✅ Cámara reiniciada como fallback');
        }
      } else {
        // Si no hay track activo, simplemente activar la cámara
        if (!cameraEnabled) {
          setCameraEnabled(true);
        }
        console.log('✅ Cámara activada');
      }
      
      // Limpiar el stream temporal
      newStream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('❌ Error cambiando cámara:', error);
      
      // Fallback simple: reiniciar cámara
      try {
        await localParticipant.setCameraEnabled(false);
        await new Promise(resolve => setTimeout(resolve, 300));
        await localParticipant.setCameraEnabled(true);
        console.log('✅ Cámara reiniciada en fallback');
      } catch (fallbackError) {
        console.error('❌ Error en fallback de cámara:', fallbackError);
      }
    } finally {
      setLoading(false);
      
      // Actualizar preview después de un delay
      setTimeout(() => {
        startCameraPreview();
      }, 800);
    }
  };

  // Cambiar micrófono usando getUserMedia y reconfiguración
  const changeMicrophoneInLiveKit = async (deviceId) => {
    try {
      if (!localParticipant) return;

      setLoading(true);
      console.log('🎤 Cambiando micrófono a:', deviceId);
      
      // Obtener el nuevo stream con el dispositivo seleccionado
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { 
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Obtener el track de audio actual del participante
      const audioTrack = localParticipant.audioTrackPublications.values().next().value;
      
      if (audioTrack?.track?.mediaStreamTrack) {
        // Reemplazar el track subyacente
        const sender = audioTrack.track.sender;
        if (sender && sender.replaceTrack) {
          await sender.replaceTrack(newStream.getAudioTracks()[0]);
          console.log('✅ Track de micrófono reemplazado exitosamente');
        } else {
          // Fallback: reiniciar micrófono completamente
          await localParticipant.setMicrophoneEnabled(false);
          await new Promise(resolve => setTimeout(resolve, 300));
          await localParticipant.setMicrophoneEnabled(true);
          console.log('✅ Micrófono reiniciado como fallback');
        }
      } else {
        // Si no hay track activo, simplemente activar el micrófono
        if (!micEnabled) {
          setMicEnabled(true);
        }
        console.log('✅ Micrófono activado');
      }
      
      // Limpiar el stream temporal
      newStream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('❌ Error cambiando micrófono:', error);
      
      // Fallback simple: reiniciar micrófono
      try {
        await localParticipant.setMicrophoneEnabled(false);
        await new Promise(resolve => setTimeout(resolve, 300));
        await localParticipant.setMicrophoneEnabled(true);
        console.log('✅ Micrófono reiniciado en fallback');
      } catch (fallbackError) {
        console.error('❌ Error en fallback de micrófono:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de cámara
  const handleCameraChange = async (deviceId) => {
    setSelectedCamera(deviceId);
    await changeCameraInLiveKit(deviceId);
  };

  // Manejar cambio de micrófono
  const handleMicrophoneChange = async (deviceId) => {
    setSelectedMicrophone(deviceId);
    await changeMicrophoneInLiveKit(deviceId);
  };

  // Test de micrófono con visualización de nivel
  const testMicrophone = async () => {
    try {
      setIsTesting(prev => ({ ...prev, mic: true }));

      if (selectedMicrophone) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: selectedMicrophone } },
          video: false
        });

        // Crear contexto de audio para analizar nivel
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Monitorear nivel de audio
        const checkAudioLevel = () => {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          
          // Aquí podrías actualizar una barra de nivel visual
          console.log('Nivel de micrófono:', Math.round(average));
        };

        micTestIntervalRef.current = setInterval(checkAudioLevel, 100);

        // Detener test después de 3 segundos
        setTimeout(() => {
          clearInterval(micTestIntervalRef.current);
          stream.getTracks().forEach(track => track.stop());
          if (audioContextRef.current) {
            audioContextRef.current.close();
          }
          setIsTesting(prev => ({ ...prev, mic: false }));
        }, 3000);
      }
    } catch (error) {
      console.error('Error testing micrófono:', error);
      setIsTesting(prev => ({ ...prev, mic: false }));
    }
  };

  // Test de altavoces
  const testSpeakers = async () => {
    try {
      setIsTesting(prev => ({ ...prev, speaker: true }));

      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwgAw==';
      audio.volume = volume / 100;

      // Cambiar dispositivo de salida si es compatible
      if (audio.setSinkId && selectedSpeaker) {
        await audio.setSinkId(selectedSpeaker);
      }

      await audio.play();
      
      setTimeout(() => {
        setIsTesting(prev => ({ ...prev, speaker: false }));
      }, 2000);

    } catch (error) {
      console.error('Error testing altavoces:', error);
      setIsTesting(prev => ({ ...prev, speaker: false }));
    }
  };

  // Alternar cámara invertida
  const toggleFlipCamera = () => {
    setIsFlipped(!isFlipped);
    
    // Aplicar transformación CSS al video principal
    const mainVideoElements = document.querySelectorAll('[data-lk-participant-video]');
    mainVideoElements.forEach(video => {
      if (video.style) {
        video.style.transform = !isFlipped ? 'scaleX(-1)' : 'scaleX(1)';
      }
    });
  };

  // Guardar configuraciones
  const saveSettings = () => {
    const settings = {
      selectedCamera,
      selectedMicrophone,
      selectedSpeaker,
      isFlipped,
      volume
    };

    try {
      localStorage.setItem('cameraAudioSettings', JSON.stringify(settings));
      applyDeviceSettings(); // Aplicar configuraciones también
      console.log('✅ Configuraciones guardadas y aplicadas');
    } catch (error) {
      console.error('❌ Error guardando configuraciones:', error);
    }
  };

  // Cargar configuraciones guardadas
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('cameraAudioSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setSelectedCamera(settings.selectedCamera || '');
        setSelectedMicrophone(settings.selectedMicrophone || '');
        setSelectedSpeaker(settings.selectedSpeaker || '');
        setIsFlipped(settings.isFlipped || false);
        setVolume(settings.volume || 80);
      }
    } catch (error) {
      console.error('❌ Error cargando configuraciones:', error);
    }
  };

  // Limpiar recursos
  const cleanup = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(track => track.stop());
      previewStreamRef.current = null;
    }
    if (micTestIntervalRef.current) {
      clearInterval(micTestIntervalRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // Efectos
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      getDevices();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedCamera && cameraEnabled) {
      startCameraPreview();
    }
  }, [selectedCamera, cameraEnabled, isOpen]);

  // Aplicar flip cuando cambie
  useEffect(() => {
    if (isFlipped) {
      const mainVideoElements = document.querySelectorAll('[data-lk-participant-video]');
      mainVideoElements.forEach(video => {
        if (video.style) {
          video.style.transform = 'scaleX(-1)';
        }
      });
    }
  }, [isFlipped]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f2125] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[#ff007a]/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#ff007a]/20">
          <div className="flex items-center gap-3">
            <Settings className="text-[#ff007a]" size={24} />
            <h2 className="text-xl font-semibold text-white">Configuración de Cámara y Audio</h2>
          </div>
          <button
            onClick={() => {
              saveSettings();
              onClose();
            }}
            className="text-gray-400 hover:text-white transition p-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Panel Izquierdo - Preview y Controles */}
            <div className="space-y-6">
              
              {/* Preview de Cámara */}
              <div className="bg-[#2b2d31] rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Camera className="text-[#ff007a]" size={20} />
                  Vista Previa de Cámara
                </h3>
                
                <div className="relative bg-black/50 rounded-lg overflow-hidden aspect-video mb-4">
                  {cameraEnabled && selectedCamera ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`w-full h-full object-cover ${isFlipped ? 'scale-x-[-1]' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Camera size={48} className="mx-auto mb-2 opacity-50" />
                        <p>Cámara desactivada</p>
                      </div>
                    </div>
                  )}
                  
                  {loading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <RefreshCw className="animate-spin text-[#ff007a]" size={32} />
                    </div>
                  )}
                </div>

                {/* Controles de Cámara */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCameraToggle(!cameraEnabled)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                      cameraEnabled 
                        ? 'bg-[#ff007a] text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {cameraEnabled ? 'Desactivar' : 'Activar'} Cámara
                  </button>
                  
                  <button
                    onClick={toggleFlipCamera}
                    className={`px-4 py-2 rounded-lg border transition ${
                      isFlipped 
                        ? 'border-[#ff007a] text-[#ff007a] bg-[#ff007a]/10' 
                        : 'border-gray-600 text-gray-300 hover:border-[#ff007a] hover:text-[#ff007a]'
                    }`}
                    title="Invertir cámara horizontalmente"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>
              </div>

              {/* Test de Micrófono */}
              <div className="bg-[#2b2d31] rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Mic className="text-[#ff007a]" size={20} />
                  Test de Micrófono
                </h3>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMicToggle(!micEnabled)}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                        micEnabled 
                          ? 'bg-[#ff007a] text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {micEnabled ? 'Desactivar' : 'Activar'} Micrófono
                    </button>
                    
                    <button
                      onClick={testMicrophone}
                      disabled={!selectedMicrophone || isTesting.mic}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isTesting.mic ? 'Probando...' : 'Probar'}
                    </button>
                  </div>
                  
                  {isTesting.mic && (
                    <div className="bg-green-900/30 border border-green-600 rounded-lg p-3">
                      <p className="text-green-400 text-sm">🎤 Habla ahora para probar el micrófono...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Test de Altavoces */}
              <div className="bg-[#2b2d31] rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Volume2 className="text-[#ff007a]" size={20} />
                  Test de Altavoces
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-300">Volumen:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      className="flex-1 accent-[#ff007a]"
                    />
                    <span className="text-sm text-[#ff007a] font-medium w-12">{volume}%</span>
                  </div>
                  
                  <button
                    onClick={testSpeakers}
                    disabled={isTesting.speaker}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isTesting.speaker ? 'Reproduciendo...' : 'Probar Altavoces'}
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Derecho - Selección de Dispositivos */}
            <div className="space-y-6">
              
              {/* Selección de Cámara */}
              <div className="bg-[#2b2d31] rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Camera className="text-[#ff007a]" size={20} />
                  Seleccionar Cámara
                </h3>
                
                <div className="space-y-2">
                  {cameras.map((camera) => (
                    <label key={camera.deviceId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#383c44] cursor-pointer transition">
                      <input
                        type="radio"
                        name="camera"
                        value={camera.deviceId}
                        checked={selectedCamera === camera.deviceId}
                        onChange={() => handleCameraChange(camera.deviceId)}
                        className="accent-[#ff007a]"
                      />
                      <span className="text-white text-sm flex-1">
                        {camera.label || `Cámara ${camera.deviceId.substring(0, 8)}...`}
                      </span>
                      {selectedCamera === camera.deviceId && (
                        <Check className="text-[#ff007a]" size={16} />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Selección de Micrófono */}
              <div className="bg-[#2b2d31] rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Mic className="text-[#ff007a]" size={20} />
                  Seleccionar Micrófono
                </h3>
                
                <div className="space-y-2">
                  {microphones.map((microphone) => (
                    <label key={microphone.deviceId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#383c44] cursor-pointer transition">
                      <input
                        type="radio"
                        name="microphone"
                        value={microphone.deviceId}
                        checked={selectedMicrophone === microphone.deviceId}
                        onChange={() => handleMicrophoneChange(microphone.deviceId)}
                        className="accent-[#ff007a]"
                      />
                      <span className="text-white text-sm flex-1">
                        {microphone.label || `Micrófono ${microphone.deviceId.substring(0, 8)}...`}
                      </span>
                      {selectedMicrophone === microphone.deviceId && (
                        <Check className="text-[#ff007a]" size={16} />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Selección de Altavoces */}
              <div className="bg-[#2b2d31] rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Volume2 className="text-[#ff007a]" size={20} />
                  Seleccionar Altavoces
                </h3>
                
                <div className="space-y-2">
                  {speakers.map((speaker) => (
                    <label key={speaker.deviceId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#383c44] cursor-pointer transition">
                      <input
                        type="radio"
                        name="speaker"
                        value={speaker.deviceId}
                        checked={selectedSpeaker === speaker.deviceId}
                        onChange={() => setSelectedSpeaker(speaker.deviceId)}
                        className="accent-[#ff007a]"
                      />
                      <span className="text-white text-sm flex-1">
                        {speaker.label || `Altavoz ${speaker.deviceId.substring(0, 8)}...`}
                      </span>
                      {selectedSpeaker === speaker.deviceId && (
                        <Check className="text-[#ff007a]" size={16} />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Botón Refrescar Dispositivos */}
              <button
                onClick={getDevices}
                disabled={loading}
                className="w-full py-3 px-4 bg-[#ff007a] text-white rounded-lg hover:bg-[#ff007a]/80 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
                {loading ? 'Actualizando...' : 'Refrescar Dispositivos'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#ff007a]/20 bg-[#1a1c20]">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-300 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              saveSettings();
              onClose();
            }}
            className="px-6 py-2 bg-[#ff007a] text-white rounded-lg hover:bg-[#ff007a]/80 transition"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraAudioSettings;