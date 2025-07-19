import React, { useEffect, useState, useRef } from "react";
import { Lock, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../../header";
import api from "../../../api/axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function EsperandoVerificacion() {
  const [estadoVerificacion, setEstadoVerificacion] = useState("pendiente");
  const [mensaje, setMensaje] = useState("");
  const [redirigiendo, setRedirigiendo] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  
  const navigate = useNavigate();
  const intervalRef = useRef(null);
  const isCheckingRef = useRef(false);

  const verificarEstado = async () => {
    // Evitar múltiples verificaciones simultáneas
    if (isCheckingRef.current || redirigiendo || rateLimited) return;
    
    isCheckingRef.current = true;

    try {
      const response = await api.get(`${API_BASE_URL}/api/verificacion/estado`);
      const { estado, mensaje: mensajeApi } = response.data;
      
      console.log("Estado recibido:", estado); // Debug
      
      setEstadoVerificacion(estado);
      setMensaje(mensajeApi || "");
      setRateLimited(false);

      // Redirigir según el estado
      if (estado === "aprobada") {
        console.log("Verificación aprobada, iniciando redirección..."); // Debug
        setRedirigiendo(true);
        
        // Limpiar interval inmediatamente
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // AQUÍ ESTABA EL PROBLEMA - FALTABA LA REDIRECCIÓN
        setTimeout(() => {
          console.log("Redirigiendo al dashboard..."); // Debug
          navigate("/dashboard"); // O la ruta que corresponda para usuarios verificados
        }, 2000);
        
      } else if (estado === "rechazada") {
        console.log("Verificación rechazada, iniciando redirección..."); // Debug
        setRedirigiendo(true);
        
        // Limpiar interval inmediatamente
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Redirigir después de un momento
        setTimeout(() => {
          console.log("Redirigiendo a verificación..."); // Debug
          navigate("/verificacion-identidad");
        }, 3000);
      }
      
    } catch (error) {
      console.error("Error al verificar estado:", error);
      
      if (error.response?.status === 429) {
        console.log("Rate limit alcanzado, pausando verificaciones por 2 minutos...");
        setRateLimited(true);
        
        setTimeout(() => {
          setRateLimited(false);
        }, 120000);
      } else {
        // Manejar otros errores
        console.error("Error de verificación:", error.message);
        setMensaje("Error al verificar el estado. Reintentando...");
      }
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Función para inicializar verificaciones
    const inicializar = async () => {
      if (!mounted) return;
      
      console.log("Inicializando verificación..."); // Debug
      
      // Primera verificación después de 1 segundo
      setTimeout(() => {
        if (mounted && !redirigiendo) {
          verificarEstado();
        }
      }, 1000);

      // Configurar polling cada 10 segundos (cambiado de 30s)
      intervalRef.current = setInterval(() => {
        if (mounted && !redirigiendo && !rateLimited) {
          console.log("Verificando estado automáticamente..."); // Debug
          verificarEstado();
        }
      }, 10000);
    };

    inicializar();

    // Cleanup function
    return () => {
      console.log("Limpiando componente..."); // Debug
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Solo se ejecuta una vez

  // Limpiar interval cuando se inicia redirección
  useEffect(() => {
    if (redirigiendo && intervalRef.current) {
      console.log("Limpiando interval por redirección..."); // Debug
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [redirigiendo]);

  const getIconoEstado = () => {
    switch (estadoVerificacion) {
      case "aprobada":
        return <CheckCircle size={48} color="#10b981" strokeWidth={2.2} />;
      case "rechazada":
        return <XCircle size={48} color="#ef4444" strokeWidth={2.2} />;
      default:
        return <Lock size={48} color="#ffffff" strokeWidth={2.2} />;
    }
  };

  const getTituloEstado = () => {
    switch (estadoVerificacion) {
      case "aprobada":
        return "¡Verificación aprobada!";
      case "rechazada":
        return "Verificación rechazada";
      default:
        return "Esperando verificación";
    }
  };

  const getMensajeEstado = () => {
    switch (estadoVerificacion) {
      case "aprobada":
        return mensaje || "Tu cuenta ha sido verificada exitosamente. Serás redirigido en unos segundos...";
      case "rechazada":
        return mensaje || "Tu verificación fue rechazada. Por favor, intenta nuevamente con documentos más claros.";
      default:
        return "Gracias por registrarte.\nTe notificaremos cuando ya estés verificada.";
    }
  };

  const getColorTitulo = () => {
    switch (estadoVerificacion) {
      case "aprobada":
        return "text-green-400";
      case "rechazada":
        return "text-red-400";
      default:
        return "text-white";
    }
  };

  const getColorBoton = () => {
    switch (estadoVerificacion) {
      case "aprobada":
        return "bg-green-600";
      case "rechazada":
        return "bg-red-600";
      default:
        return "bg-[#ff007a]";
    }
  };

  const getTextoBoton = () => {
    switch (estadoVerificacion) {
      case "aprobada":
        return redirigiendo ? "Accediendo..." : "Verificación completada";
      case "rechazada":
        return redirigiendo ? "Redirigiendo..." : "Intentar nuevamente";
      default:
        return "En proceso de verificación";
    }
  };

  const handleBotonClick = () => {
    if (estadoVerificacion === "rechazada" && !redirigiendo) {
      console.log("Redirección manual iniciada..."); // Debug
      setRedirigiendo(true);
      
      // Limpiar interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      navigate("/verificacion-identidad");
    }
  };

  // Función para debugging - puedes llamarla desde la consola del navegador
  window.debugVerificacion = () => {
    console.log({
      estadoVerificacion,
      redirigiendo,
      rateLimited,
      intervalActive: !!intervalRef.current,
      isChecking: isCheckingRef.current
    });
  };

  return (
    <div className="min-h-screen bg-ligand-mix-dark flex flex-col">
      
      {/* Header fijo arriba */}
      <Header />

      {/* Contenido centrado */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 text-center">
        {/* Título estilizado Ligand */}
        <h1 className="font-pacifico text-fucsia text-9xl bg-backgroundDark rounded-lg">
          Ligand
        </h1>

        {/* Subtítulo dinámico */}
        <h2 className={`text-5xl font-semibold mb-5 mt-4 ${getColorTitulo()}`}>
          {getTituloEstado()}
        </h2>

        {/* Mensaje dinámico */}
        <p className="text-white/70 text-base mb-8 leading-relaxed whitespace-pre-line">
          {getMensajeEstado()}
        </p>

        {/* Icono dinámico */}
        <div className="p-4 rounded-full mb-10">
          {getIconoEstado()}
        </div>

        {/* Indicador de estado en tiempo real */}
        {!redirigiendo && (
          <div className="mb-4">
            <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
              <div className={`w-2 h-2 rounded-full ${rateLimited ? 'bg-yellow-500' : 'bg-[#ff007a] animate-pulse'}`}></div>
              {rateLimited ? 'Esperando para verificar...' : 'Verificando estado...'}
            </div>
          </div>
        )}

        {/* Botón dinámico */}
        <button
          onClick={handleBotonClick}
          disabled={estadoVerificacion === "pendiente" || estadoVerificacion === "aprobada" || redirigiendo}
          className={`${getColorBoton()} text-white text-base font-semibold py-3 px-6 rounded-full ${
            estadoVerificacion === "pendiente" || estadoVerificacion === "aprobada" || redirigiendo
              ? "opacity-95 cursor-not-allowed" 
              : "hover:opacity-90 cursor-pointer"
          } transition-all duration-300`}
        >
          {getTextoBoton()}
        </button>

        {/* Mensaje adicional para rechazada */}
        {estadoVerificacion === "rechazada" && !redirigiendo && (
          <p className="text-red-400 text-sm mt-4">
            Serás redirigido al proceso de verificación en 3 segundos...
          </p>
        )}

        {/* Mensaje adicional para aprobada */}
        {estadoVerificacion === "aprobada" && !redirigiendo && (
          <p className="text-green-400 text-sm mt-4">
            Redirigiendo a tu dashboard en 2 segundos...
          </p>
        )}

        {/* Indicador de redirección */}
        {redirigiendo && (
          <p className="text-blue-400 text-sm mt-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            Redirigiendo...
          </p>
        )}
      </div>
    </div>
  );
}