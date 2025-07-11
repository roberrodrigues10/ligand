import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getUser } from "../../../utils/auth";
import instance from "../../../api/axios"; // o como tengas configurado tu archivo

export default function LoginLigand({ onClose }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);       // Paso 1: CSRF + login
      await getUser();                    // Paso 2: confirmar sesión activa
      navigate("/anteveri");              // Paso 3: redirigir
    } catch (err) {
      setError("Correo o contraseña incorrectos.");
      console.error(err);
    }
  };

  const handleForgotPassword = async () => {
    setForgotMessage("");
    setForgotError("");

    try {
      // Paso 1: obtener cookie CSRF
      await instance.get("/sanctum/csrf-cookie");

      // Paso 2: enviar solicitud
      const response = await instance.post("/api/forgot-password", {
        email: forgotEmail,
      });

      if (response.status === 200) {
        setForgotMessage("Se ha enviado un correo con instrucciones.");
        setForgotEmail("");
      }
    } catch (error) {
      console.error(error);
      if (error.response?.status === 422) {
        setForgotError("Correo inválido o no registrado.");
      } else {
        setForgotError("Ocurrió un error al intentar enviar el correo.");
      }
    }
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
          <div className="text-right mb-4">
            <button
              type="button"
              className="text-sm text-[#ff007a] hover:underline"
              onClick={() => setShowForgotModal(true)}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

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
      {showForgotModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="bg-[#1a1c20] rounded-2xl p-8 w-[380px] shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-4 text-white text-xl hover:text-[#ff007a]"
              onClick={() => setShowForgotModal(false)}
            >
              ×
            </button>
            <h2 className="text-xl font-semibold text-[#ff007a] mb-4 text-center">
              Recuperar contraseña
            </h2>
            <p className="text-white/70 text-sm mb-4 text-center">
              Ingresa tu correo electrónico registrado para enviarte un enlace de recuperación.
            </p>

            {forgotMessage && (
              <div className="text-green-500 text-sm text-center mb-2">{forgotMessage}</div>
            )}
            {forgotError && (
              <div className="text-red-500 text-sm text-center mb-2">{forgotError}</div>
            )}

            <input
              type="email"
              placeholder="Correo electrónico"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            />
            <button
              onClick={handleForgotPassword}
              className="w-full py-3 bg-[#ff007a] text-white font-bold rounded-xl hover:bg-[#e6006e] transition"
            >
              Enviar enlace de recuperación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}