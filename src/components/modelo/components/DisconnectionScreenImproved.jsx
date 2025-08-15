import React from 'react';
import { ArrowRight, Zap, Heart, Sparkles, Clock } from 'lucide-react';

const DisconnectionScreenImproved = ({ 
  disconnectionType, 
  disconnectionReason, 
  redirectCountdown, 
  t 
}) => {
  
  const getDisconnectionInfo = () => {
    switch (disconnectionType) {
      case 'next':
        return {
          icon: '⏭️',
          title: t?.('videochat.userSkippedYou') || 'El chico pasó al siguiente',
          subtitle: 'Buscó a otra modelo',
          bgGradient: 'from-amber-500/20 to-orange-500/20',
          borderColor: 'border-amber-400/30',
          iconBg: 'from-amber-500/20 to-amber-500/10',
          textColor: 'text-amber-100',
          accentColor: 'text-amber-400'
        };
      case 'stop':
        return {
          icon: '🛑',
          title: t?.('videochat.clientDisconnected') || 'El chico se desconectó',
          subtitle: 'Finalizó la videollamada',
          bgGradient: 'from-red-500/20 to-red-500/10',
          borderColor: 'border-red-400/30',
          iconBg: 'from-red-500/20 to-red-500/10',
          textColor: 'text-red-100',
          accentColor: 'text-red-400'
        };
      case 'left':
        return {
          icon: '👋',
          title: t?.('videochat.userLeft') || 'El chico abandonó la sala',
          subtitle: 'Salió de la sesión',
          bgGradient: 'from-[#ff007a]/20 to-[#ff007a]/10',
          borderColor: 'border-[#ff007a]/30',
          iconBg: 'from-[#ff007a]/20 to-[#ff007a]/10',
          textColor: 'text-[#ff007a]',
          accentColor: 'text-[#ff007a]'
        };
      default:
        return {
          icon: '💔',
          title: t?.('videochat.sessionEnded') || 'Sesión finalizada',
          subtitle: 'Se perdió la conexión',
          bgGradient: 'from-gray-500/20 to-gray-500/10',
          borderColor: 'border-gray-400/30',
          iconBg: 'from-gray-500/20 to-gray-500/10',
          textColor: 'text-gray-100',
          accentColor: 'text-gray-400'
        };
    }
  };

  const info = getDisconnectionInfo();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo animado con partículas */}
      <div className="absolute inset-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${info.bgGradient} opacity-40`}></div>
        
        {/* Partículas flotantes mejoradas */}
        <div className="absolute top-20 left-20 w-3 h-3 bg-[#ff007a]/20 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-40 right-32 w-2 h-2 bg-[#ff007a]/30 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-40 w-2 h-2 bg-[#00ff66]/20 rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-20 w-1 h-1 bg-white/25 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-60 left-80 w-1 h-1 bg-[#ff007a]/30 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-80 right-60 w-2 h-2 bg-[#ff007a]/15 rounded-full animate-bounce" style={{animationDelay: '2.5s'}}></div>
        
        {/* Ondas de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-[#ff007a]/10 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-64 h-64 border border-[#ff007a]/20 rounded-full animate-ping"></div>
        </div>
      </div>
      
      <div className="text-center max-w-lg mx-auto relative z-10">
        {/* Contenedor principal con glassmorphism */}
        <div className="bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-2xl rounded-3xl border border-[#ff007a]/20 p-8 shadow-2xl">
          
          {/* Icono principal rediseñado */}
          <div className={`bg-gradient-to-br ${info.iconBg} rounded-3xl p-10 mx-auto mb-8 border ${info.borderColor} backdrop-blur-sm shadow-2xl relative overflow-hidden`}>
            {/* Efecto de brillo */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer"></div>
            
            <div className="text-8xl animate-bounce relative z-10">
              {info.icon}
            </div>
            
            {/* Anillo de pulso */}
            <div className="absolute inset-6 border-2 border-[#ff007a]/20 rounded-2xl animate-pulse"></div>
          </div>
          
          {/* Información principal */}
          <div className="space-y-4 mb-8">
            <h2 className="text-4xl font-bold text-white leading-tight">
              {info.title}
            </h2>
            <p className={`text-xl ${info.textColor} font-medium leading-relaxed`}>
              {info.subtitle}
            </p>
          </div>
          
          {/* Mensaje de razón */}
          {disconnectionReason && (
            <div className={`bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-lg border ${info.borderColor} rounded-2xl p-6 mb-8 shadow-xl`}>
              <div className="flex items-center gap-3 mb-3">
                <Sparkles size={20} className={info.accentColor} />
                <span className="text-white font-semibold text-sm">Detalles</span>
              </div>
              <p className={`${info.textColor} text-base leading-relaxed`}>
                {disconnectionReason}
              </p>
            </div>
          )}
          
          {/* Sección de reconexión rediseñada */}
          <div className="bg-gradient-to-r from-[#ff007a]/10 to-[#ff007a]/5 backdrop-blur-lg border border-[#ff007a]/20 rounded-3xl p-8 space-y-6 shadow-xl">
            
            {/* Mensaje motivacional */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Heart size={20} className="text-[#ff007a]" />
                <h3 className="text-white font-bold text-lg">
                  {t?.('videochat.dontWorry') || '¡No te preocupes!'}
                </h3>
              </div>
              <p className="text-[#ff007a] text-base leading-relaxed">
                Te conectaremos con otro chico increíble en segundos
              </p>
            </div>
            
            {/* Countdown mejorado */}
            {redirectCountdown > 0 ? (
              <div className="relative">
                <div className="flex items-center justify-center space-x-4">
                  {/* Spinner animado */}
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-600/30 rounded-full"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-[#ff007a] border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[#ff007a] font-bold text-xl">
                        {redirectCountdown}
                      </span>
                    </div>
                  </div>
                  
                  {/* Información del countdown */}
                  <div className="text-left">
                    <div className="text-[#ff007a] font-bold text-2xl flex items-center gap-2">
                      <Clock size={24} />
                      Conectando en {redirectCountdown}s
                    </div>
                    <div className="text-[#ff007a]/70 text-sm mt-1 flex items-center gap-1">
                      <Zap size={14} />
                      Preparando siguiente conexión...
                    </div>
                  </div>
                </div>
                
                {/* Barra de progreso */}
                <div className="mt-6">
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-[#ff007a] to-[#ff007a]/80 rounded-full transition-all duration-1000 relative overflow-hidden"
                      style={{ 
                        width: `${((3 - redirectCountdown) / 3) * 100}%` 
                      }}
                    >
                      {/* Efecto de brillo en la barra */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shimmer"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center justify-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-[#ff007a] border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-2 border-[#ff007a]/50 rounded-full animate-ping"></div>
                  </div>
                  <div className="text-left">
                    <div className="text-[#ff007a] font-bold text-2xl flex items-center gap-2">
                      <Zap size={24} />
                      Conectando...
                    </div>
                    <div className="text-[#ff007a]/70 text-sm mt-1">
                      Buscando el chico perfecto para ti
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Consejos mejorados */}
        <div className="mt-8 space-y-3">
          <div className="bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-sm rounded-2xl p-4 border border-[#00ff66]/20 hover:border-[#00ff66]/40 transition-all duration-300 group">
            <div className="flex items-center gap-3 text-[#00ff66]">
              <div className="p-2 bg-[#00ff66]/20 rounded-xl group-hover:bg-[#00ff66]/30 transition-colors">
                <Sparkles size={16} className="text-[#00ff66]" />
              </div>
              <span className="text-sm font-medium">
                💡 Mantén una buena iluminación para mejores conexiones
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-sm rounded-2xl p-4 border border-[#ff007a]/20 hover:border-[#ff007a]/40 transition-all duration-300 group">
            <div className="flex items-center gap-3 text-[#ff007a]">
              <div className="p-2 bg-[#ff007a]/20 rounded-xl group-hover:bg-[#ff007a]/30 transition-colors">
                <Heart size={16} className="text-[#ff007a]" />
              </div>
              <span className="text-sm font-medium">
                🎯 Sé amigable y el siguiente chico se quedará más tiempo
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-sm rounded-2xl p-4 border border-[#ff007a]/20 hover:border-[#ff007a]/40 transition-all duration-300 group">
            <div className="flex items-center gap-3 text-[#ff007a]">
              <div className="p-2 bg-[#ff007a]/20 rounded-xl group-hover:bg-[#ff007a]/30 transition-colors">
                <ArrowRight size={16} className="text-[#ff007a]" />
              </div>
              <span className="text-sm font-medium">
                ✨ Cada nueva conexión es una oportunidad única
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(300%) skewX(-12deg); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default DisconnectionScreenImproved;