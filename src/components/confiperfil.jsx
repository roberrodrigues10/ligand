import React, { useState } from "react";
import Header from "./header";
import {
  Lock,
  LogOut,
  Trash2,
  ShieldCheck,
  Upload,
  Camera,
  X,
  Globe,
  User,
  CreditCard,
  Banknote,
  HelpCircle,
  FileText,
  AlertTriangle,
} from "lucide-react";

export default function ModeloConfiguracion() {
  const [modalActivo, setModalActivo] = useState(null);

  const abrirModal = (id) => setModalActivo(id);
  const cerrarModal = () => setModalActivo(null);

  return (
    <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white p-6">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-8 border-b border-[#ff007a] pb-2">
          ⚙️ Configuración de cuenta
        </h1>

        {/* SECCIÓN 1: CUENTA Y SEGURIDAD */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#ff007a] mb-4">
            Cuenta y Seguridad
          </h2>
          <div className="grid gap-3">
            <ConfigBoton
              icon={<Lock size={18} />}
              texto="Cambiar contraseña"
              onClick={() => abrirModal("password")}
            />
            <ConfigBoton
              icon={<LogOut size={18} />}
              texto="Cerrar sesión en todos los dispositivos"
              onClick={() => abrirModal("cerrar-sesion")}
            />
            <ConfigBoton
              icon={<Trash2 size={18} />}
              texto="Eliminar cuenta"
              onClick={() => abrirModal("eliminar-cuenta")}
            />
            <ConfigBoton
              icon={<ShieldCheck size={18} />}
              texto="Activar verificación en dos pasos (2FA)"
              onClick={() => abrirModal("2fa")}
            />
          </div>
        </div>

        {/* SECCIÓN 2: PERFIL */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#ff007a] mb-4">Perfil</h2>
          <div className="grid gap-3">
            <ConfigBoton
              icon={<Upload size={18} />}
              texto="Subir foto de perfil"
              onClick={() => abrirModal("subir-foto")}
            />
            <ConfigBoton
              icon={<Camera size={18} />}
              texto="Tomar foto"
              onClick={() => abrirModal("tomar-foto")}
            />
            <ConfigBoton
              icon={<Trash2 size={18} />}
              texto="Eliminar foto de perfil"
              onClick={() => abrirModal("eliminar-foto")}
            />
            <ConfigBoton
              icon={<User size={18} />}
              texto="Editar alias o nombre visible"
              onClick={() => abrirModal("alias")}
            />
            <ConfigBoton
              icon={<Globe size={18} />}
              texto="Idioma preferido"
              onClick={() => abrirModal("idioma")}
            />
          </div>
        </div>

        {/* SECCIÓN 3: SUSCRIPCIÓN Y PAGOS */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#ff007a] mb-4">
            Suscripción y Pagos
          </h2>
          <div className="grid gap-3">
            <ConfigBoton
              icon={<CreditCard size={18} />}
              texto="Agregar o eliminar método de pago"
              onClick={() => abrirModal("pago")}
            />
            <ConfigBoton
              icon={<Globe size={18} />}
              texto="País de residencia (fiscal)"
              onClick={() => abrirModal("pais")}
            />
            <ConfigBoton
              icon={<Banknote size={18} />}
              texto="Definir pago mínimo"
              onClick={() => abrirModal("pago-minimo")}
            />
          </div>
        </div>

        {/* SECCIÓN 4: OTROS */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#ff007a] mb-4">Otros</h2>
          <div className="grid gap-3">
            <ConfigBoton
              icon={<HelpCircle size={18} />}
              texto="Soporte o ayuda"
              onClick={() => abrirModal("soporte")}
            />
            <ConfigBoton
              icon={<FileText size={18} />}
              texto="Términos y condiciones"
              onClick={() => abrirModal("terminos")}
            />
            <ConfigBoton
              icon={<AlertTriangle size={18} />}
              texto="Reportar un problema"
              onClick={() => abrirModal("reportar")}
            />
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modalActivo && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={cerrarModal}
        >
          <div
            className="bg-[#1f2125] rounded-xl p-6 w-full max-w-sm border border-[#ff007a] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar dentro */}
            <button
              onClick={cerrarModal}
              className="absolute top-3 right-3 text-white/50 hover:text-white"
              title="Cerrar"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-[#ff007a] mb-4">
              {modalActivo.replace(/-/g, " ").toUpperCase()}
            </h3>
            <p className="text-sm text-white/80">
              Aquí puedes implementar el formulario o contenido correspondiente
              para <strong>{modalActivo}</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigBoton({ icon, texto, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-[#131418] hover:bg-[#1c1f25] transition px-4 py-2 rounded-lg text-left border border-white/10"
    >
      <span className="text-[#ff007a]">{icon}</span>
      <span className="text-sm">{texto}</span>
    </button>
  );
}
