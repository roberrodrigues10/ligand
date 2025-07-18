import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getUser } from "../../../utils/auth";

export default function LoginLigand({ onClose, onShowRegister }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password, navigate);
      await getUser();
      navigate("/anteveri");
    } catch (err) {
      // Captura el mensaje del backend si existe
      const backendMessage = err?.message || "Correo o contraseña incorrectos.";
      setError(backendMessage);
      console.error("🛑 Error en login:", backendMessage);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1c20] rounded-2xl p-6 sm:p-10 w-[350px] max-w-full shadow-xl relative"
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

        {error && (
          <div className="text-red-500 text-sm text-center mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Correo electrónico o usuario"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

          <div className="text-center text-white/80 mt-6">
            ¿Aún no tienes cuenta?{" "}
            <button
              type="button"
              className="text-[#ff007a] underline"
              onClick={() => navigate("/home?auth=register")}
            >
              Regístrate aquí
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
