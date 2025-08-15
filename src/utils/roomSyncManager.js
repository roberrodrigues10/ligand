// 🔥 NUEVO ARCHIVO: utils/roomSyncManager.js

import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';

export class RoomSyncManager {
  constructor(roomName, userName, userRole) {
    this.roomName = roomName;
    this.userName = userName;
    this.userRole = userRole;
    this.isActive = false;
    this.syncInterval = null;
    this.lastSyncTime = 0;
    this.consecutiveErrors = 0;
    this.maxErrors = 3;
    this.listeners = [];
  }

  // 🔥 INICIAR SINCRONIZACIÓN
  start() {
    if (this.isActive) {
      console.log('🔄 Sync manager ya está activo');
      return;
    }

    console.log('🚀 Iniciando Room Sync Manager', {
      room: this.roomName,
      user: this.userName,
      role: this.userRole
    });

    this.isActive = true;
    this.consecutiveErrors = 0;

    // Sincronización inicial inmediata
    this.performSync();

    // Sincronización periódica cada 12 segundos
    this.syncInterval = setInterval(() => {
      if (this.isActive) {
        this.performSync();
      }
    }, 12000);
  }

  // 🔥 DETENER SINCRONIZACIÓN
  stop() {
    console.log('🛑 Deteniendo Room Sync Manager');
    this.isActive = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.listeners = [];
  }

  // 🔥 AGREGAR LISTENER PARA EVENTOS
  addListener(eventType, callback) {
    this.listeners.push({ eventType, callback });
  }

  // 🔥 EMITIR EVENTOS
  emit(eventType, data) {
    this.listeners
      .filter(listener => listener.eventType === eventType)
      .forEach(listener => {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('❌ Error en listener:', error);
        }
      });
  }

  // 🔥 REALIZAR SINCRONIZACIÓN
  async performSync() {
    if (!this.isActive) return;

    const now = Date.now();
    
    // Evitar sincronizaciones muy frecuentes
    if (now - this.lastSyncTime < 10000) {
      console.log('⏭️ Saltando sync - muy reciente');
      return;
    }

    try {
      console.log('🔄 Ejecutando sincronización...');
      
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        throw new Error('No hay token de autenticación');
      }

      // 1. Verificar estado global del usuario
      const globalStatus = await this.checkGlobalUserStatus(authToken);
      
      // 2. Verificar participantes de la sala actual
      const roomStatus = await this.checkRoomStatus(authToken);
      
      // 3. Analizar inconsistencias
      const analysis = this.analyzeConsistency(globalStatus, roomStatus);
      
      // 4. Ejecutar acciones correctivas si es necesario
      if (analysis.needsAction) {
        console.log('⚠️ Inconsistencias detectadas:', analysis);
        await this.executeCorrectiveActions(analysis, authToken);
      }

      this.lastSyncTime = now;
      this.consecutiveErrors = 0;
      
      console.log('✅ Sincronización completada');

    } catch (error) {
      this.consecutiveErrors++;
      console.error(`❌ Error en sincronización (${this.consecutiveErrors}/${this.maxErrors}):`, error);

      // Si hay muchos errores consecutivos, detener sincronización
      if (this.consecutiveErrors >= this.maxErrors) {
        console.error('🚨 Demasiados errores - deteniendo sincronización');
        this.emit('sync_failed', { error, consecutiveErrors: this.consecutiveErrors });
        this.stop();
      }
    }
  }

  // 🔥 VERIFICAR ESTADO GLOBAL DEL USUARIO
  async checkGlobalUserStatus(authToken) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/heartbeat/check-user-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error verificando estado global: ${response.status}`);
    }

    return await response.json();
  }

  // 🔥 VERIFICAR ESTADO DE LA SALA
  async checkRoomStatus(authToken) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/livekit/participants/${this.roomName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error verificando sala: ${response.status}`);
    }

    return await response.json();
  }

  // 🔥 ANALIZAR CONSISTENCIAS
  analyzeConsistency(globalStatus, roomStatus) {
    const analysis = {
      needsAction: false,
      actions: [],
      severity: 'low',
      details: {}
    };

    // 1. Verificar múltiples sesiones activas
    if (globalStatus.active_sessions_count > 1) {
      analysis.needsAction = true;
      analysis.actions.push('cleanup_multiple_sessions');
      analysis.severity = 'high';
      analysis.details.multipleSessions = globalStatus.sessions;
    }

    // 2. Verificar si la sala actual existe en las sesiones del servidor
    const currentSessionExists = globalStatus.sessions.some(
      session => session.room_name === this.roomName
    );

    if (!currentSessionExists && roomStatus.success) {
      analysis.needsAction = true;
      analysis.actions.push('sync_session_mismatch');
      analysis.severity = 'medium';
      analysis.details.sessionMismatch = {
        currentRoom: this.roomName,
        serverSessions: globalStatus.sessions
      };
    }

    // 3. Verificar si el usuario está en la lista de participantes
    const userInParticipants = roomStatus.participants?.some(
      p => p.role === this.userRole
    );

    if (roomStatus.success && !userInParticipants) {
      analysis.needsAction = true;
      analysis.actions.push('user_not_in_room');
      analysis.severity = 'high';
      analysis.details.notInRoom = {
        currentRole: this.userRole,
        roomParticipants: roomStatus.participants
      };
    }

    // 4. Verificar si la sala fue marcada como finalizada
    if (roomStatus.session_status === 'ended') {
      analysis.needsAction = true;
      analysis.actions.push('session_ended_externally');
      analysis.severity = 'high';
      analysis.details.sessionEnded = true;
    }

    // 5. Verificar heartbeat inconsistente
    if (globalStatus.current_activity?.includes('videochat') && 
        globalStatus.current_room !== this.roomName) {
      analysis.needsAction = true;
      analysis.actions.push('heartbeat_room_mismatch');
      analysis.severity = 'medium';
      analysis.details.heartbeatMismatch = {
        heartbeatRoom: globalStatus.current_room,
        actualRoom: this.roomName
      };
    }

    return analysis;
  }

  // 🔥 EJECUTAR ACCIONES CORRECTIVAS
  async executeCorrectiveActions(analysis, authToken) {
    console.log('🔧 Ejecutando acciones correctivas:', analysis.actions);

    for (const action of analysis.actions) {
      try {
        switch (action) {
          case 'cleanup_multiple_sessions':
            await this.cleanupMultipleSessions(authToken);
            break;

          case 'sync_session_mismatch':
          case 'user_not_in_room':
          case 'session_ended_externally':
            this.emit('need_redirect', {
              reason: action,
              details: analysis.details,
              recommendedAction: 'return_to_search'
            });
            break;

          case 'heartbeat_room_mismatch':
            await this.syncHeartbeat(authToken);
            break;

          default:
            console.warn('⚠️ Acción desconocida:', action);
        }
      } catch (error) {
        console.error(`❌ Error ejecutando acción ${action}:`, error);
      }
    }
  }

  // 🔥 LIMPIAR MÚLTIPLES SESIONES
  async cleanupMultipleSessions(authToken) {
    console.log('🧹 Limpiando múltiples sesiones...');

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/heartbeat/force-cleanup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'multiple_sessions_detected'
      })
    });

    if (!response.ok) {
      throw new Error(`Error en cleanup: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Cleanup completado:', result);
  }

  // 🔥 SINCRONIZAR HEARTBEAT
  async syncHeartbeat(authToken) {
    console.log('💓 Sincronizando heartbeat...');

    const activityType = this.userRole === 'modelo' ? 'videochat' : 'videochat_client';

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/heartbeat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        activity_type: activityType,
        room: this.roomName
      })
    });

    if (!response.ok) {
      throw new Error(`Error sincronizando heartbeat: ${response.status}`);
    }

    console.log('✅ Heartbeat sincronizado');
  }
}

// 🔥 HOOK PERSONALIZADO PARA USAR EL SYNC MANAGER
export function useRoomSyncManager(roomName, userName, userRole, connected) {
  const navigate = useNavigate();
  const syncManagerRef = useRef(null);

  useEffect(() => {
    if (!roomName || !userName || !userRole || !connected) {
      // Detener sync si no hay datos completos
      if (syncManagerRef.current) {
        syncManagerRef.current.stop();
        syncManagerRef.current = null;
      }
      return;
    }

    console.log('🔧 Configurando Room Sync Manager...');

    // Crear nuevo sync manager
    const syncManager = new RoomSyncManager(roomName, userName, userRole);
    syncManagerRef.current = syncManager;

    // Configurar listeners
    syncManager.addListener('need_redirect', (data) => {
      console.log('🔄 Redirección requerida por sync manager:', data);
      
      // Detener sync antes de navegar
      syncManager.stop();
      
      // Navegar basado en la razón
      const urlParams = new URLSearchParams({
        role: userRole,
        from: 'sync_manager',
        reason: data.reason,
        message: 'Sesión inconsistente detectada'
      });
      
      navigate(`/usersearch?${urlParams}`, { replace: true });
    });

    syncManager.addListener('sync_failed', (data) => {
      console.error('🚨 Sync manager falló:', data);
      
      // En caso de fallo crítico, también redirigir
      const urlParams = new URLSearchParams({
        role: userRole,
        from: 'sync_failed',
        reason: 'sync_error',
        message: 'Error de sincronización'
      });
      
      navigate(`/usersearch?${urlParams}`, { replace: true });
    });

    // Iniciar sincronización
    syncManager.start();

    // Cleanup al desmontar
    return () => {
      console.log('🧹 Limpiando Room Sync Manager');
      if (syncManagerRef.current) {
        syncManagerRef.current.stop();
        syncManagerRef.current = null;
      }
    };

  }, [roomName, userName, userRole, connected, navigate]);

  // Función para forzar sincronización manual
  const forceSync = useCallback(() => {
    if (syncManagerRef.current) {
      console.log('🔄 Forzando sincronización manual...');
      syncManagerRef.current.performSync();
    } else {
      console.warn('⚠️ No hay sync manager activo para forzar');
    }
  }, []);

  // 🔥 RETORNAR OBJETO CON forceSync
  return { forceSync };
}

// 🔥 FUNCIÓN UTILITARIA PARA CLEANUP COMPLETO
export async function performCompleteUserCleanup(reason = 'manual_cleanup') {
  console.log('🧹 Iniciando cleanup completo del usuario...', { reason });

  try {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      console.warn('❌ No hay token para cleanup');
      return false;
    }

    // 1. Cleanup en servidor
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/heartbeat/force-cleanup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cleanup servidor exitoso:', result);
    } else {
      console.warn('⚠️ Error en cleanup servidor:', response.status);
    }

    // 2. Cleanup local
    const itemsToRemove = [
      'roomName', 'userName', 'currentRoom', 
      'inCall', 'callToken', 'videochatActive'
    ];

    itemsToRemove.forEach(item => {
      try {
        localStorage.removeItem(item);
      } catch (e) {
        console.warn('⚠️ Error removiendo item:', item);
      }
    });

    console.log('✅ Cleanup completo exitoso');
    return true;

  } catch (error) {
    console.error('❌ Error en cleanup completo:', error);
    return false;
  }
}