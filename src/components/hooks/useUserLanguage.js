// hooks/useUserLanguage.js
import { useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useUserLanguage = () => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest'
    };
  };

  const syncUserLanguage = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🚫 No hay token, no se puede cargar idioma');
      return;
    }

    try {
      console.log('🔄 Sincronizando idioma del usuario...');
      
      const response = await fetch(`${API_BASE_URL}/api/profile/info`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.user.preferred_language) {
          const currentLocalLang = localStorage.getItem('userPreferredLanguage');
          const dbLanguage = data.user.preferred_language;
          
          console.log('🌍 Idioma en BD:', dbLanguage);
          console.log('🌍 Idioma en localStorage:', currentLocalLang);
          
          // Solo actualizar si es diferente
          if (currentLocalLang !== dbLanguage) {
            localStorage.setItem('userPreferredLanguage', dbLanguage);
            console.log('✅ Idioma sincronizado en localStorage:', dbLanguage);
            
            // Actualizar i18next si está disponible
            if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
              window.i18n.changeLanguage(dbLanguage);
              console.log('✅ i18next actualizado:', dbLanguage);
            }
            
            // Disparar evento personalizado para notificar el cambio
            window.dispatchEvent(new CustomEvent('userLanguageChanged', {
              detail: { language: dbLanguage }
            }));
          } else {
            console.log('ℹ️ Idioma ya sincronizado');
          }
        } else {
          console.log('⚠️ No se encontró idioma preferido en la respuesta');
        }
      } else {
        console.error('❌ Error en respuesta del servidor:', response.status);
      }
    } catch (error) {
      console.error('❌ Error sincronizando idioma del usuario:', error);
    }
  };

  const updateUserLanguage = async (newLanguage) => {
    try {
      console.log('🔄 Actualizando idioma en BD:', newLanguage);
      
      const response = await fetch(`${API_BASE_URL}/api/profile/language/update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ language: newLanguage })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Actualizar localStorage
        localStorage.setItem('userPreferredLanguage', data.preferred_language);
        console.log('✅ Idioma actualizado en BD y localStorage:', data.preferred_language);
        
        // Actualizar i18next
        if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
          window.i18n.changeLanguage(data.preferred_language);
        }
        
        return { success: true, language: data.preferred_language };
      } else {
        console.error('❌ Error actualizando idioma:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Error de conexión actualizando idioma:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // Sincronizar idioma cuando el hook se monta
  useEffect(() => {
    syncUserLanguage();
  }, []);

  // Escuchar cambios en el token (nuevo login)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && e.newValue) {
        console.log('🔑 Nuevo token detectado, sincronizando idioma...');
        setTimeout(syncUserLanguage, 500); // Pequeño delay para asegurar que el token esté disponible
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return {
    syncUserLanguage,
    updateUserLanguage
  };
};

export default useUserLanguage;