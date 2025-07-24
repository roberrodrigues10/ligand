// src/hooks/useRateLimitHandler.js
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useRateLimitHandler = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const navigate = useNavigate();

  // 🔥 FUNCIÓN PARA MANEJAR RATE LIMITING
  const handleRateLimit = useCallback((error, options = {}) => {
    const {
      redirectToWaitPage = true,
      waitTime = 10000,
      customMessage = "Servidor ocupado, reintentando...",
      fallbackRoute = "/home",
      onRetry = null
    } = options;

    // Verificar si es realmente un error 429
    if (error?.response?.status !== 429 && !error?.message?.includes('429')) {
      return false; // No es rate limiting
    }

    console.warn('⚠️ Rate limiting detectado, activando modo espera');
    setIsRateLimited(true);

    if (redirectToWaitPage) {
      // Navegar al componente de espera con parámetros
      navigate('/rate-limit-wait', {
        state: {
          message: customMessage,
          waitTime,
          fallbackRoute,
          onRetry
        },
        replace: true
      });
    }

    return true; // Rate limit manejado
  }, [navigate]);

  // 🔥 WRAPPER PARA FUNCIONES QUE PUEDEN SER RATE LIMITED
  const withRateLimitHandling = useCallback((asyncFunction, options = {}) => {
    return async (...args) => {
      try {
        const result = await asyncFunction(...args);
        setIsRateLimited(false); // Reset si la función tuvo éxito
        return result;
      } catch (error) {
        const wasHandled = handleRateLimit(error, options);
        if (!wasHandled) {
          throw error; // Re-lanzar si no es rate limiting
        }
        return null; // Retornar null si fue rate limiting
      }
    };
  }, [handleRateLimit]);

  // 🔥 FUNCIÓN PARA RESETEAR ESTADO
  const resetRateLimit = useCallback(() => {
    setIsRateLimited(false);
  }, []);

  return {
    isRateLimited,
    handleRateLimit,
    withRateLimitHandling,
    resetRateLimit
  };
};

// 🔥 COMPONENTE HOC PARA PROTEGER RUTAS DEL RATE LIMITING
export const withRateLimitProtection = (WrappedComponent, options = {}) => {
  return function RateLimitProtectedComponent(props) {
    const { handleRateLimit } = useRateLimitHandler();

    const protectedProps = {
      ...props,
      onRateLimit: (error) => handleRateLimit(error, options)
    };

    return <WrappedComponent {...protectedProps} />;
  };
};

export default useRateLimitHandler;