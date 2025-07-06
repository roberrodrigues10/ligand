// src/utils/auth.js

import instance from "../api/axios";

export const login = async (email, password) => {
  await instance.get("/sanctum/csrf-cookie");
  return instance.post("/login", { email, password });
};

export const logout = () => {
  return instance.post("/logout");
};

export const getUser = () => {
  return instance.get("/user");
};

export const register = async (email, password) => {
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