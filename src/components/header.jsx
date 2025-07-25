import { useState, useRef, useEffect } from "react";
import { Home, Star, MessageSquare, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // idioma
import logoproncipal from "./imagenes/logoprincipal.png";

export default function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation(); // idioma
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = () => setMenuAbierto(!menuAbierto);

  useEffect(() => {
    const manejarClickFuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", manejarClickFuera);
    return () => document.removeEventListener("mousedown", manejarClickFuera);
  }, []);

  return (
    <header className="flex justify-between items-center mb-4 px-4">
      <div
        className="flex items-center cursor-pointer"
        onClick={() => navigate("/homellamadas")}
      >
        <img src={logoproncipal} alt="Logo" className="w-14 h-14" />
        <span className="text-2xl text-[#ff007a] font-pacifico ml-[-5px]">
          Ligand
        </span>
      </div>

      <nav className="flex items-center gap-6 text-lg relative">
        <button
          className="hover:scale-110 transition"
          onClick={() => navigate("/homellamadas")}
          title={t("home")} // idioma
        >
          <Home className="text-[#ff007a]" size={24} />
        </button>
        <button
          className="hover:scale-110 transition"
          onClick={() => navigate("/mensajes")} 
          title={t("messages")} // idioma
        >
          <MessageSquare className="text-[#ff007a]" size={24} />
        </button>
        <button
          className="hover:scale-110 transition"
          onClick={() => navigate("/favorites")}
          title={t("favoritesHome")} // idioma
        >
          <Star className="text-[#ff007a]" size={24} />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className="w-10 h-10 rounded-full bg-[#ff007a] text-white font-bold text-sm hover:scale-105 transition flex items-center justify-center"
            title={t("accountMenu")} // idioma
          >
            M
          </button>

          {menuAbierto && (
            <div className="absolute right-0 mt-2 w-48 bg-[#1f2125] rounded-xl shadow-lg border border-[#ff007a]/30 z-50 overflow-hidden">
              <button
                onClick={() => {
                  navigate("/configuracion");
                  setMenuAbierto(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-[#2b2d31]"
              >
                <Settings size={16} className="mr-2 text-[#ff007a]" />
                {t("settingsHome")} // idioma
              </button>
              <button
                onClick={() => {
                  navigate("/logout");
                  setMenuAbierto(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-[#2b2d31]"
              >
                <LogOut size={16} className="mr-2 text-[#ff007a]" />
                {t("logout")} // idioma
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}