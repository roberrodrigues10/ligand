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
import { useTranslation } from "react-i18next"; // idioma

export default function ModeloConfiguracion() {
  const { t } = useTranslation(); // idioma
  const [modalActivo, setModalActivo] = useState(null);

  const abrirModal = (id) => setModalActivo(id);
  const cerrarModal = () => setModalActivo(null);

  return (
    <div className="min-h-screen bg-ligand-mix-dark text-white p-6">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-8 border-b border-[#ff007a] pb-2">
          ⚙️ {t("settings.title")} {/* idioma */}
        </h1>

        {/* SECCIÓN 1: CUENTA Y SEGURIDAD */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#ff007a] mb-4">
            {t("settings.accountSecurity")} {/* idioma */}
          </h2>
          <div className="grid gap-3">
            <ConfigBoton
              icon={<Lock size={18} />}
              texto={t("settings.changePassword")} // idioma
              onClick={() => abrirModal("password")}
            />
            <ConfigBoton
              icon={<LogOut size={18} />}
              texto={t("settings.logoutAll")} // idioma
              onClick={() => abrirModal("cerrar-sesion")}
            />
            <ConfigBoton
              icon={<Trash2 size={18} />}
              texto={t("settings.deleteAccount")} // idioma
              onClick={() => abrirModal("eliminar-cuenta")}
            />
            <ConfigBoton
              icon={<ShieldCheck size={18} />}
              texto={t("settings.enable2FA")} // idioma
              onClick={() => abrirModal("2fa")}
            />
          </div>
        </div>

        {/* SECCIÓN 2: PERFIL */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#ff007a] mb-4">
            {t("settings.profile")} {/* idioma */}
          </h2>
          <div className="grid gap-3">
            <ConfigBoton
              icon={<Upload size={18} />}
              texto={t("settings.uploadPhoto")} // idioma
              onClick={() => abrirModal("subir-foto")}
            />
            <ConfigBoton
              icon={<Camera size={18} />}
              texto={t("settings.takePhoto")} // idioma
              onClick={() => abrirModal("tomar-foto")}
            />
            <ConfigBoton
              icon={<Trash2 size={18} />}
              texto={t("settings.deletePhoto")} // idioma
              onClick={() => abrirModal("eliminar-foto")}
            />
            <ConfigBoton
              icon={<User size={18} />}
              texto={t("settings.editAlias")} // idioma
              onClick={() => abrirModal("alias")}
            />
            <ConfigBoton
              icon={<Globe size={18} />}
              texto={t("settings.language")} // idioma
              onClick={() => abrirModal("idioma")}
            />
          </div>
        </div>

        {/* SECCIÓN 3: SUSCRIPCIÓN Y PAGOS */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#ff007a] mb-4">
            {t("settings.payments")} {/* idioma */}
          </h2>
          <div className="grid gap-3">
            <ConfigBoton
              icon={<CreditCard size={18} />}
              texto={t("settings.managePaymentMethod")} // idioma
              onClick={() => abrirModal("pago")}
            />
            <ConfigBoton
              icon={<Globe size={18} />}
              texto={t("settings.country")} // idioma
              onClick={() => abrirModal("pais")}
            />
            <ConfigBoton
              icon={<Banknote size={18} />}
              texto={t("settings.minimumPayout")} // idioma
              onClick={() => abrirModal("pago-minimo")}
            />
          </div>
        </div>

        {/* SECCIÓN 4: OTROS */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#ff007a] mb-4">
            {t("settings.others")} {/* idioma */}
          </h2>
          <div className="grid gap-3">
            <ConfigBoton
              icon={<HelpCircle size={18} />}
              texto={t("settings.support")} // idioma
              onClick={() => abrirModal("soporte")}
            />
            <ConfigBoton
              icon={<FileText size={18} />}
              texto={t("settings.terms")} // idioma
              onClick={() => abrirModal("terminos")}
            />
            <ConfigBoton
              icon={<AlertTriangle size={18} />}
              texto={t("settings.report")} // idioma
              onClick={() => abrirModal("reportar")}
            />
          </div>
        </div>
      </div>

      {modalActivo && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={cerrarModal}
        >
          <div
            className="bg-[#1f2125] rounded-xl p-6 w-full max-w-sm border border-[#ff007a] relative"
            onClick={(e) => e.stopPropagation()}
          >
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
              {t("settings.modalInstruction", { item: modalActivo })} {/* idioma */}
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
