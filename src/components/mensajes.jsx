import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./header";
import { getUser } from "../utils/auth"; // 🔥 IMPORTAR TU SISTEMA DE AUTH

import {
  MessageSquare,
  Home,
  Star,
  Trash2,
  MoreVertical,
  Pencil,
  Ban,
  Languages,
  Gift,
  Heart,
  Send,
  Users,
  Search,
  Video,
  Phone,
} from "lucide-react";

export default function ChatPrivado() {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionActiva, setConversacionActiva] = useState(null);
  const [usuario, setUsuario] = useState({
    id: null,
    name: "Usuario",
    rol: "cliente"
  });
  const [loading, setLoading] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [busquedaConversacion, setBusquedaConversacion] = useState("");
  const mensajesRef = useRef(null);
  const navigate = useNavigate();

  // 🔥 FUNCIÓN PARA OBTENER HEADERS CON TU TOKEN
  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("token");
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  // Cargar datos del usuario usando tu sistema de auth
  useEffect(() => {
    cargarDatosUsuario();
  }, []);

  // Cargar conversaciones cuando se tenga el usuario
  useEffect(() => {
    if (usuario.id) {
      cargarConversaciones();
    }
  }, [usuario.id]);

  // Auto-scroll cuando lleguen nuevos mensajes
  useEffect(() => {
    if (mensajesRef.current) {
      mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
    }
  }, [mensajes]);

  // Polling de mensajes si hay conversación activa
  useEffect(() => {
    let interval;
    if (conversacionActiva) {
      interval = setInterval(() => {
        cargarMensajes(conversacionActiva);
      }, 3000); // Cada 3 segundos
    }
    return () => clearInterval(interval);
  }, [conversacionActiva]);

  const cargarDatosUsuario = async () => {
    try {
      console.log('🔍 Cargando perfil usando tu sistema de auth...');
      console.log('🔑 Token disponible:', sessionStorage.getItem("token") ? 'SÍ' : 'NO');
      
      // 🔥 USAR TU FUNCIÓN getUser EXISTENTE
      const userData = await getUser();
      
      console.log('✅ Datos de usuario recibidos:', userData);
      setUsuario({
        id: userData.id,
        name: userData.name || userData.alias || `Usuario_${userData.id}`,
        rol: userData.rol
      });
      
    } catch (error) {
      console.error('❌ Error cargando datos usuario:', error);
      
      // Si es error de autenticación, usar datos de prueba
      if (error.response?.status === 401) {
        console.log('🔧 Error de autenticación, usando datos de prueba...');
        setUsuario({
          id: 1,
          name: "Usuario Demo",
          rol: "cliente"
        });
      }
    }
  };

  const cargarConversaciones = async () => {
    try {
      setLoading(true);
      console.log('🔍 Cargando conversaciones...');
      
      const response = await fetch('/api/chat/conversations', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      console.log('📡 Respuesta conversaciones:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversaciones recibidas:', data);
        setConversaciones(data.conversations || []);
      } else if (response.status === 401) {
        console.error('❌ Token inválido para conversaciones');
        // Intentar refrescar el usuario o redirigir al login
      } else {
        console.error('❌ Error cargando conversaciones:', response.status);
        const errorText = await response.text();
        console.error('Detalles:', errorText);
      }
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      // Datos de ejemplo para desarrollo
      console.log('🔧 Usando datos de ejemplo...');
      setConversaciones([
        {
          id: 1,
          other_user_id: 2,
          other_user_name: "SofiSweet",
          other_user_role: "modelo",
          room_name: "chat_user_1_2",
          last_message: "¡Hola! ¿Cómo estás?",
          last_message_time: "2024-01-15T14:30:00Z",
          unread_count: 2,
          session_date: "2024-01-15T13:45:00Z",
          avatar: "https://i.pravatar.cc/40?u=2"
        },
        {
          id: 2,
          other_user_id: 3,
          other_user_name: "Mia88",
          other_user_role: "modelo", 
          room_name: "chat_user_1_3",
          last_message: "Gracias por la sesión 😘",
          last_message_time: "2024-01-15T12:15:00Z",
          unread_count: 0,
          session_date: "2024-01-15T11:30:00Z",
          avatar: "https://i.pravatar.cc/40?u=3"
        },
        {
          id: 3,
          other_user_id: 4,
          other_user_name: "JuanXtreme",
          other_user_role: "cliente",
          room_name: "chat_user_1_4", 
          last_message: "¿Cuándo nos vemos de nuevo?",
          last_message_time: "2024-01-14T20:45:00Z",
          unread_count: 1,
          session_date: "2024-01-14T20:00:00Z",
          avatar: "https://i.pravatar.cc/40?u=4"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const cargarMensajes = async (roomName) => {
    try {
      const response = await fetch(`/api/chat/messages/${roomName}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          setMensajes(data.messages);
        }
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      // Datos de ejemplo para desarrollo si falla
      if (roomName === "chat_user_1_2") {
        setMensajes([
          {
            id: 1,
            user_id: 2,
            user_name: "SofiSweet",
            user_role: "modelo",
            message: "¡Hola! Me gustó mucho nuestra sesión",
            type: "text",
            created_at: "2024-01-15T14:25:00Z"
          },
          {
            id: 2,
            user_id: 1,
            user_name: "Usuario Demo",
            user_role: "cliente",
            message: "¡A mí también! Eres increíble",
            type: "text", 
            created_at: "2024-01-15T14:26:00Z"
          },
          {
            id: 3,
            user_id: 2,
            user_name: "SofiSweet",
            user_role: "modelo",
            message: "¿Te gustaría repetir pronto?",
            type: "text",
            created_at: "2024-01-15T14:30:00Z"
          }
        ]);
      }
    }
  };

  const abrirConversacion = async (conversacion) => {
    setConversacionActiva(conversacion.room_name);
    await cargarMensajes(conversacion.room_name);
    
    // Marcar mensajes como leídos
    if (conversacion.unread_count > 0) {
      marcarComoLeido(conversacion.room_name);
    }
  };

  const marcarComoLeido = async (roomName) => {
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ room_name: roomName })
      });
      
      // Actualizar contador local
      setConversaciones(prev => 
        prev.map(conv => 
          conv.room_name === roomName 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marcando como leído:', error);
    }
  };

  const enviarMensaje = async (tipo = 'text', contenido = null) => {
    const mensaje = contenido || nuevoMensaje.trim();
    if (!mensaje || !conversacionActiva) return;

    try {
      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          room_name: conversacionActiva,
          message: mensaje,
          type: tipo,
          extra_data: tipo === 'gift' ? { gift_type: mensaje } : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Agregar mensaje inmediatamente para UX fluida
          const nuevoMensajeObj = {
            id: Date.now(),
            user_id: usuario.id,
            user_name: usuario.name,
            user_role: usuario.rol,
            message: mensaje,
            type: tipo,
            created_at: new Date().toISOString()
          };
          setMensajes(prev => [...prev, nuevoMensajeObj]);
          setNuevoMensaje("");
          
          // Actualizar último mensaje en la lista
          setConversaciones(prev => 
            prev.map(conv => 
              conv.room_name === conversacionActiva
                ? { 
                    ...conv, 
                    last_message: mensaje,
                    last_message_time: new Date().toISOString()
                  }
                : conv
            )
          );
        }
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const iniciarVideochat = (otherUserId, otherUserRole) => {
    // Navegar a videochat con el usuario específico
    if (otherUserRole === 'modelo') {
      navigate('/videochatclient', { 
        state: { 
          targetUserId: otherUserId,
          fromChat: true 
        }
      });
    } else {
      navigate('/videochat', { 
        state: { 
          targetUserId: otherUserId,
          fromChat: true 
        }
      });
    }
  };

  const enviarRegalo = (tipoRegalo) => {
    enviarMensaje('gift', tipoRegalo);
  };

  const enviarEmoji = (emoji) => {
    enviarMensaje('emoji', emoji);
  };

  const eliminarMensaje = async (id) => {
    try {
      const response = await fetch(`/api/chat/delete-message/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setMensajes(prev => prev.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Error eliminando mensaje:', error);
    }
  };

  const formatearTiempo = (timestamp) => {
    const fecha = new Date(timestamp);
    const ahora = new Date();
    const diffMs = ahora - fecha;
    const diffHoras = diffMs / (1000 * 60 * 60);
    
    if (diffHoras < 1) {
      return fecha.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffHoras < 24) {
      return fecha.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return fecha.toLocaleDateString('es-ES', { 
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  const renderMensaje = (mensaje) => {
    switch (mensaje.type) {
      case 'gift':
        return (
          <div className="flex items-center gap-2 text-yellow-400">
            <Gift size={16} />
            <span>Envió: {mensaje.message}</span>
          </div>
        );
      case 'emoji':
        return (
          <div className="text-2xl">
            {mensaje.message}
          </div>
        );
      default:
        return mensaje.message;
    }
  };

  const conversacionesFiltradas = conversaciones.filter(conv => 
    conv.other_user_name.toLowerCase().includes(busquedaConversacion.toLowerCase())
  );

  const conversacionSeleccionada = conversaciones.find(c => c.room_name === conversacionActiva);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0d10] to-[#131418] text-white p-6">
      <Header />
      
      <div className="flex rounded-xl overflow-hidden shadow-lg h-[83vh] border border-[#ff007a]/10">
        {/* Sidebar de conversaciones */}
        <aside className="w-1/3 bg-[#2b2d31] p-4 overflow-y-auto">
          {/* Búsqueda de conversaciones */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1a1c20] text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-[#ff007a]/50"
              value={busquedaConversacion}
              onChange={(e) => setBusquedaConversacion(e.target.value)}
            />
          </div>

          {/* Info usuario actual */}
          <div className="mb-4 p-3 bg-[#1a1c20] rounded-lg border border-[#ff007a]/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">{usuario.name}</span>
              <span className="text-xs text-white/60 bg-[#ff007a]/20 px-2 py-1 rounded">
                {usuario.rol}
              </span>
            </div>
          </div>

          {/* Lista de conversaciones */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff007a] mx-auto mb-2"></div>
                <p className="text-xs text-white/60">Cargando conversaciones...</p>
              </div>
            ) : conversacionesFiltradas.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare size={32} className="text-white/30 mx-auto mb-2" />
                <p className="text-sm text-white/60">No hay conversaciones</p>
                <p className="text-xs text-white/40">Tus chats aparecerán aquí después de las sesiones</p>
              </div>
            ) : (
              conversacionesFiltradas.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => abrirConversacion(conv)}
                  className={`p-3 hover:bg-[#3a3d44] rounded-lg cursor-pointer transition-colors border ${
                    conversacionActiva === conv.room_name 
                      ? 'bg-[#ff007a]/20 border-[#ff007a]' 
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={conv.avatar}
                        alt={conv.other_user_name}
                        className="w-10 h-10 rounded-full"
                      />
                      {conv.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-[#ff007a] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{conv.other_user_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          conv.other_user_role === 'modelo' 
                            ? 'bg-pink-500/20 text-pink-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {conv.other_user_role}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 truncate mt-1">
                        {conv.last_message}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        Sesión: {formatearTiempo(conv.session_date)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xs text-white/40">
                        {formatearTiempo(conv.last_message_time)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Panel de chat */}
        <section className="w-2/3 bg-[#0a0d10] flex flex-col">
          {!conversacionActiva ? (
            /* Estado sin conversación seleccionada */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={48} className="text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Selecciona una conversación</h3>
                <p className="text-white/60">Elige una conversación para ver los mensajes</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header de conversación activa */}
              <div className="bg-[#2b2d31] px-5 py-3 flex justify-between items-center border-b border-[#ff007a]/20">
                <div className="flex items-center gap-3">
                  <img
                    src={conversacionSeleccionada?.avatar}
                    alt={conversacionSeleccionada?.other_user_name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <span className="font-semibold block">
                      {conversacionSeleccionada?.other_user_name}
                    </span>
                    <span className="text-xs text-white/60 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${
                        conversacionSeleccionada?.other_user_role === 'modelo' 
                          ? 'bg-pink-500' 
                          : 'bg-blue-500'
                      }`}></span>
                      {conversacionSeleccionada?.other_user_role}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => iniciarVideochat(
                      conversacionSeleccionada?.other_user_id,
                      conversacionSeleccionada?.other_user_role
                    )}
                    className="px-3 py-2 bg-[#ff007a]/20 hover:bg-[#ff007a]/30 text-[#ff007a] rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    <Video size={16} />
                    Videochat
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setMostrarOpciones(!mostrarOpciones)}
                      className="text-white hover:text-[#ff007a] transition-colors"
                    >
                      <MoreVertical />
                    </button>
                    {mostrarOpciones && (
                      <div className="absolute right-0 mt-2 bg-[#1f2125] border border-[#ff007a]/30 rounded-xl shadow-lg z-50 w-48">
                        <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm">
                          <Star size={16} /> Favorito
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm">
                          <Pencil size={16} /> Cambiar apodo
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm text-red-400">
                          <Ban size={16} /> Bloquear usuario
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              <div 
                ref={mensajesRef}
                className="flex-1 overflow-y-auto p-6 space-y-3"
              >
                {mensajes.map((mensaje) => {
                  const esUsuarioActual = mensaje.user_id === usuario.id;
                  
                  return (
                    <div
                      key={mensaje.id}
                      className={`flex ${esUsuarioActual ? "justify-end" : "justify-start"} group`}
                    >
                      <div className="flex flex-col max-w-sm">
                        {!esUsuarioActual && (
                          <span className="text-xs text-white/60 mb-1 px-2 flex items-center gap-1">
                            {mensaje.user_name}
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              mensaje.user_role === 'modelo' ? 'bg-pink-400' : 'bg-blue-400'
                            }`}></span>
                          </span>
                        )}
                        <div
                          className={`relative px-4 py-2 rounded-2xl text-sm ${
                            esUsuarioActual
                              ? "bg-[#ff007a] text-white rounded-br-none"
                              : mensaje.type === 'gift' 
                                ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-bl-none"
                                : "bg-[#2b2d31] text-white/80 rounded-bl-none"
                          }`}
                        >
                          {renderMensaje(mensaje)}
                          <div className="text-xs opacity-70 mt-1">
                            {formatearTiempo(mensaje.created_at)}
                          </div>
                          {esUsuarioActual && (
                            <button
                              onClick={() => eliminarMensaje(mensaje.id)}
                              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition text-white/50 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Panel de regalos y emojis */}
              <div className="bg-[#2b2d31] px-4 py-2 border-t border-[#ff007a]/10">
                <div className="flex gap-2 mb-2">
                  {/* Regalos rápidos */}
                  <button
                    onClick={() => enviarRegalo('🌹 Rosa')}
                    className="px-3 py-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-full text-xs hover:scale-105 transition-transform"
                  >
                    🌹 Rosa
                  </button>
                  <button
                    onClick={() => enviarRegalo('💎 Diamante')}
                    className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-xs hover:scale-105 transition-transform"
                  >
                    💎 Diamante
                  </button>
                  <button
                    onClick={() => enviarRegalo('👑 Corona')}
                    className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-xs hover:scale-105 transition-transform"
                  >
                    👑 Corona
                  </button>
                  
                  {/* Emojis rápidos */}
                  <div className="flex gap-1 ml-4">
                    {['❤️', '😍', '🔥', '👏', '😘', '🥰', '💋'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => enviarEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3d44] rounded-full transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Input mensaje */}
              <div className="bg-[#2b2d31] p-4 border-t border-[#ff007a]/20 flex gap-3">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-[#1a1c20] text-white px-4 py-2 rounded-full outline-none focus:ring-2 focus:ring-[#ff007a]/50"
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                />
                <button
                  onClick={() => enviarMensaje()}
                  disabled={!nuevoMensaje.trim()}
                  className="bg-[#ff007a] hover:bg-[#e6006e] disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full font-semibold transition-colors flex items-center gap-2"
                >
                  <Send size={16} />
                  Enviar
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}