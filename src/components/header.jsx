import { useState, useRef, useEffect } from "react";
import { Home, Star, MessageSquare, LogOut, Settings, Wallet, Menu, X, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoproncipal from "./imagenes/logoprincipal.png";
import { useTranslation } from 'react-i18next';
import LanguageSelector from "../components/languageSelector";

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

  // 🔔 CARGAR DATOS DEL USUARIO
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        // Aquí puedes usar tu función getUser existente
        const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (userData.id) {
          setUsuario(userData);
        } else {
          // Fallback si no hay datos en sessionStorage
          setUsuario({ id: 1 }); // ID de ejemplo
        }
      } catch (error) {
        console.error('Error cargando usuario:', error);
        setUsuario({ id: 1 }); // ID de ejemplo
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
    
    // Si hay unread_count del servidor, usarlo
    if (conversacion.unread_count && conversacion.unread_count > 0) {
      return conversacion.unread_count;
    }
    
    // Fallback: si el último mensaje es después de la última vez visto Y no es del usuario actual
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
      
      const response = await fetch('/api/chat/conversations', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        const conversaciones = data.conversations || [];
        
        // Calcular total de mensajes no leídos
        let totalUnread = 0;
        conversaciones.forEach(conv => {
          const unreadCount = calculateUnreadCount(conv);
          totalUnread += unreadCount;
        });
        
        setGlobalUnreadCount(totalUnread);
        console.log('📊 Conteo global actualizado:', totalUnread);
        
      } else {
        console.error('❌ Error obteniendo conversaciones:', response.status);
        
        // Datos de ejemplo para desarrollo
        const exampleConversations = [
          {
            id: 1,
            room_name: "chat_user_1_2",
            last_message: "¡Hola! ¿Cómo estás?",
            last_message_time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
            last_message_sender_id: 2,
            unread_count: 3
          },
          {
            id: 2,
            room_name: "chat_user_1_3",
            last_message: "Gracias por la sesión 😘",
            last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            last_message_sender_id: 3,
            unread_count: 1
          },
          {
            id: 3,
            room_name: "chat_user_1_4",
            last_message: "¿Cuándo nos vemos de nuevo?",
            last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
            last_message_sender_id: 4,
            unread_count: 2
          }
        ];
        
        let totalUnread = 0;
        exampleConversations.forEach(conv => {
          const unreadCount = calculateUnreadCount(conv);
          totalUnread += unreadCount;
        });
        
        setGlobalUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('❌ Error en polling global:', error);
      // En caso de error, usar conteo de ejemplo
      setGlobalUnreadCount(6); // 3 + 1 + 2 del ejemplo
    }
  };

  // 🔔 POLLING GLOBAL CADA 10 SEGUNDOS
  useEffect(() => {
    if (!usuario.id) return;

    // Obtener conteo inicial
    obtenerConteoGlobal();

    // Iniciar polling
    pollingInterval.current = setInterval(() => {
      obtenerConteoGlobal();
    }, 10000); // Cada 10 segundos

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
          onClick={() => navigate("/pagos")}
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
        
        {/* 🔔 BOTÓN DE MENSAJES CON CONTADOR GLOBAL */}
        <div className="relative">
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => navigate("/mensajes")}
            title="Mensajes"
          >
            <MessageSquare className="text-[#ff007a]" size={24} />
            {/* 🔔 CONTADOR GLOBAL DE MENSAJES */}
            {globalUnreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-[#1a1c20]">
                {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
              </div>
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
          {/* 🔔 NOTIFICACIÓN GLOBAL MÓVIL - Separada del menú */}
          {globalUnreadCount > 0 && (
            <div className="relative">
              <button
                onClick={() => navigate("/mensajes")}
                className="w-10 h-10 rounded-full bg-red-500 text-white hover:scale-105 transition flex items-center justify-center animate-pulse"
                title={`${globalUnreadCount} mensajes nuevos`}
              >
                <Bell size={18} />
                <div className="absolute -top-1 -right-1 bg-white text-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                </div>
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
              
              {/* 🔔 MENSAJES CON CONTADOR EN MENÚ MÓVIL */}
              <button
                onClick={() => {
                  navigate("/mensajes");
                  setMobileMenuAbierto(false);
                }}
                className="flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
              >
                <div className="flex items-center">
                  <MessageSquare size={18} className="mr-3 text-[#ff007a]"/>
                  Mensajes
                </div>
                {globalUnreadCount > 0 && (
                  <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                  </div>
                )}
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
    </header>
  );
}