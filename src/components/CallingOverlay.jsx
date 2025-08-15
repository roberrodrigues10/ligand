import React from 'react';
import { PhoneOff } from 'lucide-react';

const CallingOverlay = ({ 
  isVisible = false, 
  callerName = "Usuario", 
  onCancel = () => {},
  callerAvatar = null,
  callStatus = 'initiating'
}) => {
  const [dots, setDots] = React.useState('');
  const [callDuration, setCallDuration] = React.useState(0);

  // Animación de puntos suspensivos
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Timer de duración
  React.useEffect(() => {
    let interval;
    if (isVisible && callStatus === 'calling') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVisible, callStatus]);

  if (!isVisible) return null;

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusInfo = () => {
    switch (callStatus) {
      case 'initiating':
        return {
          title: 'Iniciando llamada...',
          subtitle: 'Preparando conexión',
          icon: '📞',
          showProgress: false
        };
      case 'calling':
        return {
          title: `Llamando${dots}`,
          subtitle: `Esperando respuesta (${formatTime(callDuration)})`,
          icon: '📞',
          showProgress: true
        };
      default:
        return {
          title: 'Conectando...',
          subtitle: 'Por favor espera',
          icon: '📞',
          showProgress: false
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop con blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1c20]/95 to-[#2b2d31]/95 backdrop-blur-sm"></div>
      
      {/* Contenido de la llamada */}
      <div className="relative z-10 bg-[#1f2125] rounded-2xl p-8 shadow-xl border border-[#ff007a]/20 max-w-sm w-full mx-6 text-center">
        
        {/* Avatar del usuario */}
        <div className="relative mb-6">
          <div className="w-32 h-32 mx-auto rounded-full mb-6 flex items-center justify-center text-4xl font-bold bg-[#ff007a] text-white shadow-2xl animate-pulse">
            {callerAvatar ? (
              <img src={callerAvatar} alt={callerName} className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitial(callerName)
            )}
          </div>
          
          {/* Anillos de animación */}
          {callStatus === 'calling' && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-[#ff007a]/50 animate-ping"></div>
              <div className="absolute inset-2 rounded-full border-2 border-[#ff007a]/30 animate-pulse"></div>
            </>
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-2">{callerName}</h2>
        
        {/* Estado de llamada */}
        <div className="bg-[#2b2d31] border border-[#ff007a]/30 rounded-xl p-3 mb-6">
          <p className="text-lg text-[#ff007a] font-semibold">
            {statusInfo.title}
          </p>
          <p className="text-sm text-white/60 mt-1">
            {statusInfo.subtitle}
          </p>
          
          {/* Barra de progreso para timeout */}
          {statusInfo.showProgress && (
            <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
              <div 
                className="bg-[#ff007a] h-1 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${Math.min((callDuration / 30) * 100, 100)}%`,
                  backgroundColor: callDuration > 25 ? '#ef4444' : '#ff007a' 
                }}
              ></div>
            </div>
          )}
        </div>

        {/* Animación de ondas de llamada */}
        {callStatus === 'calling' && (
          <div className="flex justify-center mb-6">
            <div className="flex space-x-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className="w-2 h-2 bg-[#ff007a] rounded-full animate-bounce"
                  style={{animationDelay: `${i * 0.1}s`}}
                ></div>
              ))}
            </div>
          </div>
        )}

        {/* Botón de cancelar */}
        <div className="flex justify-center">
          <button
            onClick={onCancel}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-md transition-all duration-200 transform hover:scale-105 flex items-center gap-3"
          >
            <PhoneOff size={20} />
            Cancelar Llamada
          </button>
        </div>

        {/* Consejo adicional */}
        <div className="mt-6 bg-[#2b2d31] border border-[#ff007a]/20 rounded-xl p-3 text-center">
          <p className="text-white/60 text-sm">
            💡 {callStatus === 'calling' ? 
              'La llamada se cancelará automáticamente en 30 segundos' : 
              'Estableciendo conexión con el usuario'
            }
          </p>
        </div>
      </div>

      {/* Efecto de pulsación en el fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#ff007a]/5 animate-pulse"></div>
      </div>
    </div>
  );
};

export default CallingOverlay;