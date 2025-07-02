import React from "react";

export default function Register() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#1a1c20] rounded-2xl p-10 w-[350px] shadow-xl">
        <h2 className="text-2xl text-[#ff007a] font-dancing-script text-center">
          ¡Crea tu cuenta!
        </h2>
        <p className="text-center text-white/80 mb-6">
          Regístrate para empezar a conectar
        </p>
        <form>
          <input
            type="email"
            placeholder="Correo electrónico"
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-3 mb-4 bg-[#1a1c20] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            required
          />
          <button
            type="submit"
            className="w-full py-3 bg-[#ff007a] text-white font-bold rounded-xl hover:bg-[#e6006e] transition"
          >
            Registrarse
          </button>
          <div className="text-center text-white/80 mt-6">
            ¿Ya tienes cuenta?{' '}
            <a href="#" className="text-[#ff007a] underline">
              Inicia sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
