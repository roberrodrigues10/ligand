import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { initializeAuth } from "./utils/auth";

import { AdminCodeVerification } from "./components/admin/AdminCodeVerification";
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
import UnifiedProtectedRoute from "./routes/UnifiedProtectedRoute.jsx";
import { RateLimitProvider } from './contexts/RateLimitContext.jsx';
import UserSearch from "./components/search.jsx";
import VideoRecorderUpload from "./components/VideoRecorderUpload";

import AxiosErrorHandler from "./components/AxiosErrorHandler";
import { ToastContainer } from "react-toastify";

import RateLimitWait from "./components/RateLimitWait";

import { SearchingProvider } from './contexts/SearchingContext.jsx';
import { GlobalTranslationProvider } from './contexts/GlobalTranslationContext.jsx'; // ✅ YA LO TIENES
import AdminDashboardLayout from "./components/admin/dashboard.jsx";


function App() {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <BrowserRouter>
      <RateLimitProvider>
        <SearchingProvider>
          {/* 🔥 AGREGAR ESTA LÍNEA - ENVOLVER TODO EN TRADUCCIÓN GLOBAL */}
          <GlobalTranslationProvider>
            
            <AxiosErrorHandler />
            <ToastContainer />
              
            <Routes>
              {/* 🔓 RUTAS PÚBLICAS - FUERA del RouteGuard y sin protección */}
              <Route path="/home" element={<LigandHome />} />
              <Route path="/login" element={<LoginLigand />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/AdminCodeVerification" element={<AdminCodeVerification />} />
              <Route path="/admin/dashboard" element={<AdminDashboardLayout />} />
              <Route path="/admin/dashboard/:section" element={<AdminDashboardLayout />} />

              {/* 🔥 NUEVA RUTA: Página de espera para Rate Limiting */}
              <Route 
                path="/rate-limit-wait" 
                element={<RateLimitWait />} 
              />

              {/* 🔒 RUTAS PROTEGIDAS - DENTRO del RouteGuard */}
              <Route path="/*" element={
                <RouteGuard>
                  <Routes>
                    {/* 🏠 Ruta de inicio - redirige al hub */}
                    <Route 
                      path="/" 
                      element={
                        <UnifiedProtectedRoute>
                          <div className="min-h-screen flex items-center justify-center bg-black text-white">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
                          </div>
                        </UnifiedProtectedRoute>
                      } 
                    />

                    {/* 🎯 HUB DE DECISIÓN - Donde llega el login */}
                    <Route 
                      path="/dashboard" 
                      element={
                        <UnifiedProtectedRoute>
                          <div className="min-h-screen flex items-center justify-center bg-black text-white">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
                              <p>Redirigiendo al área correspondiente...</p>
                            </div>
                          </div>
                        </UnifiedProtectedRoute>
                      } 
                    />

                    {/* 📄 PÁGINAS ESPECÍFICAS - Sin rutas protegidas anidadas */}
                    
                    {/* Proceso de registro y verificación */}
                    <Route path="/verificaremail" element={<VerificarCodigo />} />
                    <Route path="/genero" element={<Genero />} />
                    <Route path="/verificacion" element={<Verificacion />} />
                    <Route path="/anteveri" element={<Anteveri />} />
                    <Route path="/esperando" element={<Esperando />} />

                    {/* Área del cliente */}
                    <Route path="/homecliente" element={<Homecliente />} />
                    <Route path="/esperandocallcliente" element={<EsperandoCallCliente />} />
                    <Route path="/videochatclient" element={<VideochatClient />} />
                    <Route path="/message" element={<MessageClient />} />
                    <Route path="/favoritesboy" element={<Favoritesboy />} />


                    {/* Área de la modelo */}
                    <Route path="/homellamadas" element={<HomeLlamadas />} />
                    <Route path="/mensajes" element={<Mensajes />} />
                    <Route path="/favorites" element={<Favoritos />} />
                    <Route path="/historysu" element={<HistorySub />} />
                    <Route path="/esperandocall" element={<EsperancoCall />} />
                    <Route path="/videochat" element={<Videochat />} />
                    <Route path="/configuracion" element={<ConfiPerfil />} />
                    <Route path="/VideoRecorderUpload" element={<VideoRecorderUpload />} />
                    <Route path="/usersearch" element={<UserSearch />} />

                    {/* Admin */}
                    <Route path="/verificacionesadmin" element={<VerificacionesAdmin />} />

                    {/* 🚫 Fallback */}
                    <Route path="*" element={<Navigate to="/home" replace />} />
                  </Routes>
                </RouteGuard>
              } />
            </Routes>

          {/* 🔥 CERRAR EL GlobalTranslationProvider */}
          </GlobalTranslationProvider>
          
        </SearchingProvider>
      </RateLimitProvider>
    </BrowserRouter>
  );
}

export default App;