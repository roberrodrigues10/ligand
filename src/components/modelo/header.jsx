import { useState, useRef, useEffect } from "react";
import { Home, Star, MessageSquare, LogOut, Settings, Wallet, Menu, X, Bell, Send, Gift, Lock, User, DollarSign } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logoproncipal from "../imagenes/logoprincipal.png";
import { useTranslation } from 'react-i18next';
import LanguageSelector from "../languageSelector.jsx";
import ModelEarnings from './ModelEarnings.jsx';
import MiniChatVideocall, { useVideocallChat } from './MiniChatVideocall.jsx';

// 🔥 IMPORTAR TU SISTEMA DE TRADUCCIÓN
import {
  useTranslation as useCustomTranslation,
  TranslatedMessage
} from '../../utils/translationSystem.jsx';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);
  const [lastSeenMessages, setLastSeenMessages] = useState({});
  const [usuario, setUsuario] = useState({ id: null });
  const [estadoVerificacion, setEstadoVerificacion] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // 🔥 ESTADO PARA DATOS COMPLETOS
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const pollingInterval = useRef(null);
  const { t, i18n } = useTranslation();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [showEarnings, setShowEarnings] = useState(false);

  // 🔥 ESTADOS PARA EL CHAT EN VIDEOLLAMADA
  const { isInCall } = useVideocallChat();
  const [showChatModal, setShowChatModal] = useState(false);
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionActiva, setConversacionActiva] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [apodos, setApodos] = useState({});
  
  // 🔥 SISTEMA DE TRADUCCIÓN
  const { settings: translationSettings } = useCustomTranslation();

  // 🔥 FUNCIÓN PARA OBTENER HEADERS CON TOKEN
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  // 🔥 CARGAR INFORMACIÓN COMPLETA DEL USUARIO (ACTUALIZADA)
  const cargarInfoUsuario = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/info`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentUser(data.user);
          setUsuario(data.user); // Mantener compatibilidad
          console.log('👤 Usuario cargado en header modelo:', data.user);
        }
      } else {
        console.error('❌ Error en respuesta:', response.status);
        // Fallback a localStorage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.id) {
          setUsuario(userData);
          setCurrentUser(userData);
        } else {
          setUsuario({ id: 1, name: "Usuario" });
          setCurrentUser({ id: 1, name: "Usuario" });
        }
      }
    } catch (error) {
      console.error('❌ Error cargando info del usuario:', error);
      // Fallback a localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.id) {
        setUsuario(userData);
        setCurrentUser(userData);
      } else {
        setUsuario({ id: 1, name: "Usuario" });
        setCurrentUser({ id: 1, name: "Usuario" });
      }
    }
  };

  // 🎨 COMPONENTE PARA EL AVATAR (IGUAL QUE HEADERCLIENTE)
  const UserAvatar = ({ size = "w-10 h-10", textSize = "text-sm" }) => {
    if (currentUser?.avatar_url) {
      return (
        <img 
          src={currentUser.avatar_url} 
          alt="Avatar" 
          className={`${size} rounded-full object-cover border-2 border-white/20 hover:border-white/40 transition`}
          onError={(e) => {
            console.error('Error cargando avatar:', e);
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }
    
    // Avatar por defecto con inicial o icono
    const displayName = currentUser?.display_name || currentUser?.name || 'Usuario';
    const initial = displayName.charAt(0).toUpperCase();
    
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-[#ff007a] to-[#cc0062] text-white font-bold ${textSize} hover:scale-105 transition flex items-center justify-center border-2 border-white/20 hover:border-white/40`}>
        {initial}
      </div>
    );
  };

  // 🔒 VERIFICAR SI ESTÁ EN PROCESO DE VERIFICACIÓN
  const estaEnVerificacion = () => {
    const rutasVerificacion = [
      '/verificacion',
      '/verificacion-identidad', 
      '/esperando-verificacion',
      '/anteveri'
    ];
    
    const rutaActual = location.pathname;
    const estaEnRutaVerificacion = rutasVerificacion.some(ruta => 
      rutaActual.includes(ruta) || rutaActual === ruta
    );
    
    // 🔥 SOLO BLOQUEAR SI EL ESTADO ES REALMENTE PROBLEMÁTICO
    // Si está aprobada, NO bloquear (aunque verificacion_completa sea false)
    const estadosBloqueo = ['pendiente', 'no_enviada', 'rechazada'];
    const estadoBloqueado = estadosBloqueo.includes(estadoVerificacion);
    
    console.log('🔍 Debug verificación:', {
      rutaActual,
      estaEnRutaVerificacion,
      estadoVerificacion,
      estadoBloqueado,
      resultadoFinal: estaEnRutaVerificacion || estadoBloqueado
    });
    
    return estaEnRutaVerificacion || estadoBloqueado;
  };

  // 🔒 FUNCIÓN PARA MANEJAR NAVEGACIÓN BLOQUEADA
  const manejarNavegacionBloqueada = (destino, nombreBoton = 'esta función') => {
    if (estaEnVerificacion()) {
      // Solo permitir configuración y logout
      if (destino === '/configuracion' || destino === '/logout') {
        navigate(destino);
        return;
      }
      
      // Mostrar mensaje de bloqueo
      const mensaje = `🔒 ${nombreBoton} está bloqueada durante el proceso de verificación.\n\nSolo puedes acceder a Configuración para cerrar sesión si es necesario.`;
      
      // Crear modal de bloqueo temporal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] p-4';
      modal.innerHTML = `
        <div class="bg-[#1a1c20] p-6 rounded-2xl max-w-sm w-full border-2 border-[#ff007a] text-center">
          <div class="text-[#ff007a] mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 class="text-white text-lg font-bold mb-3">Función Bloqueada</h3>
          <p class="text-white/70 text-sm mb-6 leading-relaxed">${mensaje}</p>
          <button class="bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-2 rounded-lg font-semibold transition-all">
            Entendido
          </button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Cerrar modal al hacer click en el botón
      modal.querySelector('button').onclick = () => {
        document.body.removeChild(modal);
      };
      
      // Cerrar modal al hacer click fuera
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      };
      
      return;
    }
    
    // Si no está bloqueada, navegar normalmente
    navigate(destino);
  };

  // 🔒 OBTENER ESTADO DE VERIFICACIÓN
  const obtenerEstadoVerificacion = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/verificacion/estado`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setEstadoVerificacion(data.estado);
        console.log('🔍 Estado de verificación:', data.estado);
      } else {
        console.error('❌ Error obteniendo estado de verificación');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  const toggleMenu = () => setMenuAbierto(!menuAbierto);
  const toggleMobileMenu = () => setMobileMenuAbierto(!mobileMenuAbierto);

  // 🔥 MANEJAR CLICK EN MENSAJES (CON BLOQUEO)
  const handleMessagesClick = () => {
    if (estaEnVerificacion()) {
      manejarNavegacionBloqueada('/mensajes', 'Los mensajes');
      return;
    }
    
    if (isInCall) {
      setShowChatModal(true);
      if (conversaciones.length === 0) {
        cargarConversaciones();
      }
    } else {
      navigate("/mensajes");
    }
  };

  // 🔥 CARGAR CONVERSACIONES PARA EL MODAL
  const cargarConversaciones = async () => {
    try {
      console.log('🔍 Cargando conversaciones para modal...');
      
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversaciones cargadas:', data);
        setConversaciones(data.conversations || []);
      } else {
        console.error('❌ Error cargando conversaciones:', response.status);
        const exampleConversations = [
          {
            id: 1,
            other_user_id: 2,
            other_user_name: "SofiSweet",
            other_user_role: "modelo",
            room_name: "chat_user_1_2",
            last_message: "¡Hola! ¿Cómo estás?",
            last_message_time: "2024-01-15T14:30:00Z",
            last_message_sender_id: 2,
            unread_count: 3,
            avatar: "https://i.pravatar.cc/40?u=2"
          }
        ];
        setConversaciones(exampleConversations);
      }
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
    }
  };

  // 🔥 CARGAR MENSAJES DE UNA CONVERSACIÓN
  const cargarMensajes = async (roomName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/messages/${roomName}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          setMensajes(data.messages);
        }
      } else {
        const exampleMessages = [
          {
            id: 1,
            user_id: 2,
            user_name: "SofiSweet",
            user_role: "modelo",
            message: "¡Hola! ¿Cómo estás?",
            type: "text",
            created_at: "2024-01-15T14:25:00Z"
          }
        ];
        setMensajes(exampleMessages);
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
  };

  // 🔥 ABRIR CONVERSACIÓN EN EL MODAL
  const abrirConversacion = async (conversacion) => {
    setConversacionActiva(conversacion.room_name);
    await cargarMensajes(conversacion.room_name);
  };

  // 🔥 ENVIAR MENSAJE
  const enviarMensaje = async (tipo = 'text', contenido = null) => {
    const mensaje = contenido || nuevoMensaje.trim();
    if (!mensaje || !conversacionActiva) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          room_name: conversacionActiva,
          message: mensaje,
          type: tipo
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const nuevoMensajeObj = {
            id: Date.now(),
            user_id: usuario.id,
            user_name: usuario.name || "Usuario",
            user_role: usuario.rol || "cliente",
            message: mensaje,
            type: tipo,
            created_at: new Date().toISOString()
          };
          setMensajes(prev => [...prev, nuevoMensajeObj]);
          setNuevoMensaje("");
        }
      } else {
        console.error('❌ Error enviando mensaje:', response.status);
        const nuevoMensajeObj = {
          id: Date.now(),
          user_id: usuario.id,
          user_name: usuario.name || "Usuario",
          user_role: usuario.rol || "cliente",
          message: mensaje,
          type: tipo,
          created_at: new Date().toISOString()
        };
        setMensajes(prev => [...prev, nuevoMensajeObj]);
        setNuevoMensaje("");
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
    }
  };

  // 🔥 ENVIAR REGALO
  const enviarRegalo = (tipoRegalo) => {
    enviarMensaje('gift', tipoRegalo);
  };

  // 🔥 RENDERIZAR MENSAJE CON TRADUCCIÓN
  const renderMensaje = (mensaje) => {
    const textoMensaje = mensaje.message || mensaje.text || 'Mensaje sin contenido';
    const esUsuarioActual = mensaje.user_id === usuario.id;
    
    switch (mensaje.type) {
      case 'gift':
        return (
          <div className="flex items-center gap-2 text-yellow-400">
            <Gift size={16} />
            <span>Envió: {textoMensaje}</span>
          </div>
        );
      case 'emoji':
        return (
          <div className="text-2xl">
            {textoMensaje}
          </div>
        );
      default:
        if (translationSettings?.enabled && TranslatedMessage && textoMensaje && textoMensaje.trim()) {
          try {
            const tipoMensaje = esUsuarioActual ? 'local' : 'remote';
            const shouldShowTranslation = !esUsuarioActual || translationSettings.translateOutgoing;
            
            const cleanText = textoMensaje.trim();
            const isOnlyEmojis = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]*$/u.test(cleanText);
            
            if (shouldShowTranslation && cleanText.length > 0 && !isOnlyEmojis) {
              return (
                <TranslatedMessage
                  message={{
                    text: cleanText,
                    type: tipoMensaje,
                    id: mensaje.id,
                    timestamp: mensaje.created_at,
                    sender: mensaje.user_name,
                    senderRole: mensaje.user_role
                  }}
                  settings={translationSettings}
                  className="text-white"
                />
              );
            }
          } catch (error) {
            console.error('❌ Error en TranslatedMessage:', error);
          }
        }
        
        return <span className="text-white">{textoMensaje}</span>;
    }
  };

  // 🔥 FORMATEAR TIEMPO
  const formatearTiempo = (timestamp) => {
    const fecha = new Date(timestamp);
    const ahora = new Date();
    const diffMs = ahora - fecha;
    const diffHoras = diffMs / (1000 * 60 * 60);
    
    if (diffHoras < 1) {
      return fecha.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffHoras < 24) {
      return fecha.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return fecha.toLocaleDateString('es-ES', { 
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  // 🔥 OBTENER INICIAL DEL NOMBRE
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // 🔥 OBTENER NOMBRE A MOSTRAR (CON APODOS)
  const getDisplayName = (userId, originalName) => {
    return apodos[userId] || originalName;
  };

  // 🔔 CARGAR DATOS DEL USUARIO Y ESTADO DE VERIFICACIÓN
  useEffect(() => {
    cargarInfoUsuario(); // 🔥 CARGAR INFO COMPLETA
    obtenerEstadoVerificacion(); // 🔒 OBTENER ESTADO AL CARGAR
  }, []);

  // 🔔 CARGAR TIMESTAMPS DE ÚLTIMA VEZ VISTO
  useEffect(() => {
    const savedLastSeen = JSON.parse(localStorage.getItem('chatLastSeen') || '{}');
    setLastSeenMessages(savedLastSeen);
  }, []);

  // 🔔 CALCULAR MENSAJES NO LEÍDOS
  const calculateUnreadCount = (conversacion) => {
    const lastSeen = lastSeenMessages[conversacion.room_name] || 0;
    const lastMessageTime = new Date(conversacion.last_message_time).getTime();
    
    if (conversacion.unread_count && conversacion.unread_count > 0) {
      return conversacion.unread_count;
    }
    
    if (lastMessageTime > lastSeen && conversacion.last_message_sender_id !== usuario.id) {
      return 1;
    }
    
    return 0;
  };

  // 🔔 OBTENER CONTEO GLOBAL DE MENSAJES
  const obtenerConteoGlobal = async () => {
    if (!usuario.id) return;

    try {
      console.log('🔄 Obteniendo conteo global de mensajes...');
      
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        const conversaciones = data.conversations || [];
        
        let totalUnread = 0;
        conversaciones.forEach(conv => {
          const unreadCount = calculateUnreadCount(conv);
          totalUnread += unreadCount;
        });
        
        setGlobalUnreadCount(totalUnread);
        console.log('📊 Conteo global actualizado:', totalUnread);
        
      } else {
        console.error('❌ Error obteniendo conversaciones:', response.status);
        setGlobalUnreadCount(6);
      }
    } catch (error) {
      console.error('❌ Error en polling global:', error);
      setGlobalUnreadCount(6);
    }
  };

  // 🔔 POLLING GLOBAL CADA 10 SEGUNDOS
  useEffect(() => {
    if (!usuario.id) return;

    obtenerConteoGlobal();

    pollingInterval.current = setInterval(() => {
      obtenerConteoGlobal();
    }, 10000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [usuario.id, lastSeenMessages]);

  // 🔒 POLLING DEL ESTADO DE VERIFICACIÓN
  useEffect(() => {
    if (!usuario.id) return;

    const verificacionInterval = setInterval(() => {
      obtenerEstadoVerificacion();
    }, 30000); // Cada 30 segundos

    return () => clearInterval(verificacionInterval);
  }, [usuario.id]);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const manejarClickFuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", manejarClickFuera);
    return () => document.removeEventListener("mousedown", manejarClickFuera);
  }, []);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileMenuAbierto(false);
  }, [navigate]);

  // 🔒 CREAR COMPONENTE DE BOTÓN BLOQUEADO
  const BotonBloqueado = ({ children, destino, titulo, nombreBoton, className }) => {
    const bloqueado = estaEnVerificacion() && destino !== '/configuracion' && destino !== '/logout';
    
    return (
      <button
        className={`${className} ${bloqueado ? 'opacity-50 cursor-not-allowed' : ''} relative`}
        onClick={() => manejarNavegacionBloqueada(destino, nombreBoton)}
        title={bloqueado ? '🔒 Bloqueado durante verificación' : titulo}
        disabled={bloqueado}
      >
        {children}
        {bloqueado && (
          <Lock 
            size={12} 
            className="absolute -top-1 -right-1 text-red-400 bg-[#1a1c20] rounded-full p-0.5"
          />
        )}
      </button>
    );
  };

  return (
    <>
      <header className="flex justify-between items-center mb-4 px-4 relative">
        {/* Logo + Nombre */}
        <div
          className="flex items-center cursor-pointer"
          onClick={() => manejarNavegacionBloqueada("/homellamadas", "El inicio")}
        >
          <img src={logoproncipal} alt="Logo" className="w-12 h-12 sm:w-14 sm:h-14" />
          <span className="text-xl sm:text-2xl text-[#ff007a] font-pacifico ml-[-5px]">
            Ligand
          </span>
        </div>

        {/* Navegación Desktop - con bloqueos */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-lg">
          <LanguageSelector />
          
          {/* 🔥 BOTÓN DE GANANCIAS - NUEVO */}
          <button
            onClick={() => {
              console.log('🔥 Abriendo modal de ganancias...');
              setShowEarnings(true);
            }}
            className="hover:scale-110 transition p-2"
            title="Mis Ganancias"
          >
            <DollarSign className="text-[#ff007a]" size={24} />
          </button>
          
          <BotonBloqueado
            destino="/pagos"
            titulo="Pagos y monedas"
            nombreBoton="Pagos y monedas"
            className="hover:scale-110 transition p-2"
          >
            <Wallet className="text-[#ff007a]" size={24} />
          </BotonBloqueado>
          
          <BotonBloqueado
            destino="/homellamadas"
            titulo="Inicio"
            nombreBoton="El inicio"
            className="hover:scale-110 transition p-2"
          >
            <Home className="text-[#ff007a]" size={24} />
          </BotonBloqueado>
          
          {/* 🔔 BOTÓN DE MENSAJES CON BLOQUEO */}
          <div className="relative">
            <BotonBloqueado
              destino="/mensajes"
              titulo={isInCall ? "Chat en videollamada" : "Mensajes"}
              nombreBoton="Los mensajes"
              className="hover:scale-110 transition p-2"
            >
              <MessageSquare className="text-[#ff007a]" size={24} />
              {globalUnreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-[#1a1c20]">
                  {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                </div>
              )}
              {isInCall && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1c20] animate-pulse"></div>
              )}
            </BotonBloqueado>
          </div>
          
          <BotonBloqueado
            destino="/favorites"
            titulo="Favoritos"
            nombreBoton="Los favoritos"
            className="hover:scale-110 transition p-2"
          >
            <Star className="text-[#ff007a]" size={24} />
          </BotonBloqueado>

          {/* 🔥 BOTÓN DE PERFIL DESKTOP CON AVATAR DINÁMICO IGUAL QUE HEADERCLIENTE */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="hover:scale-105 transition flex items-center justify-center"
              title={`Perfil de ${currentUser?.display_name || currentUser?.name || 'Usuario'}`}
            >
              <UserAvatar />
            </button>

            {/* Menú desplegable desktop - ACTUALIZADO IGUAL QUE HEADERCLIENTE */}
            {menuAbierto && (
              <div className="absolute right-0 mt-2 w-64 bg-[#1f2125] rounded-xl shadow-lg border border-[#ff007a]/30 z-50 overflow-hidden">
                {/* 🔥 HEADER DEL MENÚ CON INFO DEL USUARIO COMPLETA */}
                <div className="px-4 py-3 border-b border-[#ff007a]/20 bg-gradient-to-r from-[#ff007a]/10 to-transparent">
                  <div className="flex items-center gap-3">
                    <UserAvatar size="w-8 h-8" textSize="text-xs" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">
                        {currentUser?.display_name || currentUser?.name || 'Usuario'}
                      </div>
                      {currentUser?.nickname && (
                        <div className="text-white/60 text-xs truncate">
                          {currentUser.name}
                        </div>
                      )}
                      <div className="text-[#ff007a] text-xs">
                        {currentUser?.rol === 'modelo' ? 'Modelo' : 'Usuario'}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    manejarNavegacionBloqueada("/configuracion", "La configuración");
                    setMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <Settings size={16} className="mr-3 text-[#ff007a]"/>
                  Configuración
                </button>
                <button
                  onClick={() => {
                    manejarNavegacionBloqueada("/logout", "Cerrar sesión");
                    setMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <LogOut size={16} className="mr-3 text-[#ff007a]" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Botón menú móvil - con bloqueos */}
        <div className="md:hidden relative" ref={mobileMenuRef}>
          <div className="flex items-center gap-2">
            {/* 🔔 NOTIFICACIÓN GLOBAL MÓVIL */}
            {globalUnreadCount > 0 && (
              <div className="relative">
                <BotonBloqueado
                  destino="/mensajes"
                  titulo={`${globalUnreadCount} mensajes nuevos`}
                  nombreBoton="Los mensajes"
                  className="w-10 h-10 rounded-full bg-red-500 text-white hover:scale-105 transition flex items-center justify-center animate-pulse"
                >
                  <Bell size={18} />
                  <div className="absolute -top-1 -right-1 bg-white text-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                  </div>
                  {isInCall && (
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </BotonBloqueado>
              </div>
            )}
            
            <button
              onClick={toggleMobileMenu}
              className="w-10 h-10 rounded-full bg-[#ff007a] text-white hover:scale-105 transition flex items-center justify-center"
              title="Menú"
            >
              {mobileMenuAbierto ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Menú móvil desplegable - ACTUALIZADO IGUAL QUE HEADERCLIENTE */}
          {mobileMenuAbierto && (
            <div className="absolute right-0 mt-2 w-72 bg-[#1f2125] rounded-xl shadow-xl border border-[#ff007a]/30 z-50 overflow-hidden">
              {/* 🔥 HEADER DEL MENÚ MÓVIL CON AVATAR IGUAL QUE HEADERCLIENTE */}
              <div className="px-4 py-3 border-b border-[#ff007a]/20 bg-gradient-to-r from-[#ff007a]/10 to-transparent">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar size="w-10 h-10" textSize="text-sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {currentUser?.display_name || currentUser?.name || 'Usuario'}
                    </div>
                    {currentUser?.nickname && (
                      <div className="text-white/60 text-xs truncate">
                        {currentUser.name}
                      </div>
                    )}
                    <div className="text-[#ff007a] text-xs">
                      {currentUser?.rol === 'modelo' ? 'Modelo' : 'Usuario'}
                    </div>
                  </div>
                </div>
                
                {/* Selector de idioma móvil */}
                <div className="text-xs text-gray-400 mb-2">Idioma</div>
                <LanguageSelector />
              </div>

              {/* 🔒 INDICADOR DE VERIFICACIÓN EN PROCESO */}
              {estaEnVerificacion() && (
                <div className="px-4 py-3 bg-red-900/20 border-b border-red-500/30">
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <Lock size={12} />
                    <span>Verificación en proceso - Funciones limitadas</span>
                  </div>
                </div>
              )}

              {/* Navegación móvil - con bloqueos */}
              <div className="py-2">
                {/* 🔥 BOTÓN DE GANANCIAS MÓVIL */}
                <button
                  onClick={() => {
                    console.log('🔥 Abriendo modal de ganancias (móvil)...');
                    setShowEarnings(true);
                    setMobileMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <DollarSign size={18} className="mr-3 text-[#ff007a]"/>
                  Mis Ganancias
                </button>
                
                <button
                  onClick={() => {
                    manejarNavegacionBloqueada("/pagos", "Pagos y monedas");
                    setMobileMenuAbierto(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition ${
                    estaEnVerificacion() ? 'opacity-50' : ''
                  }`}
                  disabled={estaEnVerificacion()}
                >
                  <div className="flex items-center">
                    <Wallet size={18} className="mr-3 text-[#ff007a]"/>
                    Pagos y monedas
                  </div>
                  {estaEnVerificacion() && <Lock size={12} className="text-red-400" />}
                </button>
                
                <button
                  onClick={() => {
                    manejarNavegacionBloqueada("/homellamadas", "El inicio");
                    setMobileMenuAbierto(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition ${
                    estaEnVerificacion() ? 'opacity-50' : ''
                  }`}
                  disabled={estaEnVerificacion()}
                >
                  <div className="flex items-center">
                    <Home size={18} className="mr-3 text-[#ff007a]"/>
                    Inicio
                  </div>
                  {estaEnVerificacion() && <Lock size={12} className="text-red-400" />}
                </button>
                
                {/* 🔔 MENSAJES CON BLOQUEO EN MÓVIL */}
                <button
                  onClick={() => {
                    manejarNavegacionBloqueada("/mensajes", "Los mensajes");
                    setMobileMenuAbierto(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition ${
                    estaEnVerificacion() ? 'opacity-50' : ''
                  }`}
                  disabled={estaEnVerificacion()}
                >
                  <div className="flex items-center">
                    <MessageSquare size={18} className="mr-3 text-[#ff007a]"/>
                    {isInCall ? "Chat Videollamada" : "Mensajes"}
                  </div>
                  <div className="flex items-center gap-1">
                    {globalUnreadCount > 0 && (
                      <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                      </div>
                    )}
                    {isInCall && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    {estaEnVerificacion() && <Lock size={12} className="text-red-400" />}
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    manejarNavegacionBloqueada("/favorites", "Los favoritos");
                    setMobileMenuAbierto(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition ${
                    estaEnVerificacion() ? 'opacity-50' : ''
                  }`}
                  disabled={estaEnVerificacion()}
                >
                  <div className="flex items-center">
                    <Star size={18} className="mr-3 text-[#ff007a]"/>
                    Favoritos
                  </div>
                  {estaEnVerificacion() && <Lock size={12} className="text-red-400" />}
                </button>
              </div>

              {/* Separador */}
              <div className="border-t border-[#ff007a]/20"></div>

              {/* Opciones de cuenta móvil - Solo configuración y logout permitidos */}
              <div className="py-2">
                <button
                  onClick={() => {
                    manejarNavegacionBloqueada("/configuracion", "La configuración");
                    setMobileMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <Settings size={18} className="mr-3 text-[#ff007a]"/>
                  Configuración
                </button>
                
                <button
                  onClick={() => {
                    manejarNavegacionBloqueada("/logout", "Cerrar sesión");
                    setMobileMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <LogOut size={18} className="mr-3 text-[#ff007a]"/>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Modal de Ganancias - SIEMPRE DISPONIBLE */}
        <ModelEarnings 
          isOpen={showEarnings} 
          onClose={() => setShowEarnings(false)} 
        />
      </header>

      {/* 🔥 MODAL DE CHAT PARA VIDEOLLAMADAS - Bloqueado durante verificación */}
      <MiniChatVideocall 
        isOpen={showChatModal && !estaEnVerificacion()}
        onClose={() => setShowChatModal(false)}
        conversaciones={conversaciones}
        conversacionActiva={conversacionActiva}
        setConversacionActiva={setConversacionActiva}
        mensajes={mensajes}
        nuevoMensaje={nuevoMensaje}
        setNuevoMensaje={setNuevoMensaje}
        enviarMensaje={enviarMensaje}
        enviarRegalo={enviarRegalo}
        renderMensaje={renderMensaje}
        formatearTiempo={formatearTiempo}
        abrirConversacion={abrirConversacion}
        getDisplayName={getDisplayName}
        onlineUsers={onlineUsers}
        getInitial={getInitial}
        translationSettings={translationSettings}
      />
    </>
  );
}