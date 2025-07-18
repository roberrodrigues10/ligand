import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "../api/axios"; // usa tu instancia con interceptor

const RutaSoloVisitantes = () => {
  const [redirect, setRedirect] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarUsuario = async () => {
      try {
        const { data } = await axios.get("/api/profile"); // token ya lo envía interceptor
        const rol = data?.user?.rol;

        if (rol === "cliente") {
          setRedirect("/homellamadas");
        } else if (rol === "modelo") {
          setRedirect("/anteveri"); // o donde quieras redirigir
        } else {
          setRedirect("/"); // por si el rol no es válido
        }
      } catch (error) {
        // No autenticado → dejarlo entrar
        setRedirect(null);
      } finally {
        setLoading(false);
      }
    };

    verificarUsuario();
  }, []);

  if (loading) return null; // o un spinner

  return redirect ? <Navigate to={redirect} replace /> : <Outlet />;
};

export default RutaSoloVisitantes;
