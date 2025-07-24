// En tu archivo ligandHome.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import pruebahistorias from './imagenes/pruebahistorias.jpg';
import logoproncipal from './imagenes/logoprincipal.png';
import LoginLigand from "./verificacion/login/loginligand";
import Register from "./verificacion/register/register";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from '../api/axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ParlandomChatApp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const hasChecked = useRef(false); // 🔥 PREVENIR LOOPS

  const auth = searchParams.get("auth");
  const showLogin = auth === "login";
  const showRegister = auth === "register";

  // 🔍 VERIFICAR SI EL USUARIO YA ESTÁ LOGUEADO Y REDIRIGIR
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // 🔥 PREVENIR MÚLTIPLES EJECUCIONES
      if (hasChecked.current) {
        console.log('🛑 ligandHome: Ya se verificó el usuario, saltando...');
        return;
      }

      try {
        console.log("👤 Usuario detectado en HOME, verificando...");
        hasChecked.current = true; // 🔥 MARCAR INMEDIATAMENTE

        const res = await api.get(`${API_BASE_URL}/api/profile`);
        const user = res.data.user;

        console.log("👤 Usuario detectado en HOME, verificando...", user);

        // Si hay un usuario logueado
        if (user) {
          // 🎮 VERIFICAR PRIMERO SI HAY TOKEN DE VIDEOCHAT ACTIVO
          const sessionToken = sessionStorage.getItem('token');
          const sessionRoomName = sessionStorage.getItem('roomName');
          const sessionUserName = sessionStorage.getItem('userName');

          console.log("🎮 Verificando token de videochat:", {
            hasToken: !!sessionToken,
            roomName: sessionRoomName,
            userName: sessionUserName
          });

          // Si hay una sesión de videochat activa, forzar redirección
          if (sessionToken && sessionRoomName && sessionRoomName !== 'null' && sessionRoomName !== 'undefined') {
            console.log("🎥 Token de videochat activo detectado, forzando redirección...");
            
            if (user.rol === "cliente") {
              console.log("🎥 Redirigiendo cliente a videochat activo");
              navigate(`/videochatclient?roomName=${sessionRoomName}&userName=${sessionUserName}`, { replace: true });
              return;
            } else if (user.rol === "modelo") {
              console.log("🎥 Redirigiendo modelo a videochat activo");
              navigate(`/videochat?roomName=${sessionRoomName}&userName=${sessionUserName}`, { replace: true });
              return;
            }
          }

          // 📧 Email no verificado
          if (!user.email_verified_at) {
            console.log("📧 Redirigiendo a verificar email");
            navigate("/verificaremail", { replace: true });
            return;
          }

          // 👤 Perfil incompleto
          if (!user.rol || !user.name) {
            console.log("👤 Redirigiendo a completar perfil");
            navigate("/genero", { replace: true });
            return;
          }

          // 👨‍💼 Cliente
          if (user.rol === "cliente") {
            console.log("👨‍💼 Redirigiendo cliente a su home");
            navigate("/homecliente", { replace: true });
            return;
          }

          // 👩‍🎤 Modelo
          if (user.rol === "modelo") {
            const estado = user.verificacion?.estado;
            console.log("👩‍🎤 Modelo detectada, estado:", estado);

            switch (estado) {
              case null:
              case undefined:
              case "rechazada":
                navigate("/anteveri", { replace: true });
                break;
              case "pendiente":
                navigate("/esperando", { replace: true });
                break;
              case "aprobada":
                navigate("/homellamadas", { replace: true });
                break;
              default:
                navigate("/anteveri", { replace: true });
            }
            return;
          }
        }

        // Si no hay usuario logueado, mostrar la página HOME
        console.log("🔓 Usuario no logueado, mostrando HOME");
        setLoading(false);

      } catch (error) {
        // Si hay error (401, etc.), significa que no está logueado
        console.log("🔓 Usuario no autenticado, mostrando HOME");
        
        // 🔥 MANEJAR 429 SIN LOGOUT
        if (error.response?.status === 429) {
          console.warn('⚠️ Rate limited en ligandHome - manteniendo estado');
          setLoading(false);
          return;
        }
        
        setLoading(false);
      }
    };

    // 🔥 SOLO EJECUTAR UNA VEZ
    if (!hasChecked.current) {
      checkUserAndRedirect();
    }
  }, []); // Sin dependencias

  const todasLasChicas = [
    "Ana", "Lucía", "Sofía", "Camila", "Valentina", "Isabela", "Mía", "Emilia"
  ];
  const [startIndex, setStartIndex] = useState(0);

  const chicasMostradas = [
    todasLasChicas[startIndex % todasLasChicas.length],
    todasLasChicas[(startIndex + 1) % todasLasChicas.length],
    todasLasChicas[(startIndex + 2) % todasLasChicas.length],
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % todasLasChicas.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 🔄 Mostrar loading mientras verifica
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white/80 mt-4">Verificando estado...</p>
        </div>
      </div>
    );
  }

  // ✅ Solo mostrar HOME si NO está logueado
  return (
    <div className="bg-ligand-mix-dark min-h-screen px-4">
      {/* Header para escritorio */}
      <header className="hidden sm:flex justify-between items-center p-3 gap-0">
        {/* Lado izquierdo */}
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff007a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="text-2xl font-bold text-fucsia">Idioma</span>
        </div>

        {/* Centro */}
        <div className="flex items-center justify-center">
          <img src={logoproncipal} alt="Logo" className="w-16 h-16" />
          <span className="text-2xl text-zorrofucsia font-pacifico ml-[-5px]">Ligand</span>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center space-x-4">
          <button
            className="border text-white bg-fucsia border-fucsia px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors text-base"
            onClick={() => navigate("/home?auth=login")}
          >
            Iniciar Sesión
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#ff007a] text-white rounded-lg hover:bg-pink-600 transition text-base">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4" />
              <line x1="12" y1="17" x2="12" y2="17" />
            </svg>
            Ayuda
          </button>
        </div>
      </header>

      {/* Header solo para móvil */}
      <header className="flex sm:hidden flex-col gap-2 p-3">
        <div className="flex justify-between items-center">
          {/* Logo + Ligand */}
          <div className="flex items-center">
            <img src={logoproncipal} alt="Logo" className="w-10 h-10" />
            <span className="text-lg text-zorrofucsia font-pacifico ml-[-5px]">Ligand</span>
          </div>

          {/* Idioma */}
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff007a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="22" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="text-base font-bold text-fucsia">Idioma</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <button
            className="border text-white bg-fucsia border-fucsia px-3 py-1.5 rounded-lg hover:bg-pink-600 text-sm"
            onClick={() => navigate("/home?auth=login")}
          >
            Iniciar Sesión
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#ff007a] text-white rounded-lg hover:bg-pink-600 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4" />
              <line x1="12" y1="17" x2="12" y2="17" />
            </svg>
            Ayuda
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex flex-col lg:flex-row items-start justify-between py-10 sm:py-12 max-w-7xl mx-auto gap-10">
        {/* Lado Izquierdo */}
        <div className="w-full lg:max-w-lg">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="font-pacifico text-fucsia text-8xl sm:text-11xl bg-backgroundDark rounded-lg">Ligand</h1>
            <p className="text-lg sm:text-4xl text-pink-200 mt-4 sm:mt-[30px] font-semibold italic">¡Habla con extraños!</p>
          </div>

          <div className="text-center mb-6">
            <button
              className="w-full py-3 sm:py-4 px-6 sm:px-8 rounded-full text-white font-bold text-base sm:text-xl bg-fucsia hover:bg-fucsia-400 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              onClick={() => navigate("/home?auth=register")}
            >
              Comenzar a chatear
            </button>
          </div>

          <div className="text-center mb-8">
            <p className="text-white text-sm sm:text-lg leading-relaxed">
              Video chat con personas aleatorias<br />
              en línea al instante
            </p>
          </div>

          <div className="flex justify-center space-x-6">
            {['Femenino', 'Masculino'].map((gender) => (
              <label key={gender} className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input type="radio" name="gender" value={gender.toLowerCase()} className="sr-only" />
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-gray-400 group-hover:border-red-400 flex items-center justify-center transition-all duration-200" />
                </div>
                <span className="ml-2 sm:ml-3 text-sm sm:text-lg font-medium text-gray-300 transition-colors duration-200">
                  {gender}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Lado derecho */}
        <div className="w-full lg:w-auto lg:ml-16">
          <div className="text-center text-white italic text-xl sm:text-3xl mb-6 font-semibold">
            ¡Chicas Relevantes!
          </div>

          {/* Carrusel */}
          <div className="flex justify-center items-end space-x-4 sm:space-x-8 mt-16">
            {chicasMostradas.map((name, index) => (
              <div
                key={name}
                className={`relative w-24 h-36 sm:w-40 sm:h-60 md:w-48 md:h-72 rounded-2xl overflow-hidden shadow-lg ${index === 1 ? "translate-y-6 sm:translate-y-20" : ""}`}
              >
                <img
                  src={pruebahistorias}
                  alt={name}
                  className="object-cover w-full h-full" />
                <div className="absolute bottom-0 w-full bg-black bg-opacity-50 text-white px-2 py-1 text-xs sm:text-sm">
                  <div className="font-semibold">{name}</div>
                  <div className={index % 2 === 0 ? "text-green-400" : "text-gray-400"}>
                    {index % 2 === 0 ? "🟢 Activa" : "⚫ Inactiva"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modales */}
      {showLogin && <LoginLigand onClose={() => navigate("/home")} />}
      {showRegister && <Register onClose={() => navigate("/home")} />}
    </div>
  );
}