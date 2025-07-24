import React from "react";
import { MessageSquare, Star, Home, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "./headercliente";
import { ProtectedPage } from '../usePageAccess'; // Asegúrate de que esta ruta sea correcta

export default function InterfazCliente() {
  const usuarios = [
    { nombre: "SofiSweet", estado: "Online", inicial: "S" },
    { nombre: "Mia88", estado: "Online", inicial: "M" },
    { nombre: "ValentinaXX", estado: "Desconectado", inicial: "V" },
  ];

  const historial = [
    { nombre: "SofiSweet", accion: "Llamada finalizada", hora: "Hoy, 11:12 AM" },
    { nombre: "Mia88", accion: "Te envió un mensaje", hora: "Hoy, 8:45 AM" },
    { nombre: "ValentinaXX", accion: "Agregada a favoritos", hora: "Ayer, 9:30 PM" },
  ];

  const navigate = useNavigate();

  return (
    <ProtectedPage requiredConditions={{
      emailVerified: true,      // Solo usuarios con email verificado
      profileComplete: true,    // Solo usuarios con perfil completo
      role: "cliente",         // Solo clientes (no modelos)
      blockIfInCall: true      // Bloquear si está en videollamada
    }}>
    <div className="min-h-screen bg-ligand-mix-dark from-[#1a1c20] to-[#2b2d31] text-white p-6">
      {/* Header con contador de minutos y botón comprar */}
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Panel central */}
        <main className="lg:col-span-3 bg-[#1f2125] rounded-2xl p-8 shadow-xl flex flex-col items-center">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 mt-16">
            ¡Hola! ¿Listo para tu próxima conexión?
          </h2>
          <p className="text-center text-white/70 mb-8 max-w-md">
            Da click en el botón de abajo para comenzar una videollamada aleatoria con una modelo en línea.
          </p>

          {/* Botones verticales */}
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <button
              className="w-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-8 py-4 rounded-full text-lg font-semibold shadow-md transition"
              onClick={() => navigate("/esperandocallcliente")}
            >
              Iniciar Videollamada
            </button>

            <button
              className="w-full bg-[#ffe4f1] text-[#4b2e35] px-8 py-4 rounded-full text-lg font-semibold shadow-md "
              onClick={() => navigate("/comprar-minutos")}
            >
              Comprar Minutos
            </button>

            {/* Consejo del día */}
            <div className="w-full bg-[#2b2d31] border border-[#ff007a]/30 rounded-xl p-4 text-center mt-2">
              <p className="text-white text-sm mb-1 font-semibold">💡 Consejo del día:</p>
              <p className="text-white/70 text-sm italic">
                Sé auténtico. Las mejores conexiones nacen de una sonrisa genuina.
              </p>
            </div>
          </div>
        </main>

        {/* Panel lateral derecho */}
        <aside className="flex flex-col gap-6">
          {/* Usuarios activos */}
          <section className="bg-[#2b2d31] rounded-2xl p-5 shadow-lg">
            <h3 className="text-lg font-bold text-[#ff007a] mb-4">Modelos Activas</h3>
            <div className="space-y-3">
              {usuarios.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-[#1f2125] p-3 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#ff007a] flex items-center justify-center font-bold text-sm">
                      {user.inicial}
                    </div>
                    <div>
                      <div className="font-semibold">{user.nombre}</div>
                      <div
                        className={`text-xs ${
                          user.estado === "Online"
                            ? "text-green-400"
                            : "text-gray-400"
                        }`}
                      >
                        {user.estado}
                      </div>
                    </div>
                  </div>
                  {/* Íconos de acciones */}
                  <div className="flex items-center gap-3">
                    <Phone
                      size={18}
                      className="text-[#ff007a] hover:text-white transition cursor-pointer"
                      onClick={() => navigate("/homellamadas")}
                    />
                    <MessageSquare
                      size={18}
                      className="text-gray-400 hover:text-white transition cursor-pointer"
                      onClick={() => navigate("/mensajes")}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Historial */}
          <section className="bg-[#2b2d31] rounded-2xl p-5 shadow-lg">
            <h3 className="text-lg font-bold text-[#ff007a] mb-4 text-center">Tu Historial</h3>
            <div className="space-y-3">
              {historial.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-start bg-[#1f2125] p-3 rounded-xl"
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-9 h-9 bg-pink-400 text-[#1a1c20] font-bold rounded-full flex items-center justify-center">
                      {item.nombre.charAt(0)}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{item.nombre}</p>
                      <p className="text-white/60 text-xs">{item.accion}</p>
                    </div>
                  </div>
                  <div className="text-right text-white/40 text-xs">{item.hora}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
    </ProtectedPage>
  );
}
