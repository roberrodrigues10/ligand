import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Lazy loading de componentes para evitar errores de carga
const LigandHome = React.lazy(() => import("./components/ligandHome"));
const LoginLigand = React.lazy(() => import("./components/verificacion/login/loginligand"));
const Logout = React.lazy(() => import("./components/verificacion/login/logout"));
const VerificarSesionActiva = React.lazy(() => import("./components/verificacion/login/verifysession"));

const VerificarCodigo = React.lazy(() => import("./components/verificacion/register/verificarcodigo"));
const Genero = React.lazy(() => import("./components/verificacion/register/genero"));
const Verificacion = React.lazy(() => import("./components/verificacion/register/verificacion"));
const Anteveri = React.lazy(() => import("./components/verificacion/register/anteveri"));
const Esperando = React.lazy(() => import("./components/verificacion/register/esperandoverifi"));

const HomeLlamadas = React.lazy(() => import("./components/homellamadas"));
const Mensajes = React.lazy(() => import("./components/mensajes"));
const Favoritos = React.lazy(() => import("./components/favorites"));
const HistorySub = React.lazy(() => import("./components/historysu"));
const EsperancoCall = React.lazy(() => import("./components/esperacall"));
const Videochat = React.lazy(() => import("./components/videochat"));
const ConfiPerfil = React.lazy(() => import("./components/confiperfil"));

const RutaSoloVisitantes = React.lazy(() => import("./routes/solovisit"));
const RutaProtegida = React.lazy(() => import("./routes/ss"));
const RutaEmailNoVerificado = React.lazy(() => import("./routes/emailnoverifiy"));
const RutaEmailVerificado = React.lazy(() => import("./routes/emailverifiy"));
const RutaClienteYaVerificado = React.lazy(() => import("./routes/routeclient"));
const RutaModeloNoVerificada = React.lazy(() => import("./routes/routemodel"));
const RutaProcesoRegistro = React.lazy(() => import("./routes/procesoregistro"));

// Componente de carga
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <div>⏳ Cargando...</div>
  </div>
);

// Componente de error
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>🚨 Error en la aplicación</h2>
    <details style={{ marginTop: '20px' }}>
      <summary>Detalles del error</summary>
      <pre>{error?.message}</pre>
    </details>
    <button onClick={resetErrorBoundary}>Reintentar</button>
  </div>
);

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} resetErrorBoundary={() => this.setState({ hasError: false, error: null })} />;
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
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
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;