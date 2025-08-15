import React from 'react';

export default function TestMessage() {
  return (
    <div className="min-h-screen bg-blue-500 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          🧪 PÁGINA DE PRUEBA
        </h1>
        <p className="text-xl text-white mb-4">
          Esta es una página súper simple para probar /message
        </p>
        
        <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-blue-500 mb-4">
            ✅ Si ves esto, funciona
          </h2>
          <p className="text-gray-700 mb-4">
            La ruta /message está funcionando correctamente.
          </p>
          <p className="text-sm text-gray-500">
            Viewport: {window.innerWidth}x{window.innerHeight}
          </p>
          <div className="mt-4">
            <button 
              onClick={() => alert('¡Botón funciona!')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test Click
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-white">
          <p>📱 User Agent: {navigator.userAgent}</p>
          <p>⏰ Timestamp: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}