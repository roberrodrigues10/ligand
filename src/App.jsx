import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LigandHome from "./components/ligandHome";
import LoginLigand from "./components/loginligand";
import Verificacion from "./components/verificacion";
import Anteveri from "./components/anteveri";
import Esperando from "./components/esperandoverifi";
import HomeLlamadas from "./components/homellamadas";
import Mensajes from "./components/mensajes";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<LigandHome />} />
        <Route path="/login" element={<LoginLigand />} />
        <Route path="/verificacion" element={<Verificacion />} />
        <Route path="/anteveri" element={<Anteveri />} />
        <Route path="/esperando" element={<Esperando />} />
        <Route path="/homellamadas" element={<HomeLlamadas />} />
        <Route path="/mensajes" element={<Mensajes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
