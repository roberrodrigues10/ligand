// src/api/axios.js
import axios from "axios";

const instance = axios.create({
  baseURL: "https://ligand-backend.onrender.com",
  withCredentials: false, // no usamos cookies
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar token Bearer
instance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
