import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
// Nueva ruta protegida para proceso de registro
import RutaProcesoRegistro from "./routes/procesoregistro";

function App() {
  return (
    <BrowserRouter>
      <VerificarSesionActiva />
      <Routes>
        {/* Ruta raíz - redirige a home */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        
        
        
        {/* Rutas públicas */}
        <Route element={<RutaSoloVisitantes />}>
          <Route path="/home" element={<LigandHome />} />
          <Route path="/login" element={<LoginLigand />} />
        </Route>
        <Route path="/logout" element={<Logout />} />

        {/* Rutas para quienes NO han verificado el email */}
        <Route element={<RutaEmailNoVerificado />}>
          <Route element={<RutaProcesoRegistro />}>
            <Route path="/verificaremail" element={<VerificarCodigo />} />
          </Route>
        </Route>

        {/* Rutas para quienes SÍ han verificado el email */}
        <Route element={<RutaEmailVerificado />}>
          {/* Rutas SOLO para clientes que ya pasaron por género y alias */}
          <Route element={<RutaClienteYaVerificado />}>
            <Route path="/homecliente" element={<Homecliente />} />
            <Route path="/esperandocallcliente" element={<EsperandoCallCliente />} />
            <Route path="/videochatclient" element={<VideochatClient />} />
          </Route>

          {/* Ruta de género protegida */}
          <Route element={<RutaProcesoRegistro />}>
            <Route path="/genero" element={<Genero />} />
          </Route>

          {/* Rutas SOLO para modelos que aún no han terminado verificación */}
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
        {/* Rutas protegidas para admin autenticados */}
          <Route path="/verificacionesadmin" element={<VerificacionesAdmin />} />
        

        {/* Ruta catch-all para URLs no encontradas */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;