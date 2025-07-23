import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react"; // ← Agregar esto
import { initializeAuth } from "./utils/auth"; // ← Agregar esto (ajusta la ruta según dónde esté tu auth.js)

import LigandHome from "./components/ligandHome";
import LoginLigand from "./components/verificacion/login/loginligand";
import Logout from "./components/verificacion/login/logout";
import VerificarSesionActiva from "./components/verificacion/login/verifysession";

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

import RutaSoloVisitantes from "./routes/solovisit";
import RouteGuard from "./routes/blockchat";

//Rutas admin
import VerificacionesAdmin from "./components/admin/adminverification";

// Rutas protegidas
import RutaProtegida from "./routes/ss";
import RutaEmailNoVerificado from "./routes/emailnoverifiy";
import RutaEmailVerificado from "./routes/emailverifiy";
import RutaClienteYaVerificado from "./routes/routeclient";
import RutaModeloNoVerificada from "./routes/routemodel";
import RutaModelo from "./routes/routemodelverify";

import Homecliente from "./components/client/homecliente";
import RutaProcesoRegistro from "./routes/procesoregistro";

function App() {
  // ✅ INICIALIZAR SISTEMA DE AUTENTICACIÓN Y HEARTBEAT
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <BrowserRouter>
      <VerificarSesionActiva />
      
      <RouteGuard>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />

          <Route element={<RutaSoloVisitantes />}>
            <Route path="/home" element={<LigandHome />} />
            <Route path="/login" element={<LoginLigand />} />
          </Route>
          <Route path="/logout" element={<Logout />} />

          <Route element={<RutaEmailNoVerificado />}>
            <Route element={<RutaProcesoRegistro />}>
              <Route path="/verificaremail" element={<VerificarCodigo />} />
            </Route>
          </Route>

          <Route element={<RutaEmailVerificado />}>
            
            <Route element={<RutaClienteYaVerificado />}>
              <Route path="/homecliente" element={<Homecliente />} />
              <Route path="/esperandocallcliente" element={<EsperandoCallCliente />} />
              <Route path="/videochatclient" element={<VideochatClient />} />
            </Route>

            <Route element={<RutaProcesoRegistro />}>
              <Route path="/genero" element={<Genero />} />
            </Route>

            <Route element={<RutaModeloNoVerificada />}>
              <Route path="/verificacion" element={<Verificacion />} />
              <Route path="/anteveri" element={<Anteveri />} />
              <Route path="/homellamadas" element={<HomeLlamadas />} />
              <Route path="/esperando" element={<Esperando />} />
              <Route path="/mensajes" element={<Mensajes />} />
              <Route path="/favorites" element={<Favoritos />} />
              <Route path="/historysu" element={<HistorySub />} />
              <Route path="/esperandocall" element={<EsperancoCall />} />
              <Route path="/videochat" element={<Videochat />} />
              <Route path="/configuracion" element={<ConfiPerfil />} />
            </Route>
            
          </Route>

          <Route path="/verificacionesadmin" element={<VerificacionesAdmin />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
          
        </Routes>
      </RouteGuard>
      
    </BrowserRouter>
  );
}

export default App;