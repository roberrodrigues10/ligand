// src/api/axios.js
import axios from "axios";
import Cookies from "js-cookie";

const instance = axios.create({
  baseURL: "https://ligand-backend.onrender.com",
  withCredentials: true, // habilita las cookies cross-domain
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

instance.interceptors.request.use((config) => {
  const token = Cookies.get("XSRF-TOKEN");
  if (token) {
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(token);
  }
  return config;
});

export default instance;
