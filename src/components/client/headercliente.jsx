import { useState, useRef, useEffect } from "react";
import { Home, Star, MessageSquare, LogOut, Settings, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoproncipal from "../imagenes/logoprincipal.png";

export default function HeaderCliente({ minutos = 25 }) {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [minutosAbierto, setMinutosAbierto] = useState(false);
  const menuRef = useRef(null);
  const minutosRef = useRef(null);

  const toggleMenu = () => setMenuAbierto(!menuAbierto);
  const toggleMinutos = () => setMinutosAbierto(!minutosAbierto);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const manejarClickFuera = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target)
      ) setMenuAbierto(false);
      if (
        minutosRef.current && !minutosRef.current.contains(e.target)
      ) setMinutosAbierto(false);
    };
    document.addEventListener("mousedown", manejarClickFuera);
    return () => document.removeEventListener("mousedown", manejarClickFuera);
  }, []);

  return (
    <header className="flex justify-between items-center mb-4 px-4">
      {/* Logo + Nombre */}
      <div
        className="flex items-center cursor-pointer"
        onClick={() => navigate("/homecliente")}
      >
        <img src={logoproncipal} alt="Logo" className="w-14 h-14" />
        <span className="text-2xl text-[#ff007a] font-pacifico ml-[-5px]">Ligand</span>
      </div>
      

      {/* Navegación + Minutos */}
      <nav className="flex items-center gap-6 text-lg relative">
         {/* MINUTOS DISPONIBLES */}
        <div ref={minutosRef} className="relative">
          <button
            onClick={toggleMinutos}
            className="flex items-center gap-2 px-3 py-2 bg-[#] hover:bg-[#e6006e] text-white rounded-full transition text-sm font-semibold"
            title="Minutos disponibles"
          >
            <ShoppingCart size={16} />
            {minutos} min
          </button>

          {/* DESPLEGABLE DE COMPRAS */}
          {minutosAbierto && (
            <div className="absolute right-0 mt-2 w-56 bg-[#1f2125] rounded-xl shadow-lg border border-[#ff007a]/30 z-50 overflow-hidden">
              <div className="text-white text-sm p-3 border-b border-[#ff007a]/20 font-semibold">Comprar minutos</div>
              <button
                className="w-full text-left px-4 py-2 hover:bg-[#2b2d31] text-sm text-white flex justify-between"
              >
                10 minutos <span className="text-[#ffb6d2] font-bold">$2.99</span>
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-[#2b2d31] text-sm text-white flex justify-between"
              >
                25 minutos <span className="text-[#ffb6d2] font-bold">$5.99</span>
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-[#2b2d31] text-sm text-white flex justify-between"
              >
                60 minutos <span className="text-[#ffb6d2] font-bold">$11.99</span>
              </button>
            </div>
          )}
        </div>
        <button
          className="hover:scale-110 transition"
          onClick={() => navigate("/homecliente")}
        >
          <Home className="text-[#ff007a]" size={24} />
        </button>
        <button
          className="hover:scale-110 transition"
          onClick={() => navigate("/mensajes")}
        >
          <MessageSquare className="text-[#ff007a]" size={24} />
        </button>
        <button
          className="hover:scale-110 transition"
          onClick={() => navigate("/favorites")}
        >
          <Star className="text-[#ff007a]" size={24} />
        </button>

        {/* Botón redondo con letra */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className="w-10 h-10 rounded-full bg-[#ff007a] text-white font-bold text-sm hover:scale-105 transition flex items-center justify-center"
            title="Menú de cuenta"
          >
            C
          </button>

          {/* Menú desplegable */}
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
                Configuración
              </button>
              <button
                onClick={() => {
                  navigate("/logout");
                  setMenuAbierto(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-[#2b2d31]"
              >
                <LogOut size={16} className="mr-2 text-[#ff007a]" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
        
      </nav>
    </header>
  );
}
