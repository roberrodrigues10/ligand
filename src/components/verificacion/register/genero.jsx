import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { User, Heart, X } from "lucide-react";
import logoproncipal from "../../imagenes/logoprincipal.png";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import { ProtectedPage } from '../../hooks/usePageAccess'; // Asegúrate de que esta ruta sea correcta

export default function SeleccionGenero() {
  const [genero, setGenero] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [nombreError, setNombreError] = useState("");
  const navigate = useNavigate();

  const handleContinue = async (e) => {
    e.preventDefault();

    if (!genero) {
      setError("Por favor selecciona un rol");
      return;
    }

    setError(null);
    setShowModal(true); // Mostrar modal tanto para cliente como modelo
  };

  const validarNombreYEnviar = async () => {
  const soloLetras = /^[A-Za-z\s]+$/;

  if (!nombre.trim()) {
    setNombreError("El nombre es obligatorio.");
    return;
  }

  if (!soloLetras.test(nombre)) {
    setNombreError("Solo se permiten letras.");
    return;
  }

  setNombreError("");
  setCargando(true);

  try {
    console.log("📤 Enviando nombre y rol a backend...");
    await api.post(`${API_BASE_URL}/api/asignar-rol`, {
      rol: genero,
      name: nombre.trim(),
    });

    console.log("✅ Rol asignado exitosamente. Esperando para actualizar perfil...");

    // Esperar unos milisegundos para que el backend persista los cambios
    await new Promise((r) => setTimeout(r, 300));

    // Función de retry para asegurar que el perfil ya esté actualizado
    let user = null;
    let intentos = 0;
    let actualizado = false;

    while (intentos < 3 && !actualizado) {
      const res = await api.get(`${API_BASE_URL}/api/profile`, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      user = res.data.user;
      console.log(`🔄 Intento ${intentos + 1} - Perfil obtenido:`, user);

      if (user.rol && user.name) {
        actualizado = true;
        break;
      }

      await new Promise((r) => setTimeout(r, 300)); // espera antes de reintentar
      intentos++;
    }

    if (!actualizado) {
      console.warn("⚠️ El perfil aún no refleja los cambios. Redirección cancelada.");
      setError("No se pudo confirmar los datos. Intenta nuevamente.");
      return;
    }

    // ✅ Guardar flag local (opcional)
    sessionStorage.setItem("perfil_actualizado", "1");

    // ✅ Refresca header de token por seguridad
    api.defaults.headers.common["Authorization"] = `Bearer ${sessionStorage.getItem("token")}`;

    // ✅ Cierra modal
    setShowModal(false);

    // ✅ Redirección
    const destino = genero === "modelo" ? "/anteveri" : "/homellamadas";
    console.log("👉 Navegando a:", destino);
    navigate(destino);
    console.log("✅ Redirección ejecutada");

    // ⚠️ Fallback: fuerza recarga si la redirección visual no ocurre
    setTimeout(() => {
      if (window.location.pathname !== destino) {
        console.warn("⚠️ Redirección no aplicada visualmente. Recargando...");
        window.location.href = destino;
      }
    }, 400);

  } catch (err) {
    console.error("❌ Error al guardar rol o al obtener perfil:", err);
    setError("Error al guardar el rol. Intenta nuevamente.");
  } finally {
    setCargando(false);
  }
};


  return (
    <ProtectedPage requiredConditions={{
      emailVerified: true,       // Email debe estar verificado
      profileComplete: false     // Perfil debe estar INCOMPLETO (sin rol o nombre)
    }}>
    <div className="min-h-screen flex flex-col items-center justify-center bg-ligand-mix-dark text-white px-4 py-10">
      {/* Logo */}
      <div className="flex items-center justify-center mb-6">
        <img src={logoproncipal} alt="Logo" className="w-16 h-16 mr-[-5px]" />
        <span className="text-2xl text-fucsia font-pacifico">Ligand</span>
      </div>

      <h1 className="text-2xl font-bold mb-8 text-center">¿Qué género eres?</h1>

      <form onSubmit={handleContinue} className="w-full max-w-2xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <label
            className={`rounded-2xl p-6 flex flex-col items-center justify-center border-2 cursor-pointer transition ${
              genero === "modelo"
                ? "border-fucsia bg-[#2d2f33]"
                : "border-gray-600 bg-[#1f2125] hover:border-fucsia"
            }`}
          >
            <Heart size={40} className="text-fucsia mb-3" />
            <span className="text-lg font-semibold">Mujer</span>
            <input
              type="radio"
              name="rol"
              value="modelo"
              checked={genero === "modelo"}
              onChange={(e) => setGenero(e.target.value)}
              className="hidden"
            />
          </label>

          <label
            className={`rounded-2xl p-6 flex flex-col items-center justify-center border-2 cursor-pointer transition ${
              genero === "cliente"
                ? "border-fucsia bg-[#2d2f33]"
                : "border-gray-600 bg-[#1f2125] hover:border-fucsia"
            }`}
          >
            <User size={40} className="text-fucsia mb-3" />
            <span className="text-lg font-semibold">Hombre</span>
            <input
              type="radio"
              name="rol"
              value="cliente"
              checked={genero === "cliente"}
              onChange={(e) => setGenero(e.target.value)}
              className="hidden"
            />
          </label>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-fucsia py-3 rounded-xl text-white font-bold hover:bg-pink-600 transition disabled:opacity-50"
        >
          {cargando ? "Guardando..." : "Continuar"}
        </button>
      </form>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1f2228] p-6 rounded-2xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-fucsia mb-4 text-center">
              {genero === "cliente"
                ? "Ingresa tu nombre"
                : "Ingresa tu nombre artístico"}
            </h2>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-4 py-2 rounded-lg bg-[#0a0d10] border border-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-fucsia"
            />

            {nombreError && (
              <p className="text-red-500 text-sm mt-2">{nombreError}</p>
            )}

            <div className="flex justify-end mt-6 space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-300 hover:underline"
              >
                Cancelar
              </button>
              <button
                onClick={validarNombreYEnviar}
                className="bg-fucsia hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedPage>
  );
}
