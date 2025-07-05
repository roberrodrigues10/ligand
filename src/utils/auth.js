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
  await instance.get("/sanctum/csrf-cookie");
  return instance.post("/register", {
    email,
    password,
    password_confirmation: password,
  });
};
