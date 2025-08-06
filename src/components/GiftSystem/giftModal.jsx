import React, { useState } from 'react';
import { X, Gift, Sparkles, Send, MessageSquare } from 'lucide-react';

export const GiftsModal = ({ 
  isOpen, 
  onClose, 
  recipientName,
  recipientId,
  roomName,
  userRole, 
  gifts = [], 
  onRequestGift, 
  loading = false 
}) => {
  
  const [selectedGift, setSelectedGift] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGiftSelect = async (gift) => {
    if (userRole === 'modelo') {
      // Modelo pide regalo directamente
      setIsLoading(true);
      try {
        const result = await onRequestGift(gift.id, recipientId, roomName, message);
        if (result.success) {
          alert(`¡Solicitud de ${gift.name} enviada a ${recipientName}! 🎁`);
          onClose();
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (error) {
        alert('Error al enviar solicitud');
      }
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedGift(null);
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  const title = userRole === 'modelo' ? 'Pedir Regalo' : 'Enviar Regalo';
  const subtitle = userRole === 'modelo' ? `Para ${recipientName}` : `A ${recipientName}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-2 sm:p-4">
      <div 
        className="border border-[#ff007a]/30 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0a0d10 0%, #131418 100%)' }}
      >
        {/* Header */}
        <div 
          className="p-4 sm:p-6 border-b border-[#ff007a]/20"
          style={{ background: 'linear-gradient(90deg, rgba(255, 0, 122, 0.15) 0%, rgba(255, 0, 122, 0.08) 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#ff007a] to-[#cc0062] rounded-full flex items-center justify-center shadow-lg shadow-[#ff007a]/20">
                <Gift size={20} className="sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
                <p className="text-[#ff007a] text-xs sm:text-sm">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/60 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Mensaje opcional para modelos */}
        {userRole === 'modelo' && (
          <div className="p-4 sm:p-6 border-b border-[#ff007a]/10">
            <label className="block text-white text-sm font-medium mb-2">
              Mensaje opcional (aparecerá con tu solicitud):
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
              <input
                type="text"
                placeholder="Ej: ¡Por favor! 🥺"
                className="w-full pl-10 pr-4 py-2 bg-[#1a1c20] text-white placeholder-white/60 rounded-lg outline-none focus:ring-2 focus:ring-[#ff007a]/50"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={100}
              />
            </div>
            <p className="text-xs text-white/50 mt-1">
              {message.length}/100 caracteres
            </p>
          </div>
        )}

        {/* Grid de regalos */}
        <div className="p-4 sm:p-8 overflow-y-auto max-h-[calc(95vh-250px)] sm:max-h-[calc(90vh-300px)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 min-h-[400px] sm:min-h-[500px]">
            {gifts.map((gift) => (
              <div
                key={gift.id}
                onClick={() => !isLoading && handleGiftSelect(gift)}
                className={`group cursor-pointer border border-[#ff007a]/20 hover:border-[#ff007a]/50 rounded-xl p-3 sm:p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#ff007a]/10 flex flex-col items-center justify-center ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{ background: 'linear-gradient(180deg, #1a1c20 0%, #2b2d31 100%)', minHeight: '140px' }}
              >
                {/* Imagen del regalo */}
                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
                  <img 
                    src={gift.image} 
                    alt={gift.name}
                    className="w-12 h-12 sm:w-20 sm:h-20 object-contain filter group-hover:brightness-110 transition-all duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentNode.querySelector('.fallback-icon');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="fallback-icon hidden w-12 h-12 sm:w-20 sm:h-20 items-center justify-center">
                    <Gift size={24} className="sm:w-10 sm:h-10 text-[#ff007a]" />
                  </div>
                </div>

                {/* Información del regalo */}
                <div className="text-center">
                  <h3 className="text-white font-semibold text-xs sm:text-sm mb-2 sm:mb-3 group-hover:text-[#ff007a] transition-colors leading-tight">
                    {gift.name}
                  </h3>
                  
                  {/* Precio */}
                  <div className="inline-flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-[#ff007a] to-[#cc0062] rounded-full text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#ff007a]/20">
                    <Sparkles size={10} className="sm:w-3.5 sm:h-3.5" />
                    {gift.price}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[#ff007a]/20 bg-[#1a1c20]/50">
          <div className="flex items-center justify-center text-xs sm:text-sm text-white/60">
            <span>
              ✨ {gifts.length} regalos disponibles
              {userRole === 'modelo' && ' - Haz clic para pedir'}
            </span>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-[#0a0d10] border border-[#ff007a]/30 rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff007a]"></div>
              <span className="text-white font-medium">Enviando solicitud...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== ESTILOS CSS ====================
export const giftSystemStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.4s ease-out;
  }
`;