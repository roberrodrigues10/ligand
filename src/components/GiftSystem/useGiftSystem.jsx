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

  const acceptGiftRequest = useCallback(async (requestId, roomName) => {
    try {
      console.log(`🎁 Aceptando regalo ${requestId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/gifts/requests/${requestId}/accept`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          request_id: requestId  // ← EL BACKEND ESPERA ESTO
        })
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (response.ok && data.success) {
        // Remover la solicitud de la lista de pendientes
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        
        console.log('✅ Regalo aceptado correctamente');
        console.log('✅ Regalo aceptado exitosamente');
  
        return { 
          success: true, 
          transaction: data.transaction,
          newBalance: data.new_balance,
          // 🔥 AGREGAR: Los mensajes del chat del backend
          chatMessages: data.chat_messages,
          // Crear estructura para los mensajes del chat
          giftInfo: {
            name: data.transaction?.gift_name,
            image: data.transaction?.gift_image,
            price: data.transaction?.amount,
            recipient: data.transaction?.recipient
          }
        };

      } else {
        console.error('❌ Error aceptando regalo:', data);
        return { 
          success: false, 
          error: data.message || data.error || 'Error desconocido'
        };
      }
    } catch (error) {
      console.error('❌ Error de conexión aceptando regalo:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }, [API_BASE_URL, getAuthHeaders]);

  const rejectGiftRequest = useCallback(async (requestId, reason = null) => {
  try {
    console.log(`❌ Rechazando regalo ${requestId}`);
    
    const requestOptions = {
      method: 'POST',
      headers: getAuthHeaders()
    };

    // Solo agregar body si hay una razón
    if (reason) {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify({ reason });
    }
    
    const response = await fetch(`${API_BASE_URL}/api/gifts/requests/${requestId}/reject`, requestOptions);

    const data = await response.json();
    
    if (data.success) {
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      console.log('✅ Regalo rechazado correctamente');
      return { success: true };
    } else {
      console.error('❌ Error rechazando regalo:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('❌ Error de conexión rechazando regalo:', error);
    return { success: false, error: 'Error de conexión' };
  }
}, [API_BASE_URL, getAuthHeaders]);


  return {
    gifts,
    loadingGifts,
    pendingRequests,
    loadingRequests,
    loadGifts,
    loadPendingRequests,
    setPendingRequests,
    acceptGiftRequest,      // ← NUEVO
    rejectGiftRequest   
  };
};