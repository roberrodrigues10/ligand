import React, { useState, useEffect } from 'react';
import { X, Search, MessageSquare, Phone, User } from 'lucide-react';

const SearchClientsModal = ({ isOpen, onClose, onMessage, onCall }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('auth_token') || sessionStorage.getItem('token');
  };

  const fetchClients = async (searchQuery = '') => {
    setLoading(true);
    try {
      const token = getAuthToken();
      
      if (!token) {
                setClients([]);
        return;
      }

      const url = new URL('/api/chat/search-clients', API_BASE_URL);
      if (searchQuery.trim()) {
        url.searchParams.append('search', searchQuery.trim());
      }
      url.searchParams.append('limit', '50');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const formattedClients = data.data.map(client => ({
            id: client.id,
            name: client.name || client.alias || `Cliente_${client.id}`,
            avatar: client.avatar || client.profile_image,
            online: client.online || client.is_online || false,
            verified: client.verified || false
          }));
          setClients(formattedClients);
        } else {
          setClients([]);
        }
      } else {
        setClients([]);
      }
    } catch (error) {
            setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NUEVA LÓGICA: Solo guardar en localStorage y cerrar modal
  const handleStartChat = async (clientId, clientName) => {
        
    try {
      const token = getAuthToken();
      
      if (!token) {
        alert('Error de autenticación');
        return;
      }

      // 1. Crear o encontrar conversación
      const response = await fetch(`${API_BASE_URL}/api/chat/start-conversation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ other_user_id: parseInt(clientId) })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // 2. 🔥 GUARDAR INFO EN LOCALSTORAGE PARA QUE CHATPRIVADO LA DETECTE
          const chatInfo = {
            shouldOpen: true,
            clientId: parseInt(clientId),
            clientName: clientName,
            roomName: data.room_name,
            conversationId: data.conversation?.id,
            timestamp: Date.now()
          };
          
          localStorage.setItem('pendingChatOpen', JSON.stringify(chatInfo));
                    
          // 3. Cerrar modal
          if (onClose) {
            onClose();
          }
          
          // 4. 🔥 LLAMAR FUNCIÓN DEL HEADER PARA NAVEGAR
          if (onMessage) {
            onMessage(clientId, clientName);
          }
          
        } else {
          alert(data.message || 'Error iniciando conversación');
        }
      } else {
        alert('Error de conexión');
      }
    } catch (error) {
            alert('Error de conexión');
    }
  };

  const closeModal = () => {
        setSearchTerm('');
    setClients([]);
    setLoading(false);
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => fetchClients(searchTerm), 500);
    return () => clearTimeout(timeout);
  }, [searchTerm, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/70" 
        onClick={closeModal}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1f2125] rounded-2xl w-full max-w-2xl max-h-[80vh] mx-4 shadow-2xl border border-[#ff007a]/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ff007a] to-[#e6006e] p-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Search size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">Buscar Clientes</h2>
          </div>
          <button
            onClick={closeModal}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#2b2d31] border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#ff007a]"
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff007a]"></div>
              <span className="ml-3 text-white">Buscando...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <User size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-400">No hay clientes disponibles</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="bg-[#2b2d31] rounded-xl p-4 hover:bg-[#36393f] transition-colors border border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#ff007a] to-[#cc0062] rounded-full flex items-center justify-center text-white font-bold">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{client.name}</h3>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${client.online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                          <span className="text-sm text-gray-400">
                            {client.online ? 'En línea' : 'Desconectado'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartChat(client.id, client.name)}
                        className="bg-[#ff007a] hover:bg-[#e6006e] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <MessageSquare size={16} />
                        Mensaje
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center text-sm text-gray-400">
          {clients.length} cliente{clients.length !== 1 ? 's' : ''} encontrado{clients.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default SearchClientsModal;