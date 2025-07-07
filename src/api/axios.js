import axios from "axios";
import Cookies from "js-cookie"; // npm install js-cookie

const instance = axios.create({
  baseURL: "https://ligand-backend.onrender.com",
  withCredentials: true,
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
  console.log("📡 Request:", config.method?.toUpperCase(), config.url);
  return config;
});

export default instance;
