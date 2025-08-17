import React, { useState, useEffect } from 'react';
import { X, Search, MessageSquare, Phone, User } from 'lucide-react';

// Componente Avatar integrado
const Avatar = ({ 
  src, 
  name, 
  size = 'md', 
  online = false, 
  className = '',
  showOnlineIndicator = true 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8', 
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const iconSizes = {
    xs: 12,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40
  };

  const onlineIndicatorSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2 h-2',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getBackgroundColor = (fullName) => {
    if (!fullName) return 'bg-gray-500';
    
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const shouldShowImage = src && !imageError && !imageLoading;
  const shouldShowFallback = !src || imageError || imageLoading;

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {src && !imageError && (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`
            ${sizeClasses[size]} rounded-full object-cover border-2 border-[#ff007a]/30
            ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200
          `}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {shouldShowFallback && (
        <div className={`
          ${sizeClasses[size]} ${getBackgroundColor(name)} rounded-full flex items-center justify-center 
          border-2 border-[#ff007a]/30 text-white font-bold ${imageLoading ? 'animate-pulse' : ''}
        `}>
          {name ? (
            <span className={size === 'md' ? 'text-base' : size === 'lg' ? 'text-lg' : 'text-sm'}>
              {getInitials(name)}
            </span>
          ) : (
            <User size={iconSizes[size]} className="text-white" />
          )}
        </div>
      )}

      {showOnlineIndicator && (
        <div className={`
          absolute -bottom-1 -right-1 ${onlineIndicatorSizes[size]} rounded-full 
          border-2 border-[#2b2d31] ${online ? 'bg-green-400' : 'bg-gray-400'}
          ${online ? 'animate-pulse' : ''}
        `}></div>
      )}

      {imageLoading && src && (
        <div className={`
          absolute inset-0 ${sizeClasses[size]} rounded-full bg-gray-600 animate-pulse
          border-2 border-[#ff007a]/30
        `}></div>
      )}
    </div>
  );
};

const SearchModelsModal = ({ isOpen, onClose, onMessage, onCall }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [models, setModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [loading, setLoading] = useState(false);

  // Función para obtener modelos desde la API
  const fetchModels = async (searchQuery = '') => {
    setLoading(true);
    try {
      // 🔍 MÚLTIPLES FORMAS DE OBTENER EL TOKEN
      let token = null;
      
      // 🔑 SEGÚN TUS LOGS, EL TOKEN ESTÁ EN sessionStorage con nombre 'token'
      token = sessionStorage.getItem('token');
      
      // Fallback: Intentar otras ubicaciones
      if (!token) {
        token = localStorage.getItem('auth_token') || 
                localStorage.getItem('token') || 
                localStorage.getItem('access_token') ||
                localStorage.getItem('bearer_token') ||
                sessionStorage.getItem('auth_token') || 
                sessionStorage.getItem('access_token');
      }

      // Opción 3: Desde cookies (si usas cookies)
      if (!token) {
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(cookie => 
          cookie.trim().startsWith('auth_token=') || 
          cookie.trim().startsWith('token=')
        );
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }

      console.log('🔑 Token de autenticación:', token ? 'Encontrado' : 'NO ENCONTRADO');
      console.log('🔍 Todos los items en localStorage:', Object.keys(localStorage));
      console.log('🔍 Todos los items en sessionStorage:', Object.keys(sessionStorage));
      
      if (!token) {
        console.error('❌ No se encontró token de autenticación en ningún lugar');
        setModels([]);
        setFilteredModels([]);
        
        // Mostrar datos simulados para que puedas ver la interfaz
        const mockModels = [
          {
            id: 1,
            name: 'Sofia Rodriguez (SIN AUTH)',
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=400&fit=crop&crop=face',
            role: 'modelo',
            online: true
          },
          {
            id: 2,
            name: 'Isabella Martinez (SIN AUTH)',
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
            role: 'modelo',
            online: false
          }
        ];
        
        console.log('🔄 Mostrando datos simulados porque no hay token');
        setModels(mockModels);
        setFilteredModels(mockModels);
        return;
      }

      // 🔥 CONFIGURAR LA URL CORRECTA DEL BACKEND
      const API_BASE_URL = 'http://localhost:8000'; // Ajusta el puerto de tu Laravel
      const url = new URL('/api/search-models', API_BASE_URL);
      
      if (searchQuery.trim()) {
        url.searchParams.append('search', searchQuery.trim());
      }
      url.searchParams.append('limit', '20');

      console.log('🔍 Buscando modelos en:', url.toString());

      // Realizar la petición a la API
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('📡 Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ Token de autenticación inválido');
          console.log('🔑 Token usado:', token.substring(0, 20) + '...');
          return;
        }
        if (response.status === 404) {
          console.error('❌ Endpoint no encontrado. Verifica que hayas agregado las rutas al backend.');
          setModels([]);
          setFilteredModels([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Datos recibidos:', data);

      if (data.success && Array.isArray(data.data)) {
        const formattedModels = data.data.map(model => ({
          id: model.id,
          name: model.name,
          avatar: model.avatar,
          role: 'modelo',
          online: model.online,
          last_seen: model.last_seen
        }));

        setModels(formattedModels);
        setFilteredModels(formattedModels);
        console.log('✅ Modelos cargados:', formattedModels.length);
      } else {
        console.error('❌ Formato de respuesta inesperado:', data);
        setModels([]);
        setFilteredModels([]);
      }

    } catch (error) {
      console.error('❌ Error fetching models:', error);
      setModels([]);
      setFilteredModels([]);
      
      // Mostrar datos simulados en caso de error para testing
      const mockModels = [
        {
          id: 1,
          name: 'Sofia Rodriguez (ERROR)',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=400&fit=crop&crop=face',
          role: 'modelo',
          online: true
        },
        {
          id: 2,
          name: 'Isabella Martinez (ERROR)',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
          role: 'modelo',
          online: false
        }
      ];
      
      console.log('🔄 Usando datos simulados debido a error');
      setModels(mockModels);
      setFilteredModels(mockModels);
    } finally {
      setLoading(false);
    }
  };

  // Cargar modelos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchModels(); // Cargar todos los modelos inicialmente
      setSearchTerm(''); // Reset search when opening
    }
  }, [isOpen]);

  // Buscar modelos cuando cambia el término de búsqueda
  useEffect(() => {
    if (!isOpen) return;
    
    const searchTimeout = setTimeout(() => {
      fetchModels(searchTerm);
    }, 300); // Debounce de 300ms para evitar muchas peticiones

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, isOpen]);

  // Función para manejar el envío de mensaje
  const handleMessage = (modelId, modelName) => {
    console.log('📩 Enviando mensaje a:', modelName);
    // Llamar a la función proporcionada por el componente padre
    if (onMessage) {
      onMessage(modelId, modelName);
    }
    onClose();
  };

  // Función para manejar la llamada
  const handleCall = (modelId, modelName) => {
    console.log('📞 Iniciando llamada con:', modelName);
    // Llamar a la función proporcionada por el componente padre
    if (onCall) {
      onCall(modelId, modelName);
    }
  };

  // No renderizar si no está abierto
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f2125] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl border border-[#ff007a]/30">
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-[#ff007a] to-[#e6006e] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">
              Buscar Modelos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#2b2d31] border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#ff007a] transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de modelos */}
        <div className="overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff007a]"></div>
              <span className="ml-3 text-white">Cargando...</span>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="text-center py-12">
              <User size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-400">
                {searchTerm ? 
                  'No se encontraron modelos con ese nombre' : 
                  'No hay modelos disponibles'
                }
              </p>
              {searchTerm && (
                <p className="text-sm text-gray-500 mt-2">
                  Intenta con un término de búsqueda diferente
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className="bg-[#2b2d31] rounded-xl p-4 hover:bg-[#36393f] transition-colors border border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    {/* Info del modelo */}
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar 
                        src={model.avatar}
                        name={model.name}
                        size="md"
                        online={model.online}
                        showOnlineIndicator={true}
                      />
                      
                      <div>
                        <h3 className="text-white font-semibold text-lg">{model.name}</h3>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            model.online ? 'bg-green-400' : 'bg-gray-400'
                          }`}></div>
                          <p className="text-sm text-gray-400">
                            {model.online ? 'En línea' : 'Desconectado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMessage(model.id, model.name)}
                        className="bg-[#ff007a] hover:bg-[#e6006e] text-white p-3 rounded-lg transition-colors flex items-center gap-2 font-medium"
                        title="Enviar mensaje"
                      >
                        <MessageSquare size={18} />
                        <span className="hidden sm:block">Mensaje</span>
                      </button>
                      
                      <button
                        onClick={() => handleCall(model.id, model.name)}
                        className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg transition-colors flex items-center gap-2 font-medium"
                        title="Hacer llamada"
                      >
                        <Phone size={18} />
                        <span className="hidden sm:block">Llamar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-[#1f2125]">
          <p className="text-center text-sm text-gray-400">
            {filteredModels.length} {filteredModels.length === 1 ? 
              'modelo encontrado' : 
              'modelos encontrados'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default SearchModelsModal;