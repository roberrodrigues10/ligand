import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importaciones directas (sin lazy loading)
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
import Videochat from "./components/videochat";
import ConfiPerfil from "./components/confiperfil";

import RutaSoloVisitantes from "./routes/solovisit";
import RutaProtegida from "./routes/ss";
import RutaEmailNoVerificado from "./routes/emailnoverifiy";
import RutaEmailVerificado from "./routes/emailverifiy";
import RutaClienteYaVerificado from "./routes/routeclient";
import RutaModeloNoVerificada from "./routes/routemodel";
import RutaProcesoRegistro from "./routes/procesoregistro";

// Componente de prueba simple
const TestComponent = () => {
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1>🎯 Aplicación funcionando correctamente</h1>
      <p>Si ves esto, el router está funcionando</p>
      <p>Hora actual: {new Date().toLocaleTimeString()}</p>
    </div>
  );
};

// Error Boundary simple
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error capturado por ErrorBoundary:', error);
    console.error('📍 Stack trace:', errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          backgroundColor: '#ffe6e6',
          minHeight: '100vh'
        }}>
          <h1>🚨 Error detectado</h1>
          <p>La aplicación ha encontrado un error:</p>
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '10px', 
            margin: '20px 0',
            borderRadius: '5px',
            textAlign: 'left'
          }}>
            <strong>Error:</strong> {this.state.error?.toString()}
          </div>
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '10px', 
            margin: '20px 0',
            borderRadius: '5px',
            textAlign: 'left',
            fontSize: '12px'
          }}>
            <strong>Stack:</strong>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', fontSize: '16px' }}
          >
            🔄 Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  console.log('🚀 App component renderizando...');
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div>
          {/* Renderizar VerificarSesionActiva solo si no hay errores */}
          <VerificarSesionActiva />
          
          <Routes>
            {/* Ruta de prueba simple */}
            <Route path="/test" element={<TestComponent />} />
            
            {/* Ruta raíz - redirige a test temporalmente */}
            <Route path="/" element={<Navigate to="/test" replace />} />
            
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
                <Route path="/homellamadas" element={<HomeLlamadas />} />
                <Route path="/mensajes" element={<Mensajes />} />
                <Route path="/favorites" element={<Favoritos />} />
                <Route path="/historysu" element={<HistorySub />} />
                <Route path="/esperandocall" element={<EsperancoCall />} />
                <Route path="/videochat" element={<Videochat />} />
                <Route path="/configuracion" element={<ConfiPerfil />} />
              </Route>

              {/* Ruta de género protegida */}
              <Route element={<RutaProcesoRegistro />}>
                <Route path="/genero" element={<Genero />} />
              </Route>

              {/* Rutas SOLO para modelos que aún no han terminado verificación */}
              <Route element={<RutaModeloNoVerificada />}>
                <Route path="/verificacion" element={<Verificacion />} />
                <Route path="/anteveri" element={<Anteveri />} />
              </Route>
              <Route path="/esperando" element={<Esperando />} />
            </Route>

            {/* Ruta catch-all para URLs no encontradas */}
            <Route path="*" element={<Navigate to="/test" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;