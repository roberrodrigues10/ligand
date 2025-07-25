import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UserSearch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [searchStatus, setSearchStatus] = useState('Iniciando...');
  const [roomData, setRoomData] = useState(null);
  const [waitTime, setWaitTime] = useState(0);
  const checkIntervalRef = useRef(null);
  const waitTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // 🔥 ESTADOS PARA PREVENIR DOBLE EJECUCIÓN
  const [isSearchingRooms, setIsSearchingRooms] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // 🔥 NUEVOS ESTADOS PARA MANEJO CENTRALIZADO
  const [searchType, setSearchType] = useState('inicial'); // 'inicial', 'siguiente', 'reconnect'
  const [consecutiveChecks, setConsecutiveChecks] = useState(0);
  
  // 🔥 OBTENER PARÁMETROS
  const role = searchParams.get('role'); // 'modelo' o 'cliente'
  const selectedCamera = searchParams.get('selectedCamera');
  const selectedMic = searchParams.get('selectedMic');
  const currentRoom = searchParams.get('currentRoom');
  const userName = searchParams.get('userName');
  const action = searchParams.get('action'); // 'siguiente', 'inicial'
  const from = searchParams.get('from'); // 'videochat_siguiente', 'esperarcall'
  const excludeUser = searchParams.get('excludeUser');
  const excludeUserName = searchParams.get('excludeUserName');
  
  console.log('🔍 [USERSEARCH] Parámetros recibidos:', { 
    role, currentRoom, userName, action, from, excludeUser
  });

  // 🔥 DETERMINAR TIPO DE BÚSQUEDA
  const determineSearchType = () => {
    if (action === 'siguiente') return 'siguiente';
    if (from === 'videochat_siguiente') return 'siguiente';
    if (currentRoom && userName) return 'siguiente';
    if (from === 'client_disconnect') return 'reconnect';
    return 'inicial';
  };

  // 🔥 FUNCIÓN PARA ENVIAR HEARTBEAT CENTRALIZADO
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
          room: room,
          component: 'usersearch',
          searchType: searchType
        })
      });

      console.log(`💓 [USERSEARCH] Heartbeat enviado: ${activityType}`);
    } catch (error) {
      console.log('⚠️ [USERSEARCH] Error enviando heartbeat:', error);
    }
  };

  // 🔥 FUNCIÓN PRINCIPAL: INICIALIZAR BÚSQUEDA CENTRALIZADA
  const initializeSearch = async () => {
    if (isSearchingRooms || isJoiningRoom || isCreatingRoom) {
      console.log('⚠️ [USERSEARCH] Proceso ya en ejecución, ignorando...');
      return;
    }

    const currentSearchType = determineSearchType();
    setSearchType(currentSearchType);

    console.log('🚀 [USERSEARCH] Iniciando búsqueda tipo:', currentSearchType);

    try {
      switch (currentSearchType) {
        case 'siguiente':
          await handleSiguientePersona();
          break;
        case 'reconnect':
          await handleReconnection();
          break;
        case 'inicial':
        default:
          await handleRuletaInicial();
          break;
      }
    } catch (error) {
      console.error('❌ [USERSEARCH] Error en búsqueda:', error);
      setError(error.message);
      setSearchStatus('Error en la búsqueda');
    }
  };

  // 🔥 NUEVA FUNCIÓN: MANEJAR "SIGUIENTE PERSONA"
  const handleSiguientePersona = async () => {
    setSearchStatus('Buscando nuevo usuario...');
    console.log('🔄 [USERSEARCH] Función siguiente activada');
    
    try {
      const authToken = sessionStorage.getItem('token');
      
      // 🔥 BUSCAR NUEVO USUARIO EXCLUYENDO EL ANTERIOR
      const response = await fetch(`${API_BASE_URL}/api/livekit/next-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          currentRoom,
          userName,
          userRole: role,
          excludeUserId: excludeUser,
          excludeUserName: excludeUserName,
          action: 'siguiente',
          searchType: 'siguiente'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.foundUser && data.roomName) {
          // 🎉 USUARIO ENCONTRADO INMEDIATAMENTE
          console.log('🎉 [USERSEARCH] Nuevo usuario encontrado inmediatamente:', data);
          setSearchStatus('¡Usuario encontrado! Conectando...');
          await redirectToVideoChat(data.roomName, data.userName, data, true);
          return;
        }
      }
      
      // 🔄 NO HAY USUARIOS DISPONIBLES - CREAR SALA Y ESPERAR
      console.log('⏳ [USERSEARCH] No hay usuarios disponibles, creando nueva sala...');
      await createRoom();
      
    } catch (error) {
      console.error('❌ [USERSEARCH] Error en siguiente persona:', error);
      // Fallback: crear nueva sala
      await createRoom();
    }
  };

  // 🔥 NUEVA FUNCIÓN: MANEJAR RECONNECTION AUTOMÁTICA
  const handleReconnection = async () => {
    setSearchStatus('Reconectando automáticamente...');
    console.log('🔌 [USERSEARCH] Manejo de reconexión automática');
    
    // Para reconexiones, crear sala inmediatamente
    await createRoom();
  };

  // 🔥 NUEVA FUNCIÓN: MANEJAR RULETA INICIAL
  const handleRuletaInicial = async () => {
    setSearchStatus('Iniciando ruleta...');
    console.log('🎰 [USERSEARCH] Ruleta inicial - buscando salas existentes primero');
    
    // 1. Intentar unirse a salas existentes
    const joinedExisting = await searchExistingRooms();
    
    if (!joinedExisting && !isJoiningRoom) {
      // 2. Crear nueva sala si no hay existentes
      console.log('🏗️ [USERSEARCH] No hay salas existentes, creando nueva');
      await createRoom();
    }
  };

  // 🔥 MEJORADO: BUSCAR SALAS EXISTENTES
  const searchExistingRooms = async () => {
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

      const response = await fetch(`${API_BASE_URL}/api/livekit/find-available-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          userRole: role,
          lookingFor: role === 'modelo' ? 'cliente' : 'modelo',
          excludeUserId: excludeUser,
          searchType: searchType
        }),
      });

      if (!response.ok) {
        console.log('⚠️ [USERSEARCH] No hay salas disponibles');
        return null;
      }

      const data = await response.json();
      console.log('✅ [USERSEARCH] Salas encontradas:', data);

      if (data.success && data.availableRoom) {
        return await joinExistingRoom(data.availableRoom);
      } else {
        console.log('⚠️ [USERSEARCH] No hay salas compatibles');
        return null;
      }

    } catch (error) {
      console.log('⚠️ [USERSEARCH] Error buscando salas existentes:', error);
      return null;
    } finally {
      setIsSearchingRooms(false);
    }
  };

  // 🔥 MEJORADO: UNIRSE A SALA EXISTENTE
  const joinExistingRoom = async (roomInfo) => {
    if (isJoiningRoom) {
      console.log('⚠️ [USERSEARCH] Ya se está uniendo a una sala, ignorando...');
      return true;
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
          userRole: role,
          searchType: searchType
        }),
      });

      if (!response.ok) {
        console.log('❌ [USERSEARCH] Error uniéndose a sala');
        return null;
      }

      const data = await response.json();
      console.log('✅ [USERSEARCH] Unido a sala existente:', data);

      if (data.success) {
        await redirectToVideoChat(data.roomName, data.userName, data, true);
        return true;
      }

      return null;

    } catch (error) {
      console.error('❌ [USERSEARCH] Error uniéndose a sala:', error);
      return null;
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // 🔥 MEJORADO: CREAR SALA
  const createRoom = async () => {
    if (isCreatingRoom) {
      console.log('⚠️ [USERSEARCH] Ya se está creando una sala, ignorando...');
      return;
    }

    setIsCreatingRoom(true);

    try {
      setSearchStatus('Creando sala...');
      console.log('🏗️ [USERSEARCH] Creando nueva sala, tipo:', searchType);
      
      const authToken = sessionStorage.getItem('token');
      if (!authToken) {
        throw new Error('No hay token de autenticación');
      }

      let endpoint = '';
      let body = {};

      // 🔥 DIFERENTES ENDPOINTS SEGÚN TIPO DE BÚSQUEDA
      if (searchType === 'siguiente' && currentRoom && userName) {
        endpoint = '/api/livekit/next-room';
        body = { 
          currentRoom,
          userName,
          reason: `${role}_siguiente`,
          excludeUserId: excludeUser,
          excludeUserName: excludeUserName,
          searchType: 'siguiente'
        };
      } else {
        // Ruleta inicial o reconnect
        endpoint = '/api/ruleta/iniciar';
        body = { 
          userRole: role,
          searchType: searchType
        };
      }

      console.log(`📡 [USERSEARCH] Creando sala en ${endpoint}`, body);

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
        ruletaData: data,
        searchType: searchType
      };
      
      setRoomData(newRoomData);
      setSearchStatus('Sala creada. Esperando usuarios...');
      
      // 🔥 HEARTBEAT INICIAL
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

  // 🔥 MEJORADO: VERIFICACIÓN INTELIGENTE DE USUARIOS
  const startWaitingForUsers = (roomName, finalUserName, currentRoomData) => {
    console.log(`⏳ [USERSEARCH] Esperando usuarios en sala: ${roomName}`);
    
    // 🔥 HEARTBEAT INICIAL
    sendHeartbeatDirect('searching', roomName);
    
    // Timer para contar tiempo de espera
    waitTimerRef.current = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);

    // 🔥 VERIFICACIÓN MÁS INTELIGENTE
    let checkCount = 0;
    
    checkIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || isRedirecting) return;
      
      checkCount++;
      setConsecutiveChecks(checkCount);
      
      try {
        // 🔥 HEARTBEAT EN CADA VERIFICACIÓN
        await sendHeartbeatDirect('searching', roomName);
        
        console.log(`🔍 [USERSEARCH] Check #${checkCount} en sala: ${roomName}`);
        
        const authToken = sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/chat/participants/${roomName}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (!response.ok) {
          console.log('⚠️ [USERSEARCH] Error verificando participantes:', response.status);
          return;
        }

        const data = await response.json();
        const participantCount = data.total_count || 0;
        
        console.log(`📊 [USERSEARCH] Check #${checkCount}: ${participantCount}/2 participantes`, {
          participants: data.participants?.map(p => p.identity) || [],
          searchType: searchType
        });

        // 🔥 VERIFICAR SI HAY 2 O MÁS PARTICIPANTES
        if (participantCount >= 2) {
          console.log('🎉 [USERSEARCH] ¡Usuario encontrado! Ambos conectados');
          
          // 🔥 MARCAR SALA COMO ACTIVA
          await markRoomAsActive(roomName);
          
          // 🔥 REDIRECCIONAR INMEDIATAMENTE
          await redirectToVideoChat(roomName, finalUserName, currentRoomData?.ruletaData, false);
          
        } else {
          // Continuar esperando
          setSearchStatus(`Esperando usuarios... (${participantCount}/2 conectados)`);
          
          // 🔥 RECREAR SALA SI LLEVA MUCHO TIEMPO SIN USUARIOS
          if (checkCount >= 15 && searchType === 'inicial') {
            console.log('🔄 [USERSEARCH] Mucho tiempo esperando (inicial), recreando sala...');
            await recreateRoom(roomName, finalUserName);
          } else if (checkCount >= 25 && searchType === 'siguiente') {
            console.log('🔄 [USERSEARCH] Mucho tiempo esperando (siguiente), recreando sala...');
            await recreateRoom(roomName, finalUserName);
          }
        }

      } catch (error) {
        console.error('⚠️ [USERSEARCH] Error verificando sala:', error);
      }
    }, 7000); // 🔥 7 segundos entre verificaciones
  };

  // 🔥 NUEVA FUNCIÓN: MARCAR SALA COMO ACTIVA
  const markRoomAsActive = async (roomName) => {
    try {
      const authToken = sessionStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/livekit/mark-room-active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          roomName, 
          status: 'active',
          timestamp: Date.now(),
          searchType: searchType
        }),
      });
      console.log('✅ [USERSEARCH] Sala marcada como activa:', roomName);
    } catch (error) {
      console.log('⚠️ [USERSEARCH] Error marcando sala activa:', error);
    }
  };

  // 🔥 NUEVA FUNCIÓN: RECREAR SALA
  const recreateRoom = async (oldRoomName, oldUserName) => {
    console.log('🔄 [USERSEARCH] Recreando sala... Antigua:', oldRoomName);
    
    // Limpiar timers
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    
    // Resetear estados
    setWaitTime(0);
    setConsecutiveChecks(0);
    setRoomData(null);
    
    // 🔥 NOTIFICAR SERVIDOR SOBRE SALA ANTIGUA
    try {
      const authToken = sessionStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/livekit/abandon-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          roomName: oldRoomName,
          userName: oldUserName,
          reason: 'timeout_recreation'
        }),
      });
    } catch (error) {
      console.log('⚠️ [USERSEARCH] Error notificando abandono de sala:', error);
    }
    
    // Crear nueva sala
    setSearchStatus('Recreando sala...');
    await createRoom();
  };

  // 🔥 FUNCIÓN CENTRALIZADA DE REDIRECCIÓN
  const redirectToVideoChat = async (roomName, finalUserName, ruletaData = null, joinedExisting = false) => {
    if (isRedirecting) {
      console.log('⚠️ [USERSEARCH] Ya se está redirigiendo, ignorando...');
      return;
    }

    setIsRedirecting(true);

    try {
      console.log('🎯 [USERSEARCH] Iniciando redirección...', {
        roomName,
        finalUserName,
        joinedExisting,
        searchType
      });

      setSearchStatus('¡Conectado! Iniciando videochat...');
      
      // 🔥 HEARTBEAT FINAL ANTES DE REDIRECCIONAR
      await sendHeartbeatDirect('videochat', roomName);
      
      // Detener todas las verificaciones
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
        searchType: searchType,
        from: 'usersearch'
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
            joinedExisting,
            searchType: searchType,
            from: 'usersearch'
          },
          replace: true
        });
      }, 1000); // 1 segundo para asegurar que todo esté listo

    } catch (error) {
      console.error('❌ [USERSEARCH] Error en redirección:', error);
      setError('Error al conectar al videochat');
      setIsRedirecting(false);
    }
  };

  // 🔥 USEEFFECT PRINCIPAL - MEJORADO
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

    console.log('🚀 [USERSEARCH] Iniciando proceso centralizado...');
    isMountedRef.current = true;
    
    // 🔥 DELAY MÍNIMO PARA EVITAR RACE CONDITIONS
    const initTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        initializeSearch();
      }
    }, 200);

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
  }, [role]); // Solo depende del role

  // 🔥 TIMEOUT DE SEGURIDAD (3 minutos)
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('⏰ [USERSEARCH] Timeout alcanzado (3 minutos)');
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
      
      setError('No se conectó ningún usuario después de 3 minutos. Intenta más tarde.');
      setSearchStatus('Tiempo de espera agotado');
    }, 180000); // 3 minutos

    return () => clearTimeout(timeout);
  }, []);

  // 🔥 FUNCIÓN PARA VOLVER
  const handleGoBack = () => {
    console.log('↩️ [USERSEARCH] Usuario canceló búsqueda');
    
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
    
    // 🔥 NOTIFICAR SERVIDOR SOBRE CANCELACIÓN
    if (roomData?.roomName) {
      try {
        const authToken = sessionStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/livekit/abandon-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ 
            roomName: roomData.roomName,
            userName: roomData.userName,
            reason: 'user_cancelled'
          }),
        });
      } catch (error) {
        console.log('⚠️ [USERSEARCH] Error notificando cancelación:', error);
      }
    }
    
    // Redirigir según rol
    if (role === 'modelo') {
      navigate('/esperandocall');
    } else if (role === 'cliente') {
      navigate('/esperandocallcliente');
    } else {
      navigate('/home');
    }
  };

  // 🔥 FORMATEAR TIEMPO DE ESPERA
  const formatWaitTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 🔥 FUNCIÓN PARA MOSTRAR ESTADO SEGÚN TIPO DE BÚSQUEDA
  const getStatusMessage = () => {
    if (isRedirecting) {
      return (
        <div className="space-y-2">
          <p className="text-green-400 text-sm font-medium">🎉 ¡Usuario encontrado!</p>
          <div className="flex items-center justify-center gap-2 text-xs text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            <span>Iniciando videochat...</span>
          </div>
        </div>
      );
    }

    if (searchStatus.includes('Buscando salas') || searchStatus.includes('Buscando nuevo')) {
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
    
    return <p className="text-gray-400 mb-6 text-sm leading-relaxed">{searchStatus}</p>;
  };

  // 🔥 FUNCIÓN PARA OBTENER EMOJI SEGÚN TIPO
  const getSearchEmoji = () => {
    switch (searchType) {
      case 'siguiente': return '🔄';
      case 'reconnect': return '🔌';
      case 'inicial': 
      default: return '🎰';
    }
  };

  // 🔥 FUNCIÓN PARA OBTENER TÍTULO SEGÚN TIPO
  const getSearchTitle = () => {
    if (isRedirecting) return '🎉 ¡Conectando!';
    
    switch (searchType) {
      case 'siguiente': 
        return `🔄 Buscando ${role === 'modelo' ? 'nuevo cliente' : 'nueva modelo'}...`;
      case 'reconnect': 
        return `🔌 Reconectando...`;
      case 'inicial': 
      default: 
        return roomData ? 
          `⏳ Esperando ${role === 'modelo' ? 'clientes' : 'modelos'}...` :
          `🎰 Iniciando ruleta...`;
    }
  };

  // 🔥 RENDER PRINCIPAL
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        {/* Spinner animado con emoji dinámico */}
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-24 w-24 border-4 border-transparent border-t-[#ff007a] border-r-[#ff007a] mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl animate-pulse">
              {isRedirecting ? '🎉' : getSearchEmoji()}
            </div>
          </div>
        </div>

        {/* Título dinámico según tipo de búsqueda */}
        <h2 className="text-2xl font-bold mb-4 text-white">
          {getSearchTitle()}
        </h2>

        {/* Subtítulo con tipo de búsqueda */}
        {!isRedirecting && (
          <div className="mb-4 px-3 py-1 bg-[#ff007a]/20 rounded-full text-xs text-[#ff007a] font-medium inline-block">
            {searchType === 'siguiente' && '🔄 Función Siguiente'}
            {searchType === 'reconnect' && '🔌 Reconexión Automática'}
            {searchType === 'inicial' && '🎰 Ruleta Inicial'}
          </div>
        )}

        {/* Estado actual dinámico */}
        {getStatusMessage()}

        {/* Información de la sala creada */}
        {roomData && !isRedirecting && (
          <div className="mb-6 p-4 bg-[#1f2125] rounded-lg border border-[#ff007a]/30">
            <p className="text-xs text-gray-400 mb-2">
              {searchType === 'siguiente' ? 'Nueva sala creada:' : 'Sala creada:'}
            </p>
            <p className="text-[#ff007a] font-mono text-sm break-all">
              {roomData.roomName}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="text-left">
                <span className="text-gray-500">Tiempo:</span>
                <span className="text-white font-bold ml-1">{formatWaitTime(waitTime)}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Checks:</span>
                <span className="text-white font-bold ml-1">{consecutiveChecks}</span>
              </div>
            </div>
          </div>
        )}

        {/* Información de exclusión (para función siguiente) */}
        {searchType === 'siguiente' && excludeUserName && !isRedirecting && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-xs">
              🚫 Excluyendo: <span className="font-medium">{excludeUserName}</span>
            </p>
          </div>
        )}

        {/* Barra de progreso animada */}
        {!error && !isRedirecting && (
          <div className="space-y-4 mb-8">
            <div className="w-full bg-[#1e1f24] rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#ff007a] to-pink-500 h-2 rounded-full animate-pulse"
                style={{
                  animation: 'loading-bar 2s ease-in-out infinite',
                  width: roomData ? '80%' : '40%'
                }}
              />
            </div>

            {/* Estados de proceso dinámicos */}
            <div className="text-xs text-gray-500 space-y-2">
              {searchType === 'inicial' && (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                    <span>Buscando salas existentes...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span>Creando sala si no hay disponibles...</span>
                  </div>
                </>
              )}
              
              {searchType === 'siguiente' && (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                    <span>Buscando nuevo usuario...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Excluyendo usuario anterior...</span>
                  </div>
                </>
              )}
              
              {searchType === 'reconnect' && (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-ping"></div>
                    <span>Reconectando automáticamente...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Creando nueva sala...</span>
                  </div>
                </>
              )}
              
              {roomData && (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <span>Verificando nuevos usuarios cada 7s...</span>
                </div>
              )}
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
            <p className="text-green-300 text-xs mt-2">
              Preparando conexión segura...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm font-medium">❌ {error}</p>
            <p className="text-red-300 text-xs mt-2">
              {searchType === 'siguiente' ? 
                'Intenta buscar otro usuario' : 
                'Intenta crear una nueva sala'
              }
            </p>
          </div>
        )}

        {/* Botón para volver - dinámico según contexto */}
        {!isRedirecting && (
          <button
            onClick={handleGoBack}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-full text-white text-sm transition"
          >
            {error ? 
              '← Volver' : 
              searchType === 'siguiente' ? 
                '← Cancelar búsqueda' : 
                '← Cancelar espera'
            }
          </button>
        )}

        {/* Información adicional según tipo */}
        {!isRedirecting && (
          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p>🏠 Sala propia {roomData ? 'creada y activa' : 'en preparación'}</p>
            <p>⚡ Verificación automática cada 7 segundos</p>
            
            {searchType === 'siguiente' && (
              <p className="text-[#ff007a]">🔄 Modo: Siguiente usuario</p>
            )}
            
            {searchType === 'reconnect' && (
              <p className="text-orange-400">🔌 Modo: Reconexión automática</p>
            )}
            
            {searchType === 'inicial' && (
              <p className="text-blue-400">🎰 Modo: Ruleta inicial</p>
            )}
            
            {role === 'modelo' && (
              <p>👩‍💼 Esperando que se conecte un cliente</p>
            )}
            {role === 'cliente' && (
              <p>👤 Esperando que se conecte una modelo</p>
            )}
            
            {excludeUser && (
              <p className="text-yellow-400">🚫 Excluyendo usuario anterior</p>
            )}
          </div>
        )}

        {/* 🔥 INDICADORES DE DEBUG (SOLO EN DESARROLLO) */}
        {process.env.NODE_ENV === 'development' && !isRedirecting && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-xs font-bold mb-2">🐛 DEBUG INFO:</p>
            <div className="text-xs text-yellow-300 space-y-1 text-left">
              <p>• Tipo: <span className="font-mono">{searchType}</span></p>
              <p>• Role: <span className="font-mono">{role}</span></p>
              <p>• From: <span className="font-mono">{from || 'N/A'}</span></p>
              <p>• Action: <span className="font-mono">{action || 'N/A'}</span></p>
              <p>• Current Room: <span className="font-mono">{currentRoom || 'N/A'}</span></p>
              <p>• User Name: <span className="font-mono">{userName || 'N/A'}</span></p>
              <p>• Exclude: <span className="font-mono">{excludeUserName || 'N/A'}</span></p>
              <div className="mt-2 pt-2 border-t border-yellow-500/30">
                <p>Estados:</p>
                {isSearchingRooms && <p className="text-blue-300">🔍 Buscando salas...</p>}
                {isJoiningRoom && <p className="text-green-300">🏃‍♀️ Uniéndose a sala...</p>}
                {isCreatingRoom && <p className="text-orange-300">🏗️ Creando sala...</p>}
                {isRedirecting && <p className="text-purple-300">🎯 Redirigiendo...</p>}
                {!isSearchingRooms && !isJoiningRoom && !isCreatingRoom && !isRedirecting && (
                  <p className="text-gray-400">⏸️ En espera...</p>
                )}
              </div>
            </div>
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
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UserSearch;