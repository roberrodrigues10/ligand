import axios from "../api/axios"; // instancia con baseURL y token dinámico

// ✅ Registrar usuario
export const register = async (email, password) => {
  try {
    const response = await axios.post("/register", {
      email,
      password,
    });

    // Guardar el token en sessionStorage
    sessionStorage.setItem("token", response.data.token);

    return response.data;
  } catch (error) {
    console.error("❌ Error en registro:", error.response?.data || error);
    throw error;
  }
};

// ✅ Login
export const login = async (email, password) => {
  try {
    const response = await axios.post("/login", { email, password });

    // Guardar token en sessionStorage (se borra al cerrar pestaña)
    sessionStorage.setItem("token", response.data.token);

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
