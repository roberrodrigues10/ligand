import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, ChevronDown, Gift, Settings, Globe } from 'lucide-react';
import { useGlobalTranslation } from '../../../contexts/GlobalTranslationContext';

const FloatingMessagesImproved = ({ messages = [], t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // 🔥 OBTENER CONTEXTO GLOBAL COMPLETO
  const { 
    translateGlobalText, 
    isEnabled: translationEnabled,
    changeGlobalLanguage,
    currentLanguage: globalCurrentLanguage 
  } = useGlobalTranslation();

  // 🔥 ESTADO PARA MODAL DE CONFIGURACIÓN Y TRADUCCIÓN
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || globalCurrentLanguage || 'es';
  });

  // 🔥 ESTADO LOCAL PARA TRADUCCIÓN
  const [localTranslationEnabled, setLocalTranslationEnabled] = useState(() => {
    return localStorage.getItem('translationEnabled') === 'true';
  });

  // 🔥 SOLUCIÓN DE TRADUCCIÓN SIMPLIFICADA
  const [translations, setTranslations] = useState(new Map());
  const [translatingIds, setTranslatingIds] = useState(new Set());

  // 🔥 IDIOMAS DISPONIBLES
  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' }
  ];

  // 🔥 FUNCIÓN FALLBACK PARA TRADUCCIÓN
  const translateWithFallback = useCallback(async (text, targetLang) => {
    try {
      console.log('🔄 Usando traducción fallback para:', `"${text}"`, 'a idioma:', targetLang);
      
      const cleanText = text.toLowerCase().trim();
      
      if (targetLang === 'en') {
        const translations = {
          'hola': 'hello',
          'como estas': 'how are you',
          'como estás': 'how are you',
          'bien': 'good',
          'mal': 'bad',
          'gracias': 'thank you',
          'por favor': 'please',
          'si': 'yes',
          'sí': 'yes',
          'no': 'no',
          'hermosa': 'beautiful',
          'guapa': 'beautiful',
          'bonita': 'pretty'
        };
        
        const translated = translations[cleanText];
        if (translated) {
          console.log('✅ Traducción EN encontrada:', `"${cleanText}"`, '->', `"${translated}"`);
          return translated;
        }
      }
      
      if (targetLang === 'es') {
        const translations = {
          'hello': 'hola',
          'hi': 'hola',
          'how are you': 'cómo estás',
          'good': 'bien',
          'bad': 'mal',
          'thank you': 'gracias',
          'beautiful': 'hermosa',
          'pretty': 'bonita'
        };
        
        const translated = translations[cleanText];
        if (translated) {
          console.log('✅ Traducción ES encontrada:', `"${cleanText}"`, '->', `"${translated}"`);
          return translated;
        }
      }
      
      // Fallback simulado
      return `[${targetLang.toUpperCase()}] ${text}`;
      
    } catch (error) {
      console.error('❌ Error en traducción fallback:', error);
      return `[ERROR-${targetLang.toUpperCase()}] ${text}`;
    }
  }, []);

  // 🌐 FUNCIÓN PARA TRADUCIR MENSAJES
  const translateMessage = useCallback(async (message) => {
    if (!localTranslationEnabled || !message?.id) {
      return;
    }
    
    const originalText = message.text || message.message;
    if (!originalText || originalText.trim() === '' || translations.has(message.id) || translatingIds.has(message.id)) {
      return;
    }

    setTranslatingIds(prev => new Set(prev).add(message.id));

    try {
      let result = null;
      
      // Usar contexto global si está disponible
      if (typeof translateGlobalText === 'function') {
        try {
          result = await translateGlobalText(originalText, message.id);
          if (!result || result === originalText) {
            result = await translateWithFallback(originalText, currentLanguage);
          }
        } catch (error) {
          result = await translateWithFallback(originalText, currentLanguage);
        }
      } else {
        result = await translateWithFallback(originalText, currentLanguage);
      }
      
      if (result && result !== originalText && result.trim() !== '' && result.toLowerCase() !== originalText.toLowerCase()) {
        setTranslations(prev => new Map(prev).set(message.id, result));
      } else {
        setTranslations(prev => new Map(prev).set(message.id, null));
      }
    } catch (error) {
      console.error('❌ Error traduciendo mensaje:', error);
      setTranslations(prev => new Map(prev).set(message.id, null));
    } finally {
      setTranslatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(message.id);
        return newSet;
      });
    }
  }, [localTranslationEnabled, translateGlobalText, currentLanguage, translateWithFallback, translations, translatingIds]);

  // 🌐 EFECTO PARA TRADUCIR MENSAJES AUTOMÁTICAMENTE
  useEffect(() => {
    if (!localTranslationEnabled) return;

    const messagesToTranslate = messages.filter(message => {
      return (
        message.type !== 'system' && 
        !['gift_request', 'gift_sent', 'gift_received', 'gift'].includes(message.type) &&
        !translations.has(message.id) && 
        !translatingIds.has(message.id) && 
        (message.text || message.message) && 
        (message.text || message.message).trim() !== ''
      );
    });

    messagesToTranslate.forEach((message, index) => {
      setTimeout(() => {
        translateMessage(message);
      }, index * 100);
    });

  }, [messages.length, localTranslationEnabled, translateMessage]);

  // 🌐 COMPONENTE DE MENSAJE CON TRADUCCIÓN
  const renderMessageWithTranslation = useCallback((message, isOwn = false) => {
    const originalText = message.text || message.content || message.message;
    const translatedText = translations.get(message.id);
    const isTranslating = translatingIds.has(message.id);
    
    const hasTranslation = translatedText && translatedText !== originalText && translatedText.trim() !== '';

    return (
      <div className="space-y-1">
        {/* TEXTO ORIGINAL */}
        <div className="text-white">
          {originalText || 'Mensaje sin contenido'}
          {isTranslating && (
            <span className="ml-2 inline-flex items-center">
              <div className="animate-spin rounded-full h-2 w-2 border-b border-current opacity-50"></div>
            </span>
          )}
        </div>

        {/* TRADUCCIÓN */}
        {hasTranslation && (
          <div className={`text-xs italic border-l-2 pl-2 py-1 ${
            isOwn 
              ? 'border-blue-300 text-blue-200 bg-blue-500/10' 
              : 'border-green-300 text-green-200 bg-green-500/10'
          } rounded-r`}>
            <span className="text-xs opacity-80"></span> {translatedText}
          </div>
        )}
      </div>
    );
  }, [translations, translatingIds]);

  // 🔥 FUNCIÓN PARA CAMBIAR IDIOMA
  const handleLanguageChange = (languageCode) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('selectedLanguage', languageCode);
    
    const shouldEnableTranslation = languageCode !== 'es';
    setLocalTranslationEnabled(shouldEnableTranslation);
    localStorage.setItem('translationEnabled', shouldEnableTranslation.toString());
    
    if (typeof changeGlobalLanguage === 'function') {
      try {
        changeGlobalLanguage(languageCode);
      } catch (error) {
        console.warn('❌ No se pudo cambiar idioma en contexto global:', error);
      }
    }
    
    setTranslations(new Map());
    setTranslatingIds(new Set());
    
    setShowSettingsModal(false);
  };

  // Debug: mostrar mensajes en consola
  useEffect(() => {
    if (Array.isArray(messages)) {
      const stats = messages.reduce((acc, msg) => {
        const key = `${msg.type}-${msg.senderRole}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    }
  }, [messages]);

  // Filtrar mensajes
  const recentMessages = Array.isArray(messages) 
    ? messages.filter(msg => msg.id > 2)
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
      setIsOpen(true);
      setUnreadCount(prev => prev + (newMessageCount - lastMessageCount));
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

  // 🎁 FUNCIÓN PARA RENDERIZAR CARDS DE REGALO (igual que antes)
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
      {/* Botón flotante */}
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
          
          {!isOpen && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
          
          {!isOpen && unreadCount > 0 && (
            <div className="absolute inset-0 rounded-full bg-[#ff007a] animate-ping opacity-30"></div>
          )}
        </button>
      </div>

      {/* Burbuja de chat */}
      {isOpen && (
        <div className="fixed top-4 right-4 w-80 max-w-[calc(100vw-2rem)] pointer-events-auto z-[9999]"
        style={{ 
               height: '250px',  // ALTURA FIJA MUCHO MÁS PEQUEÑA
               maxHeight: '250px',
               minHeight: '250px' 
             }}>
            <div className="bg-gray-900/95 backdrop-blur-lg rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden h-full flex flex-col">
            {/* Header del chat CON BOTÓN DE TRADUCCIÓN */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700/50 bg-gradient-to-r from-[#ff007a]/20 to-transparent">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-[#ff007a]" />
                <h3 className="text-white font-medium text-sm">Chat</h3>
                <span className="text-xs text-gray-400">({recentMessages.length})</span>
              </div>
              
              <div className="flex items-center gap-1">
                {/* 🔥 BOTÓN DE TRADUCCIÓN MÓVIL */}
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    localTranslationEnabled 
                      ? 'bg-[#ff007a]/20 text-[#ff007a] border border-[#ff007a]/30' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                  title="Traducción"
                >
                  <Globe size={12} />
                </button>
                
                <button
                  onClick={toggleChat}
                  className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Área de mensajes scrolleable */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3"
            >
              {recentMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <div>No hay mensajes aún...</div>
                </div>
              ) : (
                <div className="flex flex-col space-y-3">
                  {[...recentMessages].reverse().map((message, index) => {
                    const isUserMessage = message.type === 'local' && message.senderRole === 'modelo';
                    const isSystemMessage = message.type === 'system';
                    const isRemoteMessage = message.type === 'remote' && message.senderRole === 'cliente';
                    
                    const isGiftRequest = message.type === 'gift_request';
                    const isGiftSent = message.type === 'gift_sent';
                    const isGiftReceived = message.type === 'gift_received';
                    const isGiftMessage = isGiftRequest || isGiftReceived || message.type === 'gift';
                    
                    if (message.type === 'gift_sent') {
                      return null;
                    }
                    
                    const messageText = (message.text || message.message || '').toLowerCase();
                    const isGiftTextMessage = messageText.includes('envió:') || 
                                            messageText.includes('enviaste:') ||
                                            messageText.includes('🎁') ||
                                            messageText.includes('regalo') ||
                                            messageText.includes('moño') ||
                                            messageText.includes('gift');
                    
                    if (isGiftTextMessage && !isGiftMessage) {
                      return null;
                    }
                    
                    return (
                      <div
                        key={message.id || message._id || `msg-${index}`}
                        className="animate-in slide-in-from-bottom-2 duration-300"
                      >
                        {isGiftMessage ? (
                          <div className={`flex ${isUserMessage || message.senderRole === 'modelo' ? 'justify-end' : 'justify-start'}`}>
                            {renderGiftCard(message)}
                          </div>
                        ) : (
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
                              <div className="flex flex-col">
                                {isRemoteMessage && message.sender && (
                                  <div className="text-xs text-gray-300 mb-1 font-medium">
                                    {message.sender}
                                  </div>
                                )}
                                
                                {/* 🔥 USAR FUNCIÓN DE TRADUCCIÓN */}
                                {renderMessageWithTranslation(message, isUserMessage)}
                                
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
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Footer compacto */}
            <div className="px-3 py-2 border-t border-gray-700/50 bg-gray-800/50">
              <div className="text-xs text-gray-400 text-center">
                💬 Conversación en vivo
                {localTranslationEnabled && (
                  <span className="ml-2 text-[#ff007a]">
                    🌍 {languages.find(l => l.code === currentLanguage)?.flag}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 MODAL DE CONFIGURACIÓN MÓVIL MUY COMPACTO */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#0a0d10] to-[#131418] rounded-xl border border-[#ff007a]/30 shadow-2xl w-72 max-h-[75vh] overflow-hidden">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-2.5 border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-[#ff007a]/20 rounded-lg border border-[#ff007a]/30">
                  <Settings size={14} className="text-[#ff007a]" />
                </div>
                <h2 className="text-sm font-bold text-white">Traductor Móvil</h2>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <X size={14} />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-2.5 overflow-y-auto max-h-[calc(75vh-80px)]">
              {/* Advertencia temporal */}
              <div className="mb-2.5 p-2 bg-amber-500/10 border border-amber-400/30 rounded-lg">
                <div className="flex items-start gap-1.5">
                  <div className="w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-white font-bold">!</span>
                  </div>
                  <div>
                    <h4 className="text-amber-300 font-semibold text-xs mb-0.5">Solo para esta conversación</h4>
                    <p className="text-amber-200/80 text-xs leading-tight">
                      Para traducción permanente: 
                      <span className="font-semibold text-amber-100"> Configuración → Idiomas</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección de idioma */}
              <div className="mb-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Globe size={12} className="text-[#ff007a]" />
                  <h3 className="text-xs font-semibold text-white">Cambiar Idioma</h3>
                </div>

                {/* Estado actual */}
                <div className="mb-2.5 p-2 bg-gray-800/50 rounded-lg border border-gray-600/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-300">Actual:</span>
                    <div className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      localTranslationEnabled 
                        ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                        : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                    }`}>
                      {languages.find(l => l.code === currentLanguage)?.name || 'Español'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {localTranslationEnabled 
                      ? `Traduce mensajes a ${languages.find(l => l.code === currentLanguage)?.name}`
                      : 'Sin traducción activa'
                    }
                  </p>
                </div>
                
                {/* Grid de idiomas - Ultra compacto */}
                <div className="grid grid-cols-2 gap-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`
                        flex items-center gap-1 p-1.5 rounded-lg transition-all duration-200
                        border text-left hover:scale-[1.02] text-xs
                        ${currentLanguage === lang.code 
                          ? 'bg-[#ff007a]/20 border-[#ff007a]/50 text-white shadow-md' 
                          : 'bg-gray-800/40 border-gray-600/30 text-gray-300 hover:bg-[#ff007a]/10 hover:border-[#ff007a]/30 hover:text-white'
                        }
                      `}
                    >
                      <span className="text-sm flex-shrink-0">{lang.flag}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs truncate">{lang.name}</p>
                      </div>
                      {currentLanguage === lang.code && (
                        <div className="w-1 h-1 bg-[#ff007a] rounded-full flex-shrink-0"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Información sobre configuración global */}
              <div className="p-2 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                <div className="flex items-start gap-1.5">
                  <Settings size={10} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-blue-300 font-semibold text-xs mb-0.5">Configuración Permanente</h4>
                    <p className="text-blue-200/80 text-xs leading-tight">
                      Menú → Configuración → Idiomas
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-2 border-t border-gray-700/50 bg-gray-900/50">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Temporal
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-2.5 py-1 bg-[#ff007a] text-white text-xs font-medium rounded-lg hover:bg-[#ff007a]/90 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingMessagesImproved;