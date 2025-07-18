import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function RedirectSegunRol() {
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get("/api/profile");
        const user = res.data.user;
        const verificada = res.data.autorizado;

        if (user.rol === "model") {
          if (!verificada) {
            navigate("/verificacion");
          } else {
            navigate("/esperando"); // o el dashboard de la modelo
          }
        } else if (user.rol === "cliente") {
          navigate("/homellamadas");
        } else {
          navigate("/home");
        }
      } catch (err) {
        navigate("/home");
      }
    };

    check();
  }, [navigate]);

  return null;
}
