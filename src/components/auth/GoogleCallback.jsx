import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleGoogleCallback } from '../../utils/auth';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Procesando autenticación...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error('Autenticación cancelada por el usuario');
        }

        if (!code) {
          throw new Error('Código de autorización no recibido');
        }

        console.log('🔄 Procesando callback...');
        setMessage('Validando con Google...');

        const result = await handleGoogleCallback(code, state);
        
        setStatus('success');
        setMessage('¡Autenticación exitosa! Redirigiendo...');

        // Esperar un momento y redirigir
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);

      } catch (error) {
        console.error('❌ Error en callback:', error);
        setStatus('error');
        setMessage(error.message || 'Error al procesar autenticación');

        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/home?auth=login', { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

};

export default GoogleCallback;