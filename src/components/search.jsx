
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UserSearch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [searchStatus, setSearchStatus] = useState('Iniciando...');
  const [roomData, setRoomData] = useState(null); // Datos de la sala creada
  const [waitTime, setWaitTime] = useState(0); // Tiempo esperando
  const checkIntervalRef = useRef(null);
  const waitTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // 🔥 NUEVOS ESTADOS PARA PREVENIR DOBLE EJECUCIÓN
  const [isSearchingRooms, setIsSearchingRooms] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  
  // 🔥 NUEVO: ESTADO PARA EVITAR MÚLTIPLES REDIRECCIONES
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Obtener parámetros de la URL
  const role = searchParams.get('role'); // 'modelo' o 'cliente'
  const selectedCamera = searchParams.get('selectedCamera');
  const selectedMic = searchParams.get('selectedMic');
  const currentRoom = searchParams.get('currentRoom'); // Para función "Siguiente"
  const userName = searchParams.get('userName'); // Para función "Siguiente"
  
  console.log('🔍 [USERSEARCH] Parámetros recibidos:', { 
    role, 
    currentRoom, 
    userName 
  });

  // 🔥 FUNCIÓN PARA ENVIAR HEARTBEAT
  const sendHeartbeatDirect = async (activityType, room = null) => {
    try {
      const authToken = sessionStorage.getItem('token');
      if (!authToken) return;

      await fetch(`${API_BASE_URL}/api/heartbeat`, {
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

      console.log(`💓 [USERSEARCH] Heartbeat enviado: ${activityType} en ${room || 'ninguna sala'}`);
    } catch (error) {
      console.log('⚠️ [USERSEARCH] Error enviando heartbeat:', error);
    }
  };

  // 🔥 NUEVO: BUSCAR SALAS EXISTENTES ANTES DE CREAR UNA NUEVA (CON PROTECCIÓN)
  const searchExistingRooms = async () => {
    // 🔥 PREVENIR DOBLE EJECUCIÓN
    if (isSearchingRooms) {
      console.log('⚠️ [USERSEARCH] Ya se está buscando salas, ignorando...');
      return null;
    }

    setIsSearchingRooms(true);

    try {
      setSearchStatus('Buscando salas disponibles...');
      console.log('🔍 [USERSEARCH] Buscando salas existentes...');
      
      const authToken = sessionStorage.getItem('token');
      if (!authToken) {
        throw new Error('No hay token de autenticación');
      }

      // 🔥 ENDPOINT PARA BUSCAR SALAS EXISTENTES
      const response = await fetch(`${API_BASE_URL}/api/livekit/find-available-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          userRole: role, // 'modelo' o 'cliente'
          lookingFor: role === 'modelo' ? 'cliente' : 'modelo'
        }),
      });

      if (!response.ok) {
        console.log('⚠️ [USERSEARCH] No hay salas disponibles, creando nueva...');
        return null; // No hay salas, crear una nueva
      }

      const data = await response.json();
      console.log('✅ [USERSEARCH] Salas encontradas:', data);

      if (data.success && data.availableRoom) {
        // 🔥 UNIRSE A SALA EXISTENTE
        return await joinExistingRoom(data.availableRoom);
      } else {
        console.log('⚠️ [USERSEARCH] No hay salas compatibles, creando nueva...');
        return null; // Crear nueva sala
      }

    } catch (error) {
      console.log('⚠️ [USERSEARCH] Error buscando salas existentes:', error);
      return null; // En caso de error, crear nueva sala
    } finally {
      setIsSearchingRooms(false);
    }
  };

  // 🔥 NUEVO: UNIRSE A SALA EXISTENTE (CON PROTECCIÓN)
  const joinExistingRoom = async (roomInfo) => {
    // 🔥 PREVENIR DOBLE EJECUCIÓN
    if (isJoiningRoom) {
      console.log('⚠️ [USERSEARCH] Ya se está uniendo a una sala, ignorando...');
      return true; // Considerar como éxito para no crear nueva sala
    }

    setIsJoiningRoom(true);

    try {
      setSearchStatus('Uniéndose a sala existente...');
      console.log('🏃‍♀️ [USERSEARCH] Uniéndose a sala:', roomInfo.roomName);
      
      const authToken = sessionStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/livekit/join-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          roomName: roomInfo.roomName,
          userRole: role
        }),
      });

      if (!response.ok) {
        console.log('❌ [USERSEARCH] Error uniéndose a sala, creando nueva...');
        return null; // Error uniéndose, crear nueva
      }

      const data = await response.json();
      console.log('✅ [USERSEARCH] Unido a sala existente:', data);

      if (data.success) {
        // 🎉 ÉXITO - NAVEGAR INMEDIATAMENTE
        await redirectToVideoChat(data.roomName, data.userName, data, true);
        return true; // Éxito, no crear nueva sala
      }

      return null; // Error, crear nueva sala

    } catch (error) {
      console.error('❌ [USERSEARCH] Error uniéndose a sala:', error);
      return null; // Error, crear nueva sala
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // 🔥 NUEVA FUNCIÓN: REDIRECCIÓN CENTRALIZADA
  const redirectToVideoChat = async (roomName, finalUserName, ruletaData = null, joinedExisting = false) => {
    // 🔥 PREVENIR MÚLTIPLES REDIRECCIONES
    if (isRedirecting) {
      console.log('⚠️ [USERSEARCH] Ya se está redirigiendo, ignorando...');
      return;
    }

    setIsRedirecting(true);

    try {
      console.log('🎯 [USERSEARCH] Iniciando redirección...', {
        roomName,
        finalUserName,
        joinedExisting
      });

      setSearchStatus('¡Conectado! Redirigiendo...');
      
      // 🔥 HEARTBEAT FINAL ANTES DE REDIRECCIONAR
      await sendHeartbeatDirect('videochat', roomName);
      
      // Detener verificaciones
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
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

      console.log(`🧭 [USERSEARCH] Redirigiendo a: ${targetRoute}?${urlParams}`);

      // 🔥 DELAY MÍNIMO PARA EVITAR RACE CONDITIONS
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
      console.error('❌ [USERSEARCH] Error en redirección:', error);
      setError('Error al conectar al videochat');
      setIsRedirecting(false);
    }
  };

  // 🔥 MODIFICADO: FUNCIÓN PRINCIPAL DE INICIALIZACIÓN (CON PROTECCIÓN)
  const initializeSearch = async () => {
    // 🔥 PREVENIR MÚLTIPLES EJECUCIONES
    if (isSearchingRooms || isJoiningRoom || isCreatingRoom) {
      console.log('⚠️ [USERSEARCH] Proceso ya en ejecución, ignorando...');
      return;
    }

    try {
      console.log('🚀 [USERSEARCH] Iniciando proceso de búsqueda...');
      
      if (currentRoom && userName) {
        // 🔥 FUNCIÓN "SIGUIENTE" - CREAR NUEVA SALA DIRECTAMENTE
        console.log('🔄 [USERSEARCH] Modo siguiente - creando nueva sala...');
        await createRoom();
        return;
      }

      // 🔥 RULETA INICIAL - BUSCAR PRIMERO, CREAR DESPUÉS
      console.log('🎰 [USERSEARCH] Ruleta inicial - buscando salas existentes...');
      
      const joinedExisting = await searchExistingRooms();
      
      if (!joinedExisting && !isJoiningRoom) {
        // No se unió a sala existente y no está en proceso de unirse, crear nueva
        console.log('🏗️ [USERSEARCH] Creando nueva sala...');
        await createRoom();
      }
      // Si se unió a sala existente, ya se redirigió

    } catch (error) {
      console.error('❌ [USERSEARCH] Error en proceso de búsqueda:', error);
      setError(error.message);
      setSearchStatus('Error en la búsqueda');
    }
  };

  // 🔥 PASO 1: CREAR SALA UNA SOLA VEZ (CON PROTECCIÓN)
  const createRoom = async () => {
    // 🔥 PREVENIR DOBLE EJECUCIÓN
    if (isCreatingRoom) {
      console.log('⚠️ [USERSEARCH] Ya se está creando una sala, ignorando...');
      return;
    }

    setIsCreatingRoom(true);

    try {
      setSearchStatus('Creando sala...');
      console.log('🏗️ [USERSEARCH] Creando nueva sala...');
      
      const authToken = sessionStorage.getItem('token');
      if (!authToken) {
        throw new Error('No hay token de autenticación');
      }

      let endpoint = '';
      let body = {};

      if (currentRoom && userName) {
        // Función "Siguiente"
        endpoint = '/api/livekit/next-room';
        body = { 
            currentRoom,
            userName,
            reason: `${role}_siguiente`,
            excludeUserId: searchParams.get('excludeUser'),
            excludeUserName: searchParams.get('excludeUserName')
        };

      } else {
        // Ruleta inicial
        if (role === 'modelo') {
          endpoint = '/api/ruleta/iniciar';
          body = {};
        } else if (role === 'cliente') {
          endpoint = '/api/ruleta/iniciar';
          body = {};
        }
      }

      console.log(`📡 [USERSEARCH] Creando sala en ${endpoint}`);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ [USERSEARCH] Sala creada:', data);

      const roomName = data.roomName || data.newRoomName;
      const finalUserName = data.userName;

      if (!roomName || !finalUserName) {
        throw new Error('Datos de sala incompletos');
      }

      // 🔥 ACTUALIZAR ESTADO DE LA SALA
      const newRoomData = {
        roomName,
        userName: finalUserName,
        ruletaData: data
      };
      
      setRoomData(newRoomData);
      setSearchStatus('Sala creada. Esperando usuarios...');
      
      // 🔥 HEARTBEAT INICIAL CON ESTADO SEARCHING
      await sendHeartbeatDirect('searching', roomName);
      
      // 🔥 INICIAR VERIFICACIÓN PERIÓDICA
      startWaitingForUsers(roomName, finalUserName, newRoomData);

    } catch (error) {
      console.error('❌ [USERSEARCH] Error creando sala:', error);
      setError(error.message);
      setSearchStatus('Error creando sala');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // 🔥 MODIFICADO: VERIFICAR PERIÓDICAMENTE SI HAY USUARIOS - CORRECCIÓN PRINCIPAL
  const startWaitingForUsers = (roomName, finalUserName, currentRoomData) => {
    console.log(`⏳ [USERSEARCH] Esperando usuarios en sala: ${roomName}`);
    
    // 🔥 ENVIAR HEARTBEAT INICIAL
    sendHeartbeatDirect('searching', roomName);
    
    // Timer para contar tiempo de espera
    waitTimerRef.current = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    // Verificar cada 6 segundos si hay usuarios
    checkIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || isRedirecting) return;
      
      try {
        // 🔥 ENVIAR HEARTBEAT CADA VERIFICACIÓN
        await sendHeartbeatDirect('searching', roomName);
        
        console.log('🔍 [USERSEARCH] Verificando participantes en sala...');
        
        const authToken = sessionStorage.getItem('token');
        console.log('🔍 [USERSEARCH] Consultando sala:', roomName);

        const response = await fetch(`${API_BASE_URL}/api/chat/participants/${roomName}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
          console.log('⚠️ [USERSEARCH] Error verificando participantes:', response.status, response.statusText);
          return; // Continuar verificando
        }

        const data = await response.json();
        console.log('📊 [USERSEARCH] Estado de la sala:', {
          roomName,
          participantCount: data.total_count,
          participants: data.participants,
          timestamp: new Date().toISOString()
        });

        // 🔥 VERIFICAR SI HAY 2 O MÁS PARTICIPANTES
        if (data.total_count >= 2) {
          console.log('🎉 [USERSEARCH] ¡Usuario encontrado! Ambos usuarios serán redirigidos...');
          
          // 🔥 REDIRECCIÓN INMEDIATA USANDO LA FUNCIÓN CENTRALIZADA
          await redirectToVideoChat(roomName, finalUserName, currentRoomData?.ruletaData, false);
          
        } else {
          // Continuar esperando
          const participantCount = data.total_count || 0;
          setSearchStatus(`Esperando usuarios... (${participantCount}/2 conectados)`);
          console.log(`⏳ [USERSEARCH] Esperando más usuarios: ${participantCount}/2`);
        }

      } catch (error) {
        console.error('⚠️ [USERSEARCH] Error verificando sala:', error);
        // Continuar verificando aunque haya error
      }
    }, 6000); // Verificar cada 6 segundos
  };

  // 🔥 MODIFICADO: USEEFFECT CON NUEVA FUNCIÓN PRINCIPAL Y PROTECCIÓN MEJORADA
  useEffect(() => {
    // 🔥 PREVENIR DOBLE MONTAJE EN DESARROLLO
    if (window.__USERSEARCH_ACTIVE) {
      console.log('🛑 [USERSEARCH] Ya hay una búsqueda activa, ignorando montaje duplicado');
      return;
    }
    window.__USERSEARCH_ACTIVE = true;

    if (!role) {
      console.error('❌ [USERSEARCH] Falta parámetro role');
      navigate('/home');
      return;
    }

    console.log('🚀 [USERSEARCH] Iniciando proceso...');
    isMountedRef.current = true;
    
    // 🔥 DELAY MÍNIMO PARA EVITAR RACE CONDITIONS
    const initTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        initializeSearch();
      }
    }, 100);

    // Cleanup
    return () => {
      console.log('🧹 [USERSEARCH] Limpiando...');
      clearTimeout(initTimeout);
      window.__USERSEARCH_ACTIVE = false;
      isMountedRef.current = false;
      
      // Resetear estados de protección
      setIsSearchingRooms(false);
      setIsJoiningRoom(false);
      setIsCreatingRoom(false);
      setIsRedirecting(false);
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, [role]);

  // 🔥 TIMEOUT DE SEGURIDAD (120 segundos) - SIN CAMBIOS
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('⏰ [USERSEARCH] Timeout alcanzado (120s)');
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
      
      setError('No se conectó ningún usuario después de 2 minutos. Intenta más tarde.');
      setSearchStatus('Tiempo de espera agotado');
    }, 120000); // 2 minutos

    return () => clearTimeout(timeout);
  }, []);

  // 🔥 FUNCIÓN PARA VOLVER - SIN CAMBIOS
  const handleGoBack = () => {
    console.log('↩️ [USERSEARCH] Usuario canceló');
    
    // Detener verificaciones
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    
    isMountedRef.current = false;
    
    // Redirigir según rol
    if (role === 'modelo') {
      navigate('/precallmodel');
    } else if (role === 'cliente') {
      navigate('/precallclient');
    } else {
      navigate('/home');
    }
  };

  // 🔥 FORMATEAR TIEMPO DE ESPERA - SIN CAMBIOS
  const formatWaitTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 🔥 NUEVO: FUNCIÓN PARA MOSTRAR DIFERENTES ESTADOS
  const getStatusMessage = () => {
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
    
    if (searchStatus.includes('Uniéndose')) {
      return (
        <div className="space-y-2">
          <p className="text-gray-400 text-sm">{searchStatus}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            <span>Conectando a sala existente...</span>
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
    
    return <p className="text-gray-400 mb-6 text-sm leading-relaxed">{searchStatus}</p>;
  };

  // 🔥 RENDER - MODIFICADO SOLO EN ESTADO
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

        {/* Estado actual - MODIFICADO */}
        {getStatusMessage()}

        {/* Información de la sala */}
        {roomData && !isRedirecting && (
          <div className="mb-6 p-4 bg-[#1f2125] rounded-lg border border-[#ff007a]/30">
            <p className="text-xs text-gray-400 mb-2">Sala creada:</p>
            <p className="text-[#ff007a] font-mono text-sm break-all">
              {roomData.roomName}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Tiempo esperando: <span className="text-white font-bold">{formatWaitTime(waitTime)}</span>
            </p>
          </div>
        )}

        {/* Barra de progreso */}
        {!error && !isRedirecting && (
          <div className="space-y-4 mb-8">
            <div className="w-full bg-[#1e1f24] rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#ff007a] to-pink-500 h-2 rounded-full animate-pulse"
                style={{
                  animation: 'loading-bar 2s ease-in-out infinite',
                  width: '60%'
                }}
              />
            </div>

            {/* Estados de espera */}
            <div className="text-xs text-gray-500 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                <span>Sala activa y esperando...</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span>Verificando nuevos usuarios...</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <span>Listo para conectar...</span>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de redirección */}
        {isRedirecting && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-400 border-t-transparent"></div>
              <p className="text-green-400 text-sm font-medium">
                ¡Usuario encontrado! Iniciando videochat...
              </p>
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
            <p>🏠 Sala propia creada y activa</p>
            <p>⚡ Verificación automática cada 6 segundos</p>
            {currentRoom && (
              <p className="text-[#ff007a]">🔄 Modo: Nueva sala (siguiente)</p>
            )}
            {role === 'modelo' && (
              <p>👩‍💼 Esperando que se conecte un cliente</p>
            )}
            {role === 'cliente' && (
              <p>👤 Esperando que se conecte una modelo</p>
            )}
          </div>
        )}

        {/* 🔥 NUEVO: INDICADORES DE DEBUG (SOLO EN DESARROLLO) */}
        {process.env.NODE_ENV === 'development' && !isRedirecting && (
          <div className="mt-4 text-xs text-yellow-400 space-y-1">
            {isSearchingRooms && <p>🔍 Buscando salas...</p>}
            {isJoiningRoom && <p>🏃‍♀️ Uniéndose a sala...</p>}
            {isCreatingRoom && <p>🏗️ Creando sala...</p>}
            {isRedirecting && <p>🎯 Redirigiendo...</p>}
          </div>
        )}
      </div>

      {/* CSS para animaciones */}
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