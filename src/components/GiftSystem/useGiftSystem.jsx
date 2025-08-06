import { useState, useCallback } from 'react';

export const useGiftSystem = (userId, userRole, getAuthHeaders, apiBaseUrl) => {
  const [gifts, setGifts] = useState([]);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Usar el parámetro o fallback a la variable de entorno
  const API_BASE_URL = apiBaseUrl || import.meta.env.VITE_API_BASE_URL;
  
  const loadGifts = useCallback(async () => {
  try {
    setLoadingGifts(true);
    
    const headers = getAuthHeaders();
    console.log('🔑 Token actual:', headers.Authorization);
    
    const response = await fetch(`${API_BASE_URL}/api/gifts/available`, {
      headers: headers
    });
    
    console.log('📡 Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error del servidor:', errorText);
      
      // Si es 401 (no autenticado), redirigir al login
      if (response.status === 401) {
        console.log('🚪 Token inválido - necesita reloguear');
        // Aquí podrías llamar a una función de logout
        // logout(); 
      }
      return;
    }

    const data = await response.json();
    if (data.success) {
      setGifts(data.gifts);
    }
  } catch (error) {
    console.error('❌ Error cargando regalos:', error);
  } finally {
    setLoadingGifts(false);
  }
  }, [API_BASE_URL, getAuthHeaders]);

  // Cargar solicitudes pendientes (solo para clientes)
  const loadPendingRequests = useCallback(async () => {
    if (userRole !== 'cliente') return;
    
    try {
      setLoadingRequests(true);
      
      if (!API_BASE_URL) {
        throw new Error('API_BASE_URL no está configurada');
      }

      const response = await fetch(`${API_BASE_URL}/api/gifts/requests/pending`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setPendingRequests(data.requests);
      } else {
        console.error('API retornó success: false');
      }
    } catch (error) {
      console.error('❌ Error cargando solicitudes:', error);
    } finally {
      setLoadingRequests(false);
    }
  }, [userRole, API_BASE_URL, getAuthHeaders]);

  return {
    gifts,
    loadingGifts,
    pendingRequests,
    loadingRequests,
    loadGifts,
    loadPendingRequests,
    setPendingRequests
  };
};