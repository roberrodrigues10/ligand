import { useState, useRef, useEffect } from "react";
import { Home, Star, MessageSquare, LogOut, Settings, Wallet, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoproncipal from "./imagenes/logoprincipal.png";
import { useTranslation } from 'react-i18next';
import LanguageSelector from "../components/languageSelector";

export default function Header() {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const { t, i18n } = useTranslation();

  const toggleMenu = () => setMenuAbierto(!menuAbierto);
  const toggleMobileMenu = () => setMobileMenuAbierto(!mobileMenuAbierto);

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
        
        <button
          className="hover:scale-110 transition p-2"
          onClick={() => navigate("/mensajes")}
          title="Mensajes"
        >
          <MessageSquare className="text-[#ff007a]" size={24} />
        </button>
        
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
        <button
          onClick={toggleMobileMenu}
          className="w-10 h-10 rounded-full bg-[#ff007a] text-white hover:scale-105 transition flex items-center justify-center"
          title="Menú"
        >
          {mobileMenuAbierto ? <X size={20} /> : <Menu size={20} />}
        </button>

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
              
              <button
                onClick={() => {
                  navigate("/mensajes");
                  setMobileMenuAbierto(false);
                }}
                className="flex items-center w-full px-4 py-3 text-sm text-white hover:bg-[#2b2d31] transition"
              >
                <MessageSquare size={18} className="mr-3 text-[#ff007a]"/>
                Mensajes
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