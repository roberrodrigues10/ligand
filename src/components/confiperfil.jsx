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
import { useTranslation } from "react-i18next";
import PaymentManager from "./PaymentManager";
import MinimumPayoutManager from "./MinimumPayoutManager";


export default function ModeloConfiguracion() {
  const [modalActivo, setModalActivo] = useState(null);
  const { t } = useTranslation();
  const [userId, setUserId] = useState(1); // O obtén el userId del contexto/auth


  const abrirModal = (id) => setModalActivo(id);
  const cerrarModal = () => setModalActivo(null);

  return (
    <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white p-6">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-8 border-b border-[#ff007a] pb-2">
          ⚙️ {t("settings.title")}
        </h1>

        {/* Cuenta y seguridad */}
        <Seccion titulo={t("settings.accountSecurity")}>
          <ConfigBoton icon={<Lock size={18} />} texto={t("settings.changePassword")} onClick={() => abrirModal("changePassword")} />
          <ConfigBoton icon={<LogOut size={18} />} texto={t("settings.logoutAll")} onClick={() => abrirModal("logoutAll")} />
          <ConfigBoton icon={<Trash2 size={18} />} texto={t("settings.deleteAccount")} onClick={() => abrirModal("deleteAccount")} />
          <ConfigBoton icon={<ShieldCheck size={18} />} texto={t("settings.enable2FA")} onClick={() => abrirModal("enable2FA")} />
        </Seccion>

        {/* Perfil */}
        <Seccion titulo={t("settings.profile")}>
          <ConfigBoton icon={<Upload size={18} />} texto={t("settings.uploadPhoto")} onClick={() => abrirModal("uploadPhoto")} />
          <ConfigBoton icon={<Camera size={18} />} texto={t("settings.takePhoto")} onClick={() => abrirModal("takePhoto")} />
          <ConfigBoton icon={<Trash2 size={18} />} texto={t("settings.deletePhoto")} onClick={() => abrirModal("deletePhoto")} />
          <ConfigBoton icon={<User size={18} />} texto={t("settings.editAlias")} onClick={() => abrirModal("editAlias")} />
          <ConfigBoton icon={<Globe size={18} />} texto={t("settings.language")} onClick={() => abrirModal("language")} />
        </Seccion>

        {/* Pagos */}
        <Seccion titulo={t("settings.payments")}>
          <ConfigBoton icon={<CreditCard size={18} />} texto={t("settings.managePaymentMethod")} onClick={() => abrirModal("managePaymentMethod")} />
          <ConfigBoton icon={<Banknote size={18} />} texto={t("settings.minimumPayout")} onClick={() => abrirModal("minimumPayout")} />
        </Seccion>

        {/* Otros */}
        <Seccion titulo={t("settings.others")}>
          <ConfigBoton icon={<HelpCircle size={18} />} texto={t("settings.support")} onClick={() => abrirModal("support")} />
          <ConfigBoton icon={<FileText size={18} />} texto={t("settings.terms")} onClick={() => abrirModal("terms")} />
          <ConfigBoton icon={<AlertTriangle size={18} />} texto={t("settings.report")} onClick={() => abrirModal("report")} />
        </Seccion>
      </div>

      {/* Modal */}
      {modalActivo === "managePaymentMethod" ? (
        <PaymentManager 
          onClose={cerrarModal}
        />
      ) : modalActivo === "minimumPayout" ? (
        <MinimumPayoutManager 
          onClose={cerrarModal}
        />
      ) : modalActivo && (
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
              {t(`settings.${modalActivo}`)?.toUpperCase() || modalActivo}
            </h3>
            <p className="text-sm text-white/80">
              {t("settings.modalInstruction", { item: t(`settings.${modalActivo}`) || modalActivo })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-[#ff007a] mb-4">{titulo}</h2>
      <div className="grid gap-3">{children}</div>
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
