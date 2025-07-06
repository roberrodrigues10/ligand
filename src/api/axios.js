// src/api/axios.js

import axios from "axios";
import Cookies from "js-cookie";

const instance = axios.create({
  baseURL: "https://ligand-backend.onrender.com", // sin /api, ya que estás llamando /login, etc.
  withCredentials: true,
});

// 👇 Agrega el token XSRF a cada request automáticamente
instance.interceptors.request.use((config) => {
  const token = Cookies.get("XSRF-TOKEN");
  if (token) {
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(token);
  }
  return config;
});

export default instance;
