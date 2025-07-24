// 🔥 UserSearch.jsx - VERSIÓN OPTIMIZADA COMPLETA
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🚀 RATE LIMITER INTELIGENTE
class SmartRateLimiter {
  constructor() {
    this.lastRequests = new Map();
    this.isRateLimited = false;
    this.rateLimitUntil = 0;
    this.failureCount = 0;
    this.adaptiveInterval = 8000; // Interval adaptativo inicial
  }

  canMakeRequest(type) {
    const now = Date.now();
    
    if (this.isRateLimited && now < this.rateLimitUntil) {
      return false;
    }
    
    if (this.isRateLimited && now >= this.rateLimitUntil) {
      this.isRateLimited = false;
      this.failureCount = 0;
      console.log('✅ Rate limit liberado');
    }

    const lastRequest = this.lastRequests.get(type) || 0;
    const minInterval = type === 'heartbeat' ? 12000 : this.adaptiveInterval;
    
    return (now - lastRequest) >= minInterval;
  }

  async fetchSafe(url, options, type) {
    if (!this.canMakeRequest(type)) {
      return { success: false, rateLimited: true };
    }

    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        this.handleRateLimit();
        return { success: false, rateLimited: true };
      }

      if (response.ok) {
        this.lastRequests.set(type, Date.now());
        this.failureCount = 0;
        this.adaptiveInterval = Math.max(6000, this.adaptiveInterval - 500); // Reducir interval si todo va bien
        const data = await response.json();
        return { success: true, data, rateLimited: false };
      }

      return { success: false, error: `HTTP ${response.status}`, rateLimited: false };
      
    } catch (error) {
      this.failureCount++;
      this.adaptiveInterval = Math.min(20000, this.adaptiveInterval + 1000); // Aumentar interval si hay errores
      return { success: false, error: error.message, rateLimited: false };
    }
  }

  handleRateLimit() {
    this.isRateLimited = true;
    this.rateLimitUntil = Date.now() + 65000; // 65 segundos
    this.adaptiveInterval = Math.min(25000, this.adaptiveInterval * 1.5); // Aumentar interval agresivamente
    console.log(`🚫 Rate limited por 65s. Nuevo interval: ${this.adaptiveInterval}ms`);
  }

  getAdaptiveInterval() {
    return this.adaptiveInterval;
  }
}

const rateLimiter = new SmartRateLimiter();

const UserSearch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [searchStatus, setSearchStatus] = useState('Iniciando...');
  const [roomData, setRoomData] = useState(null);
  const [waitTime, setWaitTime] = useState(0);
  const [connectionCount, setConnectionCount] = useState(0);
  
  const checkIntervalRef = useRef(null);
  const waitTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const instanceIdRef = useRef(`instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Estados de protección
  const [isSearchingRooms, setIsSearchingRooms] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Parámetros
  const role = searchParams.get('role');
  const selectedCamera = searchParams.get('selectedCamera');
  const selectedMic = searchParams.get('selectedMic');
  const currentRoom = searchParams.get('currentRoom');
  const userName = searchParams.get('userName');
  
  console.log(`🔍 [${instanceIdRef.current}] Parámetros:`, { role, currentRoom, userName });

  // 🚀 HEARTBEAT OPTIMIZADO (Menos crítico, puede fallar)
  const sendOptimizedHeartbeat = async (activityType, room = null) => {
    const authToken = sessionStorage.getItem('token');
    if (!authToken) return false;

    const result = await rateLimiter.fetchSafe(
      `${API_BASE_URL}/api/heartbeat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ activity_type: activityType, room })
      },
      'heartbeat'
    );

    if (result.success) {
      console.log(`💓 Heartbeat: ${activityType} en ${room || 'ninguna sala'}`);
    } else if (result.rateLimited) {
      console.log('⏸️ Heartbeat omitido (rate limited)');
    }

    return result.success;
  };

  // 🚀 NUEVO ENDPOINT LIGERO PARA VERIFICAR SOLO LA SALA
  const checkRoomStatus = async (roomName) => {
    const authToken = sessionStorage.getItem('token');
    if (!authToken) return null;

    // 🎯 USAR ENDPOINT ESPECÍFICO PARA VERIFICAR SALA (MÁS LIGERO)
    const result = await rateLimiter.fetchSafe(
      `${API_BASE_URL}/api/room/quick-status/${roomName}`, // 🚀 NUEVO ENDPOINT
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      },
      'room_check'
    );

    if (result.success) {
      return result.data;
    } else if (result.rateLimited) {
      console.log('⏸️ Verificación de sala omitida (rate limited)');
      return 'rate_limited';
    } else {
      // Fallback al endpoint original si el nuevo no existe
      console.log('📡 Fallback al endpoint original...');
      const fallbackResult = await rateLimiter.fetchSafe(
        `${API_BASE_URL}/api/room/quick-status/${roomName}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` }
        },
        'room_check'
      );
      
      return fallbackResult.success ? fallbackResult.data : null;
    }
  };

  // 🚀 FUNCIÓN DE BÚSQUEDA EXISTENTE (OPTIMIZADA)
  const searchExistingRooms = async () => {
    if (isSearchingRooms) return null;
    setIsSearchingRooms(true);

    try {
      setSearchStatus('Buscando salas disponibles...');
      const authToken = sessionStorage.getItem('token');
      if (!authToken) throw new Error('No hay token de autenticación');

      const result = await rateLimiter.fetchSafe(
        `${API_BASE_URL}/api/livekit/find-available-rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ 
            userRole: role,
            lookingFor: role === 'modelo' ? 'cliente' : 'modelo'
          }),
        },
        'search_rooms'
      );

      if (result.success && result.data.success && result.data.availableRoom) {
        return await joinExistingRoom(result.data.availableRoom);
      }

      return null;
    } catch (error) {
      console.log('⚠️ Error buscando salas:', error);
      return null;
    } finally {
      setIsSearchingRooms(false);
    }
  };

  // 🚀 UNIRSE A SALA EXISTENTE (OPTIMIZADA)
  const joinExistingRoom = async (roomInfo) => {
    if (isJoiningRoom) return true;
    setIsJoiningRoom(true);

    try {
      setSearchStatus('Uniéndose a sala existente...');
      const authToken = sessionStorage.getItem('token');
      
      const result = await rateLimiter.fetchSafe(
        `${API_BASE_URL}/api/livekit/join-room`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ 
            roomName: roomInfo.roomName,
            userRole: role
          }),
        },
        'join_room'
      );

      if (result.success && result.data.success) {
        await redirectToVideoChat(result.data.roomName, result.data.userName, result.data, true);
        return true;
      }

      return null;
    } catch (error) {
      console.error('❌ Error uniéndose a sala:', error);
      return null;
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // 🚀 CREAR SALA (OPTIMIZADA)
  const createRoom = async () => {
    if (isCreatingRoom) return;
    setIsCreatingRoom(true);

    try {
      setSearchStatus('Creando sala...');
      const authToken = sessionStorage.getItem('token');
      if (!authToken) throw new Error('No hay token de autenticación');

      let endpoint = '';
      let body = {};

      if (currentRoom && userName) {
        endpoint = '/api/livekit/next-room';
        body = { 
          currentRoom,
          userName,
          reason: `${role}_siguiente`,
          excludeUserId: searchParams.get('excludeUser'),
          excludeUserName: searchParams.get('excludeUserName')
        };
      } else {
        endpoint = '/api/ruleta/iniciar';
        body = {};
      }

      const result = await rateLimiter.fetchSafe(
        `${API_BASE_URL}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(body),
        },
        'create_room'
      );

      if (!result.success) {
        throw new Error(result.error || 'Error creando sala');
      }

      const data = result.data;
      const roomName = data.roomName || data.newRoomName;
      const finalUserName = data.userName;

      if (!roomName || !finalUserName) {
        throw new Error('Datos de sala incompletos');
      }

      const newRoomData = {
        roomName,
        userName: finalUserName,
        ruletaData: data
      };
      
      setRoomData(newRoomData);
      setSearchStatus('Sala creada. Esperando usuarios...');
      
      // Heartbeat inicial
      await sendOptimizedHeartbeat('searching', roomName);
      
      // Iniciar verificación
      startOptimizedWaiting(roomName, finalUserName, newRoomData);

    } catch (error) {
      console.error('❌ Error creando sala:', error);
      setError(error.message);
      setSearchStatus('Error creando sala');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // 🚀 ESPERA OPTIMIZADA CON INTERVAL ADAPTATIVO
  const startOptimizedWaiting = (roomName, finalUserName, currentRoomData) => {
    console.log(`⏳ [${instanceIdRef.current}] Esperando usuarios en: ${roomName}`);
    
    // Timer para tiempo de espera
    waitTimerRef.current = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    // Función recursiva para verificar con interval adaptativo
    const scheduleNextCheck = (nextInterval = null) => {
      const interval = nextInterval || rateLimiter.getAdaptiveInterval();
      
      checkIntervalRef.current = setTimeout(async () => {
        if (!isMountedRef.current || isRedirecting) return;
        
        try {
          // Heartbeat opcional (no crítico)
          sendOptimizedHeartbeat('searching', roomName);
          
          // Verificación crítica de la sala
          const roomStatus = await checkRoomStatus(roomName);
          
          if (roomStatus === 'rate_limited') {
            console.log('⏸️ Verificación pausada por rate limit');
            setSearchStatus('Pausado temporalmente (rate limit)');
            scheduleNextCheck(rateLimiter.getAdaptiveInterval() * 2); // Doble intervalo
            return;
          }
          
          if (!roomStatus) {
            console.log('⚠️ Error verificando sala, reintentando...');
            scheduleNextCheck(interval * 1.5); // Aumentar interval en error
            return;
          }

          const participantCount = roomStatus.total_count || 0;
          setConnectionCount(participantCount);
          
          console.log(`📊 [${instanceIdRef.current}] Sala ${roomName}: ${participantCount}/2 usuarios`);

          if (participantCount >= 2) {
            console.log('🎉 ¡Usuario encontrado! Redirigiendo...');
            await redirectToVideoChat(roomName, finalUserName, currentRoomData?.ruletaData, false);
          } else {
            setSearchStatus(`Esperando usuarios... (${participantCount}/2 conectados)`);
            scheduleNextCheck(); // Continuar con interval normal
          }

        } catch (error) {
          console.error('⚠️ Error en verificación:', error);
          scheduleNextCheck(interval * 1.5); // Aumentar interval en error
        }
      }, interval);
    };

    // Iniciar primera verificación
    scheduleNextCheck(3000); // Primera verificación rápida a los 3s
  };

  // 🚀 REDIRECCIÓN (SIN CAMBIOS MAYORES)
  const redirectToVideoChat = async (roomName, finalUserName, ruletaData = null, joinedExisting = false) => {
    if (isRedirecting) return;
    setIsRedirecting(true);

    try {
      console.log(`🎯 [${instanceIdRef.current}] Redirigiendo...`, { roomName, finalUserName });
      setSearchStatus('¡Conectado! Redirigiendo...');
      
      await sendOptimizedHeartbeat('videochat', roomName);
      
      // Limpiar intervals
      if (checkIntervalRef.current) {
        clearTimeout(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }

      const targetRoute = role === 'modelo' ? '/videochat' : '/videochatclient';
      const urlParams = new URLSearchParams({
        roomName,
        userName: finalUserName,
        ...(selectedCamera && { selectedCamera }),
        ...(selectedMic && { selectedMic }),
      });

      setTimeout(() => {
        navigate(`${targetRoute}?${urlParams}`, {
          state: {
            roomName,
            userName: finalUserName,
            selectedCamera,
            selectedMic,
            ruletaData: ruletaData || roomData?.ruletaData,
            joinedExisting
          },
          replace: true
        });
      }, 500);

    } catch (error) {
      console.error('❌ Error en redirección:', error);
      setError('Error al conectar al videochat');
      setIsRedirecting(false);
    }
  };

  // 🚀 INICIALIZACIÓN PRINCIPAL
  const initializeSearch = async () => {
    if (isSearchingRooms || isJoiningRoom || isCreatingRoom) return;

    try {
      console.log(`🚀 [${instanceIdRef.current}] Iniciando proceso...`);
      
      if (currentRoom && userName) {
        console.log('🔄 Modo siguiente - creando nueva sala...');
        await createRoom();
        return;
      }

      console.log('🎰 Ruleta inicial - buscando salas existentes...');
      const joinedExisting = await searchExistingRooms();
      
      if (!joinedExisting && !isJoiningRoom) {
        console.log('🏗️ Creando nueva sala...');
        await createRoom();
      }

    } catch (error) {
      console.error('❌ Error in proceso de búsqueda:', error);
      setError(error.message);
      setSearchStatus('Error en la búsqueda');
    }
  };

  // 🚀 useEffect MEJORADO
  useEffect(() => {
    const instanceId = instanceIdRef.current;
    
    // Protección contra múltiples instancias
    if (!window.__USERSEARCH_INSTANCES) window.__USERSEARCH_INSTANCES = [];
    window.__USERSEARCH_INSTANCES.push(instanceId);
    
    // Si hay más de una instancia, cancelar las anteriores
    if (window.__USERSEARCH_INSTANCES.length > 1) {
      const myIndex = window.__USERSEARCH_INSTANCES.indexOf(instanceId);
      if (myIndex !== window.__USERSEARCH_INSTANCES.length - 1) {
        console.log(`🛑 [${instanceId}] No es la instancia más reciente, cancelando`);
        return;
      }
    }

    if (!role) {
      console.error('❌ Falta parámetro role');
      navigate('/home');
      return;
    }

    isMountedRef.current = true;
    
    const initTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        initializeSearch();
      }
    }, 150);

    return () => {
      console.log(`🧹 [${instanceId}] Limpiando...`);
      clearTimeout(initTimeout);
      
      // Remover de instancias activas
      if (window.__USERSEARCH_INSTANCES) {
        const index = window.__USERSEARCH_INSTANCES.indexOf(instanceId);
        if (index > -1) {
          window.__USERSEARCH_INSTANCES.splice(index, 1);
        }
      }
      
      isMountedRef.current = false;
      
      // Resetear estados
      setIsSearchingRooms(false);
      setIsJoiningRoom(false);
      setIsCreatingRoom(false);
      setIsRedirecting(false);
      
      // Limpiar timeouts/intervals
      if (checkIntervalRef.current) {
        clearTimeout(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, [role]);

  // Timeout de seguridad
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log(`⏰ [${instanceIdRef.current}] Timeout alcanzado (120s)`);
      
      if (checkIntervalRef.current) {
        clearTimeout(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
      
      setError('No se conectó ningún usuario después de 2 minutos. Intenta más tarde.');
      setSearchStatus('Tiempo de espera agotado');
    }, 120000);

    return () => clearTimeout(timeout);
  }, []);

  const handleGoBack = () => {
    console.log(`↩️ [${instanceIdRef.current}] Usuario canceló`);
    
    if (checkIntervalRef.current) {
      clearTimeout(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    
    isMountedRef.current = false;
    
    if (role === 'modelo') {
      navigate('/precallmodel');
    } else if (role === 'cliente') {
      navigate('/precallclient');
    } else {
      navigate('/home');
    }
  };

  const formatWaitTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 🚀 ESTADO VISUAL MEJORADO
  const getStatusMessage = () => {
    const adaptiveInterval = Math.round(rateLimiter.getAdaptiveInterval() / 1000);
    
    if (searchStatus.includes('Buscando salas')) {
      return (
        <div className="space-y-2">
          <p className="text-gray-400 text-sm">{searchStatus}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-blue-400">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Verificando salas existentes...</span>
          </div>
        </div>
      );
    }
    
    if (searchStatus.includes('Pausado')) {
      return (
        <div className="space-y-2">
          <p className="text-yellow-400 text-sm">{searchStatus}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-yellow-400">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span>Reintentando en {adaptiveInterval}s...</span>
          </div>
        </div>
      );
    }
    
    if (searchStatus.includes('Conectado') || searchStatus.includes('Redirigiendo')) {
      return (
        <div className="space-y-2">
          <p className="text-green-400 text-sm font-medium">{searchStatus}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            <span>Iniciando videochat...</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <p className="text-gray-400 mb-6 text-sm leading-relaxed">{searchStatus}</p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <span>Próxima verificación en {adaptiveInterval}s</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        {/* Spinner animado */}
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-24 w-24 border-4 border-transparent border-t-[#ff007a] border-r-[#ff007a] mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl animate-pulse">
              {role === 'modelo' ? '👩‍💼' : '👤'}
            </div>
          </div>
        </div>

        {/* Título principal */}
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isRedirecting ?
            '🎉 ¡Conectando!' :
            roomData ? 
              `⏳ Esperando ${role === 'modelo' ? 'clientes' : 'modelos'}...` :
              `🔍 Buscando ${role === 'modelo' ? 'clientes' : 'modelos'}...`
          }
        </h2>

        {/* Estado actual */}
        {getStatusMessage()}

        {/* Información de la sala */}
        {roomData && !isRedirecting && (
          <div className="mb-6 p-4 bg-[#1f2125] rounded-lg border border-[#ff007a]/30">
            <p className="text-xs text-gray-400 mb-2">Sala creada:</p>
            <p className="text-[#ff007a] font-mono text-sm break-all">
              {roomData.roomName}
            </p>
            <div className="flex justify-between items-center mt-2 text-xs">
              <span className="text-gray-500">
                Tiempo: <span className="text-white font-bold">{formatWaitTime(waitTime)}</span>
              </span>
              <span className="text-gray-500">
                Usuarios: <span className="text-white font-bold">{connectionCount}/2</span>
              </span>
            </div>
            <div className="mt-2 text-xs text-blue-400">
              Verificación cada {Math.round(rateLimiter.getAdaptiveInterval() / 1000)}s
            </div>
          </div>
        )}

        {/* Barra de progreso optimizada */}
        {!error && !isRedirecting && (
          <div className="space-y-4 mb-8">
            <div className="w-full bg-[#1e1f24] rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#ff007a] to-pink-500 h-2 rounded-full animate-pulse"
                style={{
                  animation: 'loading-bar 3s ease-in-out infinite',
                  width: '60%'
                }}
              />
            </div>

            <div className="text-xs text-gray-500 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                <span>Conexión optimizada activa</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Rate limiting inteligente</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <span>Interval adaptativo: {Math.round(rateLimiter.getAdaptiveInterval() / 1000)}s</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm font-medium">❌ {error}</p>
            <p className="text-red-300 text-xs mt-2">
              Intenta crear una nueva sala
            </p>
          </div>
        )}

        {/* Botón para volver */}
        {!isRedirecting && (
          <button
            onClick={handleGoBack}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-full text-white text-sm transition"
          >
            ← {error ? 'Volver' : 'Cancelar espera'}
          </button>
        )}

        {/* Información adicional */}
        {!isRedirecting && (
          <div className="mt-6 text-xs text-gray-500">
            <p>🚀 Conexión optimizada con rate limiting</p>
            <p>⚡ Verificación inteligente cada {Math.round(rateLimiter.getAdaptiveInterval() / 1000)}s</p>
            <p>📡 Endpoint ligero para mejor rendimiento</p>
            {currentRoom && (
              <p className="text-[#ff007a]">🔄 Modo: Nueva sala (siguiente)</p>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 20%; }
          50% { width: 80%; }
          100% { width: 20%; }
        }
      `}</style>
    </div>
  );
};

export default UserSearch;