import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "../api/axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function RutaProtegidaModelo() {
  const [cargando, setCargando] = useState(true);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const verificar = async () => {
      try {
        const res = await api.get(`${API_BASE_URL}/api/profile`);
        const usuario = res.data.user;

        if (usuario.rol === "modelo") {
          setUser(usuario);
        }
      } catch {
        setUser(null);
      } finally {
        setCargando(false);
      }
    };

    verificar();
  }, []);

  if (cargando) return <div className="text-white">Cargando...</div>;
  if (!user) return <Navigate to="/home" replace />;

  const pasosRestringidos = ["/verificar-email", "/genero", "/nombre"];

  // 🚫 Redirección si ya completó ciertos pasos
  if (
    pasosRestringidos.includes(location.pathname) &&
    user.email_verified_at &&
    user.rol &&
    user.nombre &&
    user.estado === "aprobada"
  ) {
    return <Navigate to="/homellamadas" replace />;
  }

  // ✅ REGLA: Si NO ha enviado nada de verificación (verificacion_estado == null)
  if (!user.estado) {
  const rutasPermitidas = ["/anteveri", "/verificacion"];
  if (!rutasPermitidas.includes(location.pathname)) {
    return <Navigate to="/anteveri" replace />;
    }
    }

  // 🔒 REGLA: Si está en estado pendiente
    if (user.verificacion?.estado === "pendiente") {
    if (location.pathname !== "/esperando") {
      return <Navigate to="/esperando" replace />;
    }
  }

  return <Outlet />;
}
