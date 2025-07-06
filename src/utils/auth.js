import axios from "../api/axios"; // o 'instance', mismo resultado

export const register = async (email, password) => {
  try {
    const response = await axios.post("/register", { email, password });
    return response;
  } catch (error) {
    console.error("❌ Error en registro:", error);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await axios.post("/login", { email, password });
    return response;
  } catch (error) {
    console.error("❌ Error en login:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    const response = await axios.post("/logout");
    return response;
  } catch (error) {
    console.error("❌ Error en logout:", error);
    throw error;
  }
};

export const getUser = async () => {
  try {
    const response = await axios.get("/user");
    return response;
  } catch (error) {
    console.error("❌ Error al obtener usuario:", error);
    throw error;
  }
};
