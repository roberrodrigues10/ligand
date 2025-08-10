import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, ChevronDown, Gift } from 'lucide-react';

const FloatingMessagesImproved = ({ messages = [], t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Debug: mostrar mensajes en consola
  useEffect(() => {
    console.log('📨 Mensajes recibidos:', messages);
    console.log('📊 Total mensajes:', messages?.length || 0);
    
    // Mostrar estadísticas de tipos de mensaje
    if (Array.isArray(messages)) {
      const stats = messages.reduce((acc, msg) => {
        const key = `${msg.type}-${msg.senderRole}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log('📈 Tipos de mensaje:', stats);
      
      // Mostrar IDs para debuggear el filtro
      console.log('🔢 IDs de mensajes:', messages.map(m => ({ id: m.id, text: m.text?.substring(0, 20) })));
    }
  }, [messages]);

  // Filtrar mensajes igual que en desktop - MOSTRAR TODOS
  const recentMessages = Array.isArray(messages) 
    ? messages.filter(msg => msg.id > 2)  // Solo filtrar por ID, SIN limitar cantidad
    : [];

  // Scroll automático al último mensaje
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Detectar nuevos mensajes y abrir automáticamente
  useEffect(() => {
    const newMessageCount = Array.isArray(messages) ? messages.length : 0;
    if (newMessageCount > lastMessageCount && lastMessageCount > 0) {
      console.log('🔔 Nuevo mensaje detectado!', newMessageCount - lastMessageCount);
      // Nuevo mensaje llegó
      setIsOpen(true);
      setUnreadCount(prev => prev + (newMessageCount - lastMessageCount));
      
      // Scroll al nuevo mensaje después de un pequeño delay
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
    setLastMessageCount(newMessageCount);
  }, [messages?.length, lastMessageCount]);

  // Scroll al abrir el chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [isOpen]);

  // Scroll automático cuando lleguen nuevos mensajes y esté abierto
  useEffect(() => {
    if (isOpen && recentMessages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
  }, [recentMessages.length, isOpen]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // 🎁 FUNCIÓN PARA RENDERIZAR CARDS DE REGALO (copiada del desktop chat)
  const renderGiftCard = (msg) => {
    if (msg.type === 'gift_request') {
      const giftData = msg.gift_data || msg.extra_data || {};
      let finalGiftData = giftData;
      
      if (typeof msg.extra_data === 'string') {
        try {
          finalGiftData = JSON.parse(msg.extra_data);
        } catch (e) {
          finalGiftData = giftData;
        }
      }
      
      // Construir URL de imagen
      let imageUrl = null;
      if (finalGiftData.gift_image) {
        const imagePath = finalGiftData.gift_image;
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          imageUrl = imagePath;
        } else {
          const cleanPath = imagePath.replace(/\\/g, '');
          if (cleanPath.startsWith('storage/')) {
            imageUrl = `${cleanBaseUrl}/${cleanPath}`;
          } else if (cleanPath.startsWith('/')) {
            imageUrl = `${cleanBaseUrl}${cleanPath}`;
          } else {
            imageUrl = `${cleanBaseUrl}/storage/gifts/${cleanPath}`;
          }
        }
      }
      
      return (
        <div className="bg-gradient-to-br from-[#ff007a]/20 via-[#cc0062]/20 to-[#990047]/20 rounded-xl p-3 max-w-xs border border-[#ff007a]/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="bg-gradient-to-r from-[#ff007a] to-[#cc0062] rounded-full p-1.5">
              <Gift size={12} className="text-white" />
            </div>
            <span className="text-pink-100 text-xs font-semibold">Solicitud de Regalo</span>
          </div>
          
          {imageUrl && (
            <div className="mb-2 flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center overflow-hidden border-2 border-purple-300/30">
                <img
                  src={imageUrl}
                  alt={finalGiftData.gift_name || 'Regalo'}
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentNode.querySelector('.gift-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="gift-fallback hidden w-10 h-10 items-center justify-center">
                  <Gift size={16} className="text-purple-300" />
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center space-y-1">
            <p className="text-white font-bold text-sm">
              {finalGiftData.gift_name || 'Regalo Especial'}
            </p>
            
            {finalGiftData.gift_price && (
              <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-lg px-2 py-1 border border-amber-300/30">
                <span className="text-amber-200 font-bold text-xs">
                  ✨ {finalGiftData.gift_price} monedas
                </span>
              </div>
            )}
            
            {finalGiftData.original_message && (
              <div className="bg-black/20 rounded-lg p-1.5 mt-2 border-l-4 border-[#ff007a]">
                <p className="text-purple-100 text-xs italic">
                  💭 "{finalGiftData.original_message}"
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (msg.type === 'gift_received') {
      const receivedGiftData = msg.gift_data || msg.extra_data || {};
      let finalReceivedGiftData = receivedGiftData;
      
      if (typeof msg.extra_data === 'string') {
        try {
          finalReceivedGiftData = JSON.parse(msg.extra_data);
        } catch (e) {
          finalReceivedGiftData = receivedGiftData;
        }
      }
      
      // Construir URL de imagen
      let receivedImageUrl = null;
      if (finalReceivedGiftData.gift_image) {
        const imagePath = finalReceivedGiftData.gift_image;
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          receivedImageUrl = imagePath;
        } else {
          const cleanPath = imagePath.replace(/\\/g, '');
          if (cleanPath.startsWith('storage/')) {
            receivedImageUrl = `${cleanBaseUrl}/${cleanPath}`;
          } else if (cleanPath.startsWith('/')) {
            receivedImageUrl = `${cleanBaseUrl}${cleanPath}`;
          } else {
            receivedImageUrl = `${cleanBaseUrl}/storage/gifts/${cleanPath}`;
          }
        }
      }
      
      return (
        <div className="bg-gradient-to-br from-green-900/40 via-emerald-900/40 to-teal-900/40 rounded-xl p-3 max-w-xs border border-green-300/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-1.5">
              <Gift size={12} className="text-white" />
            </div>
            <span className="text-green-100 text-xs font-semibold">¡Regalo Recibido!</span>
          </div>
          
          {receivedImageUrl && (
            <div className="mb-2 flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center overflow-hidden border-2 border-green-300/30">
                <img
                  src={receivedImageUrl}
                  alt={finalReceivedGiftData.gift_name || 'Regalo'}
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentNode.querySelector('.gift-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="gift-fallback hidden w-10 h-10 items-center justify-center">
                  <Gift size={16} className="text-green-300" />
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center space-y-1">
            <p className="text-white font-bold text-sm">
              {finalReceivedGiftData.gift_name || 'Regalo Especial'}
            </p>
            
            {finalReceivedGiftData.gift_price && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg px-2 py-1 border border-green-300/30">
                <span className="text-green-200 font-bold text-xs">
                  💰 {finalReceivedGiftData.gift_price} monedas
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (msg.type === 'gift_sent') {
      // Para gift_sent, extraer el nombre del regalo del texto y crear una card personalizada
      const giftName = (msg.text || msg.message || '').replace('🎁 Enviaste: ', '').replace('🎁 Enviaste:', '').trim();
      
      return (
        <div className="bg-gradient-to-br from-amber-900/40 via-yellow-900/40 to-orange-900/40 rounded-xl p-3 max-w-xs border border-amber-300/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full p-1.5">
              <Gift size={12} className="text-white" />
            </div>
            <span className="text-amber-100 text-xs font-semibold">¡Regalo Enviado!</span>
          </div>
          
          <div className="mb-2 flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-lg flex items-center justify-center overflow-hidden border-2 border-amber-300/30">
              <Gift size={16} className="text-amber-300" />
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-white font-bold text-sm">
              {giftName || 'Regalo Especial'}
            </p>
            <p className="text-amber-200 text-xs">
              ✨ Enviado con amor
            </p>
          </div>
        </div>
      );
    }

    if (msg.type === 'gift') {
      return (
        <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 rounded-lg p-2 border border-yellow-400/20">
          <Gift size={14} />
          <span className="text-sm">Envió: {msg.text || msg.message}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Botón flotante - RELATIVO dentro del contenedor del video (abajo derecha) */}
      <div className="absolute bottom-4 right-4 pointer-events-auto z-20">
        <button
          onClick={toggleChat}
          className={`
            relative p-3 rounded-full transition-all duration-300 hover:scale-110 shadow-lg
            ${isOpen 
              ? 'bg-[#ff007a] text-white' 
              : 'bg-gray-800/80 text-white hover:bg-gray-700/80'
            }
          `}
        >
          {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
          
          {/* Contador de mensajes no leídos */}
          {!isOpen && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
          
          {/* Indicador de pulso para nuevos mensajes */}
          {!isOpen && unreadCount > 0 && (
            <div className="absolute inset-0 rounded-full bg-[#ff007a] animate-ping opacity-30"></div>
          )}
        </button>
      </div>

      {/* Burbuja de chat - FIXED arriba cerca del logo */}
      {isOpen && (
        <div className="fixed top-4 right-4 w-80 max-w-[calc(100vw-2rem)] pointer-events-auto z-[9999]">
          <div className="bg-gray-900/95 backdrop-blur-lg rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
            {/* Header del chat */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700/50 bg-gradient-to-r from-[#ff007a]/20 to-transparent">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-[#ff007a]" />
                <h3 className="text-white font-medium text-sm">Chat</h3>
                <span className="text-xs text-gray-400">({recentMessages.length})</span>
              </div>
              
              <button
                onClick={toggleChat}
                className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Área de mensajes scrolleable - Orden normal (últimos abajo) */}
            <div 
              ref={messagesContainerRef}
              className="h-64 overflow-y-auto overflow-x-hidden p-3 space-y-3"
            >
              {recentMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <div>No hay mensajes aún...</div>
                  <div className="text-xs mt-2 opacity-60">
                    Debug: {JSON.stringify(messages?.slice(0, 2) || 'No messages')}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-3">
                  {[...recentMessages].reverse().map((message, index) => {
                    // Detectar tipo de mensaje:
                    const isUserMessage = message.type === 'local' && message.senderRole === 'modelo';
                    const isSystemMessage = message.type === 'system';
                    const isRemoteMessage = message.type === 'remote' && message.senderRole === 'cliente';
                    
                    // 🔥 DETECTAR MENSAJES DE REGALO
                    const isGiftRequest = message.type === 'gift_request';
                    const isGiftSent = message.type === 'gift_sent';
                    const isGiftReceived = message.type === 'gift_received';
                    const isGiftMessage = isGiftRequest || isGiftReceived || message.type === 'gift';
                    
                    // 🚫 FILTRAR gift_sent ya que gift_received es más relevante para el modelo
                    if (message.type === 'gift_sent') {
                      console.log('🚫 Filtrando gift_sent (redundante con gift_received)');
                      return null;
                    }
                    
                    // 🚫 FILTRAR MENSAJES DE TEXTO QUE SON DUPLICADOS DE REGALOS
                    const messageText = (message.text || message.message || '').toLowerCase();
                    const isGiftTextMessage = messageText.includes('envió:') || 
                                            messageText.includes('enviaste:') ||
                                            messageText.includes('🎁') ||
                                            messageText.includes('regalo') ||
                                            messageText.includes('moño') ||
                                            messageText.includes('gift');
                    
                    // No mostrar mensajes de texto que son duplicados de regalos
                    if (isGiftTextMessage && !isGiftMessage) {
                      console.log('🚫 Filtrando mensaje duplicado:', message.text || message.message);
                      return null;
                    }
                    
                    // Debug para cada mensaje
                    console.log('💬 Mensaje:', {
                      index,
                      text: message.text,
                      type: message.type,
                      sender: message.sender,
                      senderRole: message.senderRole,
                      isUserMessage: isUserMessage,
                      isRemoteMessage: isRemoteMessage,
                      isGiftMessage: isGiftMessage
                    });
                    
                    return (
                      <div
                        key={message.id || message._id || `msg-${index}`}
                        className="animate-in slide-in-from-bottom-2 duration-300"
                      >
                        {/* 🎁 RENDERIZAR CARDS DE REGALO CON EL MISMO DISEÑO QUE DESKTOP */}
                        {isGiftMessage ? (
                          <div className={`flex ${isUserMessage || message.senderRole === 'modelo' ? 'justify-end' : 'justify-start'}`}>
                            {renderGiftCard(message)}
                          </div>
                        ) : (
                          /* 💬 MENSAJES NORMALES */
                          <div className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`
                                max-w-[80%] min-w-[60px] rounded-xl px-3 py-2 shadow-md
                                ${isSystemMessage 
                                  ? 'bg-blue-500/80 border border-blue-400/50 text-blue-100' 
                                  : isUserMessage 
                                    ? 'bg-[#ff007a]/90 text-white ml-auto' 
                                    : 'bg-gray-700/90 text-white mr-auto'
                                }
                              `}
                            >
                              {/* Contenido del mensaje */}
                              <div className="flex flex-col">
                                {/* Nombre del remitente (solo para mensajes remotos) */}
                                {isRemoteMessage && message.sender && (
                                  <div className="text-xs text-gray-300 mb-1 font-medium">
                                    {message.sender}
                                  </div>
                                )}
                                
                                {/* Texto del mensaje */}
                                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap hyphens-auto">
                                  {message.text || message.content || message.message || 'Mensaje sin contenido'}
                                </p>
                                
                                {/* Timestamp */}
                                <div className={`text-xs mt-1 opacity-70 ${
                                  isUserMessage ? 'text-right' : 'text-left'
                                }`}>
                                  {formatTime(message.timestamp || message.createdAt || message.time || Date.now())}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Elemento invisible para hacer scroll */}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Footer compacto */}
            <div className="px-3 py-2 border-t border-gray-700/50 bg-gray-800/50">
              <div className="text-xs text-gray-400 text-center">
                💬 Conversación en vivo
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingMessagesImproved;