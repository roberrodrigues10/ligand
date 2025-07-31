import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./headercliente";
import { getUser } from "../../utils/auth";

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
  Crown,
  Diamond,      
  Sparkles,
  Coffee,
  Wine,
} from "lucide-react";


export default function ChatCliente() {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [mostrarRegalos, setMostrarRegalos] = useState(false);
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
  const [escribiendo, setEscribiendo] = useState(false);
  const mensajesRef = useRef(null);
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


  // 🎁 CATÁLOGO DE REGALOS PARA CLIENTES
  const regalosDisponibles = [
    { id: 1, nombre: "🌹 Rosa", precio: 50, color: "from-pink-500 to-red-500" },
    { id: 2, nombre: "💎 Diamante", precio: 500, color: "from-blue-500 to-purple-500" },
    { id: 3, nombre: "👑 Corona", precio: 1000, color: "from-yellow-500 to-orange-500" },
    { id: 4, nombre: "💍 Anillo", precio: 750, color: "from-purple-500 to-pink-500" },
    { id: 5, nombre: "🍾 Champagne", precio: 300, color: "from-green-500 to-yellow-500" },
    { id: 6, nombre: "❤️ Corazón", precio: 100, color: "from-red-500 to-pink-500" },
    { id: 7, nombre: "⭐ Estrella", precio: 200, color: "from-yellow-400 to-yellow-600" },
    { id: 8, nombre: "🔥 Fuego", precio: 150, color: "from-orange-500 to-red-500" },
  ];

  // 🔥 FUNCIÓN PARA OBTENER HEADERS CON TOKEN
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

  // Cargar datos del usuario
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
      }, 2000); // Cada 2 segundos para experiencia más fluida
    }
    return () => clearInterval(interval);
  }, [conversacionActiva]);

  const cargarDatosUsuario = async () => {
    try {
      console.log('🔍 [CLIENTE] Cargando perfil...');
      
      const userData = await getUser();
      
      console.log('✅ [CLIENTE] Datos recibidos:', userData);
      setUsuario({
        id: userData.id,
        name: userData.name || userData.alias || `Cliente_${userData.id}`,
        rol: userData.rol
      });
      
    } catch (error) {
      console.error('❌ [CLIENTE] Error cargando datos:', error);
      setUsuario({
        id: 1,
        name: "Cliente Demo",
        rol: "cliente"
      });
    }
  };

  const cargarConversaciones = async () => {
    try {
      setLoading(true);
      console.log('🔍 [CLIENTE] Cargando conversaciones con modelos...');
      
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [CLIENTE] Conversaciones recibidas:', data);
        // Filtrar solo conversaciones con modelos
        const conversacionesConModelos = (data.conversations || []).filter(conv => 
          conv.other_user_role === 'modelo'
        );
        setConversaciones(conversacionesConModelos);
      } else {
        console.error('❌ [CLIENTE] Error cargando conversaciones:', response.status);
      }
    } catch (error) {
      console.error('❌ [CLIENTE] Error:', error);
      // Datos de ejemplo específicos para cliente
      setConversaciones([
        {
          id: 1,
          other_user_id: 2,
          other_user_name: "SofiSweet 💋",
          other_user_role: "modelo",
          room_name: "chat_user_1_2",
          last_message: "¡Hola guapo! ¿Cómo estás? 😘",
          last_message_time: "2024-01-15T14:30:00Z",
          unread_count: 3,
          session_date: "2024-01-15T13:45:00Z",
          avatar: "https://i.pravatar.cc/40?u=2",
          online: true,
          rating: 4.8
        },
        {
          id: 2,
          other_user_id: 3,
          other_user_name: "Mia Goddess ✨",
          other_user_role: "modelo", 
          room_name: "chat_user_1_3",
          last_message: "Gracias por los regalos, eres muy dulce 🌹",
          last_message_time: "2024-01-15T12:15:00Z",
          unread_count: 0,
          session_date: "2024-01-15T11:30:00Z",
          avatar: "https://i.pravatar.cc/40?u=3",
          online: false,
          rating: 4.9
        },
        {
          id: 3,
          other_user_id: 4,
          other_user_name: "Luna Bella 🌙",
          other_user_role: "modelo",
          room_name: "chat_user_1_4", 
          last_message: "¿Te gustaría una sesión privada? 💕",
          last_message_time: "2024-01-14T20:45:00Z",
          unread_count: 1,
          session_date: "2024-01-14T20:00:00Z",
          avatar: "https://i.pravatar.cc/40?u=4",
          online: true,
          rating: 4.7
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const cargarMensajes = async (roomName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/messages/${roomName}`, {
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
      // Mensajes de ejemplo específicos para cliente-modelo
      if (roomName === "chat_user_1_2") {
        setMensajes([
          {
            id: 1,
            user_id: 2,
            user_name: "SofiSweet",
            user_role: "modelo",
            message: "¡Hola guapo! Me alegra verte de nuevo 😘",
            type: "text",
            created_at: "2024-01-15T14:25:00Z"
          },
          {
            id: 2,
            user_id: 1,
            user_name: "Cliente Demo",
            user_role: "cliente",
            message: "¡Hola bella! ¿Cómo has estado?",
            type: "text", 
            created_at: "2024-01-15T14:26:00Z"
          },
          {
            id: 3,
            user_id: 1,
            user_name: "Cliente Demo",
            user_role: "cliente",
            message: "🌹 Rosa",
            type: "gift",
            extra_data: { gift_type: "🌹 Rosa", price: 50 },
            created_at: "2024-01-15T14:27:00Z"
          },
          {
            id: 4,
            user_id: 2,
            user_name: "SofiSweet",
            user_role: "modelo",
            message: "¡Aww, gracias mi amor! Eres tan dulce 💕",
            type: "text",
            created_at: "2024-01-15T14:28:00Z"
          },
          {
            id: 5,
            user_id: 2,
            user_name: "SofiSweet",
            user_role: "modelo",
            message: "¿Te gustaría una sesión privada? Tengo algo especial para ti 🔥",
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
    
    if (conversacion.unread_count > 0) {
      marcarComoLeido(conversacion.room_name);
    }
  };

  const marcarComoLeido = async (roomName) => {
    try {
      await fetch(`${API_BASE_URL}/api/chat/mark-read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ room_name: roomName })
      });
      
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

  const enviarMensaje = async (tipo = 'text', contenido = null, extra = null) => {
    const mensaje = contenido || nuevoMensaje.trim();
    if (!mensaje || !conversacionActiva) return;

    try {
      setEscribiendo(true);
      
      const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          room_name: conversacionActiva,
          message: mensaje,
          type: tipo,
          extra_data: extra
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const nuevoMensajeObj = {
            id: Date.now(),
            user_id: usuario.id,
            user_name: usuario.name,
            user_role: usuario.rol,
            message: mensaje,
            type: tipo,
            extra_data: extra,
            created_at: new Date().toISOString()
          };
          setMensajes(prev => [...prev, nuevoMensajeObj]);
          setNuevoMensaje("");
          
          // Actualizar conversación
          setConversaciones(prev => 
            prev.map(conv => 
              conv.room_name === conversacionActiva
                ? { 
                    ...conv, 
                    last_message: tipo === 'gift' ? `Envió: ${mensaje}` : mensaje,
                    last_message_time: new Date().toISOString()
                  }
                : conv
            )
          );
        }
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    } finally {
      setEscribiendo(false);
    }
  };

  const enviarRegalo = (regalo) => {
    const extraData = {
      gift_type: regalo.nombre,
      price: regalo.precio,
      gift_id: regalo.id
    };
    
    enviarMensaje('gift', regalo.nombre, extraData);
    setMostrarRegalos(false);
    
    // Mostrar confirmación
    const confirmacion = document.createElement('div');
    confirmacion.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
    confirmacion.textContent = `¡Regalo ${regalo.nombre} enviado!`;
    document.body.appendChild(confirmacion);
    setTimeout(() => document.body.removeChild(confirmacion), 3000);
  };

  const iniciarVideochatPrivado = (modeloId) => {
    navigate('/videochatclient', { 
      state: { 
        targetUserId: modeloId,
        fromChat: true,
        isPrivate: true
      }
    });
  };

  const enviarEmoji = (emoji) => {
    enviarMensaje('emoji', emoji);
  };

  const eliminarMensaje = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/delete-message/${id}`, {
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
        const giftData = mensaje.extra_data;
        return (
          <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-lg border border-yellow-400/30">
            <Gift size={20} className="text-yellow-400" />
            <div>
              <span className="text-yellow-400 font-semibold">{mensaje.message}</span>
              {giftData?.price && (
                <p className="text-xs text-yellow-300">Valor: ${giftData.price}</p>
              )}
            </div>
          </div>
        );
      case 'emoji':
        return (
          <div className="text-3xl animate-bounce">
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
        {/* Sidebar de conversaciones con modelos */}
        <aside className="w-1/3 bg-[#2b2d31] p-4 overflow-y-auto">
          {/* Búsqueda */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
            <input
              type="text"
              placeholder="Buscar modelos..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1a1c20] text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-[#ff007a]/50"
              value={busquedaConversacion}
              onChange={(e) => setBusquedaConversacion(e.target.value)}
            />
          </div>

          {/* Info cliente */}
          <div className="mb-4 p-3 bg-gradient-to-r from-[#ff007a]/20 to-[#e6006e]/20 rounded-lg border border-[#ff007a]/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">{usuario.name}</span>
              <span className="text-xs text-white/60 bg-blue-500/20 px-2 py-1 rounded">
                👤 Cliente
              </span>
            </div>
            <p className="text-xs text-white/70 mt-1">Chatea con tus modelos favoritas</p>
          </div>

          {/* Lista de conversaciones con modelos */}
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
                <p className="text-xs text-white/40">Inicia chats con modelos después de las sesiones</p>
              </div>
            ) : (
              conversacionesFiltradas.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => abrirConversacion(conv)}
                  className={`p-3 hover:bg-[#3a3d44] rounded-lg cursor-pointer transition-colors border ${
                    conversacionActiva === conv.room_name 
                      ? 'bg-[#ff007a]/20 border-[#ff007a] shadow-lg shadow-[#ff007a]/20' 
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={conv.avatar}
                        alt={conv.other_user_name}
                        className="w-12 h-12 rounded-full border-2 border-pink-400/50"
                      />
                      {/* Estado online */}
                      {conv.online && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#2b2d31] animate-pulse"></div>
                      )}
                      {/* Contador de mensajes no leídos */}
                      {conv.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-[#ff007a] text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-bounce">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate text-pink-200">{conv.other_user_name}</p>
                        {conv.rating && (
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-yellow-400">{conv.rating}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-white/60 truncate mt-1">
                        {conv.last_message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-white/40">
                          {formatearTiempo(conv.last_message_time)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          conv.online 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {conv.online ? 'En línea' : 'Offline'}
                        </span>
                      </div>
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
                <h3 className="text-xl font-semibold mb-2">Selecciona una modelo</h3>
                <p className="text-white/60">Elige una conversación para chatear</p>
                <div className="mt-4 flex gap-2 justify-center">
                  <div className="flex items-center gap-1 text-sm text-white/50">
                    <Gift size={16} />
                    <span>Envía regalos</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-white/50">
                    <Video size={16} />
                    <span>Sesiones privadas</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header de conversación con modelo */}
              <div className="bg-gradient-to-r from-[#2b2d31] to-[#3a3d44] px-5 py-3 flex justify-between items-center border-b border-[#ff007a]/20">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={conversacionSeleccionada?.avatar}
                      alt={conversacionSeleccionada?.other_user_name}
                      className="w-12 h-12 rounded-full border-2 border-pink-400/50"
                    />
                    {conversacionSeleccionada?.online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#2b2d31]"></div>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold block text-pink-200">
                      {conversacionSeleccionada?.other_user_name}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`flex items-center gap-1 ${
                        conversacionSeleccionada?.online ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {conversacionSeleccionada?.online ? 'En línea' : 'Offline'}
                      </span>
                      {conversacionSeleccionada?.rating && (
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-yellow-400">{conversacionSeleccionada.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => iniciarVideochatPrivado(conversacionSeleccionada?.other_user_id)}
                    className="px-4 py-2 bg-gradient-to-r from-[#ff007a] to-[#e6006e] hover:from-[#e6006e] to-[#cc0060] text-white rounded-lg text-sm transition-all duration-300 flex items-center gap-2 shadow-lg shadow-[#ff007a]/30"
                  >
                    <Video size={16} />
                    Sesión Privada
                  </button>
                  
                  <button
                    onClick={() => setMostrarRegalos(!mostrarRegalos)}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-orange-500 to-red-500 text-white rounded-lg text-sm transition-all duration-300 flex items-center gap-2 shadow-lg shadow-yellow-500/30"
                  >
                    <Gift size={16} />
                    Regalos
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setMostrarOpciones(!mostrarOpciones)}
                      className="text-white hover:text-[#ff007a] transition-colors p-2"
                    >
                      <MoreVertical />
                    </button>
                    {mostrarOpciones && (
                      <div className="absolute right-0 mt-2 bg-[#1f2125] border border-[#ff007a]/30 rounded-xl shadow-lg z-50 w-48">
                        <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm">
                          <Star size={16} /> Agregar a favoritos
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm">
                          <Pencil size={16} /> Cambiar apodo
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#2b2d31] text-sm text-red-400">
                          <Ban size={16} /> Bloquear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Panel de regalos desplegable */}
              {mostrarRegalos && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20 p-4">
                  <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <Gift size={16} />
                    Envía un regalo a {conversacionSeleccionada?.other_user_name}
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {regalosDisponibles.map((regalo) => (
                      <button
                        key={regalo.id}
                        onClick={() => enviarRegalo(regalo)}
                        className={`p-3 bg-gradient-to-r ${regalo.color} rounded-lg text-white text-xs font-semibold hover:scale-105 transition-transform shadow-lg`}
                      >
                        <div className="text-lg mb-1">{regalo.nombre}</div>
                        <div>${regalo.precio}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensajes */}
              <div 
                ref={mensajesRef}
                className="flex-1 overflow-y-auto p-6 space-y-4"
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
                          <span className="text-xs text-pink-300 mb-1 px-2 flex items-center gap-1">
                            💋 {mensaje.user_name}
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                          </span>
                        )}
                        <div
                          className={`relative px-4 py-3 rounded-2xl text-sm ${
                            esUsuarioActual
                              ? "bg-gradient-to-r from-[#ff007a] to-[#e6006e] text-white rounded-br-none shadow-lg shadow-[#ff007a]/30"
                              : mensaje.type === 'gift' 
                                ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-bl-none shadow-lg shadow-yellow-500/30"
                                : "bg-gradient-to-r from-[#2b2d31] to-[#3a3d44] text-white/90 rounded-bl-none shadow-lg"
                          }`}
                        >
                          {renderMensaje(mensaje)}
                          <div className="text-xs opacity-70 mt-2 flex items-center justify-between">
                            <span>{formatearTiempo(mensaje.created_at)}</span>
                            {mensaje.type === 'gift' && (
                              <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                                🎁 Regalo
                              </span>
                            )}
                          </div>
                          {esUsuarioActual && (
                            <button
                              onClick={() => eliminarMensaje(mensaje.id)}
                              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition text-white/50 hover:text-red-400 bg-red-500/20 rounded-full p-1"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Indicador de escribiendo */}
                {escribiendo && (
                  <div className="flex justify-end">
                    <div className="bg-[#ff007a]/20 px-4 py-2 rounded-lg text-sm text-white/70">
                      Enviando...
                    </div>
                  </div>
                )}
              </div>

              {/* Panel de emojis rápidos */}
              <div className="bg-gradient-to-r from-[#2b2d31]/50 to-[#3a3d44]/50 px-4 py-2 border-t border-[#ff007a]/10">
                <div className="flex gap-2 mb-2 justify-center">
                  {/* Emojis románticos/seductores para clientes */}
                  {['😘', '😍', '🔥', '💕', '🥰', '💋', '😈', '🌹', '💎', '👑'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => enviarEmoji(emoji)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-[#ff007a]/20 rounded-full transition-all duration-300 hover:scale-110 text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input mensaje con estilo cliente */}
              <div className="bg-gradient-to-r from-[#2b2d31] to-[#3a3d44] p-4 border-t border-[#ff007a]/20 flex gap-3">
                <input
                  type="text"
                  placeholder="Escribe algo dulce..."
                  className="flex-1 bg-[#1a1c20] text-white px-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-[#ff007a]/50 focus:bg-[#0a0d10] transition-all"
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                  disabled={escribiendo}
                />
                <button
                  onClick={() => setMostrarRegalos(!mostrarRegalos)}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-orange-500 to-red-500 text-white px-4 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg shadow-yellow-500/30"
                >
                  <Gift size={16} />
                </button>
                <button
                  onClick={() => enviarMensaje()}
                  disabled={!nuevoMensaje.trim() || escribiendo}
                  className="bg-gradient-to-r from-[#ff007a] to-[#e6006e] hover:from-[#e6006e] to-[#cc0060] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg shadow-[#ff007a]/30"
                >
                  <Send size={16} />
                  {escribiendo ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
      
      {/* Notificación flotante para nuevos mensajes */}
      {conversaciones.some(conv => conv.unread_count > 0) && (
        <div className="fixed bottom-6 left-6 bg-gradient-to-r from-[#ff007a] to-[#e6006e] text-white px-4 py-2 rounded-full shadow-lg shadow-[#ff007a]/30 animate-bounce">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span className="text-sm">
              {conversaciones.reduce((sum, conv) => sum + conv.unread_count, 0)} mensajes nuevos
            </span>
          </div>
        </div>
      )}
    </div>
  );
}