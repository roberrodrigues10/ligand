import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { User, Heart, X } from "lucide-react";
import logoproncipal from "../../imagenes/logoprincipal.png";

export default function SeleccionGenero() {
  const [genero, setGenero] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [nombreError, setNombreError] = useState("");
  const navigate = useNavigate();

  const handleContinue = (e) => {
    e.preventDefault();
    if (!genero) {
      setError("Por favor selecciona un rol");
      return;
    }
    setError(null);
    setShowModal(true);
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
      await api.get("/sanctum/csrf-cookie");
      await api.post("/api/asignar-rol", {
        rol: genero,
        nombre: nombre.trim(),
      });
      navigate("/homellamadas");
    } catch (err) {
      setError("Error al guardar el rol. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  return (
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
              Ingresa tu nombre 
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
  );
}
