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
import SearchModelsModal from './SearchModelsModal'; // 👈 IMPORTAR EL MODAL DE BÚSQUEDA
import { useAppNotifications } from '../../contexts/NotificationContext';

export default function HeaderCliente() {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [comprasAbierto, setComprasAbierto] = useState(false);
  const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);
  const [showBuyCoins, setShowBuyCoins] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  // ESTADOS PARA MODALES
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false); // 👈 NUEVO ESTADO
  const [currentUser, setCurrentUser] = useState(null);
  
  const menuRef = useRef(null);
  const comprasRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const { t, i18n } = useTranslation();
  const notifications = useAppNotifications();

  // CARGAR USUARIO AL INICIALIZAR
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

  // FUNCIÓN PARA ABRIR MODAL DE HISTORIAS
  const handleOpenStories = () => {
    console.log('🎬 Abriendo modal de historias...');
    setShowStoriesModal(true);
  };

  // FUNCIÓN PARA CERRAR MODAL DE HISTORIAS
  const handleCloseStories = () => {
    console.log('🚪 Cerrando modal de historias...');
    setShowStoriesModal(false);
  };

  // 👈 FUNCIÓN PARA ABRIR MODAL DE BÚSQUEDA
  const handleOpenSearch = () => {
    console.log('🔍 Abriendo modal de búsqueda...');
    setShowSearchModal(true);
  };

  // 👈 FUNCIÓN PARA CERRAR MODAL DE BÚSQUEDA
  const handleCloseSearch = () => {
    console.log('🚪 Cerrando modal de búsqueda...');
    setShowSearchModal(false);
  };

  // 👈 FUNCIÓN PARA MANEJAR MENSAJES DESDE LA BÚSQUEDA
  const handleMessageFromSearch = async (modelId, modelName) => {
    console.log('📩 Iniciando conversación con:', { modelId, modelName });
    
    try {
      // Obtener el token
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No hay token de autenticación');
        notifications.error('Error de autenticación');
        return;
      }

      // Llamar al backend para iniciar/encontrar conversación
      const response = await fetch('http://localhost:8000/api/chat/start-conversation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          other_user_id: modelId
        })
      });

      const data = await response.json();
      console.log('📡 Respuesta del servidor:', data);

      if (data.success) {
        console.log('✅ Conversación iniciada/encontrada:', data.conversation);
        
        // Navegar al chat con toda la información necesaria
        navigate('/message', { 
          state: { 
            openChatWith: {
              id: data.conversation.id,
              room_name: data.conversation.room_name,
              other_user_id: modelId,
              other_user_name: modelName,
              other_user_role: data.conversation.other_user_role,
              session_id: data.session_id
            }
          }
        });
        
        notifications.success(`Abriendo chat con ${modelName}`);
      } else {
        console.error('❌ Error del servidor:', data.error);
        
        // Manejar errores específicos
        if (data.error === 'blocked_by_you') {
          notifications.error('Has bloqueado a este usuario');
        } else if (data.error === 'blocked_by_them') {
          notifications.error('Este usuario te ha bloqueado');
        } else {
          notifications.error(data.message || 'Error iniciando conversación');
        }
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      notifications.error('Error de conexión. Inténtalo de nuevo.');
    }
  };

  // 👈 FUNCIÓN PARA MANEJAR LLAMADAS DESDE LA BÚSQUEDA
  const handleCallFromSearch = (modelId, modelName) => {
    console.log('📞 Iniciando llamada con:', { modelId, modelName });
    // Aquí puedes implementar la lógica de llamadas
    // Por ejemplo, abrir un modal de llamada o redirigir a una página de llamada
    notifications.info(`Iniciando llamada con ${modelName}...`);
    
    // Ejemplo de navegación a una página de llamada:
    // navigate(`/call?userId=${modelId}&userName=${encodeURIComponent(modelName)}`);
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
          
          {/* 👈 ICONO DE BÚSQUEDA DE USUARIOS - AHORA FUNCIONAL */}
          <button
            onClick={handleOpenSearch}
            className="hover:scale-110 transition p-2"
            title={t('searchUsers') || 'Buscar Usuarios'}
          >
            <Search size={24} className="text-[#ff007a]" />
          </button>

          {/* ICONO DE HISTORIAS - ABRE EL MODAL */}
          <button
            onClick={handleOpenStories}
            className="hover:scale-110 transition p-2"
            title={t('viewStories') || 'Ver Historias'}
          >
            <Play size={24} className="text-[#ff007a]" />
          </button>
          
          {/* ICONO DE COMPRAS DESKTOP */}
          <div ref={comprasRef} className="relative">
            <button
              onClick={toggleCompras}
              className="hover:scale-110 transition p-2 relative"
              title={t('buyCoins') || 'Comprar Monedas'}
            >
              <Coins size={24} strokeWidth={2.5} className="text-[#ff007a]" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </button>

            {/* MODAL DE OFERTAS DESKTOP */}
            {comprasAbierto && (
              <div className="absolute right-0 mt-2 w-80 bg-[#1f2125] rounded-xl shadow-xl border border-[#ff007a]/30 z-50 overflow-hidden">
                <div className="text-white text-sm p-4 border-b border-[#ff007a]/20 font-semibold bg-[#1f2125] flex items-center gap-2">
                  <span className="text-lg">🪙</span>
                  {t('coinPackages')}
                </div>

                <div className="p-4 space-y-3 bg-[#1f2125]">
                  <button
                    onClick={() => {
                      setComprasAbierto(false);
                      abrirModalCompraMonedas();
                    }}
                    className="w-full bg-[#2b2d31] hover:bg-[#36393f] rounded-lg p-4 transition text-left border border-gray-600"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold text-lg">100 monedas</div>
                        <div className="text-sm text-gray-400">{t('videoMinutes10')}</div>
                      </div>
                      <div className="text-[#ff007a] font-bold text-xl">$2.99</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setComprasAbierto(false);
                      abrirModalCompraMonedas();
                    }}
                    className="w-full bg-[#2b2d31] hover:bg-[#36393f] rounded-lg p-4 transition text-left border border-[#ff007a]/40 relative"
                  >
                    <div className="absolute top-3 right-3">
                      <span className="bg-[#ff007a] text-white text-xs px-2 py-1 rounded-full font-semibold">
                        {t('popular')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold text-lg">300 monedas</div>
                        <div className="text-sm text-gray-400">{t('videoMinutes30')}</div>
                      </div>
                      <div className="text-[#ff007a] font-bold text-xl">$5.99</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setComprasAbierto(false);
                      abrirModalCompraMonedas();
                    }}
                    className="w-full bg-[#2b2d31] hover:bg-[#36393f] rounded-lg p-4 transition text-left border border-gray-600"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold text-lg">800 monedas</div>
                        <div className="text-sm text-gray-400">{t('videoMinutes80')}</div>
                      </div>
                      <div className="text-[#ff007a] font-bold text-xl">$11.99</div>
                    </div>
                  </button>
                </div>

                <div className="p-4 border-t border-[#ff007a]/20 bg-[#1f2125]">
                  <div className="text-center text-sm text-gray-400">
                    <span className="text-lg">🔒</span>{t('securePayment')}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => navigate("/homecliente")}
            title={t('home')}
          >
            <Home className="text-[#ff007a]" size={24} />
          </button>
          
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => navigate("/message")}
            title={t('messages')}
          >
            <MessageSquare className="text-[#ff007a]" size={24} />
          </button>
          
          <button
            className="hover:scale-110 transition p-2"
            onClick={() => navigate("/favoritesboy")}
            title={t('favoritesHome')}
          >
            <Star className="text-[#ff007a]" size={24} />
          </button>

          {/* Botón de perfil desktop */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="w-10 h-10 rounded-full bg-[#ff007a] text-white font-bold text-sm hover:scale-105 transition flex items-center justify-center"
              title={t('accountMenu')}
            >
              C
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
                  <Settings size={16} className="mr-3 text-[#ff007a]" />
                  {t('settingsHome')}
                </button>
                <button
                  onClick={() => {
                    navigate("/logout");
                    setMenuAbierto(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                >
                  <LogOut size={16} className="mr-3 text-[#ff007a]" />
                  {t('logout')}
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
              title={t('header.menu')}
            >
              {mobileMenuAbierto ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Menú móvil desplegable */}
            {mobileMenuAbierto && (
              <div className="absolute right-0 mt-2 w-72 bg-[#1f2125] rounded-xl shadow-xl border border-[#ff007a]/30 z-50 overflow-hidden">
                {/* Selector de idioma móvil */}
                <div className="px-4 py-3 border-b border-[#ff007a]/20">
                  <div className="text-xs text-gray-400 mb-2">{t('idioma')}</div>
                  <LanguageSelector />
                </div>

                {/* 👈 OPCIONES MÓVILES PARA HISTORIAS Y BÚSQUEDA */}
                <div className="py-2 border-b border-[#ff007a]/20">
                  <button
                    onClick={() => {
                      handleOpenSearch();
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <Search size={18} className="mr-3 text-[#ff007a]"/>
                    {t('searchUsers') || 'Buscar Usuarios'}
                  </button>
                  
                  <button
                    onClick={() => {
                      handleOpenStories();
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <Play size={18} className="mr-3 text-[#ff007a]"/>
                    {t('viewStories') || 'Ver Historias'}
                  </button>
                </div>

                {/* Sección de compras móvil */}
                <div className="px-4 py-3 border-b border-[#ff007a]/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Coins size={18} className="text-[#ff007a]" strokeWidth={2.5} />
                      <span className="text-white font-semibold">🪙 {t('coinPackages')}</span>
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </div>

                {/* Paquetes de monedas móvil */}
                <div className="py-2 border-b border-[#ff007a]/20">
                  <button
                    onClick={() => {
                      abrirModalCompraMonedas();
                    }}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <div>
                      <div className="font-semibold">100 monedas</div>
                      <div className="text-xs text-gray-400">{t('videoMinutes10')}</div>
                    </div>
                    <span className="text-[#ff007a] font-bold">$2.99</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        300 monedas
                        <span className="bg-[#ff007a] text-white text-xs px-1.5 py-0.5 rounded-full">{t('popular')}</span>
                      </div>
                      <div className="text-xs text-gray-400">{t('videoMinutes30')}</div>
                    </div>
                    <span className="text-[#ff007a] font-bold">$5.99</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMobileMenuAbierto(false);
                      abrirModalCompraMonedas();
                    }}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <div>
                      <div className="font-semibold">800 monedas</div>
                      <div className="text-xs text-gray-400">{t('videoMinutes80')}</div>
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
                    {t('home')}
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate("/messageclient");
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <MessageSquare size={18} className="mr-3 text-[#ff007a]"/>
                    {t('messages')}
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate("/favoritesboy");
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <Star size={18} className="mr-3 text-[#ff007a]"/>
                    {t('favoritesHome')}
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
                    {t('settingsHome')}
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate("/logout");
                      setMobileMenuAbierto(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
                  >
                    <LogOut size={18} className="mr-3 text-[#ff007a]"/>
                    {t('logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 👈 MODAL DE BÚSQUEDA DE MODELOS */}
      <SearchModelsModal 
        isOpen={showSearchModal}
        onClose={handleCloseSearch}
        onMessage={handleMessageFromSearch}
        onCall={handleCallFromSearch}
      />

      {/* MODAL DE HISTORIAS INTEGRADO */}
      <StoriesModal 
        isOpen={showStoriesModal}
        onClose={handleCloseStories}
        currentUser={currentUser}
      />

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