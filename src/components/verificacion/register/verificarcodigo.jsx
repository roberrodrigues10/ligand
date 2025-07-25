import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // idioma
import logoproncipal from "../../imagenes/logoprincipal.png";
import { verificarCodigo, login } from "../../../utils/auth";

console.log("✅ Componente EmailVerification montado");

export default function EmailVerification() {
  const { t } = useTranslation(); // idioma
  const navigate = useNavigate();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const inputsRef = useRef([]);

  const handleChange = (value, index) => {
    if (/^[0-9]?$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      if (value && index < 5) {
        inputsRef.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (code[index]) {
        const newCode = [...code];
        newCode[index] = "";
        setCode(newCode);
      } else if (index > 0) {
        inputsRef.current[index - 1].focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleVerify = async () => {
    console.log("🔍 handleVerify se ejecutó");
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setMessage(t("verification.enter6digits")); // idioma
      console.warn("Código incompleto:", fullCode);
      return;
    }

    const email = localStorage.getItem("emailToVerify");
    if (!email) {
      setMessage(t("verification.emailNotFound"));
      console.error("No se encontró 'emailToVerify' en localStorage."); // idioma
      return;
    }

    try {
      setMessage(t("verification.verifying")); // idioma
      const response = await verificarCodigo(email, fullCode);
      console.log("✅ Verificación exitosa:", response);

      const password = localStorage.getItem("passwordToVerify");
      await login(email, password);

      localStorage.removeItem("emailToVerify");
      localStorage.removeItem("passwordToVerify");

      setMessage(t("verification.success")); // idioma
      navigate("/genero");
    } catch (error) {
      if (error.response?.status === 422) {
        console.error("🔍 Errores de validación:", error.response.data.errors);
      } else {
        console.error("❌ Error al verificar código:", error);
        setMessage(t("verification.error")); // idioma
      }
    }
  };

  const handleResend = () => {
    setResending(true);
    setMessage(t("verification.resending")); // idioma
    console.log("📩 Reenviando código...");

    setTimeout(() => {
      setResending(false);
      setMessage(t("verification.codeResent")); // idioma
      console.log("✅ Código reenviado");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex flex-col items-center justify-center">
      <div className="flex items-center justify-center mb-6">
        <img src={logoproncipal} alt="Logo" className="w-16 h-16 mr-[-5px]" />
        <span className="text-2xl text-fucsia font-pacifico">Ligand</span>
      </div>

      <div className="flex flex-col items-center bg-[#1f2228] p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-fucsia mb-4">
          {t("verification.title")} // idioma
        </h1>
        <p className="text-gray-300 mb-6 text-center">
          {t("verification.instructions")} // idioma
        </p>

        <div className="flex gap-2 mb-6">
          {code.map((digit, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(el) => (inputsRef.current[index] = el)}
              className="w-12 h-12 text-center text-xl bg-[#0a0d10] border border-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-fucsia"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          className="bg-fucsia hover:bg-pink-600 transition-colors text-white font-semibold px-6 py-2 rounded-2xl mb-4 w-full"
        >
          {t("verification.buttonVerify")} // idioma
        </button>

        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-fucsia hover:underline disabled:opacity-50"
        >
          {resending
            ? t("verification.resendingShort")// idioma
            : t("verification.resend")} // idioma
        </button>

        {message && (
          <p className="mt-4 text-sm text-gray-300 text-center">{message}</p>
        )}
      </div>
    </div>
  );
}