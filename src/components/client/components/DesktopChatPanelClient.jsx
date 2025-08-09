import React from 'react';
import { Star, UserX, Gift, Send, Smile, Shield, Crown, MessageCircle } from 'lucide-react';
import { GiftMessageComponent } from '../../GiftSystem/GiftMessageComponent';

const DesktopChatPanelClient = ({
  getDisplayName,
  isDetectingUser,
  toggleFavorite,
  blockCurrentUser,
  isFavorite,
  isAddingFavorite,
  isBlocking,
  otherUser,
  setShowGiftsModal,
  messages,
  mensaje,
  setMensaje,
  enviarMensaje,
  handleKeyPress,
  userData,
  userBalance,
  handleAcceptGift,
  handleRejectGift,
  t
}) => {

  // Función de fallback para getDisplayName
  const safeGetDisplayName = () => {
    if (typeof getDisplayName === 'function') {
      try {
        return getDisplayName();
      } catch (error) {
        console.warn('Error calling getDisplayName:', error);
      }
    }
    
    // Fallback manual
    if (otherUser?.name) {
      return otherUser.name;
    }
    
    return isDetectingUser ? 'Detectando...' : 'Esperando modelo...';
  };

  return (
    <div className="w-full lg:w-[300px] xl:w-[320px] bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-xl rounded-2xl flex flex-col justify-between relative border border-[#ff007a]/20 shadow-2xl overflow-hidden">
      {/* Línea superior fucsia */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#ff007a]"></div>
      
      {/* 🔥 HEADER DEL CHAT REDISEÑADO PARA CLIENTE */}
      <div className="relative p-3 border-b border-gray-700/50">
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Avatar con colores Ligand */}
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ff007a] to-[#ff007a]/70 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg border border-[#ff007a]/30">
                {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              
              {/* Indicador de estado */}
              {otherUser ? (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00ff66] rounded-full border-3 border-[#0a0d10] flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-500 rounded-full border-3 border-[#0a0d10]"></div>
              )}
            </div>
            
            {/* Información del usuario - SIMPLIFICADA */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-white text-base leading-tight">
                  {safeGetDisplayName()}
                </h3>
                
                {isDetectingUser && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff007a]"></div>
                )}
                
                <Shield size={16} className="text-[#00ff66]" />
              </div>
              
              {/* Mostrar saldo del cliente */}
              {userBalance > 0 && (
                <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/30">
                  <Gift size={12} className="text-amber-500" />
                  <span className="text-amber-500 text-xs font-bold">{userBalance} monedas</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 🔥 BOTONES DE ACCIÓN SUPERIORES REDISEÑADOS PARA CLIENTE */}
          <div className="flex items-center gap-2">
            {/* Escudo verde (modelo verificada) */}
            <div className="p-2 bg-[#00ff66]/20 rounded-lg border border-[#00ff66]/30">
              <Shield size={18} className="text-[#00ff66]" />
            </div>
            
            {/* Regalo fucsia */}
            <button
              onClick={() => setShowGiftsModal(true)}
              disabled={!otherUser || !userBalance || userBalance <= 0}
              className={`
                relative p-2 rounded-lg transition-all duration-300 hover:scale-110 group overflow-hidden
                ${!otherUser || !userBalance || userBalance <= 0
                  ? 'bg-gray-800/50 text-gray-500 opacity-50 cursor-not-allowed' 
                  : 'bg-[#ff007a]/20 text-[#ff007a] hover:bg-[#ff007a]/30 border border-[#ff007a]/30 shadow-lg'
                }
              `}
              title={!userBalance || userBalance <= 0 ? "Necesitas monedas para enviar regalos" : "Enviar regalo"}
            >
              <Gift size={18} />
            </button>
            
            {/* Estrella fucsia (favorito) */}
            <button
              onClick={toggleFavorite}
              disabled={isAddingFavorite || !otherUser}
              className={`
                relative p-2 rounded-lg transition-all duration-300 hover:scale-110 group overflow-hidden
                ${isFavorite 
                  ? 'bg-[#ff007a]/20 text-[#ff007a] border border-[#ff007a]/40 shadow-lg' 
                  : 'bg-gray-800/50 text-gray-400 hover:text-[#ff007a] hover:bg-[#ff007a]/10'
                }
                ${isAddingFavorite ? 'animate-pulse' : ''}
                ${!otherUser ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            
            {/* Bloquear */}
            <button
              onClick={blockCurrentUser}
              disabled={isBlocking || !otherUser}
              className={`
                relative p-2 rounded-lg transition-all duration-300 hover:scale-110 group
                bg-gray-800/50 text-gray-400 hover:text-red-400 hover:bg-red-400/10
                ${isBlocking ? 'animate-pulse' : ''}
                ${!otherUser ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title="Bloquear modelo"
            >
              <UserX size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* 🔥 ÁREA DE MENSAJES REDISEÑADA */}
      <div className="flex-1 relative">
        <div className="flex-1 max-h-[350px] p-3 space-y-3 overflow-y-auto custom-scroll">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#ff007a]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#ff007a]/20">
                  <MessageCircle size={32} className="text-[#ff007a]" />
                </div>
                <h4 className="text-white font-semibold mb-2">
                  {otherUser ? `Conversa con ${otherUser.name}` : 'Esperando modelo...'}
                </h4>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                  {otherUser 
                    ? 'Inicia una conversación interesante y disfruta del chat' 
                    : 'Una modelo se conectará pronto para chatear contigo'
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.filter(msg => msg.id > 2).reverse().map((msg, index) => (
                <div key={msg.id} className="space-y-3">
                  {/* 🎁 MENSAJES DE REGALO PARA CLIENTE */}
                  {msg.type === 'gift_request' && (
                    <div className="relative">
                      <GiftMessageComponent
                        giftRequest={{
                          id: msg.id,
                          gift: {
                            name: msg.extra_data?.gift_name || 'Regalo',
                            image: msg.extra_data?.gift_image || '',
                            price: msg.extra_data?.gift_price || 0
                          },
                          message: msg.extra_data?.original_message || '',
                          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
                        }}
                        isClient={true}
                        onAccept={handleAcceptGift}
                        onReject={handleRejectGift}
                        className="mb-3 transform hover:scale-[1.02] transition-transform duration-200"
                      />
                    </div>
                  )}
                  
                  {/* 🔥 MENSAJES NORMALES REDISEÑADOS */}
                  {msg.type !== 'gift_request' && (
                    <div className={`flex ${msg.type === 'local' ? 'justify-end' : 'justify-start'} group`}>
                      {msg.type === 'local' ? (
                        <div className="w-full space-y-2">
                          <div className="text-right">
                            <span className="text-xs text-gray-400 font-medium">Tú</span>
                          </div>
                          <div className="flex justify-end">
                            <div className="relative bg-gradient-to-br from-[#ff007a] to-[#ff007a]/80 px-4 py-3 rounded-2xl rounded-br-md text-white shadow-lg border border-[#ff007a]/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 max-w-[70%]">
                              <span className="text-white text-sm leading-relaxed font-medium break-words">
                                {msg.text}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-500 font-medium">
                              {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      ) : msg.type === 'system' ? (
                        <div className="w-full flex justify-center">
                          <div className="bg-gradient-to-r from-[#00ff66]/10 to-[#00ff66]/5 border border-[#00ff66]/30 px-4 py-3 rounded-2xl max-w-[90%] backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-[#00ff66] rounded-full animate-pulse"></div>
                              <span className="text-[#00ff66] text-xs font-semibold">🎰 Sistema</span>
                            </div>
                            <p className="text-[#00ff66] text-sm leading-relaxed">
                              <span className="text-[#00ff66]">
                                {msg.text}
                              </span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[70%] space-y-2">
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-[#ff007a] to-[#ff007a]/70 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {otherUser?.name?.charAt(0)?.toUpperCase() || 'M'}
                                </span>
                              </div>
                              <span className="text-xs text-[#ff007a] font-medium">
                                {msg.senderRole === 'modelo' ? otherUser?.name || 'Modelo' : 'Usuario'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-gray-800/90 to-slate-800/90 px-4 py-3 rounded-2xl rounded-bl-md text-white shadow-lg border border-gray-600/30 backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
                            <span className="text-gray-100 text-sm leading-relaxed break-words max-w-[70%] inline-block">
                              {msg.text}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="text-xs text-gray-500 font-medium">
                              {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      
      {/* 🔥 INPUT DE CHAT REDISEÑADO PARA CLIENTE */}
      <div className="relative border-t border-gray-700/50 p-3">
        <div className="relative space-y-4">
          {/* Input principal - COMPLETAMENTE EXPANDIDO */}
          <div className="flex items-end gap-2">
            
            {/* Input que ocupa TODO el espacio disponible */}
            <div className="flex-1 min-w-0 relative">
              <input
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t?.('chat.writeMessage') || 'Escribe tu mensaje...'}
                maxLength={200}
                className="
                  w-full bg-gradient-to-r from-gray-800/60 to-slate-800/60 backdrop-blur-sm 
                  px-4 py-3 rounded-xl outline-none text-white text-sm
                  border border-gray-600/30 focus:border-[#ff007a]/50 
                  transition-all duration-300 focus:bg-gray-800/80
                  placeholder-gray-400 focus:placeholder-gray-300
                  shadow-lg focus:shadow-xl focus:shadow-[#ff007a]/10
                "
              />
              
              {/* Contador de caracteres */}
              {mensaje.length > 150 && (
                <div className="absolute -top-8 right-2">
                  <div className={`px-2 py-1 rounded-md backdrop-blur-sm text-xs font-medium border ${
                    mensaje.length > 190 
                      ? 'bg-red-500/20 text-red-300 border-red-400/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                  }`}>
                    {mensaje.length}/200
                  </div>
                </div>
              )}
            </div>
            
            {/* Botones de acción muy compactos - SOLO los esenciales */}
            <button
              onClick={() => setShowGiftsModal(true)}
              disabled={!otherUser || !userBalance || userBalance <= 0}
              className={`
                flex-shrink-0 p-2 rounded-lg transition-all duration-300 hover:scale-110
                ${otherUser && userBalance > 0
                  ? 'bg-[#ff007a]/20 text-[#ff007a] hover:bg-[#ff007a]/30 border border-[#ff007a]/30' 
                  : 'bg-gray-800/50 text-gray-500 opacity-50 cursor-not-allowed'
                }
              `}
              title={!userBalance || userBalance <= 0 ? "Necesitas monedas para enviar regalos" : "Enviar regalo"}
            >
              <Gift size={14} />
            </button>
            
            <button 
              onClick={() => {
                const emojis = ['😊', '❤️', '😍', '🥰', '😘', '💕', '🔥', '✨', '💋', '😋'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                setMensaje(prev => prev + randomEmoji);
              }}
              className="flex-shrink-0 p-2 rounded-lg transition-all duration-300 hover:scale-110 bg-[#ff007a]/20 text-[#ff007a] hover:bg-[#ff007a]/30 border border-[#ff007a]/30"
            >
              <Smile size={14} />
            </button>
            
            {/* Botón enviar */}
            <button
              onClick={enviarMensaje}
              disabled={!mensaje.trim()}
              className={`
                flex-shrink-0 relative p-2 rounded-lg transition-all duration-300 group overflow-hidden
                ${mensaje.trim() 
                  ? 'bg-gradient-to-r from-[#ff007a] to-[#ff007a]/80 text-white hover:from-[#ff007a] hover:to-[#ff007a] hover:scale-105 shadow-lg shadow-[#ff007a]/30' 
                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Send size={14} className={mensaje.trim() ? 'group-hover:translate-x-0.5 transition-transform duration-200' : ''} />
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
          </div>
        </div>
      </div>
      
      {/* 🔥 ESTILOS PARA SCROLL PERSONALIZADO */}
      <style jsx>{`
        .custom-scroll::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          margin: 8px 0;
        }
        
        .custom-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #ff007a, #ff007a);
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #e6006d, #e6006d);
        }
      `}</style>
    </div>
  );
};

export default DesktopChatPanelClient;