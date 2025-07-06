// src/utils/auth.js
import instance from "../api/axios";

// Obtiene la cookie de sesión + token CSRF
export const csrf = async () => {
  try {
    await instance.get("/sanctum/csrf-cookie");
    console.log("✅ Token CSRF obtenido exitosamente");
  } catch (error) {
    console.error("❌ Error al obtener token CSRF:", error);
    throw error;
  }
};

// Registro - SIN password_confirmation
export const register = async (email, password) => {
  try {
    await csrf();
    const response = await instance.post("/register", {
      email,
      password,
      // No envíes password_confirmation
    });
    return response;
  } catch (error) {
    console.error("❌ Error en registro:", error);
    
    // Si es error 419, intenta una vez más
    if (error.response?.status === 419) {
      try {
        console.log("🔄 Reintentando registro con nuevo token CSRF...");
        await csrf();
        const response = await instance.post("/register", {
          email,
          password,
        });
        return response;
      } catch (secondError) {
        console.error("❌ Error persistente en registro:", secondError);
        throw secondError;
      }
    }
    
    throw error;
  }
};

// Login
export const login = async (email, password) => {
  try {
    await csrf();
    const response = await instance.post("/login", { email, password });
    return response;
  } catch (error) {
    console.error("❌ Error en login:", error);
    
    if (error.response?.status === 419) {
      try {
        console.log("🔄 Reintentando login con nuevo token CSRF...");
        await csrf();
        const response = await instance.post("/login", { email, password });
        return response;
      } catch (secondError) {
        console.error("❌ Error persistente en login:", secondError);
        throw secondError;
      }
    }
    
    throw error;
  }
};

// Logout
export const logout = async () => {
  try {
    await csrf();
    const response = await instance.post("/logout");
    return response;
  } catch (error) {
    console.error("❌ Error en logout:", error);
    throw error;
  }
};

// Obtener usuario autenticado
export const getUser = () => {
  return instance.get("/user");
};