// src/utils/userCache.js - VERSIÓN CORREGIDA
import axios from '../api/axios';

// 🔥 VALIDADOR DE RESPUESTAS DEL BACKEND
const isValidUserData = (data) => {
  console.log('🔍 [CACHE] Validando datos:', { 
    type: typeof data, 
    value: data, 
    hasId: !!data?.id, 
    hasEmail: !!data?.email,
    isUndefined: data === undefined,
    isNull: data === null,
    isEmpty: Object.keys(data || {}).length === 0
  });

  // Verificar que no sea undefined, null, o string "undefined"
  if (data === undefined || data === null || data === 'undefined' || data === 'null') {
    console.log('❌ [CACHE] Datos inválidos: undefined/null');
    return false;
  }

  // Si es un objeto, verificar estructura mínima
  if (typeof data === 'object') {
    const hasRequiredFields = (
      data.id || 
      data.email || 
      data.name ||
      (data.user && (data.user.id || data.user.email))
    );
    
    if (!hasRequiredFields) {
      console.log('❌ [CACHE] Objeto sin campos requeridos:', data);
      return false;
    }
  }

  console.log('✅ [CACHE] Datos válidos');
  return true;
};

// 🔥 CACHE GLOBAL PERSISTENTE MEJORADO
class UserCacheManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.lastFetchTime = 0;
    this.CACHE_DURATION = 60000; // 60 segundos (aumentado)
    this.MIN_REQUEST_INTERVAL = 2000;
    this.MAX_RETRIES = 3;
    this.RATE_LIMIT_RETRY_DELAY = 5000;
    this.failedAttempts = new Map(); // Track de intentos fallidos
  }

  getCacheKey(token) {
    return `user_${token?.substring(0, 10) || 'default'}`;
  }

  isCacheValid(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    const isValid = (now - cached.timestamp) < this.CACHE_DURATION;
    
    // 🔥 VALIDAR TAMBIÉN QUE LOS DATOS NO ESTÉN CORRUPTOS
    if (isValid && !isValidUserData(cached.data)) {
      console.log('💥 [CACHE] Cache válido pero datos corruptos, eliminando...');
      this.cache.delete(cacheKey);
      return false;
    }
    
    if (isValid) {
      console.log('✅ Cache válido para:', cacheKey, `(${Math.round((now - cached.timestamp) / 1000)}s ago)`);
    } else {
      console.log('❌ Cache expirado para:', cacheKey);
      this.cache.delete(cacheKey);
    }
    
    return isValid;
  }

  canMakeRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastFetchTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      console.log(`⏳ Bloqueando request - muy pronto (${timeSinceLastRequest}ms < ${this.MIN_REQUEST_INTERVAL}ms)`);
      return false;
    }
    
    return true;
  }

  // 🔥 FUNCIÓN PRINCIPAL MEJORADA
  async getUser(forceRefresh = false) {
    const token = sessionStorage.getItem('token');
    if (!token) {
      console.log('🔍 [CACHE] No hay token');
      throw new Error('No authentication token found');
    }

    const cacheKey = this.getCacheKey(token);
    
    // 🔥 VERIFICAR FALLOS PREVIOS
    const failedCount = this.failedAttempts.get(cacheKey) || 0;
    if (failedCount >= 5) {
      console.log('🚨 [CACHE] Demasiados fallos consecutivos, limpiando token...');
      sessionStorage.removeItem('token');
      this.clearCache();
      throw new Error('Too many failed attempts, please login again');
    }

    // 🔥 STEP 1: Verificar cache válido
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      console.log('🎯 Retornando desde cache:', cached.data?.name || cached.data?.email || 'sin identificar');
      
      // Reset failed attempts en cache hits exitosos
      this.failedAttempts.delete(cacheKey);
      return cached.data;
    }

    // 🔥 STEP 2: Verificar request pendiente
    if (this.pendingRequests.has(cacheKey)) {
      console.log('⏳ Request ya en progreso, esperando...');
      try {
        const result = await this.pendingRequests.get(cacheKey);
        return result;
      } catch (error) {
        console.log('❌ [CACHE] Request pendiente falló');
        throw error;
      }
    }

    // 🔥 STEP 3: Rate limiting
    if (!this.canMakeRequest()) {
      const expiredCache = this.cache.get(cacheKey);
      if (expiredCache && isValidUserData(expiredCache.data)) {
        console.log('🔄 Usando cache expirado temporalmente para evitar rate limit');
        return expiredCache.data;
      }
      
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL));
    }

    // 🔥 STEP 4: Hacer request
    const requestPromise = this.makeRequestWithRetry(token, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // 🎉 ÉXITO - Reset failed attempts
      this.failedAttempts.delete(cacheKey);
      return result;
      
    } catch (error) {
      // 📈 Incrementar failed attempts
      const currentFails = this.failedAttempts.get(cacheKey) || 0;
      this.failedAttempts.set(cacheKey, currentFails + 1);
      
      console.log(`❌ [CACHE] Request falló (${currentFails + 1}/5 fallos)`, error.message);
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // 🔥 REQUEST MEJORADA CON VALIDACIÓN ESTRICTA
  async makeRequestWithRetry(token, cacheKey, retryCount = 0) {
    try {
      this.lastFetchTime = Date.now();
      
      console.log(`📡 Haciendo request a /api/profile (intento ${retryCount + 1}/${this.MAX_RETRIES})`);
      
      const response = await axios.get('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 segundos timeout (aumentado)
      });

      console.log('📡 [CACHE] Respuesta cruda del backend:', {
        status: response.status,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataValue: response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      // 🔥 VALIDACIÓN ESTRICTA DE LA RESPUESTA
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.data) {
        console.log('💥 [CACHE] Backend devolvió response.data vacío');
        throw new Error('Backend returned empty response.data');
      }

      // Extraer datos del usuario
      const userData = response.data.user || response.data;
      
      // 🔥 VALIDACIÓN CRÍTICA
      if (!isValidUserData(userData)) {
        console.log('💥 [CACHE] Backend devolvió datos inválidos:', userData);
        
        // Si es el último intento, lanzar error específico
        if (retryCount >= this.MAX_RETRIES - 1) {
          throw new Error('Backend consistently returning invalid user data');
        }
        
        // Reintentar inmediatamente
        console.log('🔄 [CACHE] Reintentando por datos inválidos...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.makeRequestWithRetry(token, cacheKey, retryCount + 1);
      }

      // 🎉 DATOS VÁLIDOS - GUARDAR EN CACHE
      this.cache.set(cacheKey, {
        data: userData,
        timestamp: Date.now()
      });
      
      console.log('✅ Usuario obtenido y cacheado:', userData?.name || userData?.email || userData?.id || 'usuario válido');
      return userData;

    } catch (error) {
      console.error(`❌ Error obteniendo usuario (intento ${retryCount + 1}):`, error.message);
      
      // 🔥 MANEJO DE 429 (Rate Limit)
      if (error.response?.status === 429) {
        console.warn('⚠️ Rate limited (429) detectado');
        
        const fallbackCache = this.cache.get(cacheKey);
        if (fallbackCache && isValidUserData(fallbackCache.data)) {
          console.log('🔄 Usando cache como fallback para rate limit');
          return fallbackCache.data;
        }
        
        if (retryCount < this.MAX_RETRIES) {
          const delay = this.RATE_LIMIT_RETRY_DELAY * (retryCount + 1);
          console.log(`⏳ Reintentando en ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequestWithRetry(token, cacheKey, retryCount + 1);
        }
      }

      // 🔥 MANEJO DE 401/403 (Auth errors)
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🚨 [CACHE] Error de autenticación, token inválido');
        sessionStorage.removeItem('token');
        this.clearCache();
        throw new Error('Authentication failed - please login again');
      }

      // 🔥 MANEJO DE ERRORES DE RED/TIMEOUT
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.log('⏱️ [CACHE] Timeout detectado');
        
        // Usar cache como fallback en timeout
        const fallbackCache = this.cache.get(cacheKey);
        if (fallbackCache && isValidUserData(fallbackCache.data)) {
          console.log('🔄 Usando cache como fallback para timeout');
          return fallbackCache.data;
        }
      }
      
      // 🔄 REINTENTOS PARA OTROS ERRORES
      if (retryCount < this.MAX_RETRIES) {
        const delay = 2000 * (retryCount + 1); // 2s, 4s, 6s
        console.log(`⏳ Reintentando en ${delay}ms por error ${error.response?.status || 'network'}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(token, cacheKey, retryCount + 1);
      }
      
      // 🚨 SI LLEGAMOS AQUÍ, NO PUDIMOS RECUPERARNOS
      throw error;
    }
  }

  // 🧹 LIMPIAR CACHE
  clearCache() {
    console.log('🧹 Limpiando cache de usuario');
    this.cache.clear();
    this.pendingRequests.clear();
    this.failedAttempts.clear();
  }

  clearCacheForToken(token) {
    const cacheKey = this.getCacheKey(token);
    this.cache.delete(cacheKey);
    this.pendingRequests.delete(cacheKey);
    this.failedAttempts.delete(cacheKey);
  }

  // 🔍 DEBUG INFO MEJORADO
  getDebugInfo() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      failedAttempts: this.failedAttempts.size,
      lastFetchTime: this.lastFetchTime,
      cacheEntries: Array.from(this.cache.keys()),
      cacheData: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        hasValidData: isValidUserData(value.data),
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    };
  }
}

// 🔥 INSTANCIA GLOBAL ÚNICA
const userCacheManager = new UserCacheManager();

// 🔥 AUTO-LIMPIEZA MEJORADA
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, cached] of userCacheManager.cache.entries()) {
    const age = now - cached.timestamp;
    const isOld = age > 600000; // 10 minutos
    const isInvalid = !isValidUserData(cached.data);
    
    if (isOld || isInvalid) {
      userCacheManager.cache.delete(key);
      cleaned++;
      console.log(`🧹 Cache entry auto-limpiado: ${key} (${isOld ? 'viejo' : 'inválido'})`);
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Auto-limpieza completada: ${cleaned} entradas eliminadas`);
  }
}, 300000); // Cada 5 minutos (más frecuente)

// 🔥 FUNCIÓN EXPORTADA PRINCIPAL
export const getUser = async (forceRefresh = false) => {
  return await userCacheManager.getUser(forceRefresh);
};

// Funciones auxiliares
export const clearUserCache = () => userCacheManager.clearCache();
export const getUserCacheDebug = () => userCacheManager.getDebugInfo();

export default userCacheManager;