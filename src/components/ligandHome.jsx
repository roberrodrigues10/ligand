import React, { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import pruebahistorias from './imagenes/pruebahistorias.jpg';
import logoproncipal from './imagenes/logoprincipal.png';
import LoginLigand from "./verificacion/login/loginligand";
import Register from "./verificacion/register/register";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Play, X, User, MessageCircle, Gift, Video } from "lucide-react";
import api from '../api/axios';
import { useTranslation } from 'react-i18next';
import LanguageSelector from "../components/languageSelector";
import { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiddenLoginModal } from "../components/admin/HiddenLoginModal.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ParlandomChatApp() {
  const { t, i18n } = useTranslation();
  useEffect(() => {
  const savedLang = localStorage.getItem("lang");
  if (savedLang && savedLang !== i18n.language) {
    i18n.changeLanguage(savedLang);
  }
  }, []);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const hasChecked = useRef(false); // 🔥 PREVENIR LOOPS

  const auth = searchParams.get("auth");
  const showLogin = auth === "login";
  const showRegister = auth === "register";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const intervalRef = useRef(null);
  const [historias, setHistorias] = useState([]);
  const [loadingHistorias, setLoadingHistorias] = useState(true)

  const cargarHistorias = async () => {
    try {
      setLoadingHistorias(true);
      console.log("🔄 Cargando historias desde BD...");
      
      // Datos de prueba como fallback
      const historiasPrueba = [
        { 
          id: 'prueba1', 
          nombre: "Mía", 
          estado: "activa", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        },
        { 
          id: 'prueba2', 
          nombre: "Emilia", 
          estado: "inactiva", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        },
        { 
          id: 'prueba3', 
          nombre: "Valentina", 
          estado: "activa", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        },
        { 
          id: 'prueba4', 
          nombre: "Sofía", 
          estado: "inactiva", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        },
        { 
          id: 'prueba5', 
          nombre: "Camila", 
          estado: "activa", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        }
      ];
      
      // Hacer la petición a tu API
      const response = await api.get(`${API_BASE_URL}/api/stories`);
      
      // Procesar los datos recibidos
      const historiasData = response.data.map(story => ({
        id: story.id,
        nombre: story.user?.name || 'Usuario',
        estado: story.user?.is_online ? "activa" : "inactiva",
        img: story.file_path ? `${API_BASE_URL}/storage/${story.file_path}` : pruebahistorias,
        image: story.file_path ? `${API_BASE_URL}/storage/${story.file_path}` : pruebahistorias,
        mime_type: story.mime_type,
        source_type: story.source_type,
        created_at: story.created_at,
        expires_at: story.expires_at,
        user_id: story.user_id
      }));
      
      // Si hay menos de 3 historias de la BD, completar con las de prueba
      let historiasFinales = [...historiasData];
      
      if (historiasFinales.length < 3) {
        const historiasNecesarias = 3 - historiasFinales.length;
        const historiasPruebaAUsar = historiasPrueba.slice(0, historiasNecesarias);
        historiasFinales = [...historiasFinales, ...historiasPruebaAUsar];
        console.log(`📝 Se agregaron ${historiasPruebaAUsar.length} historias de prueba (total disponible: ${historiasFinales.length})`);
      }
      
      setHistorias(historiasFinales);
      console.log("✅ Historias finales cargadas:", historiasFinales);
      
    } catch (error) {
      console.error("❌ Error cargando historias:", error);
      
      // Si hay error completo, usar solo datos de fallback
      const historiasPrueba = [
        { 
          id: 'prueba1', 
          nombre: "Mía", 
          estado: "activa", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        },
        { 
          id: 'prueba2', 
          nombre: "Emilia", 
          estado: "inactiva", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        },
        { 
          id: 'prueba3', 
          nombre: "Valentina", 
          estado: "activa", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        },
        { 
          id: 'prueba4', 
          nombre: "Sofía", 
          estado: "inactiva", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        },
        { 
          id: 'prueba5', 
          nombre: "Camila", 
          estado: "activa", 
          img: pruebahistorias, 
          image: pruebahistorias,
          mime_type: 'image/jpeg',
          source_type: 'upload'
        }
      ];
      
      setHistorias(historiasPrueba);
    } finally {
      setLoadingHistorias(false);
    }
  };

  // CARGAR HISTORIAS AL MONTAR EL COMPONENTE
  useEffect(() => {
    cargarHistorias();
  }, []);

  const visibleCards = 3;
  const delayMs = 5000;

  useEffect(() => {
    if (expandedIndex === null && historias.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % historias.length);
      }, delayMs);
    }
    return () => clearInterval(intervalRef.current);
  }, [expandedIndex, historias.length]); // Agregar historias.length como dependencia

  const handleExpand = (index) => {
    setExpandedIndex(index);
    clearInterval(intervalRef.current);
  };

  const handleClose = () => {
    console.log("🔴 Cerrando modal..."); // Para debugging
    setExpandedIndex(null);
    
    // Reiniciar el carrusel después de un pequeño delay
    setTimeout(() => {
      if (expandedIndex === null) { // Solo si realmente se cerró
        console.log("🔄 Reiniciando carrusel..."); // Para debugging
        intervalRef.current = setInterval(() => {
          setCurrentIndex((prevIndex) => {
            const newIndex = (prevIndex + 1) % historias.length;
            console.log("📍 Nuevo índice:", newIndex); // Para debugging
            return newIndex;
          });
        }, 5000);
      }
    }, 100);
  };

  // TAMBIÉN MODIFICA tu useEffect del carrusel para que sea más robusto:
  useEffect(() => {
    // Limpiar cualquier intervalo existente
    clearInterval(intervalRef.current);
    
    // Solo iniciar el carrusel si no hay modal expandido
    if (expandedIndex === null) {
      console.log("▶️ Iniciando carrusel automático..."); // Para debugging
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const newIndex = (prevIndex + 1) % historias.length;
          console.log("📍 Carrusel automático - nuevo índice:", newIndex);
          return newIndex;
        });
      }, 5000);
    } else {
      console.log("⏸️ Carrusel pausado - modal abierto"); // Para debugging
    }

    // Cleanup
    return () => {
      console.log("🧹 Limpiando intervalo...");
      clearInterval(intervalRef.current);
    };
  }, [expandedIndex]); // Depende de expandedIndex

  const getVisibleHistorias = () => {
    if (historias.length === 0) return [];
    
    const start = currentIndex;
    const end = (start + visibleCards) % historias.length;
    if (end > start) {
      return historias.slice(start, end);
    } else {
      return [...historias.slice(start), ...historias.slice(0, end)];
    }
  };

  const visibleHistorias = getVisibleHistorias();

  // Efecto para manejar la reproducción de videos en el carrusel
  useEffect(() => {
    // Reproducir TODOS los videos del carrusel
    const videos = document.querySelectorAll('video[data-carousel="true"]');
    videos.forEach((video) => {
      video.currentTime = 0;
      video.play().catch(console.log);
    });
  }, [currentIndex, expandedIndex, historias]); // Se ejecuta cuando cambia el índice, modal o historias

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

  // Función para manejar clicks de botones cuando no está logueado
  const handleButtonClick = (action) => {
    console.log(`🔄 Usuario no logueado intentando ${action}, redirigiendo a registro...`);
    navigate("/home?auth=register");
  };

  // 🔄 Mostrar loading mientras verifica
  if (loading || loadingHistorias) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white/80 mt-4">
            {loading ? "Verificando estado..." : "Cargando historias..."}
          </p>
        </div>
      </div>
    );
  }

  if (!loadingHistorias && historias.length === 0) {
    console.log("⚠️ No hay historias disponibles");
  }

  // ✅ Solo mostrar HOME si NO está logueado
  return (
    <div className="bg-ligand-mix-dark min-h-screen px-4">
      {/* Header para escritorio */}
      <header className="hidden sm:flex justify-between items-center p-3 gap-0">
        {/* Lado izquierdo */}
        <div className="flex items-center space-x-3">
        <span className="text-[19px] font-semibold" style={{ color: '#ff007a' }}>
          {t('idioma')}:
        </span>
        <LanguageSelector />
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
            {t('iniciarSesion')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#ff007a] text-white rounded-lg hover:bg-pink-600 transition text-base">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4" />
              <line x1="12" y1="17" x2="12" y2="17" />
            </svg>
            {t('ayuda')}
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
            {t('iniciarSesion')}
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#ff007a] text-white rounded-lg hover:bg-pink-600 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4" />
              <line x1="12" y1="17" x2="12" y2="17" />
            </svg>
            {t('ayuda')}
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex flex-col lg:flex-row items-start justify-between py-10 sm:py-12 max-w-7xl mx-auto gap-10">
        {/* Lado Izquierdo */}
        <div className="w-full lg:max-w-lg">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="font-pacifico text-fucsia text-8xl sm:text-11xl bg-backgroundDark rounded-lg">Ligand</h1>
            <p className="text-lg sm:text-4xl text-pink-200 mt-4 sm:mt-[30px] font-semibold italic">{t('frasePrincipal')}</p>
            
          </div>

          <div className="text-center mb-6">
            <button
              className="w-full py-3 sm:py-4 px-6 sm:px-8 rounded-full text-white font-bold text-base sm:text-xl bg-fucsia hover:bg-fucsia-400 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              onClick={() => navigate("/home?auth=register")}
            >
              {t('comenzar')}
            </button>
          </div>

          <div className="text-center mb-8">
            <p className="text-white text-sm sm:text-lg leading-relaxed">
              {t('subtitulo')}
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
                  {t(`genero.femenino`)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Lado derecho */}
        <div className="w-full lg:ml-16">
          <div className="text-center text-white italic text-xl sm:text-3xl mb-6 font-semibold">
            {t(`chicasRelevantes`)}
            
          </div>

        {/* Carrusel */}
        {/* Carrusel con Framer Motion - Manteniendo estructura flex original */}
        {historias.length > 0 ? (
          <div className="bg-gradient-to-b flex items-center justify-center">
            <div className="relative w-full max-w-full overflow-hidden py-8 px-2">
              <motion.div 
                className="flex justify-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <AnimatePresence mode="popLayout">
                  {visibleHistorias.map((historia, index) => {
                    const realIndex = historias.findIndex(h => h.id === historia.id);
                    const isCenter = index === 1;
                    const isExpanded = expandedIndex === realIndex;

                    return (
                      <motion.div
                        key={historia.id}
                        className={`relative cursor-pointer rounded-2xl overflow-hidden shadow-lg flex-shrink-0 ${
                          isExpanded
                            ? "z-40 fixed inset-0 w-screen rounded-none"
                            : "w-[150px] md:w-[180px] aspect-[9/16]"
                        } ${
                          isCenter && !isExpanded
                            ? "border-4 border-fuchsia-500 box-content" // box-content evita que el borde se meta encima del contenido
                            : ""
                        } ${
                          expandedIndex !== null && !isExpanded
                            ? "blur-sm pointer-events-none"
                            : ""
                        }`}
                        onClick={() => !isExpanded && isCenter && handleExpand(realIndex)}
                        
                        layout
                        layoutId={`card-${historia.id}`}
                        
                        initial={{ 
                          x: 150,
                          opacity: 0,
                          scale: 0.8
                        }}
                        animate={{ 
                          x: 0,
                          opacity: isCenter ? 1 : 0.6,
                          scale: isExpanded ? 1 : isCenter ? 1.1 : 0.95
                        }}
                        exit={{ 
                          x: -150,
                          opacity: 0,
                          scale: 0.8
                        }}
                        
                        transition={{
                          layout: {
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                            mass: 0.8
                          },
                          x: { 
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                            duration: 0.6
                          },
                          scale: {
                            type: "spring", 
                            stiffness: 400,
                            damping: 25,
                            duration: 0.4
                          },
                          opacity: { 
                            duration: 0.3,
                            ease: "easeInOut"
                          }
                        }}
                        
                        whileHover={!isExpanded && isCenter ? { 
                          scale: 1.15,
                          transition: { 
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                            duration: 0.2
                          }
                        } : {}}
                        
                        whileTap={!isExpanded && isCenter ? { 
                          scale: 1.05,
                          transition: { duration: 0.1 }
                        } : {}}

                        style={isExpanded ? {
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 50,
                          width: '100vw',
                          height: '100vh'
                        } : {}}
                      >
                        {!isExpanded ? (
                          // Vista normal de la tarjeta
                          <motion.div
                            className=" rounded-3xl shadow-2xl overflow-hidden"
                            style={{
                              width: 'min(100%, 70vw)',
                              aspectRatio: '9/16',
                              minWidth: '100%',
                              height: 'auto'
                            }}
                          >
                            {historia.mime_type?.startsWith("video") ? (
                              <video
                                key={`video-${historia.id}-${currentIndex}`}
                                src={historia.image}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                autoPlay
                                loop
                                preload="metadata"
                                data-carousel="true"
                                data-historia-id={historia.id}
                              />
                            ) : (
                              <img
                                src={historia.image}
                                alt={historia.nombre}
                                className="w-full h-full object-cover"
                              />
                            )}

                            {/* Estado */}
                            <div className={`absolute top-3 right-3 text-xs md:text-sm px-2 md:px-3 py-1 rounded-full font-semibold ${
                              historia.estado === "activa"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}>
                              {historia.estado === "activa" ? "Activa" : "Inactiva"}
                            </div>
                          </motion.div>
                        ) : (
                          // Vista expandida (modal) - Adaptada a los colores del sitio
                          <motion.div
                            className="relative w-full h-full flex items-center justify-center bg-ligand-mix-dark"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.7 }}
                          >
                            {/* Botón cerrar */}
                            <button
                              className="absolute top-6 right-6 text-white bg-black/40 p-3 rounded-full hover:bg-black/60 transition-all duration-300 z-50 backdrop-blur-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleClose();
                              }}
                            >
                              <X size={24} />
                            </button>

                            {/* Contenedor principal con flexbox responsive */}
                            <div className="flex items-center justify-center w-full h-full gap-8 px-4 md:px-8 flex-col md:flex-row py-20 md:py-8">
                              {/* Imagen con proporciones 9:16 */}
                              <motion.div className="relative w-[25%] h-full rounded-2xl overflow-hidden">
                              {historia.mime_type?.startsWith("video") ? (
                                <video
                                  key={`modal-video-${historia.id}`}
                                  src={historia.image}
                                  className="h-full object-cover mx-auto rounded-[12px]"
                                  muted
                                  playsInline
                                  autoPlay
                                  loop
                                  preload="metadata"
                                />
                              ) : (
                                <img
                                  src={historia.image}
                                  alt={historia.nombre}
                                  className="h-full object-cover mx-auto rounded-[12px]"
                                />
                              )}

                              {/* Estado (activa/inactiva) */}
                              <div className={`absolute bottom-2 right-2 z-40 text-xs px-2 py-1 rounded-full font-semibold ${
                                historia.estado === "activa"
                                  ? "bg-green-600 text-white"
                                  : "bg-red-600 text-white"
                              }`}>
                                {historia.estado === "activa" ? "Activa" : "Inactiva"}
                              </div>

                              {/* Nombre */}
                              <div className="absolute bottom-2 left-2 text-white text-sm font-semibold bg-black/50 px-2 py-1 rounded">
                                {historia.nombre}
                              </div>
                            </motion.div>
                              {/* Panel de información y botones */}
                              <motion.div
                                className="text-white space-y-4 md:space-y-6 max-w-sm md:max-w-md w-full px-4"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ 
                                  duration: 0.6, 
                                  ease: "easeOut",
                                  delay: 0.4
                                }}
                              >
                                <motion.div 
                                  className="text-2xl md:text-4xl font-bold text-center text-fucsia"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.6, duration: 0.5 }}
                                >
                                  {historia.nombre}
                                </motion.div>
                                
                                <motion.div 
                                  className="grid grid-cols-1 gap-4"
                                  initial={{ opacity: 0, y: 30 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.8, duration: 0.5 }}
                                >
                                  {/* Chatear */}
                                  <button 
                                    className="bg-fucsia hover:bg-pink-600 px-6 py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                                    onClick={() => handleButtonClick('chat')}
                                  >
                                    <MessageCircle size={24} /> Chatear
                                  </button>

                                  {/* Videollamada */}
                                  <button 
                                    className="bg-gradient-to-r from-fucsia to-pink-600 hover:from-pink-600 hover:to-pink-700 px-6 py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                                    onClick={() => handleButtonClick('videocall')}
                                  >
                                    <Video size={24} /> Videollamada
                                  </button>
                                </motion.div>
                              </motion.div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        ) : (
        <div className="text-center text-white/60 py-16">
          <p className="text-lg">No hay historias disponibles en este momento</p>
        </div>
      )}
        {/* Estilos CSS para las animaciones */}
        <style>{`
          @keyframes slideUp {
            from {
              transform: translateY(100px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes slideDown {
            from {
              transform: translateY(-50px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes slideIn {
            from {
              transform: translateX(100px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          /* Asegurar que las transiciones sean suaves */
          .transition-all {
            transition-property: all;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}</style>
      </div>
    </div>

      {/* Modales */}
      {showLogin && <LoginLigand onClose={() => navigate("/home")} />}
      {showRegister && <Register onClose={() => navigate("/home")} />}
      <HiddenLoginModal />
    </div>
  );
}
export const Dashboard = () => {
  return (
    <>
      <Header />
      <HiddenLoginModal />
      <main className="flex-1 flex flex-col">{/* etc... */}</main>
    </>
  );
};