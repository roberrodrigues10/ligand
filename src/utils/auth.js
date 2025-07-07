import axios from "../api/axios"; // instancia con baseURL y withCredentials

// ✅ Obtener cookie CSRF desde el backend (Sanctum)
export const getCsrfCookie = async () => {
  try {
    await axios.get("/sanctum/csrf-cookie");
    console.log("✅ CSRF cookie obtenida");
  } catch (error) {
    console.error("❌ Error obteniendo CSRF cookie:", error);
    throw error;
  }
};

// ✅ Registrar usuario
export const register = async (email, password) => {
  try {
    await getCsrfCookie();
    const response = await axios.post("/register", {
      email,
      password,
      password_confirmation: password,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error en registro:", error.response?.data || error);
    throw error;
  }
};

// ✅ Login
export const login = async (email, password) => {
  try {
    await getCsrfCookie();
    const response = await axios.post("/login", { email, password });
    return response.data;
  } catch (error) {
    console.error("❌ Error en login:", error.response?.data || error);
    throw error;
  }
};

// ✅ Logout
export const logout = async () => {
  try {
    await axios.post("/logout");
    return true;
  } catch (error) {
    console.error("❌ Error en logout:", error.response?.data || error);
    throw error;
  }
};

// ✅ Obtener usuario autenticado
export const getUser = async () => {
  try {
    const response = await axios.get("/user");
    return response.data;
  } catch (error) {
    console.error("❌ Error obteniendo usuario:", error.response?.data || error);
    throw error;
  }
};
