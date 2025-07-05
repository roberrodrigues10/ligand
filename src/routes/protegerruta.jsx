import { useEffect, useState } from "react";
import { useLocation, Navigate, Outlet } from "react-router-dom";
import api from "../api/axios";

export default function RutaProtegida() {
  const [estadoVerificacion, setEstadoVerificacion] = useState(null);
  const [autenticado, setAutenticado] = useState(true);
  const [cargando, setCargando] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verificar = async () => {
      try {
        await api.get("/sanctum/csrf-cookie");
        const res = await api.get("/api/verificacion/estado");
        setEstadoVerificacion(res.data.estado);
        setAutenticado(true);
      } catch (error) {
        if (error.response?.status === 401) {
          setAutenticado(false);
        } else {
          console.error("❌ Error al obtener estado de verificación:", error);
        }
      } finally {
        setCargando(false);
      }
    };

    verificar();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="loader mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/home" replace />;
  }

  const rutaActual = location.pathname;

  // 🔁 Si está en pendiente, redirigir siempre a /esperando excepto si ya está ahí
  if (estadoVerificacion === "pendiente" && rutaActual !== "/esperando") {
    return <Navigate to="/esperando" replace />;
  }

  // ✅ Si está aprobado y está en alguna ruta restringida, redirigir a homellamadas
  if (
    estadoVerificacion === "aprobado" &&
    ["/verificacion", "/anteveri", "/esperando"].includes(rutaActual)
  ) {
    return <Navigate to="/homellamadas" replace />;
  }

  // ⛔ Si está sin verificar o rechazado y trata de ir a algo que no sea permitido
  if (
    (estadoVerificacion === null || estadoVerificacion === "rechazada") &&
    !["/", "/home", "/verificacion"].includes(rutaActual)
  ) {
    return <Navigate to="/verificacion" replace />;
  }

  return <Outlet />;
}
