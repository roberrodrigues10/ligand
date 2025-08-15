import { useState, useRef, useEffect } from "react";
import { Home, Star, MessageSquare, LogOut, Settings, Wallet, Menu, X, Bell, Send, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoproncipal from "./imagenes/logoprincipal.png";
import { useTranslation } from 'react-i18next';
import LanguageSelector from "../components/languageSelector";
import ModelEarnings from './ModelEarnings';
import MiniChatVideocall, { useVideocallChat } from './MiniChatVideocall';
import { DollarSign } from 'lucide-react';

// 🔥 IMPORTAR TU SISTEMA DE TRADUCCIÓN
import {
  useTranslation as useCustomTranslation,
  TranslatedMessage
} from '../utils/translationSystem.jsx';

export default function Header() {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);
  const [lastSeenMessages, setLastSeenMessages] = useState({});
  const [usuario, setUsuario] = useState({ id: null });
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

  const toggleMenu = () => setMenuAbierto(!menuAbierto);
  const toggleMobileMenu = () => setMobileMenuAbierto(!mobileMenuAbierto);

  // 🔥 FUNCIÓN PARA OBTENER HEADERS CON TOKEN
  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("token");
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

  // 🔥 MANEJAR CLICK EN MENSAJES
  const handleMessagesClick = () => {
    if (isInCall) {
      // Si está en videollamada, abrir modal de chat
      setShowChatModal(true);
      // Cargar conversaciones si no están cargadas
      if (conversaciones.length === 0) {
        cargarConversaciones();
      }
    } else {
      // Si no está en videollamada, navegar a mensajes
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
        // Datos de ejemplo para desarrollo
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
          },
          {
            id: 2,
            other_user_id: 3,
            other_user_name: "Mia88",
            other_user_role: "modelo", 
            room_name: "chat_user_1_3",
            last_message: "Gracias por la sesión 😘",
            last_message_time: "2024-01-15T12:15:00Z",
            last_message_sender_id: 3,
            unread_count: 1,
            avatar: "https://i.pravatar.cc/40?u=3"
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
        // Mensajes de ejemplo
        const exampleMessages = [
          {
            id: 1,
            user_id: 2,
            user_name: "SofiSweet",
            user_role: "modelo",
            message: "¡Hola! ¿Cómo estás?",
            type: "text",
            created_at: "2024-01-15T14:25:00Z"
          },
          {
            id: 2,
            user_id: usuario.id,
            user_name: usuario.name || "Usuario",
            user_role: "cliente",
            message: "¡Hola! Todo bien, ¿y tú?",
            type: "text",
            created_at: "2024-01-15T14:26:00Z"
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
          // Agregar mensaje inmediatamente
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
        // Para demo, agregar mensaje local
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
        // Con traducción si está habilitada
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

  // 🔔 CARGAR DATOS DEL USUARIO
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (userData.id) {
          setUsuario(userData);
        } else {
          setUsuario({ id: 1, name: "Usuario" });
        }
      } catch (error) {
        console.error('Error cargando usuario:', error);
        setUsuario({ id: 1, name: "Usuario" });
      }
    };

    cargarUsuario();
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
        setGlobalUnreadCount(6); // Ejemplo
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

  return (
    <>
      <header className="flex justify-between items-center mb-4 px-4 relative">
        {/* Logo + Nombre */}
        <div
          className="flex items-center cursor-pointer"
          onClick={() => navigate("/homellamadas")}
        >
          <img src={logoproncipal} alt="Logo" className="w-12 h-12 sm:w-14 sm:h-14" />
          <span className="text-xl sm:text-2xl text-[#ff007a] font-pacifico ml-[-5px]">
            Ligand
          </span>
        </div>

        {/* Navegación Desktop - oculta en móvil */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-lg">
          <LanguageSelector />
          
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => setShowEarnings(true)}
            title="Pagos y monedas"
          >
            <Wallet className="text-[#ff007a]" size={24} />
          </button>
          
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => navigate("/homellamadas")}
            title="Inicio"
          >
            <Home className="text-[#ff007a]" size={24} />
          </button>
          
          {/* 🔔 BOTÓN DE MENSAJES CON LÓGICA DUAL */}
          <div className="relative">
            <button
              className="hover:scale-110 transition p-2"
              onClick={handleMessagesClick}
              title={isInCall ? "Chat en videollamada" : "Mensajes"}
            >
              <MessageSquare className="text-[#ff007a]" size={24} />
              {globalUnreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-[#1a1c20]">
                  {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                </div>
              )}
              {/* 🔥 INDICADOR VISUAL SI ESTÁ EN VIDEOLLAMADA */}
              {isInCall && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1c20] animate-pulse"></div>
              )}
            </button>
          </div>
          
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => navigate("/favorites")}
            title="Favoritos"
          >
            <Star className="text-[#ff007a]" size={24} />
          </button>

          {/* Botón de perfil desktop */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="w-10 h-10 rounded-full bg-[#ff007a] text-white font-bold text-sm hover:scale-105 transition flex items-center justify-center"
              title="Menú de cuenta"
            >
              M
            </button>

            {/* Menú desplegable desktop */}
            {menuAbierto && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1f2125] rounded-xl shadow-lg border border-[#ff007a]/30 z-50 overflow-hidden">
                <button
                  onClick={() => {
                    navigate("/configuracion");
                    setMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <Settings size={16} className="mr-3 text-[#ff007a]"/>
                  Configuración
                </button>
                <button
                  onClick={() => {
                    navigate("/logout");
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

        {/* Botón menú móvil - solo visible en móvil */}
        <div className="md:hidden relative" ref={mobileMenuRef}>
          <div className="flex items-center gap-2">
            {/* 🔔 NOTIFICACIÓN GLOBAL MÓVIL */}
            {globalUnreadCount > 0 && (
              <div className="relative">
                <button
                  onClick={handleMessagesClick}
                  className="w-10 h-10 rounded-full bg-red-500 text-white hover:scale-105 transition flex items-center justify-center animate-pulse"
                  title={`${globalUnreadCount} mensajes nuevos`}
                >
                  <Bell size={18} />
                  <div className="absolute -top-1 -right-1 bg-white text-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                  </div>
                  {/* 🔥 INDICADOR SI ESTÁ EN VIDEOLLAMADA */}
                  {isInCall && (
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </button>
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

          {/* Menú móvil desplegable */}
          {mobileMenuAbierto && (
            <div className="absolute right-0 mt-2 w-64 bg-[#1f2125] rounded-xl shadow-xl border border-[#ff007a]/30 z-50 overflow-hidden">
              {/* Selector de idioma móvil */}
              <div className="px-4 py-3 border-b border-[#ff007a]/20">
                <div className="text-xs text-gray-400 mb-2">Idioma</div>
                <LanguageSelector />
              </div>

              {/* Navegación móvil */}
              <div className="py-2">
                <button
                  onClick={() => {
                    navigate("/pagos");
                    setMobileMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <Wallet size={18} className="mr-3 text-[#ff007a]"/>
                  Pagos y monedas
                </button>
                
                <button
                  onClick={() => {
                    navigate("/homellamadas");
                    setMobileMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <Home size={18} className="mr-3 text-[#ff007a]"/>
                  Inicio
                </button>
                
                {/* 🔔 MENSAJES CON LÓGICA DUAL EN MÓVIL */}
                <button
                  onClick={() => {
                    handleMessagesClick();
                    setMobileMenuAbierto(false);
                  }}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
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
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    navigate("/favorites");
                    setMobileMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <Star size={18} className="mr-3 text-[#ff007a]"/>
                  Favoritos
                </button>
              </div>

              {/* Separador */}
              <div className="border-t border-[#ff007a]/20"></div>

              {/* Opciones de cuenta móvil */}
              <div className="py-2">
                <button
                  onClick={() => {
                    navigate("/configuracion");
                    setMobileMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <Settings size={18} className="mr-3 text-[#ff007a]"/>
                  Configuración
                </button>
                
                <button
                  onClick={() => {
                    navigate("/logout");
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
        
        {/* Modal de Ganancias */}
        <ModelEarnings 
          isOpen={showEarnings} 
          onClose={() => setShowEarnings(false)} 
        />
      </header>

      {/* 🔥 MODAL DE CHAT PARA VIDEOLLAMADAS */}
      <MiniChatVideocall 
        isOpen={showChatModal}
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