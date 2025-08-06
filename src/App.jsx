import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { initializeAuth } from "./utils/auth";

// 🔥 IMPORTAR EL HOOK SIMPLE DE ROL
import { ProtectedPage } from "./components/usePageAccess";

import LigandHome from "./components/ligandHome";
import LoginLigand from "./components/verificacion/login/loginligand";
import Logout from "./components/verificacion/login/logout";

import VerificarCodigo from "./components/verificacion/register/verificarcodigo";
import Genero from "./components/verificacion/register/genero";
import Verificacion from "./components/verificacion/register/verificacion";
import Anteveri from "./components/verificacion/register/anteveri";
import Esperando from "./components/verificacion/register/esperandoverifi";

import HomeLlamadas from "./components/homellamadas";
import Mensajes from "./components/mensajes";
import Favoritos from "./components/favorites";
import HistorySub from "./components/historysu";
import EsperancoCall from "./components/esperacall";
import EsperandoCallCliente from "./components/client/esperacallclient";
import Videochat from "./components/videochat";
import VideochatClient from "./components/client/videochatclient";
import ConfiPerfil from "./components/confiperfil";
import MessageClient from "./components/client/message.jsx"
import Favoritesboy from "./components/client/favoritesclient.jsx"

import RouteGuard from "./routes/blockchat";
import VerificacionesAdmin from "./components/admin/adminverification";
import Homecliente from "./components/client/homecliente";
import { RateLimitProvider } from './contexts/RateLimitContext.jsx';
import UserSearch from "./components/search.jsx";
import VideoRecorderUpload from "./components/VideoRecorderUpload";

import { ToastContainer } from "react-toastify";

import RateLimitWait from "./components/RateLimitWait";

import { SearchingProvider } from './contexts/SearchingContext.jsx';
import { GlobalTranslationProvider } from './contexts/GlobalTranslationContext.jsx';

function App() {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <BrowserRouter>
      <RateLimitProvider>
        <SearchingProvider>
          <GlobalTranslationProvider>
            
            <ToastContainer />
              
            <Routes>
              {/* 🔓 RUTAS PÚBLICAS (fuera del RoleGuard) */}
              <Route path="/home" element={<LigandHome />} />
              <Route path="/login" element={<LoginLigand />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/rate-limit-wait" element={<RateLimitWait />} />

              {/* 🔒 RUTAS PROTEGIDAS (dentro del RouteGuard Y ProtectedPage) */}
              <Route path="/*" element={
                <RouteGuard>
                    <Routes>
                      
                      {/* 🏠 RUTA RAÍZ */}
                      <Route 
                        path="/" 
                        element={<Navigate to="/dashboard" replace />} 
                      />

                      {/* 🎯 DASHBOARD - El RoleGuard se encargará de redirigir */}
                      <Route 
                        path="/dashboard" 
                        element={
                          <div className="min-h-screen flex items-center justify-center bg-black text-white">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
                              <p>Redirigiendo al área correspondiente...</p>
                            </div>
                          </div>
                        } 
                      />

                      {/* 📧 PROCESO DE REGISTRO (públicas dentro del RouteGuard) */}
                      <Route path="/verificaremail" element={<VerificarCodigo />} />
                      <Route path="/genero" element={<Genero />} />
                      <Route path="/verificacion" element={<Verificacion />} />
                      <Route path="/anteveri" element={<Anteveri />} />
                      <Route path="/esperando" element={<Esperando />} />

                      {/* 👨‍💼 ÁREA DEL CLIENTE - Solo clientes pueden acceder */}
                      <Route path="/homecliente" element={<Homecliente />} />
                      <Route path="/esperandocallcliente" element={<EsperandoCallCliente />} />
                      <Route path="/videochatclient" element={<VideochatClient />} />
                      <Route path="/message" element={<MessageClient />} />
                      <Route path="/favoritesboy" element={<Favoritesboy />} />

                      {/* 👩‍💼 ÁREA DE LA MODELO - Solo modelos pueden acceder */}
                      <Route path="/homellamadas" element={<HomeLlamadas />} />
                      <Route path="/mensajes" element={<Mensajes />} />
                      <Route path="/favorites" element={<Favoritos />} />
                      <Route path="/historysu" element={<HistorySub />} />
                      <Route path="/esperandocall" element={<EsperancoCall />} />
                      <Route path="/videochat" element={<Videochat />} />
                      <Route path="/configuracion" element={<ConfiPerfil />} />
                      <Route path="/VideoRecorderUpload" element={<VideoRecorderUpload />} />
                      <Route path="/usersearch" element={<UserSearch />} />

                      {/* 🛡️ ADMIN - Solo admins pueden acceder */}
                      <Route path="/verificacionesadmin" element={<VerificacionesAdmin />} />

                      {/* 🚫 FALLBACK */}
                      <Route path="*" element={<Navigate to="/home" replace />} />
                      
                    </Routes>
                </RouteGuard>
              } />
            </Routes>

          </GlobalTranslationProvider>
        </SearchingProvider>
      </RateLimitProvider>
    </BrowserRouter>
  );
}

export default App;