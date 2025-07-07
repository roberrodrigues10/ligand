// src/api/axios.js
import axios from "axios";

const instance = axios.create({
  baseURL: "https://ligand-backend.onrender.com",
  withCredentials: true, // habilita las cookies cross-domain
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Solo logs, sin leer cookies manualmente
instance.interceptors.request.use((config) => {
  console.log("📡 Request:", config.method?.toUpperCase(), config.url);
  return config;
});

export default instance;
