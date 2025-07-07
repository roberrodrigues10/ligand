  import React from "react";
  import { BrowserRouter, Routes, Route } from "react-router-dom";
  import LigandHome from "./components/ligandHome";
  import LoginLigand from "./components/verificacion/login/loginligand";
  import Verificacion from "./components/verificacion/register/verificacion";
  import Anteveri from "./components/verificacion/register/anteveri";
  import Esperando from "./components/verificacion/register/esperandoverifi";
  import HomeLlamadas from "./components/homellamadas";
  import Mensajes from "./components/mensajes";
  import Favoritos from "./components/favorites";
  import HistorySub from "./components/historysu";
  import EsperancoCall from "./components/esperacall";
  import Videochat from "./components/videochat";
  import ConfiPerfil from "./components/confiperfil";
  import RutaProtegida from "./routes/protegerruta";
  import Logout from "./components/verificacion/login/logout"; // o donde pongas esto
  import Genero from "./components/verificacion/register/genero"; // Asegúrate de importar el componente de selección de género
  import VerificarCodigo from "./components/verificacion/register/verificarcodigo"; // Asegúrate de importar el componente de selección de género

  function App() {
    return (
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/home" element={<LigandHome />} />
          <Route path="/login" element={<LoginLigand />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/genero" element={<Genero />} />
          <Route path="/verificaremail" element={<VerificarCodigo />} />

          {/* Rutas protegidas */}
          <Route element={<RutaProtegida />}>
            <Route path="/verificacion" element={<Verificacion />} />
            <Route path="/anteveri" element={<Anteveri />} />
            <Route path="/esperando" element={<Esperando />} />
            <Route path="/homellamadas" element={<HomeLlamadas />} />
            <Route path="/mensajes" element={<Mensajes />} />
            <Route path="/favorites" element={<Favoritos />} />
            <Route path="/historysu" element={<HistorySub />} />
            <Route path="/esperandocall" element={<EsperancoCall />} />
            <Route path="/videochat" element={<Videochat />} />
            <Route path="/configuracion" element={<ConfiPerfil />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }

  export default App;
