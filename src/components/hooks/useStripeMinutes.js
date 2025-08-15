import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useStripeCoins = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    onBalanceChange = null,
    onCoinsLow = null,
    lowCoinsThreshold = 50, // 🔥 CAMBIO: 50 monedas = ~5 minutos
    onError = null,
    enableNotifications = true
  } = options;

  // 🔥 ESTADOS ACTUALIZADOS PARA MONEDAS
  const [balance, setBalance] = useState({
    purchased_coins: 0,
    gift_coins: 0,
    total_coins: 0,
    minutes_available: 0,
    cost_per_minute: 10,
    minimum_required: 30
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Estados específicos de Stripe
  const [stripeConfig, setStripeConfig] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [packages, setPackages] = useState([]);

  // Referencias para callbacks y cleanup
  const previousBalance = useRef(0);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Headers de autenticación
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      throw new Error('Token de autenticación no válido');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  // Manejo seguro de estados
  const safeSetState = useCallback((setter, value) => {
    if (mountedRef.current) {
      setter(value);
    }
  }, []);

  // 🔥 CONFIGURACIÓN STRIPE ACTUALIZADA
  const fetchStripeConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/config`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error obteniendo configuración`);
      }

      const data = await response.json();
      
      if (data.success) {
        const config = {
          publicKey: data.stripe_public_key,
          currency: data.currency || 'usd',
          coinSystem: data.coin_system || {
            cost_per_minute: 10,
            minimum_balance: 30
          }
        };
        safeSetState(setStripeConfig, config);
        return config;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error obteniendo configuración Stripe:', error);
      if (onError) onError(error);
      safeSetState(setError, error.message);
      return null;
    }
  }, [getAuthHeaders, onError, safeSetState]);

  // 🔥 BALANCE DE MONEDAS ACTUALIZADO
  const fetchBalance = useCallback(async () => {
    try {
      safeSetState(setError, null);
      const response = await fetch(`${API_BASE_URL}/api/coins/balance`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al obtener balance`);
      }

      const data = await response.json();
      
      if (data.success) {
        const newBalance = data.balance;
        const totalCoins = newBalance.total_coins;

        // Actualizar estados
        safeSetState(setBalance, newBalance);
        safeSetState(setLastUpdate, new Date());

        // Callbacks
        if (onBalanceChange && previousBalance.current !== totalCoins) {
          onBalanceChange(newBalance, previousBalance.current);
        }

        if (onCoinsLow && totalCoins <= lowCoinsThreshold && previousBalance.current > lowCoinsThreshold) {
          onCoinsLow(totalCoins);
        }

        previousBalance.current = totalCoins;
        return newBalance;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error obteniendo balance:', error);
      if (onError) onError(error);
      safeSetState(setError, error.message);
      return null;
    } finally {
      safeSetState(setLoading, false);
    }
  }, [getAuthHeaders, onBalanceChange, onCoinsLow, lowCoinsThreshold, onError, safeSetState]);

  // 🔥 PAQUETES DE MONEDAS ACTUALIZADOS
  const fetchPackages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/packages`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error obteniendo paquetes`);
      }

      const data = await response.json();

      if (data.success) {
        safeSetState(setPackages, data.packages || []);
        return {
          success: true,
          packages: data.packages || [],
          stripePublicKey: data.stripe_public_key,
          coinSystem: data.coin_system
        };
      } else {
        throw new Error(data.error || 'Error obteniendo paquetes');
      }
    } catch (error) {
      console.error('Error obteniendo paquetes:', error);
      if (onError) onError(error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [getAuthHeaders, onError, safeSetState]);

  // 🔥 CREAR PAYMENT INTENT ACTUALIZADO
  const createPaymentIntent = useCallback(async (packageId, returnUrl = window.location.origin) => {
    try {
      safeSetState(setProcessingPayment, true);
      
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/create-payment-intent`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          package_id: packageId,
          return_url: returnUrl
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error creando pago`);
      }

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          clientSecret: data.client_secret,
          purchaseId: data.purchase_id,
          amount: data.amount,
          currency: data.currency,
          paymentIntentId: data.payment_intent_id,
          packageInfo: data.package_info
        };
      } else {
        throw new Error(data.error || 'Error creando el pago');
      }
    } catch (error) {
      console.error('Error creando Payment Intent:', error);
      if (onError) onError(error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      safeSetState(setProcessingPayment, false);
    }
  }, [getAuthHeaders, onError, safeSetState]);

  // 🔥 CONFIRMAR PAGO ACTUALIZADO
  const confirmPayment = useCallback(async (paymentIntentId, purchaseId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/confirm-payment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          purchase_id: purchaseId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error confirmando pago`);
      }

      const data = await response.json();

      if (data.success) {
        // Refrescar balance después de pago exitoso
        await fetchBalance();
        
        return {
          success: true,
          message: data.message,
          coinsAdded: data.coins_added,
          bonusCoinsAdded: data.bonus_coins_added,
          totalCoinsAdded: data.total_coins_added,
          minutesEquivalent: data.minutes_equivalent,
          transactionId: data.transaction_id
        };
      } else {
        throw new Error(data.error || 'Error confirmando pago');
      }
    } catch (error) {
      console.error('Error confirmando pago:', error);
      if (onError) onError(error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [getAuthHeaders, fetchBalance, onError]);

  // 🔥 CANCELAR PAGO ACTUALIZADO
  const cancelPayment = useCallback(async (paymentIntentId, purchaseId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/cancel-payment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          purchase_id: purchaseId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error cancelando pago`);
      }

      const data = await response.json();

      return {
        success: data.success,
        message: data.message || (data.success ? 'Pago cancelado' : 'Error cancelando'),
        error: data.error
      };
    } catch (error) {
      console.error('Error cancelando pago:', error);
      if (onError) onError(error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [getAuthHeaders, onError]);

  // 🔥 CONSUMIR MONEDAS ACTUALIZADO
  const consumeCoins = useCallback(async (roomName, minutesConsumed, sessionId = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/coins/consume`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          room_name: roomName,
          minutes_consumed: minutesConsumed,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error consumiendo monedas`);
      }

      const data = await response.json();

      if (data.success) {
        // Actualizar balance local inmediatamente
        const newTotalCoins = data.remaining_balance;
        const updatedBalance = {
          ...balance,
          total_coins: newTotalCoins,
          minutes_available: Math.floor(newTotalCoins / balance.cost_per_minute)
        };
        
        safeSetState(setBalance, updatedBalance);
        
        // Callback de cambio de balance
        if (onBalanceChange) {
          onBalanceChange(updatedBalance, previousBalance.current);
        }
        previousBalance.current = newTotalCoins;
        
        return {
          success: true,
          consumed: data.consumed,
          breakdown: data.breakdown,
          remaining: data.remaining_balance,
          minutesRemaining: data.minutes_remaining,
          canContinue: data.can_continue
        };
      } else {
        return {
          success: false,
          error: data.error,
          currentBalance: data.current_balance,
          required: data.required,
          action: data.action
        };
      }
    } catch (error) {
      console.error('Error consumiendo monedas:', error);
      if (onError) onError(error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [getAuthHeaders, balance, onBalanceChange, onError, safeSetState]);

  // 🔥 NUEVAS FUNCIONES PARA MONEDAS
  const hasEnoughCoins = useCallback((requiredCoins) => {
    return balance.total_coins >= requiredCoins;
  }, [balance.total_coins]);

  const hasEnoughMinutes = useCallback((requiredMinutes) => {
    const requiredCoins = requiredMinutes * balance.cost_per_minute;
    return balance.total_coins >= requiredCoins;
  }, [balance.total_coins, balance.cost_per_minute]);

  const canStartVideoChat = useCallback(() => {
    return balance.total_coins >= balance.minimum_required;
  }, [balance.total_coins, balance.minimum_required]);

  // 🔥 HISTORIAL ACTUALIZADO
  const fetchPurchaseHistory = useCallback(async (page = 1) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/history?page=${page}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error obteniendo historial`);
      }

      const data = await response.json();

      if (data.success) {
        const history = data.purchases?.data || data.purchases || [];
        safeSetState(setPurchaseHistory, history);
        return {
          success: true,
          purchases: data.purchases
        };
      } else {
        throw new Error(data.error || 'Error obteniendo historial');
      }
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      if (onError) onError(error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [getAuthHeaders, onError, safeSetState]);

  // 🔥 COMPRA SANDBOX ACTUALIZADA
  const purchaseSandbox = useCallback(async (packageId) => {
    try {
      safeSetState(setProcessingPayment, true);
      
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/sandbox-purchase`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          package_id: packageId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error en compra sandbox`);
      }

      const data = await response.json();

      if (data.success) {
        // Refrescar balance después de compra exitosa
        await fetchBalance();
        
        return {
          success: true,
          transactionId: data.transaction_id,
          coinsAdded: data.coins_added,
          bonusCoinsAdded: data.bonus_coins_added,
          totalCoinsAdded: data.total_coins_added,
          minutesEquivalent: data.minutes_equivalent,
          sandbox: data.sandbox,
          message: data.message
        };
      } else {
        throw new Error(data.error || 'Error en compra sandbox');
      }
    } catch (error) {
      console.error('Error en compra sandbox:', error);
      if (onError) onError(error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      safeSetState(setProcessingPayment, false);
    }
  }, [getAuthHeaders, fetchBalance, onError, safeSetState]);

  // 🔥 VERIFICAR ESTADO ACTUALIZADO
  const checkPurchaseStatus = useCallback(async (purchaseId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/purchase-status/${purchaseId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error obteniendo estado`);
      }

      const data = await response.json();

      return {
        success: data.success,
        purchase: data.purchase,
        status: data.status,
        error: data.error
      };
    } catch (error) {
      console.error('Error verificando estado:', error);
      if (onError) onError(error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [getAuthHeaders, onError]);

  // 🔥 FUNCIONES DE FORMATO ACTUALIZADAS
  const formatCoins = useCallback((coins) => {
    return coins ? `${coins.toLocaleString()}` : '0';
  }, []);

  const formatMinutesFromCoins = useCallback((coins, costPerMinute = 10) => {
    if (!coins || coins < 0) return '0m';
    
    const minutes = Math.floor(coins / costPerMinute);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }, []);

  // 🔥 ESTADO DEL BALANCE ACTUALIZADO
  const getBalanceStatus = useCallback(() => {
    const totalCoins = balance.total_coins;
    const minimumRequired = balance.minimum_required;
    
    if (totalCoins === 0) {
      return {
        status: 'empty',
        color: 'red',
        message: 'Sin monedas disponibles',
        urgent: true,
        recommendation: 'Compra monedas para hacer videollamadas'
      };
    } else if (totalCoins < minimumRequired) {
      return {
        status: 'insufficient',
        color: 'red',
        message: 'Monedas insuficientes para videochat',
        urgent: true,
        recommendation: `Necesitas al menos ${minimumRequired} monedas`
      };
    } else if (totalCoins < lowCoinsThreshold) {
      return {
        status: 'low',
        color: 'yellow',
        message: 'Monedas bajas - Considera recargar',
        urgent: false,
        recommendation: 'Recarga pronto para evitar interrupciones'
      };
    } else if (totalCoins < 100) {
      return {
        status: 'moderate',
        color: 'blue',
        message: 'Balance adecuado',
        urgent: false,
        recommendation: 'Tienes suficientes monedas'
      };
    } else {
      return {
        status: 'good',
        color: 'green',
        message: 'Balance excelente',
        urgent: false,
        recommendation: 'Perfecto para múltiples videollamadas'
      };
    }
  }, [balance.total_coins, balance.minimum_required, lowCoinsThreshold]);

  // 🔥 ESTADÍSTICAS ACTUALIZADAS
  const getStats = useCallback(() => {
    const totalCoins = balance.total_coins;
    const purchasedCoins = balance.purchased_coins;
    const giftCoins = balance.gift_coins;
    const minutesAvailable = balance.minutes_available;
    const costPerMinute = balance.cost_per_minute;
    
    const estimatedUsedCoins = (purchasedCoins + giftCoins) - totalCoins;
    const usagePercentage = (purchasedCoins + giftCoins) > 0 ? 
      Math.round((estimatedUsedCoins / (purchasedCoins + giftCoins)) * 100) : 0;
    const remainingPercentage = (purchasedCoins + giftCoins) > 0 ? 
      Math.round((totalCoins / (purchasedCoins + giftCoins)) * 100) : 0;

    return {
      totalCoins,
      purchasedCoins,
      giftCoins,
      minutesAvailable,
      costPerMinute,
      estimatedUsedCoins,
      usagePercentage,
      remainingPercentage,
      totalTransactions: purchaseHistory.length,
      efficiency: usagePercentage,
      canStartVideoChat: totalCoins >= balance.minimum_required,
      minutesRemaining: Math.floor(totalCoins / costPerMinute)
    };
  }, [balance, purchaseHistory]);

  // Inicialización - sin cambios
  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          fetchStripeConfig(),
          fetchBalance(),
          fetchPackages()
        ]);
      } catch (error) {
        console.error('Error inicializando hook:', error);
        if (onError) onError(error);
      }
    };

    initialize();
  }, [fetchStripeConfig, fetchBalance, fetchPackages, onError]);

  // Auto-refresh - sin cambios
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchBalance();
        }
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchBalance]);

  // Cleanup al desmontar - sin cambios
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Validar token periódicamente - sin cambios
  useEffect(() => {
    const validateToken = () => {
      try {
        getAuthHeaders();
      } catch (error) {
        safeSetState(setError, 'Sesión expirada. Por favor, inicia sesión nuevamente.');
        if (onError) onError(new Error('Token inválido'));
      }
    };

    const tokenValidationInterval = setInterval(validateToken, 60000);
    
    return () => clearInterval(tokenValidationInterval);
  }, [getAuthHeaders, onError, safeSetState]);

  return {
    // 🔥 ESTADOS ACTUALIZADOS
    balance,
    loading,
    error,
    lastUpdate,

    // Estados de Stripe
    stripeConfig,
    processingPayment,
    packages,
    purchaseHistory,

    // 🔥 FUNCIONES PRINCIPALES ACTUALIZADAS
    fetchBalance,
    consumeCoins,
    hasEnoughCoins,
    hasEnoughMinutes,
    canStartVideoChat,
    fetchPackages,
    fetchPurchaseHistory,
    formatCoins,
    formatMinutesFromCoins,
    getBalanceStatus,
    getStats,

    // Funciones de Stripe
    createPaymentIntent,
    confirmPayment,
    cancelPayment,
    fetchStripeConfig,
    checkPurchaseStatus,

    // Función sandbox
    purchaseSandbox,

    // 🔥 UTILIDADES COMPUTADAS ACTUALIZADAS
    ...getStats(),

    // 🔥 CONTROL DE ESTADO ACTUALIZADO
    isReady: !loading && !error && stripeConfig !== null,
    needsTopUp: balance.total_coins < lowCoinsThreshold,
    canMakeCalls: balance.total_coins >= balance.minimum_required,
    criticallyLow: balance.total_coins < balance.minimum_required,
    
    // Funciones de utilidad
    refresh: () => fetchBalance(),
    clearError: () => safeSetState(setError, null)
  };
};

// 🔥 HOOK ESPECIALIZADO PARA VIDEOCHAT ACTUALIZADO
export const useStripeVideoChat = (options = {}) => {
  const coins = useStripeCoins({
    autoRefresh: true,
    refreshInterval: 10000,
    lowCoinsThreshold: 50, // ~5 minutos
    ...options
  });

  const canStartVideoChat = useCallback(() => {
    return coins.balance.total_coins >= coins.balance.minimum_required;
  }, [coins.balance.total_coins, coins.balance.minimum_required]);

  const consumeForVideoChat = useCallback(async (roomName, minutesUsed, sessionId = null) => {
    const requiredCoins = minutesUsed * coins.balance.cost_per_minute;
    
    if (!coins.hasEnoughCoins(requiredCoins)) {
      return {
        success: false,
        error: 'Monedas insuficientes para el videochat',
        required: requiredCoins,
        available: coins.balance.total_coins,
        action: 'end_call'
      };
    }

    return await coins.consumeCoins(roomName, minutesUsed, sessionId);
  }, [coins]);

  const getMaxVideoChatDuration = useCallback(() => {
    return Math.floor(coins.balance.total_coins / coins.balance.cost_per_minute);
  }, [coins.balance.total_coins, coins.balance.cost_per_minute]);

  const shouldShowWarning = useCallback((estimatedMinutes = 30) => {
    const requiredCoins = estimatedMinutes * coins.balance.cost_per_minute;
    return coins.balance.total_coins < requiredCoins && coins.balance.total_coins > 0;
  }, [coins.balance.total_coins, coins.balance.cost_per_minute]);

  const getVideoChatTimeRemaining = useCallback(() => {
    const minutes = Math.floor(coins.balance.total_coins / coins.balance.cost_per_minute);
    return {
      minutes,
      hours: Math.floor(minutes / 60),
      formattedTime: coins.formatMinutesFromCoins(coins.balance.total_coins, coins.balance.cost_per_minute)
    };
  }, [coins.balance.total_coins, coins.balance.cost_per_minute, coins.formatMinutesFromCoins]);

  return {
    ...coins,
    canStartVideoChat,
    consumeForVideoChat,
    getMaxVideoChatDuration,
    shouldShowWarning,
    getVideoChatTimeRemaining,
    
    // Estados específicos para videochat
    criticallyLow: coins.balance.total_coins < coins.balance.minimum_required,
    warningLevel: coins.balance.total_coins < 50,
    safeLevel: coins.balance.total_coins >= 100,
    canAffordMinutes: (minutes) => coins.balance.total_coins >= (minutes * coins.balance.cost_per_minute)
  };
};

// 🔥 HOOK DE NOTIFICACIONES ACTUALIZADO
export const useCoinsNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: new Date(),
      duration: 5000,
      type: 'info',
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, newNotification.duration);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const notifyLowCoins = useCallback((totalCoins, costPerMinute = 10) => {
    const minutes = Math.floor(totalCoins / costPerMinute);
    return addNotification({
      type: 'warning',
      title: 'Monedas Bajas',
      message: `Te quedan ${totalCoins} monedas (≈ ${minutes} minutos). Considera recargar.`,
      duration: 8000
    });
  }, [addNotification]);

  const notifyPurchaseSuccess = useCallback((coinsAdded, bonusCoins = 0) => {
    const totalAdded = coinsAdded + bonusCoins;
    const message = bonusCoins > 0 
      ? `Se agregaron ${coinsAdded} monedas + ${bonusCoins} bonus = ${totalAdded} monedas totales.`
      : `Se agregaron ${totalAdded} monedas a tu cuenta.`;
      
    return addNotification({
      type: 'success',
      title: 'Compra Exitosa',
      message,
      duration: 5000
    });
  }, [addNotification]);

  const notifyCoinsConsumed = useCallback((coinsConsumed, remaining, breakdown = null) => {
    let message = `Usaste ${coinsConsumed} monedas. Te quedan ${remaining} monedas.`;
    
    if (breakdown) {
      message += ` (${breakdown.gift_coins_used} regalo + ${breakdown.purchased_coins_used} compradas)`;
    }
    
    return addNotification({
      type: 'info',
      title: 'Monedas Consumidas',
      message,
      duration: 3000
    });
  }, [addNotification]);

  const notifyInsufficientCoins = useCallback((required, available) => {
    return addNotification({
      type: 'error',
      title: 'Monedas Insuficientes',
      message: `Necesitas ${required} monedas pero solo tienes ${available}. Recarga para continuar.`,
      duration: 8000
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    notifyLowCoins,
    notifyPurchaseSuccess,
    notifyCoinsConsumed,
    notifyInsufficientCoins
  };
};