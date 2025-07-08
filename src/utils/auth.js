import instance from "../api/axios";

export const csrf = async () => {
  try {
    await instance.get("/sanctum/csrf-cookie");
    console.log("✅ Token CSRF obtenido exitosamente");
  } catch (error) {
    console.error("❌ Error al obtener token CSRF:", error);
    throw error;
  }
};

export const login = async (email, password) => {
  await csrf();
  return instance.post("/login", { email, password });
};

export const logout = async () => {
  await csrf();
  return instance.post("/logout");
};

export const getUser = () => {
  return instance.get("/user");
};

export const asignarRol = async ({ rol, nombre }) => {
  await csrf();
  return instance.post("/api/asignar-rol", {
    rol,
    name: nombre,
  });
};

export const register = async (email, password) => {
  await csrf();
  return instance.post("/api/register-model", {
    email,
    password,
  });
};

export async function verificarCodigo(email, code) {
  console.log("➡️ Enviando:", { email, code });
  const response = await instance.post("/api/verify-email-code", {
    email,
    code,
  });
  return response.data;
}