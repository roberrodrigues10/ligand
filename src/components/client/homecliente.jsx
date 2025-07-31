import React from "react";
import { MessageSquare, Star, Home, Phone, Clock, CheckCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "./headercliente";
import { ProtectedPage } from '../usePageAccess';
import { getUser } from "../../utils/auth";
import CallingSystem from '../../components/CallingOverlay';
import IncomingCallOverlay from '../../components/IncomingCallOverlay';

export default function InterfazCliente() {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


  // Estados
  const [user, setUser] = React.useState(null);
  const [chicasActivas, setChicasActivas] = React.useState([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [initialLoad, setInitialLoad] = React.useState(true);
  
  // 🔥 ESTADOS DE LLAMADAS
  const [isCallActive, setIsCallActive] = React.useState(false);
  const [currentCall, setCurrentCall] = React.useState(null);
  const [isReceivingCall, setIsReceivingCall] = React.useState(false);
  const [incomingCall, setIncomingCall] = React.useState(null);
  const [callPollingInterval, setCallPollingInterval] = React.useState(null);
  const [incomingCallPollingInterval, setIncomingCallPollingInterval] = React.useState(null);

  const historial = [
    { nombre: "SofiSweet", accion: "Llamada finalizada", hora: "Hoy, 11:12 AM" },
    { nombre: "Mia88", accion: "Te envió un mensaje", hora: "Hoy, 8:45 AM" },
    { nombre: "ValentinaXX", accion: "Agregada a favoritos", hora: "Ayer, 9:30 PM" },
  ];

  // 🔥 FUNCIÓN PARA OBTENER HEADERS CON TOKEN
  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("token");
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // 🔥 FUNCIÓN PARA OBTENER INICIAL DEL NOMBRE
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // 🔥 CARGAR CHICAS ACTIVAS/ONLINE
  const cargarChicasActivas = async (isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {
        setLoadingUsers(true);
      }
      
      console.log('🔍 Cargando chicas activas...');
      
      const response = await fetch(`${API_BASE_URL}/api/chat/users/my-contacts`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Chicas activas recibidas:', data);
        
        // Filtrar solo modelos (chicas) que están online
        const chicasOnline = (data.contacts || []).filter(contact => 
          contact.role === 'modelo' && contact.is_online
        );
        
        setChicasActivas(prevChicas => {
          const newChicaIds = chicasOnline.map(u => u.id).sort();
          const prevChicaIds = prevChicas.map(u => u.id).sort();
          
          if (JSON.stringify(newChicaIds) !== JSON.stringify(prevChicaIds)) {
            console.log('📝 Actualizando lista de chicas activas');
            return chicasOnline;
          }
          
          return prevChicas.map(prevChica => {
            const updatedChica = chicasOnline.find(u => u.id === prevChica.id);
            return updatedChica || prevChica;
          });
        });
        
      } else {
        console.error('❌ Error cargando contactos:', response.status);
        if (initialLoad) {
          await handleFallbackData();
        }
      }
    } catch (error) {
      console.error('❌ Error cargando chicas activas:', error);
      if (initialLoad) {
        await handleFallbackData();
      }
    } finally {
      if (!isBackgroundUpdate) {
        setLoadingUsers(false);
      }
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };

  // Función para manejar datos de fallback
  const handleFallbackData = async () => {
    try {
      const conversationsResponse = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        console.log('✅ Usando conversaciones como fuente de chicas activas');
        
        // Solo modelos (chicas) de las conversaciones
        const uniqueChicas = (conversationsData.conversations || [])
          .filter(conv => conv.other_user_role === 'modelo')
          .map(conv => ({
            id: conv.other_user_id,
            name: conv.other_user_name,
            alias: conv.other_user_name,
            role: conv.other_user_role,
            is_online: Math.random() > 0.3,
            avatar: `https://i.pravatar.cc/40?u=${conv.other_user_id}`,
            last_seen: new Date().toISOString()
          })).filter(u => u.is_online);
        
        setChicasActivas(uniqueChicas);
      } else {
        throw new Error('No se pudieron cargar conversaciones');
      }
    } catch (fallbackError) {
      console.log('🔧 Usando datos de ejemplo de chicas...');
      const exampleChicas = [
        {
          id: 201,
          name: "SofiSweet",
          alias: "SofiSweet",
          role: "modelo",
          is_online: true,
          avatar: "https://i.pravatar.cc/40?u=201",
          last_seen: new Date().toISOString()
        },
        {
          id: 202,
          name: "Mia88",
          alias: "Mia88", 
          role: "modelo",
          is_online: true,
          avatar: "https://i.pravatar.cc/40?u=202",
          last_seen: new Date().toISOString()
        },
        {
          id: 203,
          name: "ValentinaXX",
          alias: "ValentinaXX", 
          role: "modelo",
          is_online: true,
          avatar: "https://i.pravatar.cc/40?u=203",
          last_seen: new Date().toISOString()
        }
      ];
      
      setChicasActivas(exampleChicas);
    }
  };

  // 🔥 FUNCIÓN PARA NAVEGAR A CHAT CON CHICA ESPECÍFICA
  const abrirChatConChica = (chica) => {
    console.log('📩 Abriendo chat con chica:', chica.name);
    
    navigate('/mensajes', {
      state: {
        openChatWith: {
          userId: chica.id,
          userName: chica.name || chica.alias,
          userRole: chica.role
        }
      }
    });
  };

  // 🔥 NUEVA FUNCIÓN: INICIAR LLAMADA A CHICA
  const iniciarLlamadaAChica = async (chica) => {
    try {
      console.log('📞 Iniciando llamada a chica:', chica.name);
      
      // Mostrar overlay de llamando
      setCurrentCall({
        ...chica,
        status: 'initiating'
      });
      setIsCallActive(true);
      
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calls/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: chica.id,
          call_type: 'video'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Llamada iniciada a chica:', data);
        
        // Actualizar estado con datos de la llamada
        setCurrentCall({
          ...chica,
          callId: data.call_id,
          roomName: data.room_name,
          status: 'calling'
        });
        
        // Iniciar polling para verificar respuesta
        iniciarPollingLlamada(data.call_id);
        
      } else {
        console.error('❌ Error iniciando llamada a chica:', data.error);
        setIsCallActive(false);
        setCurrentCall(null);
        alert(data.error);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      setIsCallActive(false);
      setCurrentCall(null);
      alert('Error al iniciar llamada');
    }
  };

  // 🔥 NUEVA FUNCIÓN: POLLING PARA VERIFICAR ESTADO DE LLAMADA SALIENTE
  const iniciarPollingLlamada = (callId) => {
    console.log('🔄 Iniciando polling para llamada:', callId);
    
    const interval = setInterval(async () => {
      try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/calls/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ call_id: callId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          const callStatus = data.call.status;
          console.log('📊 Estado llamada:', callStatus);
          
          if (callStatus === 'active') {
            // ¡Llamada aceptada por la chica!
            console.log('🎉 Llamada aceptada por la chica, redirigiendo...');
            clearInterval(interval);
            setCallPollingInterval(null);
            redirigirAVideochat(data.call);
            
          } else if (callStatus === 'rejected') {
            // Llamada rechazada por la chica
            console.log('❌ Llamada rechazada por la chica');
            clearInterval(interval);
            setCallPollingInterval(null);
            setIsCallActive(false);
            setCurrentCall(null);
            alert('La chica rechazó la llamada');
            
          } else if (callStatus === 'cancelled') {
            // Llamada cancelada por timeout
            console.log('🛑 Llamada cancelada por timeout');
            clearInterval(interval);
            setCallPollingInterval(null);
            setIsCallActive(false);
            setCurrentCall(null);
            alert('La llamada expiró sin respuesta');
          }
        }
        
      } catch (error) {
        console.error('❌ Error verificando llamada:', error);
      }
    }, 2000);
    
    setCallPollingInterval(interval);
    
    // Timeout de seguridad
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setCallPollingInterval(null);
        if (isCallActive) {
          setIsCallActive(false);
          setCurrentCall(null);
          alert('Tiempo de espera agotado');
        }
      }
    }, 35000);
  };

  // 🔥 NUEVA FUNCIÓN: CANCELAR LLAMADA SALIENTE
  const cancelarLlamada = async () => {
    try {
      console.log('🛑 Cancelando llamada...');
      
      if (currentCall?.callId) {
        const token = sessionStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/calls/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            call_id: currentCall.callId
          })
        });
      }
      
      // Limpiar polling
      if (callPollingInterval) {
        clearInterval(callPollingInterval);
        setCallPollingInterval(null);
      }
      
    } catch (error) {
      console.error('❌ Error cancelando llamada:', error);
    }
    
    setIsCallActive(false);
    setCurrentCall(null);
  };

  // 🔥 NUEVA FUNCIÓN: POLLING PARA LLAMADAS ENTRANTES
  const verificarLlamadasEntrantes = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calls/check-incoming`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.has_incoming && data.incoming_call) {
          console.log('📞 Llamada entrante de chica detectada:', data.incoming_call);
          
          // Solo mostrar si no hay ya una llamada visible
          if (!isReceivingCall && !isCallActive) {
            setIncomingCall(data.incoming_call);
            setIsReceivingCall(true);
          }
        } else if (isReceivingCall && !data.has_incoming) {
          // La llamada ya no está disponible
          console.log('📞 Llamada entrante ya no disponible');
          setIsReceivingCall(false);
          setIncomingCall(null);
        }
      }
    } catch (error) {
      console.log('⚠️ Error verificando llamadas entrantes:', error);
    }
  };

  // 🔥 NUEVA FUNCIÓN: RESPONDER LLAMADA ENTRANTE
  const responderLlamada = async (accion) => {
    if (!incomingCall) return;
    
    try {
      console.log(`📱 Respondiendo llamada de chica: ${accion}`);
      
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calls/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          call_id: incomingCall.id,
          action: accion // 'accept' o 'reject'
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (accion === 'accept') {
          console.log('✅ Llamada de chica aceptada:', data);
          
          // Ocultar overlay de llamada entrante
          setIsReceivingCall(false);
          setIncomingCall(null);
          
          // Redirigir al videochat
          redirigirAVideochat(data);
          
        } else {
          console.log('❌ Llamada de chica rechazada');
          setIsReceivingCall(false);
          setIncomingCall(null);
        }
      } else {
        console.error('❌ Error respondiendo llamada:', data.error);
        setIsReceivingCall(false);
        setIncomingCall(null);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      setIsReceivingCall(false);
      setIncomingCall(null);
    }
  };

  // 🔥 NUEVA FUNCIÓN: REDIRIGIR AL VIDEOCHAT CLIENTE
  const redirigirAVideochat = (callData) => {
    console.log('🚀 Redirigiendo a videochat cliente:', callData);
    
    // Guardar datos de la llamada
    sessionStorage.setItem('roomName', callData.room_name);
    sessionStorage.setItem('userName', user?.name || 'Cliente');
    sessionStorage.setItem('currentRoom', callData.room_name);
    sessionStorage.setItem('inCall', 'true');
    sessionStorage.setItem('videochatActive', 'true');
    
    // Limpiar estados de llamada
    setIsCallActive(false);
    setCurrentCall(null);
    setIsReceivingCall(false);
    setIncomingCall(null);
    
    // Limpiar intervals
    if (callPollingInterval) {
      clearInterval(callPollingInterval);
      setCallPollingInterval(null);
    }
    
    // Redirigir al videochat cliente
    navigate('/videochatclient', {
      state: {
        roomName: callData.room_name,
        userName: user?.name || 'Cliente',
        callId: callData.call_id || callData.id,
        from: 'call',
        callData: callData
      }
    });
  };

  // 🔄 POLLING MEJORADO - SIN PARPADEO
  React.useEffect(() => {
    if (!user?.id) return;

    cargarChicasActivas(false);

    const interval = setInterval(() => {
      cargarChicasActivas(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUser();
        setUser(userData);
      } catch (err) {
        console.error("Error al obtener usuario:", err);
      }
    };
    fetchUser();
  }, []);

  // 🔥 NUEVO USEEFFECT: POLLING PARA LLAMADAS ENTRANTES
  React.useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Iniciando monitoreo de llamadas entrantes');
    
    verificarLlamadasEntrantes();
    
    const interval = setInterval(verificarLlamadasEntrantes, 3000);
    setIncomingCallPollingInterval(interval);

    return () => {
      console.log('🔔 Deteniendo monitoreo de llamadas entrantes');
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user?.id, isReceivingCall, isCallActive]);

  // 🔥 CLEANUP AL DESMONTAR COMPONENTE
  React.useEffect(() => {
    return () => {
      if (callPollingInterval) {
        clearInterval(callPollingInterval);
      }
      if (incomingCallPollingInterval) {
        clearInterval(incomingCallPollingInterval);  
      }
    };
  }, []);

  return (
    <ProtectedPage requiredConditions={{
      emailVerified: true,
      profileComplete: true,
      role: "cliente",
      blockIfInCall: true
    }}>
      <div className="min-h-screen bg-ligand-mix-dark from-[#1a1c20] to-[#2b2d31] text-white p-6">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Panel central */}
          <main className="lg:col-span-3 bg-[#1f2125] rounded-2xl p-8 shadow-xl flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 mt-16">
              ¡Hola! {user?.name} ¿Listo para tu próxima conexión?
            </h2>
            <p className="text-center text-white/70 mb-8 max-w-md">
              Da click en el botón de abajo para comenzar una videollamada aleatoria con una chica en línea, 
              o llama directamente a alguna de las chicas disponibles.
            </p>

            {/* Botones verticales */}
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <button
                className="w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-8 py-4 rounded-full text-lg font-semibold shadow-md transition-all duration-200 transform hover:scale-105"
                onClick={() => navigate("/esperandocallcliente")}
              >
                Iniciar Videollamada
              </button>

              <button
                className="w-full bg-[#ffe4f1] hover:bg-[#ffd1e8] text-[#4b2e35] px-8 py-4 rounded-full text-lg font-semibold shadow-md transition-all duration-200 transform hover:scale-105"
                onClick={() => navigate("/comprar-minutos")}
              >
                Comprar Minutos
              </button>

              {/* Consejo del día */}
              <div className="w-full bg-[#2b2d31] border border-[#ff007a]/30 rounded-xl p-4 text-center mt-2">
                <p className="text-white text-sm mb-1 font-semibold">💡 Consejo del día:</p>
                <p className="text-white/70 text-sm italic">
                  Sé auténtico. Las mejores conexiones nacen de una sonrisa genuina.
                </p>
              </div>
            </div>
          </main>

          {/* Panel lateral derecho */}
          <aside className="flex flex-col gap-2 h-[82vh] overflow-y-auto">
            {/* Chicas activas */}
            <section className="bg-[#2b2d31] rounded-2xl p-5 shadow-lg h-1/2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#ff007a]">
                  Chicas Activas
                </h3>
                {chicasActivas.length > 0 && (
                  <span className="text-xs text-white/50 bg-[#ff007a]/20 px-2 py-1 rounded-full">
                    {chicasActivas.length}
                  </span>
                )}
              </div>
              
              {loadingUsers && initialLoad ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#ff007a] border-t-transparent"></div>
                  <span className="ml-3 text-sm text-white/60">
                    Cargando chicas...
                  </span>
                </div>
              ) : (
                <div className="space-y-3 h-[calc(100%-4rem)] overflow-y-auto pr-2">
                  <style>
                    {`
                      .space-y-3::-webkit-scrollbar {
                        width: 4px;
                      }
                      .space-y-3::-webkit-scrollbar-track {
                        background: #2b2d31;
                        border-radius: 2px;
                      }
                      .space-y-3::-webkit-scrollbar-thumb {
                        background: #ff007a;
                        border-radius: 2px;
                      }
                      .space-y-3::-webkit-scrollbar-thumb:hover {
                        background: #cc0062;
                      }
                    `}
                  </style>
                  
                  {chicasActivas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <Users size={32} className="text-white/20 mb-3" />
                      <p className="text-sm text-white/60 font-medium">
                        No hay chicas activas
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        Las chicas disponibles aparecerán aquí cuando estén en línea
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chicasActivas.map((chica, index) => (
                        <div
                          key={chica.id}
                          className="flex items-center justify-between bg-[#1f2125] p-3 rounded-xl hover:bg-[#25282c] transition-all duration-200 animate-fadeIn"
                          style={{
                            animationDelay: `${index * 50}ms`
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#ff007a] flex items-center justify-center font-bold text-sm relative">
                              {getInitial(chica.name || chica.alias)}
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2b2d31] animate-pulse"></div>
                            </div>
                            <div>
                              <div className="font-semibold text-sm">
                                {chica.name || chica.alias}
                              </div>
                              <div className="text-xs text-green-400">
                                En línea
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => iniciarLlamadaAChica(chica)}
                              disabled={isCallActive || isReceivingCall}
                              className={`p-2 rounded-full transition-colors duration-200 ${
                                isCallActive || isReceivingCall 
                                  ? 'bg-gray-500/20 cursor-not-allowed' 
                                  : 'hover:bg-[#ff007a]/20'
                              }`}
                              title={
                                isCallActive || isReceivingCall 
                                  ? "Llamada en curso" 
                                  : "Llamar a esta chica"
                              }
                            >
                              <Phone 
                                size={16} 
                                className={`${
                                  isCallActive || isReceivingCall 
                                    ? 'text-gray-500' 
                                    : 'text-[#ff007a] hover:text-white'
                                } transition-colors`} 
                              />
                            </button>
                            <button
                              onClick={() => abrirChatConChica(chica)}
                              className="p-2 rounded-full hover:bg-gray-500/20 transition-colors duration-200"
                              title="Mensaje a esta chica"
                            >
                              <MessageSquare size={16} className="text-gray-400 hover:text-white transition-colors" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Historial */}
            <section className="bg-[#2b2d31] rounded-2xl p-5 shadow-lg h-1/2">
              <h3 className="text-lg font-bold text-[#ff007a] mb-4 text-center">Tu Historial</h3>
              <div className="space-y-3 h-[calc(100%-4rem)] overflow-y-auto pr-2">
                {historial.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start bg-[#1f2125] p-3 rounded-xl hover:bg-[#25282c] transition-colors duration-200"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-9 h-9 bg-pink-400 text-[#1a1c20] font-bold rounded-full flex items-center justify-center text-sm">
                        {item.nombre.charAt(0)}
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">{item.nombre}</p>
                        <p className="text-white/60 text-xs">{item.accion}</p>
                      </div>
                    </div>
                    <div className="text-right text-white/40 text-xs">{item.hora}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {/* Estilos adicionales para animaciones */}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `}</style>
      </div>

      {/* 🔥 OVERLAY PARA LLAMADAS SALIENTES */}
      <CallingSystem
        isVisible={isCallActive}
        callerName={currentCall?.name || currentCall?.alias}
        callerAvatar={currentCall?.avatar}
        onCancel={cancelarLlamada}
        callStatus={currentCall?.status || 'initiating'}
      />

      {/* 🔥 OVERLAY PARA LLAMADAS ENTRANTES */}
      <IncomingCallOverlay
        isVisible={isReceivingCall}
        callData={incomingCall}
        onAnswer={() => responderLlamada('accept')}
        onDecline={() => responderLlamada('reject')}
      />
    </ProtectedPage>
  );
}