import axios from "../api/axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ✅ Registrar usuario
export const register = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/register`, { email, password }, { skipInterceptor: true });

    const token = response.data.access_token;
    if (token) {
      sessionStorage.setItem("token", token);
      console.log("✅ Token guardado en registro:", token.substring(0, 10) + "...");
    } else {
      console.warn("⚠️ No se recibió access_token en registro:", response.data);
    }

    return response.data;
  } catch (error) {
    console.error("❌ Error en registro:", error.response?.data || error);
    throw error;
  }
};

// ✅ Login
export const login = async (email, password, navigate) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/login`, { email, password });

    const token = response.data.access_token;
    if (token) {
      sessionStorage.setItem("token", token);
      console.log("✅ Token guardado en login:", token.substring(0, 10) + "...");
    }

    const { signup_step } = response.data;

    switch (signup_step) {
      case 'gender':
        navigate('/registro/genero');
        break;
      case 'name':
        navigate('/registro/nombre');
        break;
      case 'photo':
        navigate('/registro/foto');
        break;
      case 'verification':
        navigate('/anteveri');
        break;
      default:
        navigate('/homellamadas');
        break;
    }

    return response.data;
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error(error.response.data.message || "Correo no verificado");
    }

    if (error.response?.status === 401) {
      throw new Error("Credenciales incorrectas");
    }

    console.error("❌ Error en login:", error.response?.data || error);
    throw new Error("Error desconocido en el login");
  }
};

// ✅ Logout
export const logout = async () => {
  try {
    await axios.post(`${API_BASE_URL}/api/logout`);
    sessionStorage.removeItem("token");
    return true;
  } catch (error) {
    console.error("❌ Error en logout:", error.response?.data || error);
    throw error;
  }
};

// ✅ Obtener usuario autenticado - SIN skipInterceptor
export const getUser = async () => {
  try {
    const token = sessionStorage.getItem("token");
    console.log("🔐 Token disponible para profile:", token ? "Sí" : "No");
    
    const response = await axios.get(`${API_BASE_URL}/api/profile`); // ← SIN skipInterceptor
    console.log("✅ Perfil obtenido exitosamente");
    console.log("👤 Usuario:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error obteniendo usuario:", error.response?.data);
    
    // Si es 401, limpiar token inválido
    if (error.response?.status === 401) {
      console.log("🧹 Limpiando token inválido");
      sessionStorage.removeItem("token");
    }
    
    throw error;
  }
};

// ✅ Verificar código
export async function verificarCodigo(email, code) {
  console.log("➡️ Enviando:", { email, code });
  const response = await axios.post(`${API_BASE_URL}/api/verify-email-code`, {
    email,
    code,
  });
  return response.data;
}

// ✅ Reenviar código
export async function reenviarCodigo(email) {
  return await axios.post(`${API_BASE_URL}/api/resend-code`, { email });
}

export const asignarRol = async ({ rol, nombre }) => {
  return axios.post(`${API_BASE_URL}/api/asignar-rol`, {
    rol,
    name: nombre,
  });
};

// ✅ Reclamar sesión
export const reclamarSesion = async () => {
  try {
    const token = sessionStorage.getItem("token");
    const response = await axios.post(
      `${API_BASE_URL}/api/reclamar-sesion`,
      {},
      {
        skipInterceptor: true,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const nuevoToken = response.data.nuevo_token;
    if (nuevoToken) {
      sessionStorage.setItem("token", nuevoToken);
      return nuevoToken;
    } else {
      console.warn("⚠️ No se recibió nuevo_token");
      return null;
    }
  } catch (error) {
    console.error("❌ Error reclamando sesión:", error.response?.data || error);
    throw error;
  }
};