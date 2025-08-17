import React, { useState, useEffect } from 'react';
import { X, Search, MessageSquare, Phone, User } from 'lucide-react';

// Componente Avatar integrado (igual que el de modelos)
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

const SearchClientsModal = ({ isOpen, onClose, onMessage, onCall }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔥 FUNCIÓN PARA OBTENER EL TOKEN (SEPARADA PARA REUTILIZAR)
  const getAuthToken = () => {
    // Obtener el token
    let token = sessionStorage.getItem('token');
    
    // Fallback: Intentar otras ubicaciones
    if (!token) {
      token = localStorage.getItem('auth_token') || 
              localStorage.getItem('token') || 
              localStorage.getItem('access_token') ||
              localStorage.getItem('bearer_token') ||
              sessionStorage.getItem('auth_token') || 
              sessionStorage.getItem('access_token');
    }

    return token;
  };

  // Función para obtener clientes desde la API
  const fetchClients = async (searchQuery = '') => {
    setLoading(true);
    try {
      const token = getAuthToken();
      
      console.log('🔑 Token de autenticación:', token ? 'Encontrado' : 'NO ENCONTRADO');
      
      if (!token) {
        console.error('❌ No se encontró token de autenticación');
        setClients([]);
        setFilteredClients([]);
        
        // Mostrar datos simulados para desarrollo
        const mockClients = [
          {
            id: 1,
            name: 'Carlos Rodriguez (SIN AUTH)',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
            role: 'cliente',
            online: true
          },
          {
            id: 2,
            name: 'Miguel Santos (SIN AUTH)',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
            role: 'cliente',
            online: false
          }
        ];
        
        console.log('🔄 Mostrando datos simulados porque no hay token');
        setClients(mockClients);
        setFilteredClients(mockClients);
        return;
      }

      // 🔥 URL para buscar CLIENTES
      const API_BASE_URL = 'http://localhost:8000';
      const url = new URL('/api/chat/search-clients', API_BASE_URL);
      
      if (searchQuery.trim()) {
        url.searchParams.append('search', searchQuery.trim());
      }
      url.searchParams.append('limit', '20');

      console.log('🔍 Buscando clientes en:', url.toString());

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
          return;
        }
        if (response.status === 404) {
          console.error('❌ Endpoint no encontrado. Verifica que hayas agregado las rutas al backend.');
          setClients([]);
          setFilteredClients([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Datos recibidos:', data);

      if (data.success && Array.isArray(data.data)) {
        const formattedClients = data.data.map(client => ({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          role: 'cliente',
          online: client.online,
          last_seen: client.last_seen
        }));

        setClients(formattedClients);
        setFilteredClients(formattedClients);
        console.log('✅ Clientes cargados:', formattedClients.length);
      } else {
        console.error('❌ Formato de respuesta inesperado:', data);
        setClients([]);
        setFilteredClients([]);
      }

    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      setClients([]);
      setFilteredClients([]);
      
      // Mostrar datos simulados en caso de error
      const mockClients = [
        {
          id: 1,
          name: 'Carlos Rodriguez (ERROR)',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
          role: 'cliente',
          online: true
        },
        {
          id: 2,
          name: 'Miguel Santos (ERROR)',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
          role: 'cliente',
          online: false
        }
      ];
      
      console.log('🔄 Usando datos simulados debido a error');
      setClients(mockClients);
      setFilteredClients(mockClients);
    } finally {
      setLoading(false);
    }
  };

  // Cargar clientes cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setSearchTerm('');
    }
  }, [isOpen]);

  // Buscar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (!isOpen) return;
    
    const searchTimeout = setTimeout(() => {
      fetchClients(searchTerm);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, isOpen]);

  // 🔥 FUNCIÓN PARA MANEJAR EL ENVÍO DE MENSAJE (ARREGLADA)
  const handleMessage = async (clientId, clientName) => {
    console.log('📩 Iniciando conversación con cliente:', clientName, 'ID:', clientId);
    
    try {
      const token = getAuthToken(); // 🔥 AHORA SÍ TENEMOS ACCESO AL TOKEN
      
      if (!token) {
        console.error('❌ No se encontró token de autenticación para iniciar conversación');
        alert('Error: No se encontró token de autenticación');
        return;
      }

      const API_BASE_URL = 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/chat/start-conversation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          other_user_id: clientId
        })
      });

      console.log('📡 Respuesta start-conversation:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Error en start-conversation:', errorData);
        
        if (response.status === 401) {
          alert('Error: Token de autenticación inválido');
          return;
        }
        if (response.status === 404) {
          alert('Error: Endpoint no encontrado');
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Conversación iniciada exitosamente:', data);

      if (data.success) {
        // 🔥 LLAMAR A LA FUNCIÓN DEL COMPONENTE PADRE
        if (onMessage) {
          onMessage(clientId, clientName, data.conversation, data.room_name);
        }
        
        // Cerrar el modal
        onClose();
        
        console.log('🚀 Redirigiendo al chat con:', {
          clientId,
          clientName,
          roomName: data.room_name,
          sessionId: data.session_id
        });
      } else {
        console.error('❌ Respuesta de startConversation no exitosa:', data);
        alert(`Error: ${data.message || 'No se pudo iniciar la conversación'}`);
      }

    } catch (error) {
      console.error('❌ Error iniciando conversación:', error);
      alert(`Error iniciando conversación: ${error.message}`);
    }
  };

  // Función para manejar la llamada
  const handleCall = (clientId, clientName) => {
    console.log('📞 Iniciando llamada con:', clientName);
    if (onCall) {
      onCall(clientId, clientName);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f2125] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl border border-[#ff007a]/30">
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-[#ff007a] to-[#e6006e] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">
              Buscar Clientes
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
              placeholder="Buscar clientes por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#2b2d31] border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#ff007a] transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff007a]"></div>
              <span className="ml-3 text-white">Cargando...</span>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <User size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-400">
                {searchTerm ? 
                  'No se encontraron clientes con ese nombre' : 
                  'No hay clientes disponibles'
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
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-[#2b2d31] rounded-xl p-4 hover:bg-[#36393f] transition-colors border border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    {/* Info del cliente */}
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar 
                        src={client.avatar}
                        name={client.name}
                        size="md"
                        online={client.online}
                        showOnlineIndicator={true}
                      />
                      
                      <div>
                        <h3 className="text-white font-semibold text-lg">{client.name}</h3>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            client.online ? 'bg-green-400' : 'bg-gray-400'
                          }`}></div>
                          <p className="text-sm text-gray-400">
                            {client.online ? 'En línea' : 'Desconectado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMessage(client.id, client.name)}
                        className="bg-[#ff007a] hover:bg-[#e6006e] text-white p-3 rounded-lg transition-colors flex items-center gap-2 font-medium"
                        title="Enviar mensaje"
                      >
                        <MessageSquare size={18} />
                        <span className="hidden sm:block">Mensaje</span>
                      </button>
                      
                      <button
                        onClick={() => handleCall(client.id, client.name)}
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
            {filteredClients.length} {filteredClients.length === 1 ? 
              'cliente encontrado' : 
              'clientes encontrados'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default SearchClientsModal;