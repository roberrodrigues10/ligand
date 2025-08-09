import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, ChevronDown } from 'lucide-react';

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
                    // local + modelo = Andrea (mensajes propios)
                    // remote + cliente = jose (mensajes recibidos)
                    const isUserMessage = message.type === 'local' && message.senderRole === 'modelo';
                    
                    const isSystemMessage = message.type === 'system';
                    const isRemoteMessage = message.type === 'remote' && message.senderRole === 'cliente';
                    
                    // Debug para cada mensaje
                    console.log('💬 Mensaje:', {
                      index,
                      text: message.text,
                      type: message.type,
                      sender: message.sender,
                      senderRole: message.senderRole,
                      isUserMessage: isUserMessage,
                      isRemoteMessage: isRemoteMessage
                    });
                    
                    return (
                      <div
                        key={message.id || message._id || `msg-${index}`}
                        className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                      >
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