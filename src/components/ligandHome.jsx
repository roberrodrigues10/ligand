import React from 'react';
import { Heart } from 'lucide-react';
import pruebahistorias from './imagenes/pruebahistorias.jpg';
import logoproncipal from './imagenes/logoprincipal.png';
import LoginLigand from "./verificacion/login/loginligand"; 
import Register from "./verificacion/register/register"; // Asegúrate de tener este también
import { useTranslation } from 'react-i18next'; // importar hook

export default function ParlandomChatApp() {
  const { t, i18n } = useTranslation();

  const cambiarIdioma = (lng) => {
    i18n.changeLanguage(lng);
  };
  // Estados de modal
  const [showLogin, setShowLogin] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);


  return (
    <div className="bg-ligand-mix-dark min-h-screen">
      {/* Header */}
      <header className="flex justify-between items-center p-3">
        {/* Lado izquierdo */}
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff007a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="text-2xl font-bold text-fucsia">{t('idioma')}</span>
          <select
            onChange={(e) => {
              const lang = e.target.value;
              i18n.changeLanguage(lang);
              localStorage.setItem('lng', lang); // 👈 agrega esto
            }}
            className="bg-transparent border-none text-white ml-2"
          >
            <option value="es">ES</option>
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
        </div>

        {/* Centro: Logo + Nombre */}
        <div className="flex items-center justify-center">
          <img src={logoproncipal} alt="Logo" className="w-16 h-16" />
          <span className="text-2xl text-zorrofucsia font-pacifico ml-[-5px]">Ligand</span>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center space-x-4">
          <button
            className="border text-white bg-fucsia border-fucsia px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
            onClick={() => setShowLogin(true)}
          >
            {t('iniciarSesion')}
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-[#ff007a] text-white rounded-lg hover:bg-pink-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4" />
              <line x1="12" y1="17" x2="12" y2="17" />
            </svg>
            {t('ayuda')}
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="flex items-start justify-between px-6 py-12 max-w-7xl mx-auto gap-10">
        {/* Lado Izquierdo */}
        <div className="flex-1 max-w-lg mt-[-40px] ml-[-40px]">
          <div className="text-center mb-8">
            <h1 className="font-pacifico text-fucsia text-11xl bg-backgroundDark rounded-lg">Ligand</h1>
            <p className="text-4xl text-pink-200 mt-[-20px] font-semibold italic">
              {t('frasePrincipal')}
            </p>
          </div>

          <div className="text-center mb-6">
            <button
              className="w-full py-4 px-8 rounded-full text-white font-bold text-xl bg-fucsia hover:bg-fucsia-400 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              onClick={() => setShowRegister(true)}
            >
              {t('comenzar')}
            </button>
          </div>

          <div className="text-center mb-8">
            <p className="text-white text-lg leading-relaxed">
              {t('subtitulo')}
            </p>
          </div>

          <div className="flex justify-center space-x-8">
            {/* Género */}
            {['femenino', 'masculino'].map((gender) => (
              <label key={gender} className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input type="radio" name="gender" value={gender} className="sr-only" />
                  <div className="w-6 h-6 rounded-full border-2 border-gray-400 group-hover:border-red-400 flex items-center justify-center transition-all duration-200" />
                </div>
                <span className="ml-3 text-lg font-medium text-gray-700 transition-colors duration-200">
                  {t(`genero.${gender}`)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Lado derecho */}
        <div className="flex-1 ml-[130px]">
          <div className="text-center text-white italic text-3xl mb-8 font-semibold">{t('chicasRelevantes')}</div>

          <div className="flex justify-center items-end space-x-8">
            {['Ana', 'Lucía', 'Sofía'].map((name, index) => (
              <div
                key={name}
                className={`relative w-48 h-72 rounded-2xl overflow-hidden shadow-lg ${index === 1 ? 'translate-y-40' : ''}`}
              >
                <img src={pruebahistorias} alt={name} className="object-cover w-full h-full" />
                <div className="absolute bottom-0 w-full bg-black bg-opacity-50 text-white px-3 py-2 text-sm">
                  <div className="font-semibold">{name}</div>
                  <div className={`text-xs ${index === 1 ? 'text-gray-400' : 'text-green-400'}`}>
                    {index === 1 ? t('inactiva') : t('activa')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modales */}
      {showLogin && <LoginLigand onClose={() => setShowLogin(false)} />}
      {showRegister && <Register onClose={() => setShowRegister(false)} />}
    </div>
  );
}
