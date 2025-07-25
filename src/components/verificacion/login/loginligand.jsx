import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithoutRedirect } from "../../../utils/auth";
import { useTranslation } from 'react-i18next'; // idioma

export default function LoginLigand({ onClose, onShowRegister }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation(); // idioma

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 🚀 Solo hacer login - dejar que UnifiedProtectedRoute decida el destino
      console.log("🔑 Iniciando login...");
      await loginWithoutRedirect(email, password);
      
      console.log("✅ Login exitoso, redirigiendo al dashboard");
      
      // 🎯 NAVEGACIÓN SIMPLE - ir al hub que decide el destino
      navigate("/dashboard", { replace: true });

    } catch (err) {
      const backendMessage = err?.message || "Correo o contraseña incorrectos.";
      setError(backendMessage);
      console.error("🛑 Error en login:", backendMessage);
      setLoading(false);
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
        <button
          className="absolute top-3 right-4 text-white text-xl hover:text-[#ff007a] transition"
          onClick={onClose}
        >
          ×
        </button>

        <h2 className="text-2xl text-[#ff007a] font-dancing-script text-center">
          {t('login.titulo')}
        </h2>
        <p className="text-center text-white/80 mb-6">
          {t('login.subtitulo')}
        </p>

        {error && (
          <div className="text-red-500 text-sm text-center mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t('login.placeholder_email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            disabled={loading}
          />
          <input
            type="password"
            placeholder={t('login.placeholder_contrasena')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            disabled={loading}
          />
          

          <label className="text-white/80 flex items-center gap-2 mb-4">
            <input type="checkbox" disabled={loading} /> {t('login.recuerdame')}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ff007a] text-white font-bold rounded-xl hover:bg-[#e6006e] transition disabled:opacity-50"
          >
            {loading ? t("login.loading") : t("login.boton_iniciar")}
          </button>

          <div className="text-center text-white/80 mt-6">
            {t('login.no_tienes_cuenta')}{" "}
            <button
              type="button"
              className="text-[#ff007a] underline"
              onClick={() => navigate("/home?auth=register")}
              disabled={loading}
            >
              {t('login.registrate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}