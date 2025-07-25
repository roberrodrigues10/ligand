import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "/src/utils/auth.js";
import { useTranslation } from "react-i18next"; // idioma

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState(""); // Solo se guarda, pero no se envía aún
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation(); // idioma

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    try {
      setLoading(true);
      await register(email, password); // Solo se envía email y password
      localStorage.setItem("emailToVerify", email); // 👉 Guardamos el email
      localStorage.setItem("passwordToVerify", password); // 👈 AÑADE ESTA LÍNEA
      navigate("/verificaremail");
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#1a1c20] rounded-2xl p-10 w-[350px] shadow-xl">
        <h2 className="text-2xl text-[#ff007a] font-dancing-script text-center">
          {t("register.title")} // idioma
        </h2>
        <p className="text-center text-white/80 mb-6">{t("register.subtitle")}</p> // idioma

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t("register.emailPlaceholder")} // idioma
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            required
          />

          <input
            type="password"
            placeholder={t("register.passwordPlaceholder")} // idioma
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            required
          />

          {error && (
            <div className="text-red-500 text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ff007a] text-white font-bold rounded-xl hover:bg-[#e6006e] transition disabled:opacity-50"
          >
            {loading ? t("register.loading") : t("register.button")} // idioma
          </button>

          <div className="text-center text-white/80 mt-6">
            {t("register.haveAccount")}{" "} // idioma
            <a href="#" className="text-[#ff007a] underline">
              {t("register.loginLink")} // idioma
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}