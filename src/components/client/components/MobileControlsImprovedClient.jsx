import React from 'react';
import { Star, UserX, Gift, Send, Heart, Mic, MicOff, Video, VideoOff, PhoneOff, SkipForward, SwitchCamera } from 'lucide-react';

const MobileControlsImprovedClient = ({
  mensaje,
  setMensaje,
  enviarMensaje,
  handleKeyPress,
  toggleFavorite,
  blockCurrentUser,
  isFavorite,
  isAddingFavorite,
  isBlocking,
  otherUser,
  setShowGiftsModal,
  micEnabled,
  setMicEnabled,
  cameraEnabled,
  setCameraEnabled,
  onCameraSwitch,
  onEndCall,
  siguientePersona,
  finalizarChat,
  userBalance
}) => {
  
  const handleGiftClick = () => {
    if (otherUser && userBalance > 0) {
      setShowGiftsModal(true);
    }
  };

  const handleEmojiClick = () => {
    const heartsEmojis = ['❤️', '💕', '😍', '🥰', '😘', '💋', '🔥', '✨'];
    const randomHeart = heartsEmojis[Math.floor(Math.random() * heartsEmojis.length)];
    setMensaje(prev => prev + randomHeart);
  };

  const handleCameraSwitch = () => {
    if (onCameraSwitch) {
      onCameraSwitch();
    }
  };

  const handleEndCall = () => {
    if (onEndCall) {
      onEndCall();
    } else if (finalizarChat) {
      finalizarChat();
    }
  };

  const handleNextPerson = () => {
    if (siguientePersona) {
      siguientePersona();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 p-2 bg-gradient-to-t from-[#0a0d10] via-[#131418]/80 to-transparent backdrop-blur-sm">
      {/* Panel de chat con TODOS los controles */}
      <div className="bg-gradient-to-r from-[#0a0d10] to-[#131418] backdrop-blur-xl rounded-2xl border border-[#ff007a]/20 shadow-xl">
        {/* Barra de TODOS los controles unificada */}
        <div className="flex items-center justify-center gap-1 p-2 border-b border-gray-700/50 flex-wrap">
          {/* CONTROLES DE MEDIA */}
          
          {/* Micrófono */}
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            className={`
              relative p-2 rounded-xl transition-all duration-300 hover:scale-105
              ${micEnabled 
                ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30' 
                : 'bg-red-500/20 text-red-400 border border-red-400/30'
              }
            `}
            title={micEnabled ? "Desactivar micrófono" : "Activar micrófono"}
          >
            {micEnabled ? <Mic size={12} /> : <MicOff size={12} />}
            <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
              micEnabled ? 'bg-[#00ff66]' : 'bg-red-400'
            } animate-pulse`}></div>
          </button>

          {/* Cámara */}
          <button
            onClick={() => setCameraEnabled(!cameraEnabled)}
            className={`
              relative p-2 rounded-xl transition-all duration-300 hover:scale-105
              ${cameraEnabled 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30' 
                : 'bg-red-500/20 text-red-400 border border-red-400/30'
              }
            `}
            title={cameraEnabled ? "Apagar cámara" : "Encender cámara"}
          >
            {cameraEnabled ? <Video size={12} /> : <VideoOff size={12} />}
            <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
              cameraEnabled ? 'bg-blue-400' : 'bg-red-400'
            } animate-pulse`}></div>
          </button>

          {/* Intercambiar Vista */}
          <button
            onClick={handleCameraSwitch}
            className="relative p-2 rounded-xl transition-all duration-300 hover:scale-105 bg-purple-500/20 text-purple-400 border border-purple-400/30"
            title="Intercambiar vista de cámara"
          >
            <SwitchCamera size={12} />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
          </button>

          {/* Siguiente persona */}
          <button
            onClick={handleNextPerson}
            className="p-2 rounded-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-[#ff007a] to-[#ff007a]/80 text-white hover:from-[#ff007a] hover:to-[#ff007a] shadow-lg"
            title="Siguiente modelo"
          >
            <SkipForward size={12} />
          </button>

          {/* Colgar */}
          <button
            onClick={handleEndCall}
            className="p-2 rounded-xl transition-all duration-300 hover:scale-105 bg-red-500/80 text-white hover:bg-red-600 shadow-lg"
            title="Finalizar chat"
          >
            <PhoneOff size={12} />
          </button>

          {/* SEPARADOR VISUAL */}
          <div className="w-px h-6 bg-gray-600/50 mx-1"></div>

          {/* CONTROLES SOCIALES */}

          {/* Favorito */}
          <button
            onClick={toggleFavorite}
            disabled={isAddingFavorite || !otherUser}
            className={`
              relative p-2 rounded-xl transition-all duration-300
              ${isFavorite 
                ? 'bg-[#ff007a]/20 text-[#ff007a] border border-[#ff007a]/40' 
                : 'bg-gray-800/50 text-gray-400 hover:text-[#ff007a] hover:bg-[#ff007a]/10'
              }
              ${isAddingFavorite ? 'animate-pulse' : ''}
              ${!otherUser ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'}
            `}
            title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} />
            {isAddingFavorite && (
              <div className="absolute inset-0 rounded-xl border border-[#ff007a] animate-ping"></div>
            )}
          </button>

          {/* Bloquear */}
          <button
            onClick={blockCurrentUser}
            disabled={isBlocking || !otherUser}
            className={`
              relative p-2 rounded-xl transition-all duration-300
              bg-gray-800/50 text-gray-400 hover:text-red-400 hover:bg-red-400/10
              ${isBlocking ? 'animate-pulse' : ''}
              ${!otherUser ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'}
            `}
            title="Bloquear modelo"
          >
            <UserX size={12} />
            {isBlocking && (
              <div className="absolute inset-0 rounded-xl border border-red-400 animate-ping"></div>
            )}
          </button>

          {/* Regalo */}
          <button
            onClick={handleGiftClick}
            disabled={!otherUser || !userBalance || userBalance <= 0}
            className={`
              p-2 rounded-xl transition-all duration-300
              ${otherUser && userBalance > 0
                ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/30 hover:scale-105' 
                : 'bg-gray-800/50 text-gray-400 opacity-40 cursor-not-allowed'
              }
            `}
            title={!userBalance || userBalance <= 0 ? "Necesitas monedas para enviar regalos" : "Enviar regalo"}
          >
            <Gift size={12} />
          </button>

          {/* Emoji */}
          <button
            onClick={handleEmojiClick}
            className="p-2 rounded-xl transition-all duration-300 hover:scale-105 bg-gray-800/50 text-[#ff007a] hover:bg-[#ff007a]/10"
            title="Agregar emoji"
          >
            <Heart size={12} />
          </button>
        </div>

        {/* Input de mensaje con indicador de usuario al lado */}
        <div className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative max-w-[60%]">
              <input
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe mensaje..."
                maxLength={200}
                className="
                  w-full bg-gray-800/60 backdrop-blur-sm px-3 py-2 rounded-xl 
                  outline-none text-white text-sm placeholder-gray-400
                  border border-gray-600/30 focus:border-[#ff007a]/50 
                  transition-all duration-300 focus:bg-gray-800/80
                  pr-10
                "
              />
              
              {/* Contador de caracteres */}
              {mensaje.length > 150 && (
                <div className="absolute -top-6 right-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded backdrop-blur-sm ${
                    mensaje.length > 190 
                      ? 'bg-red-500/20 text-red-300' 
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {mensaje.length}/200
                  </span>
                </div>
              )}
            </div>

            {/* Botón enviar */}
            <button
              onClick={enviarMensaje}
              disabled={!mensaje.trim()}
              className={`
                relative p-2 rounded-xl transition-all duration-300 overflow-hidden shrink-0
                ${mensaje.trim() 
                  ? 'bg-gradient-to-r from-[#ff007a] to-[#ff007a]/80 text-white hover:scale-105 shadow-lg' 
                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                }
              `}
              title="Enviar mensaje"
            >
              <Send size={14} />
              
              {/* Efecto de brillo */}
              {mensaje.trim() && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
              )}
            </button>

            {/* Indicador de conexión movido aquí */}
            {otherUser && (
              <div className="bg-gradient-to-r from-[#0a0d10] to-[#131418] backdrop-blur-lg rounded-full px-2 py-1 border border-[#00ff66]/30 shrink-0">
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <div className="w-1.5 h-1.5 bg-[#00ff66] rounded-full"></div>
                    <div className="absolute inset-0 w-1.5 h-1.5 bg-[#00ff66] rounded-full animate-ping opacity-40"></div>
                  </div>
                  <span className="text-[#00ff66] text-xs font-medium truncate max-w-[60px]">
                    {otherUser.name}
                  </span>
                </div>
              </div>
            )}

            {/* Indicador de saldo */}
            {userBalance > 0 && (
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-500/10 backdrop-blur-lg rounded-full px-2 py-1 border border-amber-500/30 shrink-0">
                <div className="flex items-center gap-1">
                  <Gift size={12} className="text-amber-500" />
                  <span className="text-amber-500 text-xs font-bold">
                    {userBalance}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileControlsImprovedClient;