import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./header";

import {
  Home,
  MessageSquare,
  Star,
  MoreVertical,
  PhoneCall,
  Ban,
  Trash2,
  RefreshCw,
  Heart,
  Users
} from "lucide-react";
import logoproncipal from "./imagenes/logoprincipal.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Favoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opcionesAbiertas, setOpcionesAbiertas] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const navigate = useNavigate();

  // 🔥 CARGAR FAVORITOS AL MONTAR EL COMPONENTE
  useEffect(() => {
    loadFavorites();
  }, []);

  // 🔥 FUNCIÓN PARA CARGAR FAVORITOS
  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);

      const authToken = sessionStorage.getItem('token');
      if (!authToken) {
        setError('No hay sesión activa');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/favorites/list`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setFavoritos(data.favorites || []);
        console.log('✅ Favoritos cargados:', data.favorites.length);
      } else {
        throw new Error(data.error || 'Error cargando favoritos');
      }

    } catch (err) {
      console.error('❌ Error cargando favoritos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNCIÓN PARA ELIMINAR FAVORITO
  const eliminarFavorito = async (favoriteId, nombre) => {
    if (!confirm(`¿Estás seguro que quieres eliminar a ${nombre} de tus favoritos?`)) {
      return;
    }

    try {
      setProcessingAction(favoriteId);
      
      const authToken = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/favorites/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          favorite_user_id: favoriteId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Remover de la lista local
        setFavoritos(prev => prev.filter(fav => fav.id !== favoriteId));
        setOpcionesAbiertas(null);
        console.log('✅ Favorito eliminado:', nombre);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error eliminando favorito:', error);
      alert('Error de conexión');
    } finally {
      setProcessingAction(null);
    }
  };

  // 🔥 FUNCIÓN PARA BLOQUEAR USUARIO
  const bloquearUsuario = async (favoriteId, nombre) => {
    const reason = prompt(`¿Por qué quieres bloquear a ${nombre}?`, '');
    if (reason === null) return;

    try {
      setProcessingAction(favoriteId);
      
      const authToken = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/blocks/block-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          blocked_user_id: favoriteId,
          reason: reason
        })
      });

      const data = await response.json();

      if (data.success) {
        // Remover de favoritos también
        setFavoritos(prev => prev.filter(fav => fav.id !== favoriteId));
        setOpcionesAbiertas(null);
        alert(`${nombre} ha sido bloqueado y removido de favoritos`);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error bloqueando usuario:', error);
      alert('Error de conexión');
    } finally {
      setProcessingAction(null);
    }
  };

  // 🔥 FUNCIÓN PARA INICIAR CHAT CON FAVORITO
  const iniciarChatConFavorito = async (favoriteId, nombre) => {
    try {
      setProcessingAction(favoriteId);
      
      const authToken = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/favorites/start-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          favorite_user_id: favoriteId
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Chat iniciado con favorito');
        // Redirigir al videochat
        const userRole = JSON.parse(sessionStorage.getItem('user'))?.rol || 'cliente';
        const chatUrl = userRole === 'cliente' ? '/videochatclient' : '/videochat';
        navigate(`${chatUrl}?roomName=${data.room_name}&from=favorite`);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error iniciando chat:', error);
      alert('Error de conexión');
    } finally {
      setProcessingAction(null);
    }
  };

  // 🔥 FUNCIÓN PARA FORMATEAR FECHA
  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'Fecha desconocida';
    
    const fecha = new Date(fechaString);
    const ahora = new Date();
    const diffTime = Math.abs(ahora - fecha);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Agregado hace 1 día';
    if (diffDays < 7) return `Agregado hace ${diffDays} días`;
    if (diffDays < 30) return `Agregado hace ${Math.floor(diffDays / 7)} semanas`;
    return `Agregado ${fecha.toLocaleDateString()}`;
  };

  // 🔥 CERRAR OPCIONES AL HACER CLIC FUERA
  useEffect(() => {
    const handleClickOutside = () => {
      setOpcionesAbiertas(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // 🔥 RENDER LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white p-6">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff007a] mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando favoritos...</p>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 RENDER ERROR
  if (error) {
    return (
      <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white p-6">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold mb-2">Error cargando favoritos</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button 
              onClick={loadFavorites}
              className="bg-[#ff007a] hover:bg-[#e6006e] px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={16} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ligand-mix-dark from-[#0a0d10] to-[#131418] text-white p-6">
      {/* Header */}
      <Header />
      
      {/* Título y estadísticas */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#ff007a] flex items-center gap-2">
            <Heart size={24} />
            Tus Favoritos
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {favoritos.length} {favoritos.length === 1 ? 'favorito' : 'favoritos'}
          </p>
        </div>
        
        <button 
          onClick={loadFavorites}
          disabled={loading}
          className="bg-[#2b2d31] hover:bg-[#373a40] px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Lista de favoritos */}
      {favoritos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💝</div>
          <h3 className="text-xl font-bold mb-2">No tienes favoritos aún</h3>
          <p className="text-gray-400 mb-6">Cuando agregues usuarios como favoritos, aparecerán aquí</p>
          <button 
            onClick={() => navigate('/esperarcall')}
            className="bg-[#ff007a] hover:bg-[#e6006e] px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
          >
            <Users size={16} />
            Buscar usuarios
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {favoritos.map((fav) => (
            <div
              key={fav.id}
              className="bg-[#1f2125] rounded-xl p-5 shadow-lg border border-[#ff007a]/10 relative"
            >
              {/* Parte superior */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#ff007a] rounded-full flex items-center justify-center font-bold text-black text-lg">
                    {fav.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-base">{fav.name}</p>
                    <p className="text-green-400 text-sm">
                      Online {/* Por ahora fijo, después puedes agregar estado real */}
                    </p>
                  </div>
                </div>

                {/* Botón de opciones */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpcionesAbiertas(opcionesAbiertas === fav.id ? null : fav.id);
                    }}
                    className="text-white/50 hover:text-white p-1"
                    disabled={processingAction === fav.id}
                  >
                    {processingAction === fav.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <MoreVertical size={20} />
                    )}
                  </button>

                  {opcionesAbiertas === fav.id && (
                    <div className="absolute right-0 mt-2 bg-[#2b2d31] border border-[#ff007a]/30 rounded-xl shadow-xl w-44 z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          bloquearUsuario(fav.id, fav.name);
                        }}
                        className="flex items-center w-full px-4 py-2 gap-2 hover:bg-[#373a40] text-sm text-red-400"
                      >
                        <Ban size={16} /> Bloquear
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarFavorito(fav.id, fav.name);
                        }}
                        className="flex items-center w-full px-4 py-2 gap-2 hover:bg-[#373a40] text-sm"
                      >
                        <Trash2 size={16} /> Eliminar de favoritos
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Nota del favorito */}
              {fav.note && (
                <p className="text-white/70 text-sm italic mb-3 bg-[#2b2d31] p-2 rounded">
                  "{fav.note}"
                </p>
              )}

              {/* Fecha agregado */}
              <p className="text-gray-500 text-xs mb-4">
                {formatearFecha(fav.created_at)}
              </p>

              {/* Botones */}
              <div className="flex gap-3">
                <button 
                  onClick={() => iniciarChatConFavorito(fav.id, fav.name)}
                  disabled={processingAction === fav.id}
                  className="flex-1 bg-[#ff007a] hover:bg-[#e6006e] text-white px-3 py-2 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingAction === fav.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                  ) : (
                    'Chatear'
                  )}
                </button>
                <button 
                  className="flex-1 bg-[#2b2d31] hover:bg-[#373a40] text-white/80 px-3 py-2 rounded-full text-sm flex items-center justify-center gap-1"
                  onClick={() => alert('Función de llamada próximamente')}
                >
                  <PhoneCall size={16} /> Llamar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}