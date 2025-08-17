import { useState, useRef, useEffect } from "react";
import { 
  Home, 
  Star, 
  MessageSquare, 
  LogOut, 
  Settings, 
  DollarSign, 
  Menu, 
  X, 
  Coins,
  Search, 
  Play,
  User    // Para el icono de usuario por defecto
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import logoproncipal from "../imagenes/logoprincipal.png";
import LanguageSelector from "../../components/languageSelector";
import { getUser } from "../../utils/auth";
import UnifiedPaymentModal from '../../components/payments/UnifiedPaymentModal';
import StoriesModal from './StoriesModal';
import { useAppNotifications } from '../../contexts/NotificationContext';

export default function HeaderCliente() {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [comprasAbierto, setComprasAbierto] = useState(false);
  const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);
  const [showBuyCoins, setShowBuyCoins] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const menuRef = useRef(null);
  const comprasRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const { t, i18n } = useTranslation();
  const notifications = useAppNotifications();
  

  // 🔥 CARGAR USUARIO AL INICIALIZAR
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getUser();
        setCurrentUser(userData);
        console.log('👤 Usuario cargado en header:', userData);
      } catch (error) {
        console.error('Error cargando usuario:', error);
      }
    };

    loadUser();
  }, []);

  // 🎨 COMPONENTE PARA EL AVATAR
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

  const handleOpenStories = () => {
    console.log('🎬 Abriendo modal de historias...');
    setShowStoriesModal(true);
  };

  const handleCloseStories = () => {
    console.log('🚪 Cerrando modal de historias...');
    setShowStoriesModal(false);
  };

  const handleOpenSearch = () => {
    console.log('🔍 Búsqueda de usuarios...');
    notifications.info('Funcionalidad de búsqueda próximamente');
  };

  // ✅ FUNCIONES CORREGIDAS PARA COMPRAS
  const abrirModalCompraMonedas = () => {
    console.log('💰 Abriendo modal de compra de monedas...');
    setShowBuyCoins(true);
  };

  const cerrarModalCompraMonedas = () => {
    console.log('🚪 Cerrando modal de compra de monedas...');
    setShowBuyCoins(false);
  };

  const toggleMenu = () => setMenuAbierto(!menuAbierto);
  const toggleCompras = () => setComprasAbierto(!comprasAbierto);
  const toggleMobileMenu = () => setMobileMenuAbierto(!mobileMenuAbierto);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const manejarClickFuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
      if (comprasRef.current && !comprasRef.current.contains(e.target)) {
        setComprasAbierto(false);
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
          onClick={() => navigate("/homecliente")}
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
            onClick={handleOpenSearch}
            className="hover:scale-110 transition p-2"
            title="Buscar usuarios"
          >
            <Search size={24} className="text-[#ff007a]" />
          </button>

          <button
            onClick={handleOpenStories}
            className="hover:scale-110 transition p-2"
            title="Ver historias"
          >
            <Play size={24} className="text-[#ff007a]" />
          </button>
          
          {/* ✅ BOTÓN DE COMPRAS DESKTOP CORREGIDO */}
          <button
            onClick={abrirModalCompraMonedas}
            className="hover:scale-110 transition p-2 relative"
            title="Comprar monedas"
          >
            <Coins size={24} strokeWidth={2.5} className="text-[#ff007a]" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </button>
          
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => navigate("/homecliente")}
            title="Inicio"
          >
            <Home className="text-[#ff007a]" size={24} />
          </button>
          
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => navigate("/message")}
            title="Mensajes"
          >
            <MessageSquare className="text-[#ff007a]" size={24} />
          </button>
          
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => navigate("/favoritesboy")}
            title="Favoritos"
          >
            <Star className="text-[#ff007a]" size={24} />
          </button>

          {/* 🔥 BOTÓN DE PERFIL DESKTOP CON AVATAR DINÁMICO */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="hover:scale-105 transition flex items-center justify-center"
              title={`Perfil de ${currentUser?.display_name || currentUser?.name || 'Usuario'}`}
            >
              <UserAvatar />
            </button>

            {/* Menú desplegable desktop */}
            {menuAbierto && (
              <div className="absolute right-0 mt-2 w-64 bg-[#1f2125] rounded-xl shadow-lg border border-[#ff007a]/30 z-50 overflow-hidden">
                {/* 🔥 HEADER DEL MENÚ CON INFO DEL USUARIO */}
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
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    navigate("/settings");
                    setMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <Settings size={16} className="mr-3 text-[#ff007a]" />
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
        <div className="md:hidden flex items-center gap-2">
          <div className="relative" ref={mobileMenuRef}>
            <button
              onClick={toggleMobileMenu}
              className="w-10 h-10 rounded-full bg-[#ff007a] text-white hover:scale-105 transition flex items-center justify-center"
              title="Menú"
            >
              {mobileMenuAbierto ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Menú móvil desplegable */}
            {mobileMenuAbierto && (
              <div className="absolute right-0 mt-2 w-72 bg-[#1f2125] rounded-xl shadow-xl border border-[#ff007a]/30 z-50 overflow-hidden">
                {/* 🔥 HEADER DEL MENÚ MÓVIL CON AVATAR */}
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
                    </div>
                  </div>
                  
                  {/* Selector de idioma móvil */}
                  <div className="text-xs text-gray-400 mb-2">Idioma</div>
                  <LanguageSelector />
                </div>

                {/* Opciones móviles para historias y búsqueda */}
                <div className="py-2 border-b border-[#ff007a]/20">
                  <button
                    onClick={() => {
                      handleOpenSearch();
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <Search size={18} className="mr-3 text-[#ff007a]"/>
                    Buscar usuarios
                  </button>
                  
                  <button
                    onClick={() => {
                      handleOpenStories();
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <Play size={18} className="mr-3 text-[#ff007a]"/>
                    Ver historias
                  </button>
                </div>

                {/* ✅ SECCIÓN DE COMPRAS MÓVIL CORREGIDA */}
                <div className="py-2 border-b border-[#ff007a]/20">
                  <button
                    onClick={() => {
                      abrirModalCompraMonedas();
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <Coins size={18} className="text-[#ff007a]" strokeWidth={2.5} />
                        <span>Comprar monedas</span>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </button>
                </div>
                
                {/* Navegación móvil */}
                <div className="py-2 border-b border-[#ff007a]/20">
                  <button
                    onClick={() => {
                      navigate("/homecliente");
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <Home size={18} className="mr-3 text-[#ff007a]"/>
                    Inicio
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate("/message");
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <MessageSquare size={18} className="mr-3 text-[#ff007a]"/>
                    Mensajes
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate("/favoritesboy");
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <Star size={18} className="mr-3 text-[#ff007a]"/>
                    Favoritos
                  </button>
                </div>

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
        </div>
      </header>

      {/* Modal de historias integrado */}
      <StoriesModal 
        isOpen={showStoriesModal}
        onClose={handleCloseStories}
        currentUser={currentUser}
      />
      
      {/* ✅ MODAL DE COMPRAS CORREGIDO */}
      {showBuyCoins && (
        <UnifiedPaymentModal onClose={cerrarModalCompraMonedas} />
      )}

      {/* Modal de confirmación */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2b2d31] rounded-xl p-6 max-w-sm mx-4 shadow-xl border border-[#ff007a]/20">
            <h3 className="text-lg font-bold text-white mb-3">
              {confirmAction.title}
            </h3>
            <p className="text-white/70 mb-6">
              {confirmAction.message}
            </p>
            <button
              onClick={confirmAction.action}
              className="w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              {confirmAction.confirmText}
            </button>
          </div>
        </div>
      )}
    </>
  );
}