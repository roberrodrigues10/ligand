import React, { useEffect, useRef, useCallback } from 'react';
import { Star, UserX, Gift, Send, Smile, Shield, Crown, MessageCircle } from 'lucide-react';
import { GiftMessageComponent } from '../../GiftSystem/GiftMessageComponent';

const DesktopChatPanel = ({
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
  t
}) => {

  // Ref para el contenedor de mensajes
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // 🎵 SISTEMA DE SONIDOS DE REGALO - COPIADO DE CHATPRIVADO
  const playGiftReceivedSound = useCallback(async () => {
    try {
      console.log('🎁🔊 Reproduciendo sonido de regalo recibido...');
      
      // Crear audio para regalo recibido
      const audio = new Audio('/sounds/gift-received.mp3');
      audio.volume = 0.8;
      audio.preload = 'auto';
      
      try {
        await audio.play();
        console.log('🎵 Sonido de regalo reproducido correctamente');
      } catch (playError) {
        console.error('❌ Error reproduciendo sonido de regalo:', playError);
        if (playError.name === 'NotAllowedError') {
          console.log('🚫 AUTOPLAY BLOQUEADO - Usando sonido alternativo');
          // Sonido alternativo más corto
          playAlternativeGiftSound();
        }
      }
    } catch (error) {
      console.error('❌ Error general creando audio de regalo:', error);
      playAlternativeGiftSound();
    }
  }, []);

  const playAlternativeGiftSound = useCallback(() => {
    try {
      // Sonido sintetizado como alternativa
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Crear una melodía alegre para regalos
      const playNote = (frequency, startTime, duration) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Melodía alegre: Do-Mi-Sol-Do
      const now = audioContext.currentTime;
      playNote(523.25, now, 0.2);      // Do
      playNote(659.25, now + 0.15, 0.2); // Mi
      playNote(783.99, now + 0.3, 0.2);  // Sol
      playNote(1046.5, now + 0.45, 0.3); // Do (octava alta)
      
      console.log('🎵 Sonido alternativo de regalo reproducido');
    } catch (error) {
      console.error('❌ Error con sonido alternativo:', error);
    }
  }, []);

  // 🎁 FUNCIÓN PARA REPRODUCIR NOTIFICACIÓN DE REGALO
  const playGiftNotification = useCallback(async (giftName) => {
    try {
      // Reproducir sonido
      await playGiftReceivedSound();
      
      // Mostrar notificación visual si está permitido
      if (Notification.permission === 'granted') {
        new Notification('🎁 ¡Regalo Recibido!', {
          body: `Has recibido: ${giftName}`,
          icon: '/favicon.ico',
          tag: 'gift-received',
          requireInteraction: true // La notificación permanece hasta que el usuario la cierre
        });
      }
      
      // Vibrar en dispositivos móviles
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
      
      console.log('🎉 Notificación completa de regalo ejecutada');
    } catch (error) {
      console.error('❌ Error en notificación de regalo:', error);
    }
  }, [playGiftReceivedSound]);

  // Auto-scroll al final cuando hay nuevos mensajes
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Efecto para hacer scroll automático cuando cambian los mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // También scroll cuando se envía un mensaje
  useEffect(() => {
    if (mensaje === '') {
      // Mensaje acabado de enviar, hacer scroll
      setTimeout(scrollToBottom, 100);
    }
  }, [mensaje]);

  // 🎁 DETECTAR REGALOS RECIBIDOS EN MENSAJES NUEVOS
  const previousMessagesRef = useRef([]);
  
  useEffect(() => {
    // Solo procesar si hay mensajes previos para comparar
    if (previousMessagesRef.current.length === 0) {
      previousMessagesRef.current = messages;
      return;
    }

    // Detectar mensajes nuevos
    const currentMessageIds = new Set(previousMessagesRef.current.map(m => m.id));
    const newMessages = messages.filter(m => !currentMessageIds.has(m.id));

    if (newMessages.length > 0) {
      console.log(`✅ ${newMessages.length} mensajes nuevos detectados en DesktopChat`);
      
      // 🎁 DETECTAR REGALOS RECIBIDOS
      const newGiftMessages = newMessages.filter(msg => 
        msg.type === 'gift_received' && 
        msg.user_id !== userData?.id // Solo si no soy yo quien envió
      );
      
      if (newGiftMessages.length > 0) {
        console.log('🎁 ¡Regalo(s) recibido(s) detectado(s) en DesktopChat!', newGiftMessages);
        
        // Reproducir sonido para cada regalo
        newGiftMessages.forEach(async (giftMsg, index) => {
          try {
            // Extraer nombre del regalo
            let giftData = giftMsg.gift_data || giftMsg.extra_data || {};
            
            // Parsear si es string
            if (typeof giftData === 'string') {
              try {
                giftData = JSON.parse(giftData);
              } catch (e) {
                giftData = { gift_name: 'Regalo Especial' };
              }
            }
            
            const giftName = giftData.gift_name || 'Regalo Especial';
            console.log(`🎵 Reproduciendo sonido para regalo: ${giftName}`);
            
            // Reproducir notificación con sonido
            await playGiftNotification(giftName);
            
            // Esperar un poco entre regalos para no saturar
            if (newGiftMessages.length > 1 && index < newGiftMessages.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error('❌ Error procesando sonido de regalo:', error);
          }
        });
      }

      // 🔥 DETECTAR REGALOS ENVIADOS (para clientes)
      const newSentGiftMessages = newMessages.filter(msg => 
        msg.type === 'gift_sent' && 
        msg.user_id === userData?.id && // Solo si soy yo quien envió
        userData?.rol === 'cliente' // Solo los clientes envían regalos
      );
      
      if (newSentGiftMessages.length > 0) {
        console.log('💸 Regalo(s) enviado(s) detectado(s)!', newSentGiftMessages);
        
        // Notificación silenciosa para regalo enviado
        if (Notification.permission === 'granted') {
          new Notification('🎁 Regalo Enviado', {
            body: 'Tu regalo ha sido enviado exitosamente',
            icon: '/favicon.ico'
          });
        }
      }
    }

    // Actualizar referencia de mensajes previos
    previousMessagesRef.current = messages;
  }, [messages, userData?.id, userData?.rol, playGiftNotification]);

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
    
    return isDetectingUser ? 'Detectando...' : 'Esperando chico...';
  };

  return (
    <div className="w-full lg:w-[300px] xl:w-[320px] bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-xl rounded-2xl flex flex-col justify-between relative border border-[#ff007a]/20 shadow-2xl overflow-hidden">
      {/* Línea superior fucsia */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#ff007a]"></div>
      
      {/* 🔥 HEADER DEL CHAT REDISEÑADO PARA MODELO */}
      <div className="relative p-3 border-b border-gray-700/50">
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Avatar con colores Ligand */}
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ff007a] to-[#ff007a]/70 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg border border-[#ff007a]/30">
                {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              
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
                
              </div>
            </div>
          </div>
          
          {/* 🔥 BOTONES DE ACCIÓN SUPERIORES REDISEÑADOS PARA MODELO */}
          <div className="flex items-center gap-2">
            {/* Escudo verde (usuario verificado) */}
            <div className="p-2 bg-[#00ff66]/20 rounded-lg border border-[#00ff66]/30">
              <Shield size={18} className="text-[#00ff66]" />
            </div>
            
            {/* Regalo fucsia - MODELO PUEDE PEDIR REGALOS */}
            <button
              onClick={() => setShowGiftsModal(true)}
              disabled={!otherUser}
              className={`
                relative p-2 rounded-lg transition-all duration-300 hover:scale-110 group overflow-hidden
                ${!otherUser 
                  ? 'bg-gray-800/50 text-gray-500 opacity-50 cursor-not-allowed' 
                  : 'bg-[#ff007a]/20 text-[#ff007a] hover:bg-[#ff007a]/30 border border-[#ff007a]/30 shadow-lg'
                }
              `}
              title="Pedir regalo"
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
              title="Bloquear usuario"
            >
              <UserX size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* 🔥 ÁREA DE MENSAJES REDISEÑADA CON AUTO-SCROLL */}
      <div className="flex-1 relative">
        <div 
          ref={messagesContainerRef}
          className="flex-1 max-h-[350px] p-3 space-y-3 overflow-y-auto custom-scroll"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#ff007a]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#ff007a]/20">
                  <MessageCircle size={32} className="text-[#ff007a]" />
                </div>
                <h4 className="text-white font-semibold mb-2">
                  {otherUser ? `Conversa con ${otherUser.name}` : 'Esperando chico...'}
                </h4>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                  {otherUser 
                    ? 'Inicia una conversación interesante y disfruta del chat' 
                    : 'Un chico se conectará pronto para chatear contigo'
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.filter(msg => msg.id > 2).reverse().map((msg, index) => (
                <div key={msg.id} className="space-y-3">
                  {/* 🎁 RENDERIZAR MENSAJES DE REGALO SEGÚN TU CÓDIGO */}
                  {(msg.type === 'gift_request' || msg.type === 'gift_sent' || msg.type === 'gift_received' || msg.type === 'gift') && (
                    <div className="relative">
                      {/* Renderizar según el tipo específico */}
                      {msg.type === 'gift' && (
                        <div className="flex items-center gap-2 text-yellow-400">
                          <Gift size={16} />
                          <span>Envió: {msg.text || msg.message}</span>
                        </div>
                      )}

                      {msg.type === 'gift_request' && (() => {
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
                          <div className="bg-gradient-to-br from-[#ff007a]/20 via-[#cc0062]/20 to-[#990047]/20 rounded-xl p-4 max-w-xs border border-[#ff007a]/30 shadow-lg backdrop-blur-sm">
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <div className="bg-gradient-to-r from-[#ff007a] to-[#cc0062] rounded-full p-2">
                                <Gift size={16} className="text-white" />
                              </div>
                              <span className="text-pink-100 text-sm font-semibold">Solicitud de Regalo</span>
                            </div>
                            
                            {imageUrl && (
                              <div className="mb-3 flex justify-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-purple-300/30">
                                  <img
                                    src={imageUrl}
                                    alt={finalGiftData.gift_name || 'Regalo'}
                                    className="w-12 h-12 object-contain"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const fallback = e.target.parentNode.querySelector('.gift-fallback');
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div className="gift-fallback hidden w-12 h-12 items-center justify-center">
                                    <Gift size={20} className="text-purple-300" />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="text-center space-y-2">
                              
                              {finalGiftData.gift_price && (
                                <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-lg px-3 py-1 border border-amber-300/30">
                                  <span className="text-amber-200 font-bold text-sm">
                                    ✨ {finalGiftData.gift_price} monedas
                                  </span>
                                </div>
                              )}
                              
                              {finalGiftData.original_message && (
                                <div className="bg-black/20 rounded-lg p-2 mt-3 border-l-4 border-[#ff007a]">
                                  <p className="text-purple-100 text-xs italic">
                                    💭 "{finalGiftData.original_message}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {msg.type === 'gift_received' && (() => {
                        
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
                          <div className="bg-gradient-to-br from-green-900/40 via-emerald-900/40 to-teal-900/40 rounded-xl p-4 max-w-xs border border-green-300/30 shadow-lg backdrop-blur-sm">
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-2">
                                <Gift size={16} className="text-white" />
                              </div>
                              <span className="text-green-100 text-sm font-semibold">¡Regalo Recibido!</span>
                            </div>
                            
                            {receivedImageUrl && (
                              <div className="mb-3 flex justify-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-green-300/30">
                                  <img
                                    src={receivedImageUrl}
                                    alt={finalReceivedGiftData.gift_name || 'Regalo'}
                                    className="w-12 h-12 object-contain"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const fallback = e.target.parentNode.querySelector('.gift-fallback');
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div className="gift-fallback hidden w-12 h-12 items-center justify-center">
                                    <Gift size={20} className="text-green-300" />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="text-center space-y-2">
                              {/* 🔥 NOMBRE DEL REGALO - AÑADIDO */}
                              <p className="text-white font-bold text-base">
                                {finalReceivedGiftData.gift_name || 'Regalo Especial'}
                              </p>
                              
                              {/* 🔥 PRECIO DEL REGALO - AÑADIDO */}
                              {finalReceivedGiftData.gift_price && (
                                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg px-3 py-1 border border-green-300/30">
                                  <span className="text-green-200 font-bold text-sm">
                                    💰 {finalReceivedGiftData.gift_price} monedas
                                  </span>
                                </div>
                              )}
                            
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  )}
                  
                  {/* 🔥 MENSAJES NORMALES REDISEÑADOS */}
                  {!['gift_request', 'gift_sent', 'gift_received', 'gift'].includes(msg.type) && (
                    <div className={`flex ${msg.type === 'local' ? 'justify-end' : 'justify-start'} group`}>
                      {msg.type === 'local' ? (
                        <div className="w-full space-y-2">
                          <div className="text-right">
                            <span className="text-xs text-gray-400 font-medium">Tú</span>
                          </div>
                          <div className="flex justify-end">
                            <div className="relative bg-gradient-to-br from-[#ff007a] to-[#ff007a]/80 px-4 py-3 rounded-2xl rounded-br-md text-white shadow-lg border border-[#ff007a]/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 max-w-[70%]">
                              <span className="text-white text-sm leading-relaxed font-medium break-words">
                                {msg.type === 'emoji' ? (
                                  <div className="text-2xl">{msg.text || msg.message}</div>
                                ) : (
                                  <span className="text-white">{msg.text || msg.message}</span>
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-500 font-medium">
                              {new Date(msg.timestamp || msg.created_at).toLocaleTimeString('es-ES', {
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
                                {msg.text || msg.message}
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
                                  {otherUser?.name?.charAt(0)?.toUpperCase() || 'C'}
                                </span>
                              </div>
                              <span className="text-xs text-[#ff007a] font-medium">
                                {msg.senderRole === 'chico' ? otherUser?.name || 'Chico' : 'Usuario'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-gray-800/90 to-slate-800/90 px-4 py-3 rounded-2xl rounded-bl-md text-white shadow-lg border border-gray-600/30 backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
                            <span className="text-gray-100 text-sm leading-relaxed break-words max-w-[70%] inline-block">
                              {msg.type === 'emoji' ? (
                                <div className="text-2xl">{msg.text || msg.message}</div>
                              ) : (
                                <span className="text-white">{msg.text || msg.message}</span>
                              )}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="text-xs text-gray-500 font-medium">
                              {new Date(msg.timestamp || msg.created_at).toLocaleTimeString('es-ES', {
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
              {/* Elemento invisible para hacer scroll automático */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>
      
      {/* 🔥 INPUT DE CHAT REDISEÑADO PARA MODELO */}
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
                placeholder={t?.('chat.respondToClient') || 'Responde al chico...'}
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
      
      {/* 🎁 AUDIO INVISIBLE PARA REGALOS - NUEVO */}
      <div className="hidden">
        <audio id="gift-sound" preload="auto">
          <source src="/sounds/gift-received.mp3" type="audio/mpeg" />
          <source src="/sounds/gift-received.wav" type="audio/wav" />
        </audio>
      </div>
      
      {/* 🔥 ESTILOS PARA SCROLL PERSONALIZADO */}
      <style jsx>{`
        .custom-scroll {
          scroll-behavior: smooth;
        }
        
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

export default DesktopChatPanel;