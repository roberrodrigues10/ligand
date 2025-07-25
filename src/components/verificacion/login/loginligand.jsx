import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getUser } from "../../../utils/auth";
import instance from "../../../api/axios"; // o como tengas configurado tu archivo
import { useTranslation } from 'react-i18next'; // idioma


export default function LoginLigand({ onClose }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const { t } = useTranslation(); // idioma

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);       // Paso 1: CSRF + login
      await getUser();                    // Paso 2: confirmar sesión activa
      navigate("/anteveri");              // Paso 3: redirigir
    } catch (err) {
      setError(t('login.error_credenciales')); // idioma
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
        setForgotMessage(t('login.msg_recuperacion_enviada')); // idioma
        setForgotEmail("");
      }
    } catch (error) {
      console.error(error);
      if (error.response?.status === 422) {
        setForgotError(t('login.error_recuperacion_invalido')); // idioma
      } else {
        setForgotError(t('login.error_recuperacion_invalido')); // idioma
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
          {t('login.titulo')} // idioma
        </h2>

        <p className="text-center text-white/80 mb-6">
          {t('login.subtitulo')} // idioma
        </p>

        {error && (
          <div className="text-red-500 text-sm text-center mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t('login.placeholder_email')} // idioma
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
          />
          <input
            type="password"
            placeholder={t('login.placeholder_contrasena')} // idioma
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
              {t('forgotPassword')} // idioma
            </button>
          </div>

          <label className="text-white/80 flex items-center gap-2 mb-4">
            <input type="checkbox" /> {t('login.recuerdame')} // idioma
          </label>

          <button
            type="submit"
            className="w-full py-3 bg-[#ff007a] text-white font-bold rounded-xl hover:bg-[#e6006e] transition"
          >
            {t('login.boton_iniciar')} // idioma
          </button>

          <div className="text-center text-white/40 my-3">{t('login.o')}</div> // idioma

          <button
            type="button"
            className="w-full py-3 border border-[#2c2e33] bg-[#1a1c20] text-white rounded-xl flex justify-center items-center gap-2"
          >
            <span className="text-lg font-bold text-[#ff007a]">G</span>
            {t('login.boton_google')} // idioma
          </button>

          <div className="text-center text-white/80 mt-6">
            {t('login.no_tienes_cuenta')}{" "} // idioma
            <button
              type="button"
              className="text-[#ff007a] underline"
              onClick={() => {
                onClose();
                // Aquí puedes abrir el modal de registro
              }}
            >
            {t('login.registrate')} // idioma
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
              {t('login.titulo_recuperar')} // idioma
            </h2>
            <p className="text-white/70 text-sm mb-4 text-center">
              {t('login.descripcion_recuperar')} // idioma
            </p>

            {forgotMessage && (
              <div className="text-green-500 text-sm text-center mb-2">
                {t('login.msg_recuperacion_enviada')} // idioma
              </div>
            )}
            {forgotError && (
              <div className="text-red-500 text-sm text-center mb-2">
                {t('login.error_recuperacion_invalido')} // idioma
              </div>
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
              {t('login.boton_enviar_recuperacion')} // idioma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}