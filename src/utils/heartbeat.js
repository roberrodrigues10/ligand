// 🔥 /src/utils/heartbeat.js - Utilidad centralizada para heartbeats

import { useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔥 FUNCIÓN PRINCIPAL PARA ENVIAR HEARTBEAT
export const sendHeartbeat = async (activityType = 'browsing', room = null) => {
  try {
    const authToken = sessionStorage.getItem('token');
    if (!authToken) {
      console.log('⚠️ [HEARTBEAT] No hay token de autenticación');
      return false;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        activity_type: activityType,
        room: room
      })
    });

    if (response.ok) {
      const data = await response.json(
);
      console.log(`💓 [HEARTBEAT] ✅ ${activityType} en ${room || 'ninguna sala'}`);
      return true;
    } else {
      console.log(`⚠️ [HEARTBEAT] Error ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ [HEARTBEAT] Error de red:', error.message);
    return false;
  }
};

// 🔥 HOOK PERSONALIZADO PARA HEARTBEAT AUTOMÁTICO
export const useHeartbeat = (activityType = 'browsing', room = null, intervalMs = 15000, enabled = true) => {
  const intervalRef = useRef(null);
  const isEnabledRef = useRef(enabled);

  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!isEnabledRef.current) return;

    console.log(`🚀 [HEARTBEAT] Iniciando: ${activityType} cada ${intervalMs}ms`);

    // Heartbeat inicial
    sendHeartbeat(activityType, room);

    // Heartbeat periódico
    intervalRef.current = setInterval(() => {
      if (isEnabledRef.current) {
        sendHeartbeat(activityType, room);
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // 🔥 CLEANUP: Volver a browsing al desmontar (excepto si ya era browsing)
      if (activityType !== 'browsing' && isEnabledRef.current) {
        console.log(`🧹 [HEARTBEAT] Cleanup: ${activityType} → browsing`);
        sendHeartbeat('browsing', null);
      }
    };
  }, [activityType, room, intervalMs]);

  // Función para cambiar estado manualmente
  const changeActivity = (newActivityType, newRoom = null) => {
    console.log(`🔄 [HEARTBEAT] Cambio: ${activityType} → ${newActivityType}`);
    sendHeartbeat(newActivityType, newRoom);
  };

  return { changeActivity };
};

// 🔥 HOOK ESPECIALIZADO PARA COMPONENTES DE VIDEOCHAT
export const useVideoChatHeartbeat = (roomName, role = 'modelo') => {
  const activityType = role === 'modelo' ? 'videochat' : 'videochat_client';
  
  return useHeartbeat(activityType, roomName, 15000, !!roomName);
};

// 🔥 HOOK PARA COMPONENTES DE BÚSQUEDA
export const useSearchHeartbeat = (roomName, isSearching = true) => {
  const activityType = isSearching ? 'searching' : 'browsing';
  
  return useHeartbeat(activityType, roomName, 10000, isSearching);
};

// 🔥 HOOK PARA COMPONENTES DE NAVEGACIÓN
export const useBrowsingHeartbeat = (intervalMs = 20000) => {
  return useHeartbeat('browsing', null, intervalMs);
};

// 🔥 CONSTANTES ÚTILES
export const ACTIVITY_TYPES = {
  // ✅ Disponibles para emparejamiento
  BROWSING: 'browsing',
  SEARCHING: 'searching', 
  IDLE: 'idle',
  
  // ❌ No disponibles para emparejamiento
  VIDEOCHAT: 'videochat',
  VIDEOCHAT_CLIENT: 'videochat_client',
  VIDEOCHAT_MODEL: 'videochat_model'
};

export const HEARTBEAT_INTERVALS = {
  FAST: 10000,    // 10 segundos - Para búsqueda activa
  NORMAL: 15000,  // 15 segundos - Para videochat
  SLOW: 20000,    // 20 segundos - Para navegación
  VERY_SLOW: 30000 // 30 segundos - Para estados idle
};

// 🔥 FUNCIÓN PARA VERIFICAR SI UN ESTADO ESTÁ DISPONIBLE PARA EMPAREJAMIENTO
export const isAvailableForMatching = (activityType) => {
  const availableTypes = [
    ACTIVITY_TYPES.BROWSING,
    ACTIVITY_TYPES.SEARCHING,
    ACTIVITY_TYPES.IDLE
  ];
  
  return availableTypes.includes(activityType);
};

// 🔥 FUNCIÓN PARA LIMPIAR HEARTBEAT AL CERRAR VENTANA
export const setupHeartbeatCleanup = () => {
  const cleanup = () => {
    // Usar sendBeacon para envío confiable al cerrar
    const authToken = sessionStorage.getItem('token');
    if (authToken && navigator.sendBeacon) {
      const data = new FormData();
      data.append('activity_type', 'idle');
      data.append('room', '');
      
      navigator.sendBeacon(`${API_BASE_URL}/api/heartbeat`, data);
      console.log('🧹 [HEARTBEAT] Cleanup enviado via sendBeacon');
    }
  };

  // Limpiar al cerrar ventana/pestaña
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('unload', cleanup);
  
  // Limpiar al perder visibilidad
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sendHeartbeat('idle', null);
    } else {
      sendHeartbeat('browsing', null);
    }
  });

  return () => {
    window.removeEventListener('beforeunload', cleanup);
    window.removeEventListener('unload', cleanup);
  };
};

export default {
  sendHeartbeat,
  useHeartbeat,
  useVideoChatHeartbeat,
  useSearchHeartbeat,
  useBrowsingHeartbeat,
  ACTIVITY_TYPES,
  HEARTBEAT_INTERVALS,
  isAvailableForMatching,
  setupHeartbeatCleanup
};