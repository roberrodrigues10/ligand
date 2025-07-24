// src/utils/userCache.js
import axios from '../api/axios';

// 🔥 CACHE GLOBAL PERSISTENTE
class UserCacheManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.lastFetchTime = 0;
    this.CACHE_DURATION = 30000; // 30 segundos
    this.MIN_REQUEST_INTERVAL = 2000; // 2 segundos mínimo entre requests
    this.MAX_RETRIES = 3;
    this.RATE_LIMIT_RETRY_DELAY = 5000; // 5 segundos para 429
  }

  // Generar clave única de cache
  getCacheKey(token) {
    return `user_${token?.substring(0, 10) || 'default'}`;
  }

  // Verificar si el cache es válido
  isCacheValid(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    const isValid = (now - cached.timestamp) < this.CACHE_DURATION;
    
    if (isValid) {
      console.log('✅ Cache válido para:', cacheKey, `(${Math.round((now - cached.timestamp) / 1000)}s ago)`);
    } else {
      console.log('❌ Cache expirado para:', cacheKey);
      this.cache.delete(cacheKey);
    }
    
    return isValid;
  }

  // Verificar si podemos hacer una nueva request
  canMakeRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastFetchTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      console.log(`⏳ Bloqueando request - muy pronto (${timeSinceLastRequest}ms < ${this.MIN_REQUEST_INTERVAL}ms)`);
      return false;
    }
    
    return true;
  }

  // Función principal para obtener usuario
  async getUser(forceRefresh = false) {
    const token = sessionStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const cacheKey = this.getCacheKey(token);
    
    // 🔥 STEP 1: Verificar cache si no es force refresh
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      console.log('🎯 Retornando desde cache:', cached.data.name || cached.data.email);
      return cached.data;
    }

    // 🔥 STEP 2: Verificar si ya hay una request pendiente
    if (this.pendingRequests.has(cacheKey)) {
      console.log('⏳ Request ya en progreso, esperando...');
      return await this.pendingRequests.get(cacheKey);
    }

    // 🔥 STEP 3: Verificar rate limiting propio
    if (!this.canMakeRequest()) {
      // Si tenemos cache expirado, usarlo temporalmente
      const expiredCache = this.cache.get(cacheKey);
      if (expiredCache) {
        console.log('🔄 Usando cache expirado temporalmente para evitar rate limit');
        return expiredCache.data;
      }
      
      // Esperar el tiempo mínimo y reintentar
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL));
    }

    // 🔥 STEP 4: Crear la request con manejo de 429
    const requestPromise = this.makeRequestWithRetry(token, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Request con retry automático para 429
  async makeRequestWithRetry(token, cacheKey, retryCount = 0) {
    try {
      this.lastFetchTime = Date.now();
      
      console.log(`📡 Haciendo request a /api/profile (intento ${retryCount + 1}/${this.MAX_RETRIES})`);
      
      const response = await axios.get('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 segundos timeout
      });

      if (response.status === 200 && response.data) {
        const userData = response.data.user || response.data;
        
        // 🔥 GUARDAR EN CACHE
        this.cache.set(cacheKey, {
          data: userData,
          timestamp: Date.now()
        });
        
        console.log('✅ Usuario obtenido y cacheado:', userData.name || userData.email);
        return userData;
      } else {
        throw new Error(`Invalid response: ${response.status}`);
      }

    } catch (error) {
      console.error(`❌ Error obteniendo usuario (intento ${retryCount + 1}):`, error.message);
      
      // 🔥 MANEJO ESPECÍFICO DE 429
      if (error.response?.status === 429) {
        console.warn('⚠️ Rate limited (429) detectado');
        
        // Si tenemos cache (aunque esté expirado), usarlo
        const fallbackCache = this.cache.get(cacheKey);
        if (fallbackCache) {
          console.log('🔄 Usando cache como fallback para rate limit');
          return fallbackCache.data;
        }
        
        // Si podemos reintentar, esperar más tiempo
        if (retryCount < this.MAX_RETRIES) {
          const delay = this.RATE_LIMIT_RETRY_DELAY * (retryCount + 1); // Backoff exponencial
          console.log(`⏳ Reintentando en ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequestWithRetry(token, cacheKey, retryCount + 1);
        }
      }
      
      // 🔥 MANEJO DE OTROS ERRORES CON RETRY
      if (retryCount < this.MAX_RETRIES && error.response?.status !== 401 && error.response?.status !== 403) {
        const delay = 1000 * (retryCount + 1); // 1s, 2s, 3s
        console.log(`⏳ Reintentando en ${delay}ms por error ${error.response?.status || 'network'}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(token, cacheKey, retryCount + 1);
      }
      
      // Si llegamos aquí, no podemos recuperarnos
      throw error;
    }
  }

  // Limpiar cache manualmente
  clearCache() {
    console.log('🧹 Limpiando cache de usuario');
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Limpiar cache de un token específico
  clearCacheForToken(token) {
    const cacheKey = this.getCacheKey(token);
    this.cache.delete(cacheKey);
    this.pendingRequests.delete(cacheKey);
  }

  // Debug info
  getDebugInfo() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      lastFetchTime: this.lastFetchTime,
      cacheEntries: Array.from(this.cache.keys())
    };
  }
}

// 🔥 INSTANCIA GLOBAL ÚNICA
const userCacheManager = new UserCacheManager();

// 🔥 FUNCIÓN EXPORTADA QUE REEMPLAZA getUser
export const getUser = async (forceRefresh = false) => {
  return await userCacheManager.getUser(forceRefresh);
};

// Exportar funciones auxiliares
export const clearUserCache = () => userCacheManager.clearCache();
export const getUserCacheDebug = () => userCacheManager.getDebugInfo();

// 🔥 AUTO-LIMPIEZA DEL CACHE CADA 10 MINUTOS
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of userCacheManager.cache.entries()) {
    if (now - cached.timestamp > 600000) { // 10 minutos
      userCacheManager.cache.delete(key);
      console.log('🧹 Cache entry auto-limpiado:', key);
    }
  }
}, 600000); // Cada 10 minutos

export default userCacheManager;