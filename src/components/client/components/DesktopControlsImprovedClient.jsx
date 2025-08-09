// components/DesktopControlsImprovedClient.jsx
import React from 'react';
import { 
  Mic, 
  MicOff, 
  Video,
  VideoOff,
  PhoneOff, 
  Settings,
  Volume2,
  VolumeX,
  SkipForward
} from 'lucide-react';

const DesktopControlsImprovedClient = ({
  micEnabled,
  setMicEnabled,
  cameraEnabled,
  setCameraEnabled,
  volumeEnabled,
  setVolumeEnabled,
  siguientePersona,
  finalizarChat,
  showMainSettings,
  setShowMainSettings,
  setShowCameraAudioModal,
  loading,
  t
}) => {

  return (
    // ✅ Agregada clase "hidden md:block" para ocultar en móviles y mostrar desde tablet hacia arriba
    <div className="hidden md:block fixed bottom-1 left-1/2 transform -translate-x-1/2 z-40">
      {/* Contenedor principal con estilo Ligand */}
      <div className="bg-gradient-to-r from-[#0a0d10] to-[#131418] backdrop-blur-xl rounded-3xl border border-[#ff007a]/20 shadow-2xl p-4">
        <div className="flex items-center gap-4">
          
          {/* Micrófono */}
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            disabled={loading}
            className={`
              relative p-4 rounded-2xl transition-all duration-300 hover:scale-110 group
              ${micEnabled 
                ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30 shadow-lg shadow-[#00ff66]/20' 
                : 'bg-red-500/20 text-red-400 border border-red-400/30 shadow-lg shadow-red-500/20'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            
            {/* Indicador de estado */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
              micEnabled ? 'bg-[#00ff66]' : 'bg-red-400'
            } animate-pulse`}></div>
          </button>

          {/* Cámara */}
          <button
            onClick={() => setCameraEnabled(!cameraEnabled)}
            disabled={loading}
            className={`
              relative p-4 rounded-2xl transition-all duration-300 hover:scale-110 group
              ${cameraEnabled 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30 shadow-lg shadow-blue-500/20' 
                : 'bg-red-500/20 text-red-400 border border-red-400/30 shadow-lg shadow-red-500/20'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            
            {/* Indicador de estado */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
              cameraEnabled ? 'bg-blue-400' : 'bg-red-400'
            } animate-pulse`}></div>
          </button>

          {/* Volumen */}
          <button
            onClick={() => setVolumeEnabled && setVolumeEnabled(!volumeEnabled)}
            disabled={loading}
            className={`
              relative p-4 rounded-2xl transition-all duration-300 hover:scale-110 group
              ${volumeEnabled 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30 shadow-lg shadow-purple-500/20' 
                : 'bg-red-500/20 text-red-400 border border-red-400/30 shadow-lg shadow-red-500/20'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {volumeEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Separador visual */}
          <div className="w-px h-8 bg-gray-600/50"></div>

          {/* Siguiente persona */}
          <button
            onClick={siguientePersona}
            disabled={loading}
            className={`
              relative p-4 rounded-2xl transition-all duration-300 hover:scale-110 group overflow-hidden
              bg-gradient-to-r from-[#ff007a] to-[#ff007a]/80 text-white 
              hover:from-[#ff007a] hover:to-[#ff007a] shadow-lg shadow-[#ff007a]/40
              border border-[#ff007a]/30
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <SkipForward size={20} className="group-hover:translate-x-1 transition-transform duration-200" />
            
            {/* Efecto de brillo */}
            {!loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            )}
          </button>

          {/* Colgar llamada */}
          <button
            onClick={finalizarChat}
            disabled={loading}
            className={`
              relative p-4 rounded-2xl transition-all duration-300 hover:scale-110 group overflow-hidden
              bg-gradient-to-r from-red-500 to-red-600 text-white 
              hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/40
              border border-red-400/30
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <PhoneOff size={20} className="group-hover:rotate-12 transition-transform duration-200" />
            
            {/* Efecto de brillo */}
            {!loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            )}
          </button>

          {/* Separador */}
          <div className="w-px h-8 bg-gray-600/50"></div>

          {/* Configuración */}
          <div className="relative">
            <button
              onClick={() => setShowMainSettings(!showMainSettings)}
              disabled={loading}
              className={`
                relative p-4 rounded-2xl transition-all duration-300 hover:scale-110 group
                ${showMainSettings 
                  ? 'bg-[#ff007a]/20 text-[#ff007a] border border-[#ff007a]/30' 
                  : 'bg-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-600/50 border border-gray-600/30'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Settings size={20} className={`group-hover:rotate-90 transition-transform duration-300 ${
                showMainSettings ? 'rotate-90' : ''
              }`} />
            </button>

            {/* Dropdown de configuración */}
            {showMainSettings && (
              <div className="absolute bottom-full mb-2 right-0 bg-gradient-to-b from-[#0a0d10] to-[#131418] border border-[#ff007a]/20 rounded-2xl shadow-2xl backdrop-blur-xl min-w-[200px] settings-dropdown">
                <div className="p-4 space-y-3">
                  <button
                    onClick={() => {
                      setShowCameraAudioModal(true);
                      setShowMainSettings(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-[#ff007a]/10 transition-colors duration-200 text-sm"
                  >
                    🎥 Cámara y Audio
                  </button>
                  
                  <div className="border-t border-gray-700/50 my-2"></div>
                  
                  <button
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 text-sm"
                  >
                    🔄 Recargar página
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopControlsImprovedClient;