import { useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { getUser, reclamarSesion } from "../../../utils/auth";
import instance from "../../../api/axios";

const VerificarSesionActiva = () => {
  const yaPreguntado = useRef(false);
  const intervaloRef = useRef(null);
  const popupAbierto = useRef(false);
  const navigate = useNavigate();

  // Función para mostrar el popup de sesión duplicada
  const mostrarPopupSesionDuplicada = async () => {
    if (popupAbierto.current || yaPreguntado.current) return;

    yaPreguntado.current = true;
    popupAbierto.current = true;

    // Limpiar intervalo INMEDIATAMENTE
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }

    console.log("🔥 Mostrando popup de sesión duplicada");

    try {
      const resultado = await Swal.fire({
        title: "Sesión iniciada en otro dispositivo",
        text: "¿Deseas continuar aquí y cerrar la sesión en el otro dispositivo?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, continuar aquí",
        cancelButtonText: "No, cerrar sesión",
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: "#0a0d10",
        color: "#ffffff",
        iconColor: "#ff007a",
        confirmButtonColor: "#ff007a",
        cancelButtonColor: "#333333",
        customClass: {
          popup: "rounded-xl shadow-lg",
          confirmButton: "px-4 py-2 text-white font-semibold",
          cancelButton: "px-4 py-2 font-semibold",
        },
      });

      if (resultado.isConfirmed) {
        console.log("✅ Usuario eligió continuar aquí");
        
        // Marcar INMEDIATAMENTE que estamos reclamando
        localStorage.setItem("reclamando_sesion", "true");
        
        await manejarReclamacionSesion();
      } else {
        console.log("❌ Usuario eligió cerrar sesión");
        cerrarSesionCompleta();
      }
    } catch (error) {
      console.error("❌ Error al mostrar popup:", error);
      resetearEstado();
    }
  };

  // Función separada para manejar la reclamación
  const manejarReclamacionSesion = async () => {
    try {
      // Marcar que estamos reclamando ANTES de cualquier llamada
      localStorage.setItem("reclamando_sesion", "true");
      
      console.log("🔄 Iniciando reclamación de sesión...");
      console.log("🔍 Token antes de reclamar:", localStorage.getItem("token") ? "SÍ" : "NO");
      
      const nuevoToken = await reclamarSesion();
      
      if (nuevoToken) {
        console.log("✅ Nuevo token recibido");
        
        // Actualizar token en axios
        instance.defaults.headers.common["Authorization"] = `Bearer ${nuevoToken}`;
        
        // Verificar que funciona
        await getUser();
        console.log("✅ Token verificado - Sesión reclamada exitosamente");
        
        // Limpiar todo y resetear
        localStorage.removeItem("reclamando_sesion");
        resetearEstado();
        
        // Reiniciar verificación con delay
        setTimeout(() => {
          iniciarVerificacion();
        }, 2000);
        
      } else {
        throw new Error("No se recibió nuevo token");
      }
    } catch (error) {
      console.error("❌ Error al reclamar sesión:", error);
      cerrarSesionCompleta();
    }
  };

  // Función para cerrar sesión completa
  const cerrarSesionCompleta = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("reclamando_sesion");
    resetearEstado();
    navigate("/home?auth=login", { replace: true });
  };

  // Función para resetear estado
  const resetearEstado = () => {
    yaPreguntado.current = false;
    popupAbierto.current = false;
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  };

  // Verificación principal - MÁS SIMPLE Y DIRECTA
  const verificar = async () => {
    // Saltar verificación en casos específicos
    if (deberíaSaltarVerificacion()) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.log("🔍 No hay token - Usuario no autenticado");
      return;
    }

    console.log("🔍 Verificando sesión activa...");

    try {
      await getUser();
      console.log("✅ Usuario autenticado correctamente");
      // Todo bien, no hacer nada
    } catch (error) {
      console.log("❌ Error al verificar usuario:", error);
      
      const status = error?.response?.status;
      const codigo = error?.response?.data?.code;
      const mensaje = error?.response?.data?.message || "";

      // 🔥 DETECCIÓN ESPECÍFICA DE SESIÓN DUPLICADA
      if (status === 401 && codigo === 'SESSION_DUPLICATED') {
        console.log("🔥 SESIÓN DUPLICADA CONFIRMADA - Mostrando popup");
        
        // Mostrar popup INMEDIATAMENTE
        setTimeout(() => {
          mostrarPopupSesionDuplicada();
        }, 100);
      } 
      // Si es otro tipo de error 401/403, cerrar sesión
      else if (status === 401 || status === 403) {
        console.log("❌ Error de autenticación general - Cerrando sesión");
        cerrarSesionCompleta();
      }
    }
  };

  // Función para determinar si debe saltar la verificación
  const deberíaSaltarVerificacion = () => {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const isAuthLogin = pathname === "/home" && searchParams.get("auth") === "login";
    const estamosReclamando = localStorage.getItem("reclamando_sesion") === "true";
    const popupYaMostrado = popupAbierto.current || yaPreguntado.current;

    if (isAuthLogin) {
      console.log("🔍 Saltando verificación - Usuario en login");
      return true;
    }

    if (estamosReclamando) {
      console.log("🔍 Saltando verificación - Reclamando sesión");
      return true;
    }

    if (popupYaMostrado) {
      console.log("🔍 Saltando verificación - Popup ya mostrado");
      return true;
    }

    return false;
  };

  // Función para iniciar verificación
  const iniciarVerificacion = () => {
    console.log("🚀 Iniciando verificación de sesión");
    
    // Verificación inmediata
    setTimeout(() => {
      verificar();
    }, 500); // Reducido de 1000ms a 500ms
    
    // Intervalo cada 8 segundos (reducido de 10)
    if (!intervaloRef.current) {
      intervaloRef.current = setInterval(verificar, 8000);
    }
  };

  useEffect(() => {
    iniciarVerificacion();

    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
      // Limpiar bandera solo si no estamos reclamando
      if (localStorage.getItem("reclamando_sesion") !== "true") {
        localStorage.removeItem("reclamando_sesion");
      }
    };
  }, [navigate]);

  return null;
};

export default VerificarSesionActiva;