import React from "react";
import { useNavigate } from "react-router-dom";

export default function LoginLigand({ onClose }) {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí puedes hacer validaciones o login real si lo deseas
    navigate("/anteveri"); // Redirige a la ruta de verificación
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1c20] rounded-2xl p-10 w-[400px] shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          className="absolute top-3 right-4 text-white text-xl hover:text-[#ff007a] transition"
          onClick={onClose}
        >
          ×
        </button>

        <h2 className="text-2xl text-[#ff007a] font-dancing-script text-center">
          ¡Bienvenida de nuevo!
        </h2>
        <p className="text-center text-white/80 mb-6">
          Inicia sesión para seguir conectando
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Correo electrónico o usuario"
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
          />

          <label className="text-white/80 flex items-center gap-2 mb-4">
            <input type="checkbox" /> Recuérdame
          </label>

          <button
            type="submit"
            className="w-full py-3 bg-[#ff007a] text-white font-bold rounded-xl hover:bg-[#e6006e] transition"
          >
            Iniciar sesión
          </button>

          <div className="text-center text-white/40 my-3">o</div>

          <button
            type="button"
            className="w-full py-3 border border-[#2c2e33] bg-[#1a1c20] text-white rounded-xl flex justify-center items-center gap-2"
          >
            <span className="text-lg font-bold text-[#ff007a]">G</span>
            Iniciar sesión con Google
          </button>

          <div className="text-center text-white/80 mt-6">
            ¿Aún no tienes cuenta?{" "}
            <button
              type="button"
              className="text-[#ff007a] underline"
              onClick={() => {
                onClose();
                // Aquí puedes abrir el modal de registro
              }}
            >
              Regístrate aquí
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
