import React from 'react';
import { Clock, Wifi, WifiOff, User, Signal, Link } from 'lucide-react';
import ClientRemainingMinutes from '../../ClientRemainingMinutes';

const TimeDisplayImproved = ({ 
  tiempoReal, 
  formatoTiempo, 
  connected, 
  otherUser, 
  roomName, 
  t 
}) => {
  return (
    <div className="w-full">
      {/* Versión móvil - compacta */}
      <div className="lg:hidden bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-xl rounded-xl p-3 border border-[#ff007a]/20 mx-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          {/* Tiempo principal con rojo brillante */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#ff2e57]/20 rounded-lg border border-[#ff2e57]/30">
              <Clock size={14} className="text-[#ff2e57]" />
            </div>
            <div>
              <div className="text-gray-300 text-xs">Tiempo:</div>
              <div className="text-[#ff2e57] font-bold text-sm font-mono tracking-wider">
                {formatoTiempo()}
              </div>
            </div>
          </div>
          
          {/* Estado de conexión */}
          <div className="flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-1 bg-[#00ff66]/20 px-2 py-1 rounded-lg border border-[#00ff66]/30">
                <div className="w-2 h-2 bg-[#00ff66] rounded-full animate-pulse"></div>
                <span className="text-[#00ff66] text-xs font-medium">Conectada</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-lg border border-red-400/30">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-red-300 text-xs font-medium">Desconectada</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Info del chico en móvil */}
        {otherUser && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-[#ff007a] to-[#ff007a]/70 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <span className="text-white text-sm font-medium">{otherUser.name}</span>
              </div>
              
              {connected && (
                <div className="bg-[#00ff66]/20 px-2 py-1 rounded-lg border border-[#00ff66]/30">
                  <ClientRemainingMinutes
                    roomName={roomName}
                    clientUserId={otherUser.id}
                    connected={connected}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Versión desktop - cabecera superior MÁS COMPACTA */}
      <div className="hidden lg:flex justify-between items-center bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-xl rounded-lg p-2 border border-[#ff007a]/20 shadow-lg mx-4 mb-2">
        {/* Panel izquierdo - Tiempo y minutos del chico */}
        <div className="flex items-center gap-3">
          {/* Tiempo de llamada con rojo brillante */}
          <div className="flex items-center gap-2">
            <div className="p-1 bg-[#ff2e57]/20 rounded-md border border-[#ff2e57]/30">
              <Clock size={14} className="text-[#ff2e57]" />
            </div>
            <div>
              <div className="text-gray-300 text-xs font-medium">Tiempo:</div>
              <div className="text-[#ff2e57] font-bold text-base font-mono tracking-wider">
                {formatoTiempo()}
              </div>
            </div>
          </div>
          
          {/* Minutos del chico con verde */}
          {otherUser && connected && (
            <div className="flex items-center gap-2">
              <div className="p-1 bg-[#00ff66]/20 rounded-md border border-[#00ff66]/30">
                <Link size={14} className="text-[#00ff66]" />
              </div>
              <div>
                <div className="text-[#00ff66] font-bold text-sm">
                  <ClientRemainingMinutes
                    roomName={roomName}
                    clientUserId={otherUser.id}
                    connected={connected}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Panel central - Información del chico */}
        {otherUser && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-[#ff007a] to-[#ff007a]/70 rounded-lg flex items-center justify-center border border-[#ff007a]/50">
                <span className="text-white font-bold text-xs">
                  {otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              {connected && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00ff66] rounded-full border border-[#0a0d10] animate-pulse"></div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[#ff007a] text-xs font-medium">Chico conectado</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Panel derecho - Estado compacto */}
        <div className="flex items-center gap-2">
          {/* Estado de conexión */}
          <div className={`
            bg-gradient-to-br rounded-lg p-2 border shadow-md
            ${connected 
              ? 'from-[#00ff66]/10 to-[#00ff66]/5 border-[#00ff66]/30' 
              : 'from-red-500/10 to-red-500/5 border-red-400/30'
            }
          `}>
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-md border ${
                connected 
                  ? 'bg-[#00ff66]/20 border-[#00ff66]/30' 
                  : 'bg-red-500/20 border-red-400/30'
              }`}>
                {connected ? (
                  <Wifi size={12} className="text-[#00ff66]" />
                ) : (
                  <WifiOff size={12} className="text-red-400" />
                )}
              </div>
              <div>
                <div className={`text-xs font-semibold ${
                  connected ? 'text-[#00ff66]' : 'text-red-300'
                }`}>
                  {connected ? 'Conectada' : 'Desconectada'}
                </div>
                <div className="text-xs text-gray-400">
                  {connected ? 'Transmisión activa' : 'Sin conexión'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Calidad de conexión */}
          {connected && (
            <div className="bg-gradient-to-br from-[#ff007a]/10 to-[#ff007a]/5 rounded-lg p-2 border border-[#ff007a]/30">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-[#ff007a]/20 rounded-md border border-[#ff007a]/30">
                  <Signal size={12} className="text-[#ff007a]" />
                </div>
                <div>
                  <div className="text-[#ff007a] text-xs font-semibold">Excelente</div>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-2 bg-[#00ff66] rounded-full"></div>
                      <div className="w-0.5 h-3 bg-[#00ff66] rounded-full"></div>
                      <div className="w-0.5 h-4 bg-[#00ff66] rounded-full"></div>
                      <div className="w-0.5 h-3 bg-[#00ff66] rounded-full"></div>
                    </div>
                    <span className="text-xs text-gray-400 ml-1">HD</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Hora actual compacta */}
          <div className="bg-gradient-to-br from-gray-600/10 to-slate-600/10 rounded-lg p-2 border border-gray-500/30">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-gray-500/20 rounded-md border border-gray-400/30">
                <Clock size={12} className="text-gray-400" />
              </div>
              <div>
                <div className="text-gray-300 text-xs font-medium mb-0.5">Hora local</div>
                <div className="text-white font-mono text-xs">
                  {new Date().toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeDisplayImproved;