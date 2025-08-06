import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { 
  Coins, // 🔥 CAMBIO: Clock -> Coins
  CreditCard, 
  Zap, 
  Star, 
  Check, 
  AlertCircle, 
  Loader,
  Gift,
  Shield,
  DollarSign,
  X,
  Lock,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Configuración de estilo para CardElement
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: 'transparent',
      '::placeholder': {
        color: '#9ca3af',
      },
      iconColor: '#ff007a',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
  hidePostalCode: false,
};

// Componente del formulario de pago - ACTUALIZADO PARA MONEDAS
function CheckoutForm({ 
  selectedPackage, 
  onSuccess, 
  onError, 
  onCancel,
  clientSecret,
  purchaseId 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardName, setCardName] = useState('');

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    try {
      // Confirmar el pago con Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardName || 'Usuario'
            }
          }
        }
      );

      if (stripeError) {
        console.error('Error de Stripe:', stripeError);
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // 🔥 CAMBIO: URL actualizada para monedas
        const response = await fetch(`${API_BASE_URL}/api/stripe-coins/confirm-payment`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            purchase_id: purchaseId
          })
        });

        const data = await response.json();

        if (data.success) {
          onSuccess({
            transactionId: paymentIntent.id,
            // 🔥 CAMBIO: Manejo de monedas en lugar de minutos
            coinsAdded: data.coins_added,
            bonusCoinsAdded: data.bonus_coins_added,
            totalCoinsAdded: data.total_coins_added,
            minutesEquivalent: data.minutes_equivalent,
            message: data.message
          });
        } else {
          setError(data.error || 'Error confirmando el pago');
        }
      }

    } catch (err) {
      console.error('Error procesando pago:', err);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setProcessing(false);
    }
  };

  // 🔥 NUEVA FUNCIÓN: Formatear monedas
  const formatCoins = (coins) => {
    return coins ? `${coins.toLocaleString()} monedas` : '0 monedas';
  };

  // 🔥 FUNCIÓN ACTUALIZADA: Calcular minutos equivalentes
  const formatMinutesFromCoins = (coins, costPerMinute = 10) => {
    const minutes = Math.floor(coins / costPerMinute);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resumen del paquete */}
      <div className="bg-[#1a1c20] rounded-lg p-4 border border-[#ff007a]/30">
        <h3 className="text-lg font-bold text-white mb-2">Resumen de Compra</h3>
        
        {/* 🔥 CAMBIO: Mostrar monedas en lugar de minutos */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/70">{selectedPackage.name}</span>
          <span className="text-[#ff007a] font-bold">
            {formatCoins(selectedPackage.coins)}
          </span>
        </div>
        
        {/* 🔥 CAMBIO: Monedas bonus */}
        {selectedPackage.bonus_coins > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-green-400 text-sm flex items-center gap-1">
              <Gift size={14} />
              Monedas bonus
            </span>
            <span className="text-green-400 text-sm">
              +{formatCoins(selectedPackage.bonus_coins)}
            </span>
          </div>
        )}
        
        {/* 🔥 NUEVO: Equivalente en minutos */}
        {selectedPackage.type !== 'gifts' && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-blue-400 text-sm">Equivalente en tiempo</span>
            <span className="text-blue-400 text-sm">
              ≈ {formatMinutesFromCoins(selectedPackage.total_coins || (selectedPackage.coins + (selectedPackage.bonus_coins || 0)))}
            </span>
          </div>
        )}
        <div className="border-t border-gray-600 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold">Total</span>
            <span className="text-2xl font-bold text-[#ff007a]">
              ${selectedPackage.price}
            </span>
          </div>
        </div>
      </div>

      {/* Resto del formulario igual... */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="text-green-400" size={16} />
          <span className="text-sm text-green-400">Pago seguro con encriptación SSL</span>
        </div>

        {/* Nombre en tarjeta */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Nombre en la tarjeta
          </label>
          <input
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="Nombre completo"
            className="w-full bg-[#1a1c20] border border-gray-600 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:border-[#ff007a] focus:outline-none transition-colors"
          />
        </div>

        {/* Información de tarjeta */}
        <div className="bg-[#1a1c20] rounded-lg p-4 border border-gray-600 focus-within:border-[#ff007a] transition-colors">
          <label className="block text-sm font-medium text-white/70 mb-2">
            Información de la Tarjeta
          </label>
          <CardElement
            options={cardElementOptions}
            onChange={(event) => {
              setCardComplete(event.complete);
              if (event.error) {
                setError(event.error.message);
              } else {
                setError(null);
              }
            }}
          />
        </div>

        {/* Tarjetas aceptadas */}
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-xs text-white/50">Aceptamos:</span>
          <div className="flex gap-2">
            {['VISA', 'Mastercard', 'American Express', 'Discover'].map((card) => (
              <div key={card} className="text-xs bg-white/10 px-2 py-1 rounded text-white/60">
                {card}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-400" size={16} />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || processing || !cardComplete || !cardName.trim()}
          className="flex-1 bg-gradient-to-r from-[#ff007a] to-[#ff4499] hover:from-[#e6006e] hover:to-[#e6007a] text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader className="animate-spin" size={18} />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard size={18} />
              Pagar ${selectedPackage.price}
            </>
          )}
        </button>
      </div>

      {/* Información de seguridad */}
      <div className="text-center">
        <p className="text-xs text-white/50">
          Tu información de pago está protegida con encriptación de grado bancario.
          No almacenamos los datos de tu tarjeta.
        </p>
      </div>
    </form>
  );
}

// 🔥 COMPONENTE PRINCIPAL ACTUALIZADO PARA MONEDAS
export default function StripeBuyCoins({ onClose }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [packages, setPackages] = useState([]);
  const [balance, setBalance] = useState(null); // 🔥 CAMBIO: Objeto completo en lugar de número
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [purchaseId, setPurchaseId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [activePackageType, setActivePackageType] = useState('minutes'); // Por defecto minutos


  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Cargar Stripe y datos iniciales
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        // 🔥 CAMBIO: URL actualizada para monedas
        const configResponse = await fetch(`${API_BASE_URL}/api/stripe-coins/config`, {
          headers: getAuthHeaders()
        });
        const configData = await configResponse.json();

        if (configData.success) {
          const stripe = await loadStripe(configData.stripe_public_key);
          setStripePromise(stripe);
        }

        // Cargar paquetes, balance e historial
        await Promise.all([
          fetchPackages(), 
          fetchBalance(),
          fetchPurchaseHistory()
        ]);

      } catch (error) {
        console.error('Error inicializando Stripe:', error);
        showNotification('Error de configuración. Intenta más tarde.', 'error');
      } finally {
        setLoading(false);
      }
    };

    initializeStripe();
  }, []);

  const fetchBalance = async () => {
  try {
    // 1. Obtener balance de minutos
    const minutesResponse = await fetch(`${API_BASE_URL}/api/coins/balance`, {
      headers: getAuthHeaders()
    });
    const minutesData = await minutesResponse.json();

    // 2. Obtener balance de regalos
    const giftsResponse = await fetch(`${API_BASE_URL}/api/gifts/balance`, {
      headers: getAuthHeaders()
    });
    const giftsData = await giftsResponse.json();

    // 3. Combinar balances
    let combinedBalance = {
      // Balance de minutos (videochat)
      purchased_coins: 0,
      gift_coins: 0,
      total_coins: 0,
      minutes_available: 0,
      // Balance de regalos
      gift_balance: 0,
      total_received_gifts: 0,
      total_sent_gifts: 0
    };

    if (minutesData.success) {
      combinedBalance.purchased_coins = minutesData.balance.purchased_coins || 0;
      combinedBalance.gift_coins = minutesData.balance.gift_coins || 0;
      combinedBalance.total_coins = minutesData.balance.total_coins || 0;
      combinedBalance.minutes_available = minutesData.balance.minutes_available || 0;
    }

    if (giftsData.success) {
      combinedBalance.gift_balance = giftsData.balance.gift_balance || 0;
      combinedBalance.total_received_gifts = giftsData.balance.total_received || 0;
      combinedBalance.total_sent_gifts = giftsData.balance.total_sent || 0;
    }

    setBalance(combinedBalance);

    // 🔍 DEBUG: Log para verificar
    console.log('💰 Balances obtenidos:', {
      minutesData: minutesData.success ? minutesData.balance : 'Error',
      giftsData: giftsData.success ? giftsData.balance : 'Error',
      combinedBalance
    });

  } catch (error) {
    console.error('Error obteniendo balance:', error);
    // Establecer balance por defecto en caso de error
    setBalance({
      purchased_coins: 0,
      gift_coins: 0,
      total_coins: 0,
      minutes_available: 0,
      gift_balance: 0,
      total_received_gifts: 0,
      total_sent_gifts: 0
    });
  }
  };

  const fetchPackages = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stripe-coins/packages`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (data.success) {
      // NO FILTRAR - obtener todos los paquetes
      setPackages(data.packages);
    }
  } catch (error) {
    console.error('Error obteniendo paquetes:', error);
  }
  };

  // 3. FUNCIÓN para filtrar paquetes según el tipo activo
  const getFilteredPackages = () => {
    return packages.filter(pkg => pkg.type === activePackageType);
  };

  const fetchPurchaseHistory = async () => {
    try {
      // 🔥 CAMBIO: URL actualizada para monedas
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/history`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setPurchaseHistory((data.purchases.data || []).slice(0, 3));
      }
    } catch (error) {
      console.error('Error obteniendo historial:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const selectPackage = async (pkg) => {
    setSelectedPackage(pkg);
    setCreatingPayment(true);

    try {
      // 🔥 CAMBIO: URL actualizada para monedas
      const response = await fetch(`${API_BASE_URL}/api/stripe-coins/create-payment-intent`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          package_id: pkg.id,
          return_url: window.location.origin + '/buy-coins' // 🔥 CAMBIO: URL actualizada
        })
      });

      const data = await response.json();

      if (data.success) {
        setClientSecret(data.client_secret);
        setPurchaseId(data.purchase_id);
        setShowCheckout(true);
      } else {
        showNotification(data.error || 'Error creando el pago', 'error');
        setSelectedPackage(null);
      }
    } catch (error) {
      console.error('Error creando pago:', error);
      showNotification('Error de conexión. Intenta nuevamente.', 'error');
      setSelectedPackage(null);
    } finally {
      setCreatingPayment(false);
    }
  };

  const handlePaymentSuccess = async (result) => {
  // Detectar tipo de compra basado en la respuesta
  const isGiftPurchase = result.type === 'gift_coins';
  
  if (isGiftPurchase) {
    showNotification(
      `¡Pago exitoso! Se agregaron ${result.total_gift_coins_added} monedas de regalo a tu cuenta`,
      'success'
    );
  } else {
    showNotification(
      `¡Pago exitoso! Se agregaron ${result.totalCoinsAdded} monedas (≈ ${result.minutesEquivalent} minutos) a tu cuenta`,
      'success'
    );
  }
  
  // Actualizar balance e historial
  await Promise.all([
    fetchBalance(),
    fetchPurchaseHistory()
  ]);
  
  // Cerrar checkout y resetear
  setShowCheckout(false);
  setSelectedPackage(null);
  setClientSecret('');
  setPurchaseId(null);

  // Cerrar modal después de un momento
  setTimeout(() => {
    if (onClose) onClose();
  }, 2000);
  };

  const handlePaymentError = (error) => {
    showNotification(error, 'error');
  };

  const handleCancel = async () => {
    if (purchaseId && clientSecret) {
      try {
        // 🔥 CAMBIO: URL actualizada para monedas
        await fetch(`${API_BASE_URL}/api/stripe-coins/cancel-payment`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            payment_intent_id: clientSecret.split('_secret_')[0],
            purchase_id: purchaseId
          })
        });
      } catch (error) {
        console.error('Error cancelando pago:', error);
      }
    }

    setShowCheckout(false);
    setSelectedPackage(null);
    setClientSecret('');
    setPurchaseId(null);
  };

  // 🔥 NUEVAS FUNCIONES DE FORMATEO
  const formatCoins = (coins) => {
    return coins ? `${coins.toLocaleString()}` : '0';
  };

  const formatMinutesFromCoins = (coins, costPerMinute = 10) => {
    const minutes = Math.floor(coins / costPerMinute);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const calculateSavings = (pkg) => {
    const basePackage = packages.find(p => p.coins === 100); // 🔥 CAMBIO: Buscar por monedas
    if (!basePackage || pkg.total_coins <= basePackage.total_coins) return 0;
    
    const baseRate = basePackage.price / basePackage.total_coins;
    const currentRate = pkg.price / pkg.total_coins;
    
    return Math.round(((baseRate - currentRate) / baseRate) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-[#ff007a] mx-auto mb-4" size={48} />
          <p className="text-white/70">Cargando sistema de pagos...</p>
        </div>
      </div>
    );
  }

return (
  <div className="text-white w-[80vw] h-[90vh] mx-auto overflow-auto">
    {/* Notificación */}
    {notification && (
      <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
        notification.type === 'success'
          ? 'bg-green-500/90 border border-green-400'
          : 'bg-red-500/90 border border-red-400'
      }`}>
        <div className="flex items-center gap-2">
          {notification.type === 'success' ? (
            <Check size={20} className="text-white" />
          ) : (
            <AlertCircle size={20} className="text-white" />
          )}
          <p className="text-white font-medium">{notification.message}</p>
        </div>
      </div>
    )}

    {!showCheckout ? (
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-[#ff007a] to-[#ff4499] rounded-full flex items-center justify-center">
              {/* 🔥 CAMBIO: Clock -> Coins */}
              <Coins size={24} className="text-white" />
            </div>
            {/* 🔥 CAMBIO: Título actualizado */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              {activePackageType === 'minutes' ? 'Comprar Minutos' : 'Enviar Regalos'}
            </h1>
          </div>

          {/* 🔥 BALANCE ACTUALIZADO PARA MONEDAS */}
          <div className="bg-[#2b2d31] rounded-xl p-6 mb-6 border border-[#ff007a]/20">
            <div className="text-center">
              <p className="text-white/70 mb-4">Tu balance actual</p>
              
              {balance && (
                <>
                  {/* Balance según el tipo activo */}
                  {activePackageType === 'minutes' ? (
                    // MOSTRAR BALANCE DE MINUTOS
                    <>
                      <div className="text-3xl sm:text-4xl font-bold text-[#ff007a] mb-2">
                        {formatCoins(balance.total_coins)} monedas
                      </div>
                      <div className="text-lg text-blue-400 mb-4">
                        ≈ {formatMinutesFromCoins(balance.total_coins)} disponibles para videochat
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div className="bg-[#1a1c20] rounded-lg p-3">
                          <div className="text-white/60">Compradas</div>
                          <div className="text-[#ff007a] font-bold">{formatCoins(balance.purchased_coins)}</div>
                        </div>
                        <div className="bg-[#1a1c20] rounded-lg p-3">
                          <div className="text-white/60">Regalo (minutos)</div>
                          <div className="text-green-400 font-bold">{formatCoins(balance.gift_coins)}</div>
                        </div>
                      </div>
                      <p className="text-white/50 text-sm mt-3">
                        {balance.total_coins === 0
                          ? 'Necesitas comprar monedas para hacer videollamadas'
                          : `Puedes hacer videollamadas por ${formatMinutesFromCoins(balance.total_coins)}`}
                      </p>
                    </>
                  ) : (
                    // MOSTRAR BALANCE DE REGALOS
                    <>
                      <div className="text-3xl sm:text-4xl font-bold text-[#ff007a] mb-2">
                        {formatCoins(balance.gift_balance)} monedas regalo
                      </div>
                      <div className="text-lg text-green-400 mb-4">
                        Disponibles para enviar regalos
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div className="bg-[#1a1c20] rounded-lg p-3">
                          <div className="text-white/60">Recibidos</div>
                          <div className="text-green-400 font-bold">{formatCoins(balance.total_received_gifts)}</div>
                        </div>
                        <div className="bg-[#1a1c20] rounded-lg p-3">
                          <div className="text-white/60">Enviados</div>
                          <div className="text-orange-400 font-bold">{formatCoins(balance.total_sent_gifts)}</div>
                        </div>
                      </div>
                      <p className="text-white/50 text-sm mt-3">
                        {balance.gift_balance === 0
                          ? 'Compra paquetes de regalo para enviar a otros usuarios'
                          : `Tienes ${formatCoins(balance.gift_balance)} monedas para regalar`}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-center mb-8">
          <div className="bg-[#2b2d31] rounded-xl p-2 border border-gray-600">
            <div className="flex gap-2">
              <button
                onClick={() => setActivePackageType('minutes')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activePackageType === 'minutes'
                    ? 'bg-gradient-to-r from-[#ff007a] to-[#ff4499] text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-[#1a1c20]'
                }`}
              >
                <Coins size={18} />
                Comprar Minutos
              </button>
              <button
                onClick={() => setActivePackageType('gifts')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activePackageType === 'gifts'
                    ? 'bg-gradient-to-r from-[#ff007a] to-[#ff4499] text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-[#1a1c20]'
                }`}
              >
                <Gift size={18} />
                Enviar Regalos
              </button>
            </div>
          </div>
        </div>

        {/* 🔥 PAQUETES ACTUALIZADOS PARA MONEDAS */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {getFilteredPackages().map((pkg) => {
            const savings = calculateSavings(pkg);
            const isGiftPackage = pkg.type === 'gifts';

            return (
              <div
                key={pkg.id}
                className={`relative bg-[#2b2d31] rounded-xl p-6 border-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                  pkg.is_popular
                    ? 'border-[#ff007a] shadow-lg shadow-[#ff007a]/20'
                    : 'border-gray-600 hover:border-[#ff007a]/50'
                } ${creatingPayment ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => !creatingPayment && selectPackage(pkg)}
              >
                {pkg.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-[#ff007a] to-[#ff4499] text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Star size={14} fill="currentColor" />
                      MÁS POPULAR
                    </div>
                  </div>
                )}
                {pkg.discount_percentage > 0 && (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      -{pkg.discount_percentage}%
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg sm:text-xl font-bold mb-2">{pkg.name}</h3>

                  <div className="mb-4">
                    {/* Mostrar monedas */}
                    <div className="text-2xl sm:text-3xl font-bold text-[#ff007a] mb-1">
                      {formatCoins(pkg.coins)} monedas
                    </div>
                    
                    {/* Monedas bonus */}
                    {pkg.bonus_coins > 0 && (
                      <div className="flex items-center justify-center gap-1 text-green-400 text-sm">
                        <Gift size={14} />
                        +{formatCoins(pkg.bonus_coins)} gratis
                      </div>
                    )}
                    
                    {/* SOLO para paquetes de MINUTOS - mostrar equivalencia */}
                    {!isGiftPackage && (
                      <div className="text-blue-400 text-sm mt-1">
                        ≈ {formatMinutesFromCoins(pkg.total_coins)} de videochat
                      </div>
                    )}
                    
                    {/* Total de monedas - diferente texto según el tipo */}
                    <div className="text-white/50 text-sm">
                      Total: {formatCoins(pkg.total_coins)} monedas{isGiftPackage ? ' para regalar' : ''}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-xl sm:text-2xl font-bold mb-1">
                      ${pkg.price}
                      <span className="text-sm text-white/50 ml-1">USD</span>
                    </div>
                    {/* Valor por moneda */}
                    <div className="text-xs text-white/40">
                      ${(pkg.price / pkg.total_coins).toFixed(4)} por moneda
                    </div>
                  </div>

                  {/* Descripción del paquete */}
                  {pkg.description && (
                    <p className="text-white/60 text-sm mb-4">{pkg.description}</p>
                  )}

                  {/* Botón - texto diferente según el tipo */}
                  <button
                    disabled={creatingPayment}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 ${
                      pkg.is_popular
                        ? 'bg-gradient-to-r from-[#ff007a] to-[#ff4499] hover:from-[#e6006e] hover:to-[#e6007a] text-white'
                        : 'bg-[#ff007a] hover:bg-[#e6006e] text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {creatingPayment ? (
                        <>
                          <Loader className="animate-spin" size={18} />
                          Preparando...
                        </>
                      ) : (
                        <>
                          {isGiftPackage ? (
                            <>
                              <Gift size={18} />
                              Comprar Regalo
                            </>
                          ) : (
                            <>
                              <CreditCard size={18} />
                              Comprar ahora
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info de seguridad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#2b2d31] rounded-xl p-6 text-center border border-blue-500/20">
            <Shield className="text-blue-400 mx-auto mb-3" size={32} />
            <h3 className="font-bold mb-2">Pago Seguro</h3>
            <p className="text-white/60 text-sm">
              Procesado por Stripe con encriptación bancaria
            </p>
          </div>
          <div className="bg-[#2b2d31] rounded-xl p-6 text-center border border-green-500/20">
            <Zap className="text-green-400 mx-auto mb-3" size={32} />
            <h3 className="font-bold mb-2">Activación Inmediata</h3>
            <p className="text-white/60 text-sm">
              {/* 🔥 CAMBIO: Texto actualizado */}
              Las monedas se activan al confirmar el pago
            </p>
          </div>
          <div className="bg-[#2b2d31] rounded-xl p-6 text-center border border-yellow-500/20">
            <TrendingUp className="text-yellow-400 mx-auto mb-3" size={32} />
            <h3 className="font-bold mb-2">Mejor Valor</h3>
            <p className="text-white/60 text-sm">
              {/* 🔥 CAMBIO: Texto actualizado */}
              Más monedas = mayor ahorro por moneda
            </p>
          </div>
        </div>

        {/* 🔥 HISTORIAL ACTUALIZADO PARA MONEDAS */}
        {purchaseHistory.length > 0 && (
          <div className="bg-[#2b2d31] rounded-xl p-6 border border-gray-600">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="text-[#ff007a]" size={24} />
              Compras Recientes
            </h3>
            <div className="space-y-3">
              {purchaseHistory.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-[#1a1c20] rounded-lg"
                >
                  <div className="mb-2 sm:mb-0">
                    <div className="font-medium">
                      {/* 🔥 CAMBIO: Mostrar monedas en lugar de minutos */}
                      {formatCoins(purchase.total_coins)} monedas compradas
                      {purchase.bonus_coins > 0 && (
                        <span className="text-green-400 text-sm ml-2">
                          (+{formatCoins(purchase.bonus_coins)} bonus)
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-blue-400">
                      ≈ {formatMinutesFromCoins(purchase.total_coins)} de videochat
                    </div>
                    <div className="text-sm text-white/50">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#ff007a]">
                      ${purchase.amount}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full mt-1 sm:mt-0 ${
                      purchase.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {purchase.status === 'completed' ? 'Completado' : 'Pendiente'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ) : (
      <div className="p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#2b2d31] rounded-xl p-6 sm:p-8 border border-[#ff007a]/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <CreditCard className="text-[#ff007a]" size={24} />
                Finalizar Compra
              </h2>
              <div className="flex items-center gap-2 text-green-400">
                <Shield size={20} />
                <span className="text-sm">Pago Seguro</span>
              </div>
            </div>

            {stripePromise && clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  selectedPackage={selectedPackage}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={handleCancel}
                  clientSecret={clientSecret}
                  purchaseId={purchaseId}
                />
              </Elements>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);

}