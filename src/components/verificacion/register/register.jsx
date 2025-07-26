import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "/src/utils/auth.js";
import { useTranslation } from "react-i18next";

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "El correo es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "El correo no es válido.";
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria.";
    } else if (password.length < 7) {
      newErrors.password = "La contraseña debe tener al menos 7 caracteres.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      await register(email, password);
      localStorage.setItem("emailToVerify", email);
      localStorage.setItem("passwordToVerify", password);
      navigate("/verificaremail");
    } catch (err) {
      console.error(err);
      setErrors({ general: "Ocurrió un error. Inténtalo nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#1a1c20] rounded-2xl p-10 w-[350px] shadow-xl">
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
            className="w-full p-3 mb-2 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
          />
          {errors.email && <p className="text-red-500 text-sm mb-2">{errors.email}</p>}

          <input
            type="password"
            placeholder={t("register.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-2 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
          />
          {errors.password && <p className="text-red-500 text-sm mb-2">{errors.password}</p>}

          {errors.general && (
            <div className="text-red-500 text-sm mb-4 text-center">
              {errors.general}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ff007a] text-white font-bold rounded-xl hover:bg-[#e6006e] transition disabled:opacity-50"
          >
            {loading ? t("register.loading") : t("register.button")}
          </button>

          <div className="text-center text-white/80 mt-6">
            {t("register.haveAccount")}{" "}
            <a href="#" className="text-[#ff007a] underline">
              {t("register.loginLink")}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}