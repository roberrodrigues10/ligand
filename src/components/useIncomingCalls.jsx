import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Hook personalizado para manejar llamadas entrantes
 * Se debe usar en componentes principales como Layout o App
 */
export const useIncomingCalls = () => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const checkIntervalRef = useRef(null);
  const isActiveRef = useRef(true);

  // 🔥 FUNCIÓN: VERIFICAR LLAMADAS ENTRANTES
  const checkForIncomingCalls = async () => {
    if (!isActiveRef.current) return;

    try {
      const authToken = sessionStorage.getItem('token');
      if (!authToken) return;

      const response = await fetch(`${API_BASE_URL}/api/calls/check-incoming`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.has_incoming && data.incoming_call) {
          console.log('📞 [HOOK] Llamada entrante detectada:', data.incoming_call);
          
          // Solo mostrar si no hay ya una llamada visible
          if (!showIncomingCall) {
            setIncomingCall(data.incoming_call);
            setShowIncomingCall(true);
          }
        } else if (showIncomingCall && !data.has_incoming) {
          // La llamada ya no está disponible
          console.log('📞 [HOOK] Llamada entrante ya no disponible');
          setShowIncomingCall(false);
          setIncomingCall(null);
        }
      }
    } catch (error) {
      console.log('⚠️ [HOOK] Error verificando llamadas entrantes:', error);
    }
  };

  // 🔄 INICIAR POLLING
  useEffect(() => {
    console.log('📞 [HOOK] Iniciando monitoreo de llamadas entrantes');
    
    // Verificar inmediatamente
    checkForIncomingCalls();
    
    // Configurar polling cada 3 segundos
    checkIntervalRef.current = setInterval(checkForIncomingCalls, 3000);

    return () => {
      console.log('📞 [HOOK] Deteniendo monitoreo de llamadas entrantes');
      isActiveRef.current = false;
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // 🔥 FUNCIÓN: CERRAR OVERLAY DE LLAMADA ENTRANTE
  const closeIncomingCall = () => {
    console.log('📞 [HOOK] Cerrando overlay de llamada entrante');
    setShowIncomingCall(false);
    setIncomingCall(null);
  };

  // 🔥 FUNCIÓN: PAUSAR/REANUDAR MONITOREO
  const pauseMonitoring = () => {
    console.log('📞 [HOOK] Pausando monitoreo');
    isActiveRef.current = false;
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
  };

  const resumeMonitoring = () => {
    console.log('📞 [HOOK] Reanudando monitoreo');
    isActiveRef.current = true;
    checkIntervalRef.current = setInterval(checkForIncomingCalls, 3000);
  };

  return {
    incomingCall,
    showIncomingCall,
    closeIncomingCall,
    pauseMonitoring,
    resumeMonitoring
  };
};