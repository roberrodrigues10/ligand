import React, { useEffect, useRef, useMemo, useCallback, useState  } from 'react';
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

  // Ref para el contenedor de mensajes
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const processedMessageIds = useRef(new Set());

  const [stableMessages, setStableMessages] = useState([]);
  // 🎵 FUNCIONES DE SONIDO PARA SOLICITUDES DE REGALO (CLIENTE)
  const playGiftRequestSound = useCallback(async () => {
    try {
      console.log('🔔 [CLIENT] Reproduciendo sonido de solicitud de regalo...');
      
      const audio = new Audio('/sounds/gift-request.mp3');
      audio.volume = 0.6;
      audio.preload = 'auto';
      
      try {
        await audio.play();
        console.log('🎵 [CLIENT] Sonido de solicitud reproducido');
      } catch (playError) {
        console.error('❌ Error reproduciendo sonido:', playError);
        playAlternativeRequestSound();
      }
    } catch (error) {
      console.error('❌ Error general con audio:', error);
      playAlternativeRequestSound();
    }
  }, []);

  const playAlternativeRequestSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const playNote = (frequency, startTime, duration) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Melodía de solicitud: Sol-La-Si (ascendente)
      const now = audioContext.currentTime;
      playNote(392.00, now, 0.2);        // Sol
      playNote(440.00, now + 0.15, 0.2); // La  
      playNote(493.88, now + 0.3, 0.3);  // Si
      
      console.log('🎵 [CLIENT] Sonido alternativo de solicitud reproducido');
    } catch (error) {
      console.error('❌ Error con sonido alternativo:', error);
    }
  }, []);

// 🔥 SOLO ACTUALIZAR CUANDO REALMENTE CAMBIEN LOS MENSAJES
useEffect(() => {
  if (!messages || !Array.isArray(messages)) {
    return;
  }

  // Crear signature de los mensajes
  const currentSignature = messages.map(m => `${m.id}-${m.type}-${m.text?.substring(0, 10)}`).join('|');
  const lastSignature = stableMessages.map(m => `${m.id}-${m.type}-${m.text?.substring(0, 10)}`).join('|');

  // Solo actualizar si realmente cambiaron
  if (currentSignature !== lastSignature) {
    console.log('🔄 [STABLE] Actualizando mensajes estables', {
      before: stableMessages.length,
      after: messages.length,
      changed: true
    });

    // Procesar mensajes
    const seenIds = new Set();
    const uniqueMessages = messages.filter(msg => {
      if (seenIds.has(msg.id)) {
        return false;
      }
      seenIds.add(msg.id);
      return true;
    });

    // 🔥 ORDENAMIENTO CRONOLÓGICO CORRECTO
    const sortedMessages = uniqueMessages.slice().sort((a, b) => {
      // Usar created_at o timestamp como fuente principal de ordenamiento
      const timeA = new Date(a.created_at || a.timestamp).getTime();
      const timeB = new Date(b.created_at || b.timestamp).getTime();
      
      // 🔥 ORDEN ASCENDENTE: los más antiguos primero
      if (timeA !== timeB) {
        return timeA - timeB; // ← CAMBIO CLAVE: timeA - timeB (no timeB - timeA)
      }
      
      // Si tienen el mismo timestamp, usar ID como desempate
      const idA = typeof a.id === 'string' ? parseInt(a.id) : a.id;
      const idB = typeof b.id === 'string' ? parseInt(b.id) : b.id;
      return idA - idB; // ← ORDEN ASCENDENTE por ID también
    });

    console.log('📅 [SORT] Mensajes ordenados cronológicamente:', {
      total: sortedMessages.length,
      first: sortedMessages[0] ? {
        id: sortedMessages[0].id,
        type: sortedMessages[0].type,
        time: sortedMessages[0].created_at || sortedMessages[0].timestamp
      } : null,
      last: sortedMessages[sortedMessages.length - 1] ? {
        id: sortedMessages[sortedMessages.length - 1].id,
        type: sortedMessages[sortedMessages.length - 1].type,
        time: sortedMessages[sortedMessages.length - 1].created_at || sortedMessages[sortedMessages.length - 1].timestamp
      } : null
    });

    // 🔥 DETECTAR NUEVAS SOLICITUDES DE REGALO ANTES DE ACTUALIZAR
    if (stableMessages.length > 0) {
      // Obtener mensajes nuevos comparando con los anteriores
      const currentIds = new Set(sortedMessages.map(m => m.id));
      const previousIds = new Set(stableMessages.map(m => m.id));
      
      const newMessages = sortedMessages.filter(msg => !previousIds.has(msg.id));
      
      // Filtrar solo solicitudes de regalo nuevas
      const newGiftRequests = newMessages.filter(msg => 
        msg.type === 'gift_request' && 
        msg.user_id !== userData?.id && // Solo si no soy yo quien envió
        msg.senderRole !== 'cliente'    // Solo de la modelo
      );
      
      if (newGiftRequests.length > 0) {
        console.log('🎁 [DESKTOP] ¡Nueva solicitud de regalo detectada!', newGiftRequests);
        
        // Reproducir sonido para cada solicitud nueva
        newGiftRequests.forEach(async (giftMsg, index) => {
          try {
            // Pequeño delay entre regalos para no saturar
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Reproducir sonido
            await playGiftRequestSound();
            
            // Vibrar en dispositivos móviles
            if ('vibrate' in navigator) {
              navigator.vibrate([300, 100, 300]);
            }
            
            // Notificación visual
            if (Notification.permission === 'granted') {
              const giftData = parseGiftData(giftMsg);
              new Notification('💝 Solicitud de Regalo', {
                body: `¡${otherUser?.name || 'Una modelo'} te pide: ${giftData.gift_name}!`,
                icon: '/favicon.ico',
                tag: 'gift-request',
                requireInteraction: true
              });
            }
          } catch (error) {
            console.error('❌ Error procesando sonido de solicitud:', error);
          }
        });
      }
    }

    setStableMessages(sortedMessages);
  } else {
    console.log('⏸️ [STABLE] Mensajes sin cambios - no re-render');
  }
}, [messages, playGiftRequestSound, userData?.id, otherUser?.name]);

// 🔥 TAMBIÉN AGREGAR ESTE DEBUG PARA VER EL ORDEN REAL
useEffect(() => {
  if (stableMessages.length > 0) {
    console.log('📋 [DEBUG] Orden actual de mensajes:');
    stableMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ID:${msg.id} | Tipo:${msg.type} | Tiempo:${msg.created_at || msg.timestamp}`);
    });
  }
}, [stableMessages]);

// 🔥 FUNCIÓN MEJORADA PARA DETECTAR REGALOS
const isGiftMessage = useCallback((msg) => {
  const result = (
    // Tipos específicos de regalo
    msg.type === 'gift_request' || 
    msg.type === 'gift_sent' || 
    msg.type === 'gift_received' || 
    msg.type === 'gift' ||
    msg.type === 'gift_rejected' ||
    // Texto que indica regalo
    (msg.text && (
      msg.text.includes('🎁 Solicitud de regalo') ||
      msg.text.includes('Solicitud de regalo') ||
      msg.text.includes('🎁 Enviaste:') ||
      msg.text.includes('🎁 Recibiste:') ||
      msg.text.includes('Enviaste:') ||
      msg.text.includes('Recibiste:') ||
      msg.text.includes('Regalo recibido') ||
      msg.text.includes('Regalo enviado') ||
      msg.text.includes('Rechazaste una solicitud')
    )) ||
    // Mensaje heredado con campo message
    (msg.message && (
      msg.message.includes('🎁 Solicitud de regalo') ||
      msg.message.includes('Solicitud de regalo') ||
      msg.message.includes('🎁 Enviaste:') ||
      msg.message.includes('🎁 Recibiste:') ||
      msg.message.includes('Enviaste:') ||
      msg.message.includes('Recibiste:')
    ))
  );
  
  return result;
}, []);

// 🔥 FUNCIÓN HELPER PARA PARSING SEGURO DE JSON
const parseGiftData = useCallback((msg) => {
  let giftData = {};
  
  // Intentar obtener de extra_data primero
  if (msg.extra_data) {
    try {
      if (typeof msg.extra_data === 'string') {
        giftData = JSON.parse(msg.extra_data);
      } else if (typeof msg.extra_data === 'object') {
        giftData = msg.extra_data;
      }
    } catch (e) {
      console.error('❌ Error parseando extra_data:', e);
    }
  }
  
  // Fallback a gift_data
  if (!giftData.gift_name && msg.gift_data) {
    try {
      if (typeof msg.gift_data === 'string') {
        const parsed = JSON.parse(msg.gift_data);
        giftData = { ...giftData, ...parsed };
      } else if (typeof msg.gift_data === 'object') {
        giftData = { ...giftData, ...msg.gift_data };
      }
    } catch (e) {
      console.error('❌ Error parseando gift_data:', e);
    }
  }
  
  // Extraer datos del texto si no hay JSON
  if (!giftData.gift_name && (msg.text || msg.message)) {
    const text = msg.text || msg.message;
    
    // Para solicitudes: "🎁 Solicitud de regalo: Nombre del Regalo"
    const requestMatch = text.match(/Solicitud de regalo:\s*(.+?)(?:\s*-|$)/);
    if (requestMatch) {
      giftData.gift_name = requestMatch[1].trim();
      giftData.gift_price = giftData.gift_price || 10;
    }
    
    // Para enviados: "🎁 Enviaste: Nombre del Regalo"
    const sentMatch = text.match(/Enviaste:\s*(.+?)(?:\s*-|$)/);
    if (sentMatch) {
      giftData.gift_name = sentMatch[1].trim();
    }
    
    // Para recibidos: "🎁 Recibiste: Nombre del Regalo"
    const receivedMatch = text.match(/Recibiste:\s*(.+?)(?:\s*-|$)/);
    if (receivedMatch) {
      giftData.gift_name = receivedMatch[1].trim();
    }
  }
  
  // Valores por defecto
  return {
    gift_name: giftData.gift_name || 'Regalo Especial',
    gift_price: giftData.gift_price || 10,
    gift_image: giftData.gift_image || null,
    request_id: giftData.request_id || msg.id,
    security_hash: giftData.security_hash || null,
    original_message: giftData.original_message || '',
    ...giftData
  };
}, []);

  // Auto-scroll al final cuando hay nuevos mensajes
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };
  

  // Efecto para hacer scroll automático cuando cambian los mensajes
  useEffect(() => {
    scrollToBottom();
  }, [stableMessages]);

  // También scroll cuando se envía un mensaje
  useEffect(() => {
    if (mensaje === '') {
      // Mensaje acabado de enviar, hacer scroll
      setTimeout(scrollToBottom, 100);
    }
  }, [mensaje]);

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

  const buildCompleteImageUrl = (imagePath) => {
      if (!imagePath) {
          console.log('⚠️ No hay imagen para el regalo');
          return null;
      }
      
      // Si ya es una URL completa
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          console.log('✅ URL completa encontrada:', imagePath);
          return imagePath;
      }
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      
      // Limpiar backslashes de Windows
      const cleanPath = imagePath.replace(/\\/g, '/');
      
      let finalUrl;
      
      if (cleanPath.startsWith('storage/')) {
          // storage/gifts/image.png -> http://domain.com/storage/gifts/image.png
          finalUrl = `${cleanBaseUrl}/${cleanPath}`;
      } else if (cleanPath.startsWith('/')) {
          // /storage/gifts/image.png -> http://domain.com/storage/gifts/image.png
          finalUrl = `${cleanBaseUrl}${cleanPath}`;
      } else {
          // image.png -> http://domain.com/storage/gifts/image.png
          finalUrl = `${cleanBaseUrl}/storage/gifts/${cleanPath}`;
      }
      
      console.log('🖼️ URL construida:', {
          original: imagePath,
          cleaned: cleanPath,
          final: finalUrl
      });
      
      return finalUrl;
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
      
      {/* 🔥 ÁREA DE MENSAJES REDISEÑADA CON AUTO-SCROLL */}
       <div className="flex-1 relative">
        <div 
          ref={messagesContainerRef}
          className="flex-1 max-h-[350px] p-3 space-y-3 overflow-y-auto custom-scroll"
        >
          {stableMessages.length === 0 ? (
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
              {stableMessages.map((msg, index) => {
                // 🔥 CONTROL DE LOGGING - Solo log si no se ha procesado antes
                if (!processedMessageIds.current.has(msg.id)) {
                  console.log('🔍 [CLIENT] Nuevo mensaje:', {
                    id: msg.id,
                    type: msg.type,
                    text: msg.text?.substring(0, 30),
                    message: msg.message?.substring(0, 30),
                    isGift: isGiftMessage(msg),
                    timestamp: msg.timestamp || msg.created_at
                  });
                  processedMessageIds.current.add(msg.id);
                }

                // 🔥 VERIFICAR SI ES MENSAJE DE REGALO
                const isGift = isGiftMessage(msg);

                return (
                  <div key={`${msg.id}-${index}`} className="space-y-3">
                    
                    {/* 🔥 RENDERIZADO DE REGALOS - FLUJO CRONOLÓGICO CORREGIDO */}
                    {isGift && (() => {
                      const giftData = parseGiftData(msg);
                      const imageUrl = buildCompleteImageUrl(giftData.gift_image);
                      
                      console.log('🎁 [CLIENT] Renderizando regalo en orden:', {
                        id: msg.id,
                        type: msg.type,
                        giftData,
                        timestamp: msg.timestamp || msg.created_at
                      });

                      // 🔥 DETERMINAR TIPO DE REGALO Y QUIÉN LO ENVIÓ
                      const isFromCurrentUser = msg.user_id === userData?.id || 
                                              msg.user_name === userData?.name ||
                                              msg.senderRole === 'cliente' ||
                                              msg.type === 'local';

                      const isRequestFromModel = (msg.type === 'gift_request') && !isFromCurrentUser;
                      const isGiftSentByClient = (msg.type === 'gift_sent') && isFromCurrentUser;
                      const isGiftReceivedByModel = (msg.type === 'gift_received') && !isFromCurrentUser;
                      const isRejectedByClient = (msg.type === 'gift_rejected') && isFromCurrentUser;

                      // 🔥 1. SOLICITUD DE REGALO (viene de la modelo) - ANCHO LIMITADO CORRECTAMENTE
                      if (isRequestFromModel || 
                          (!isFromCurrentUser && (
                            (msg.text && msg.text.includes('Solicitud de regalo')) ||
                            (msg.message && msg.message.includes('Solicitud de regalo'))
                          ))) {
                        
                        return (
                          <div className="space-y-2"> {/* ← Contenedor completo */}
                            
                            {/* 🔥 HEADER DEL MENSAJE (como los mensajes normales) */}
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-[#ff007a] to-[#ff007a]/70 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {otherUser?.name?.charAt(0)?.toUpperCase() || 'M'}
                                  </span>
                                </div>
                                <span className="text-xs text-[#ff007a] font-medium">
                                  {otherUser?.name || 'Modelo'}
                                </span>
                              </div>
                            </div>

                            {/* 🔥 CARD DE REGALO CON ANCHO LIMITADO */}
                            <div className="flex justify-start">
                              <div className="bg-gradient-to-br from-[#ff007a]/20 via-[#cc0062]/20 to-[#990047]/20 rounded-xl p-2 w-[70%] border border-[#ff007a]/30 shadow-lg backdrop-blur-sm">
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  <div className="bg-gradient-to-r from-[#ff007a] to-[#cc0062] rounded-full p-2">
                                    <Gift size={16} className="text-white" />
                                  </div>
                                  <span className="text-pink-100 text-sm font-semibold">
                                    Te pide un regalo
                                  </span>
                                </div>
                                
                                <div className="mb-3 flex justify-center">
                                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-purple-300/30">
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={giftData.gift_name || 'Regalo'}
                                        className="w-12 h-12 object-contain"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          const fallback = e.target.parentNode.querySelector('.gift-fallback');
                                          if (fallback) fallback.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div className={`gift-fallback ${imageUrl ? 'hidden' : 'flex'} w-12 h-12 items-center justify-center`}>
                                      <Gift size={20} className="text-purple-300" />
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-center space-y-2">
                                  <p className="text-white font-bold text-base">
                                    {giftData.gift_name}
                                  </p>
                                  
                                  <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-lg px-3 py-1 border border-amber-300/30">
                                    <span className="text-amber-200 font-bold text-sm">
                                      ✨ {giftData.gift_price} monedas
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
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 🔥 2. REGALO ENVIADO (viene del cliente - tú)
                      if (isGiftSentByClient || 
                          (isFromCurrentUser && (
                            (msg.text && msg.text.includes('Enviaste:')) ||
                            (msg.message && msg.message.includes('Enviaste:'))
                          ))) {
                        
                        return (
                          <div className="flex justify-end">
                            <div className="bg-gradient-to-br from-[#ff007a]/20 via-[#cc0062]/20 to-[#990047]/20 rounded-xl p-4 w-[70%] border border-[#ff007a]/30 shadow-lg backdrop-blur-sm">                              
                              <div className="flex items-center gap-2 mb-3">
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full p-2">
                                  <Gift size={16} className="text-white" />
                                </div>
                                <span className="text-blue-100 text-sm font-semibold">Regalo Enviado</span>
                              </div>
                              
                              {imageUrl && (
                                <div className="mb-3 flex justify-center">
                                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-blue-300/30">
                                    <img
                                      src={imageUrl}
                                      alt={giftData.gift_name}
                                      className="w-12 h-12 object-contain"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        const fallback = e.target.parentNode.querySelector('.gift-fallback');
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                    />
                                    <div className="gift-fallback hidden w-12 h-12 items-center justify-center">
                                      <Gift size={20} className="text-blue-300" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="text-center space-y-2">
                                <p className="text-white font-bold text-base">
                                  {giftData.gift_name}
                                </p>
                                
                                <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg px-3 py-1 border border-blue-300/30">
                                  <span className="text-blue-200 font-bold text-sm">
                                    💰 {giftData.gift_price} monedas
                                  </span>
                                </div>
                              </div>
                              
                              {/* 🔥 TIMESTAMP DEL MENSAJE */}
                              <div className="text-right mt-3">
                                <span className="text-xs text-gray-500 font-medium">
                                  {new Date(msg.timestamp || msg.created_at).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 🔥 3. REGALO RECIBIDO (raro, pero posible)
                      if (isGiftReceivedByModel || 
                          (!isFromCurrentUser && (
                            (msg.text && msg.text.includes('Recibiste:')) ||
                            (msg.message && msg.message.includes('Recibiste:'))
                          ))) {
                        
                        return (
                          <div className="flex justify-start">
                            <div className="bg-gradient-to-br from-green-900/40 via-emerald-900/40 to-teal-900/40 rounded-xl p-4 max-w-xs border border-green-300/30 shadow-lg backdrop-blur-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-2">
                                  <Gift size={16} className="text-white" />
                                </div>
                                <span className="text-green-100 text-sm font-semibold">🎉 ¡Regalo Recibido!</span>
                              </div>
                              
                              {imageUrl && (
                                <div className="mb-3 flex justify-center">
                                  <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-green-300/30">
                                    <img
                                      src={imageUrl}
                                      alt={giftData.gift_name}
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
                                <p className="text-white font-bold text-base">
                                  {giftData.gift_name}
                                </p>
                                
                                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg px-3 py-1 border border-green-300/30">
                                  <span className="text-green-200 font-bold text-sm">
                                    💰 {giftData.gift_price} monedas
                                  </span>
                                </div>
                              </div>
                              
                              {/* 🔥 TIMESTAMP DEL MENSAJE */}
                              <div className="text-left mt-3">
                                <span className="text-xs text-gray-500 font-medium">
                                  {new Date(msg.timestamp || msg.created_at).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 🔥 4. REGALO RECHAZADO
                      if (isRejectedByClient || 
                          (isFromCurrentUser && (
                            (msg.text && msg.text.includes('Rechazaste')) ||
                            (msg.message && msg.message.includes('Rechazaste'))
                          ))) {
                        
                        return (
                          <div className="flex justify-end">
                            <div className="bg-gradient-to-br from-red-900/40 via-red-800/40 to-red-900/40 rounded-xl p-3 max-w-xs border border-red-400/30 shadow-lg backdrop-blur-sm">
                              <div className="flex items-center justify-center gap-2">
                                <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-full p-2">
                                  <Gift size={14} className="text-white" />
                                </div>
                                <span className="text-red-100 text-sm font-semibold">❌ Regalo rechazado</span>
                              </div>
                              
                              {/* 🔥 TIMESTAMP DEL MENSAJE */}
                              <div className="text-right mt-2">
                                <span className="text-xs text-gray-500 font-medium">
                                  {new Date(msg.timestamp || msg.created_at).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 🔥 5. FALLBACK PARA OTROS TIPOS DE REGALO
                      return (
                        <div className="flex justify-center">
                          <div className="bg-gradient-to-br from-purple-900/40 via-purple-800/40 to-purple-900/40 rounded-xl p-4 max-w-xs border border-purple-400/30 shadow-lg backdrop-blur-sm">
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-full p-2">
                                <Gift size={16} className="text-white" />
                              </div>
                              <span className="text-purple-100 text-sm font-semibold">🎁 Actividad de Regalo</span>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-white text-sm">
                                {msg.text || msg.message || 'Actividad de regalo'}
                              </p>
                            </div>
                            
                            {/* 🔥 TIMESTAMP DEL MENSAJE */}
                            <div className="text-center mt-3">
                              <span className="text-xs text-gray-500 font-medium">
                                {new Date(msg.timestamp || msg.created_at).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  
                  {/* 🔥 MENSAJES NORMALES REDISEÑADOS */}
                  {!isGift && (
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
                );
              })}
              {/* Elemento invisible para hacer scroll automático */}
              <div ref={messagesEndRef} />
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

export default DesktopChatPanelClient;