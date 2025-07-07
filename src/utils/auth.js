import axios from "../api/axios"; // instancia con baseURL y token dinámico


// ✅ Registrar usuario
export const register = async (email, password) => {
  try {
    const response = await axios.post("/api/register", {
      email,
      password,
    });

    const token = response.data.access_token;
    if (token) {
      sessionStorage.setItem("token", token);
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
export const login = async (email, password) => {
  try {
    const response = await axios.post("/api/login", { email, password });

    const token = response.data.access_token;
    if (token) {
      sessionStorage.setItem("token", token);
    } else {
      console.warn("⚠️ No se recibió access_token en login:", response.data);
    }

    return response.data;
  } catch (error) {
    console.error("❌ Error en login:", error.response?.data || error);
    throw error;
  }
};


// ✅ Logout
export const logout = async () => {
  try {
    sessionStorage.removeItem("token"); // Borra el token
    await axios.post("/api/logout");
    return true;
  } catch (error) {
    console.error("❌ Error en logout:", error.response?.data || error);
    throw error;
  }
};

// ✅ Obtener usuario autenticado
export const getUser = async () => {
  try {
    const response = await axios.get("/api/user");
    return response.data;
  } catch (error) {
    console.error("❌ Error obteniendo usuario:", error.response?.data || error);
    throw error;
  }
};
