import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "/src/utils/auth.js";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslation } from "react-i18next"; // idioma

const RECAPTCHA_SITE_KEY = "6LfNonwrAAAAAIgJSmx1LpsprNhNct1VVWMWp2rz";

export default function Register({ onClose, onShowLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recaptchaToken, setCaptchaToken] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation(); // idioma

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t("register.errorFields"));
      return;
    }

    // Si activas CAPTCHA:
    // if (!recaptchaToken) {
    //   setError(t("register.errorCaptcha"));
    //   return;
    // }

    try {
      setLoading(true);
      await register(email, password, recaptchaToken);
      localStorage.setItem("emailToVerify", email);
      navigate("/verificaremail", { state: { email } });
    } catch (err) {
      console.error(err);
      setError(t("register.errorGeneric"));
    } finally {
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
        {/* Botón de cerrar */}
        <button
          className="absolute top-3 right-4 text-white text-xl hover:text-[#ff007a] transition"
          onClick={onClose}
        >
          ×
        </button>

        <h2 className="text-2xl text-[#ff007a] font-dancing-script text-center">
          {t("register.title")}
        </h2>
        <p className="text-center text-white/80 mb-6">
          {t("register.subtitle")}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t("register.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            required
          />

          <input
            type="password"
            placeholder={t("register.passwordPlaceholder")}
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

          {/* reCAPTCHA opcional */}
          {/* <div className="mb-4 flex justify-center">
            <ReCAPTCHA
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={(token) => setCaptchaToken(token)}
            />
          </div> */}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ff007a] text-white font-bold rounded-xl hover:bg-[#e6006e] transition disabled:opacity-50"
          >
            {loading ? t("register.loading") : t("register.button")}
          </button>

          <div className="text-center text-white/80 mt-6">
            {t("register.haveAccount")}{" "}
            <button
              type="button"
              className="text-[#ff007a] underline"
              onClick={() => navigate("/home?auth=login")}
            >
              {t("register.loginLink")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
