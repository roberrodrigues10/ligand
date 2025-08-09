import React, { useState, useEffect } from 'react';
import { Clock, Wifi, WifiOff, User, Signal, Coins, Timer,Gift } from 'lucide-react';
import ClientRemainingMinutes from '../../ClientRemainingMinutes';

// ACTUALIZAR TimeDisplayImprovedClient.jsx para mostrar AMBOS balances:

const TimeDisplayImprovedClient = ({ 
  connected, 
  otherUser, 
  roomName, 
  t,
  userBalance,      // Balance de COINS (monedas generales)
  giftBalance,      // Balance de GIFTS (para regalos)
  remainingMinutes 
}) => {
  const [currentCoinsBalance, setCurrentCoinsBalance] = useState(userBalance || 0);
  const [currentGiftBalance, setCurrentGiftBalance] = useState(giftBalance || 0);
  const [currentMinutes, setCurrentMinutes] = useState(remainingMinutes || 0);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // 🔄 Actualizar ambos balances cada 5 minutos
  useEffect(() => {
    const updateBalances = async () => {
      try {
        const authToken = sessionStorage.getItem('token');
        if (!authToken) return;

        // 1️⃣ Balance de COINS
        const coinsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/client-balance/my-balance/quick`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (coinsResponse.ok) {
          const coinsData = await coinsResponse.json();
          if (coinsData.success) {
            setCurrentCoinsBalance(coinsData.total_coins);
            setCurrentMinutes(coinsData.remaining_minutes);
          }
        }

        // 2️⃣ Balance de GIFTS
        const giftsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/gifts/my-balance`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (giftsResponse.ok) {
          const giftsData = await giftsResponse.json();
          if (giftsData.success) {
            setCurrentGiftBalance(giftsData.gift_balance);
          }
        }

        setLastUpdate(Date.now());
      } catch (error) {
        console.error('Error actualizando balances:', error);
      }
    };

    // Actualizar inmediatamente
    updateBalances();

    // Actualizar cada 5 minutos
    const interval = setInterval(updateBalances, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Actualizar cuando cambien las props
  useEffect(() => {
    if (userBalance !== undefined) {
      setCurrentCoinsBalance(userBalance);
    }
  }, [userBalance]);

  useEffect(() => {
    if (giftBalance !== undefined) {
      setCurrentGiftBalance(giftBalance);
    }
  }, [giftBalance]);

  useEffect(() => {
    if (remainingMinutes !== undefined) {
      setCurrentMinutes(remainingMinutes);
    }
  }, [remainingMinutes]);

  return (
    <div className="w-full">
      {/* Versión móvil - compacta */}
      <div className="lg:hidden bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-xl rounded-xl p-3 border border-[#ff007a]/20 mx-4 mb-4">
        <div className="flex items-center justify-between gap-2">
          {/* Saldo de COINS con ícono dorado */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <Coins size={12} className="text-amber-500" />
            </div>
            <div>
              <div className="text-gray-300 text-xs">Monedas:</div>
              <div className="text-amber-500 font-bold text-sm font-mono tracking-wider">
                {currentCoinsBalance}
              </div>
            </div>
          </div>

          {/* Saldo de GIFTS con ícono rosa */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#ff007a]/20 rounded-lg border border-[#ff007a]/30">
              <Gift size={12} className="text-[#ff007a]" />
            </div>
            <div>
              <div className="text-gray-300 text-xs">Regalos:</div>
              <div className="text-[#ff007a] font-bold text-sm font-mono tracking-wider">
                {currentGiftBalance}
              </div>
            </div>
          </div>
          
          {/* Estado de conexión */}
          <div className="flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-1 bg-[#00ff66]/20 px-2 py-1 rounded-lg border border-[#00ff66]/30">
                <div className="w-2 h-2 bg-[#00ff66] rounded-full animate-pulse"></div>
                <span className="text-[#00ff66] text-xs font-medium">Conectado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-lg border border-red-400/30">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-red-300 text-xs font-medium">Desconectado</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Tiempo restante en móvil */}
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-500/20 rounded-md border border-blue-500/30">
              <Timer size={12} className="text-blue-400" />
            </div>
            <span className="text-blue-400 text-sm font-medium">
              {currentMinutes} min disponibles
            </span>
          </div>
        </div>

        {/* Info de la modelo en móvil */}
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
                  <span className="text-[#00ff66] text-xs">Modelo</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Versión desktop - cabecera superior MÁS COMPACTA */}
      <div className="hidden lg:flex justify-between items-center bg-gradient-to-b from-[#0a0d10] to-[#131418] backdrop-blur-xl rounded-lg p-2 border border-[#ff007a]/20 shadow-lg mx-4 mb-2">
        {/* Panel izquierdo - AMBOS balances y minutos */}
        <div className="flex items-center gap-3">
          {/* Saldo de COINS con ícono dorado */}
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-500/20 rounded-md border border-amber-500/30">
              <Coins size={14} className="text-amber-500" />
            </div>
            <div>
              <div className="text-gray-300 text-xs font-medium">Monedas:</div>
              <div className="text-amber-500 font-bold text-base font-mono tracking-wider">
                {currentCoinsBalance}
              </div>
            </div>
          </div>

          {/* Saldo de GIFTS con ícono rosa */}
          <div className="flex items-center gap-2">
            <div className="p-1 bg-[#ff007a]/20 rounded-md border border-[#ff007a]/30">
              <Gift size={14} className="text-[#ff007a]" />
            </div>
            <div>
              <div className="text-gray-300 text-xs font-medium">Regalos:</div>
              <div className="text-[#ff007a] font-bold text-base font-mono tracking-wider">
                {currentGiftBalance}
              </div>
            </div>
          </div>
          
          {/* Minutos disponibles con azul */}
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-500/20 rounded-md border border-blue-500/30">
              <Timer size={14} className="text-blue-400" />
            </div>
            <div>
              <div className="text-blue-400 font-bold text-sm">
                {currentMinutes} min
              </div>
            </div>
          </div>
        </div>
        
        {/* Resto del componente igual... */}
      </div>

      {/* Indicador de última actualización */}
      <div className="hidden lg:block text-center">
        <div className="text-xs text-gray-400 mx-4">
          Actualizado: {new Date(lastUpdate).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
};
export default TimeDisplayImprovedClient;