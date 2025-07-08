import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logoproncipal from "../../imagenes/logoprincipal.png";
import { verificarCodigo } from "../../../utils/auth"; // asegúrate de que este archivo exista
import { login } from "../../../utils/auth"; // Ajusta el path a donde esté tu auth.js

console.log("✅ Componente EmailVerification montado"); // este debe verse SIEMPRE

export default function EmailVerification() {
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
      setMessage("Por favor ingresa los 6 dígitos.");
      console.warn("Código incompleto:", fullCode);
      return;
    }

    const email = localStorage.getItem("emailToVerify");
    console.log("📧 Email desde localStorage:", email);
    console.log("🔢 Código a verificar:", fullCode);

    if (!email) {
      setMessage("No se encontró el correo registrado.");
      console.error("No se encontró 'emailToVerify' en localStorage.");
      return;
    }

    try {
      setMessage("Verificando...");
      const response = await verificarCodigo(email, fullCode);
      console.log("✅ Verificación exitosa:", response);

      const password = localStorage.getItem("passwordToVerify");
      console.log("🔐 Password desde localStorage:", password);
      await login(email, password);
      console.log("🔐 Password desde localStorage:", password);

      localStorage.removeItem("emailToVerify");
      localStorage.removeItem("passwordToVerify");

      setMessage("Correo verificado exitosamente.");
      navigate("/genero");
    } catch (error) {
      if (error.response && error.response.status === 422) {
        console.error("🔍 Errores de validación:", error.response.data.errors);
      } else {
        console.error("❌ Error al verificar código:", error);
      }
    }

  };

  const handleResend = () => {
    setResending(true);
    setMessage("Reenviando código...");
    console.log("📩 Reenviando código...");

    // Aquí podrías implementar el endpoint para reenviar el código
    setTimeout(() => {
      setResending(false);
      setMessage("Código reenviado al correo.");
      console.log("✅ Código reenviado");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0d10] to-[#131418] text-white flex flex-col items-center justify-center">
      {/* Logo + Nombre */}
      <div className="flex items-center justify-center mb-6">
        <img src={logoproncipal} alt="Logo" className="w-16 h-16 mr-[-5px]" />
        <span className="text-2xl text-fucsia font-pacifico">Ligand</span>
      </div>

      <div className="flex flex-col items-center bg-[#1f2228] p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-fucsia mb-4">
          Verificación de correo
        </h1>
        <p className="text-gray-300 mb-6 text-center">
          Ingresa el código que te enviamos a tu correo electrónico.
        </p>

        {/* 6 cuadros de código */}
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
          Verificar código
        </button>

        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-fucsia hover:underline disabled:opacity-50"
        >
          {resending ? "Reenviando..." : "¿No recibiste el código? Reenviar"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-gray-300 text-center">{message}</p>
        )}
      </div>
    </div>
  );
}