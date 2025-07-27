import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import instance from "../../../api/axios";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { token } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const emailParam = queryParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError(t("passwords_no_match"));
      return;
    }

    try {
      await instance.get("/sanctum/csrf-cookie");
      await instance.post("/api/reset-password", {
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      });

      setMessage(t("password_changed_successfully"));
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      console.error(err);
      setError(t("error_changing_password"));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d10] flex items-center justify-center px-4">
      <div className="bg-[#1a1c20] p-8 rounded-2xl w-full max-w-md shadow-xl">
        <h2 className="text-2xl text-[#ff007a] font-bold mb-4 text-center">
          {t("reset_password")}
        </h2>

        {message && (
          <div className="text-green-500 text-sm text-center mb-4">
            {message}
          </div>
        )}
        {error && (
          <div className="text-red-500 text-sm text-center mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder={t("new_password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-4 bg-[#0a0d10] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            required
          />
          <input
            type="password"
            placeholder={t("confirm_password")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 mb-6 bg-[#0a0d10] border border-[#2c2e33] text-white rounded-xl placeholder-white/60"
            required
          />
          <button
            type="submit"
            className="w-full py-3 bg-[#ff007a] text-white font-bold rounded-xl hover:bg-[#e6006e] transition"
          >
            {t("change_password")}
          </button>
        </form>
      </div>
    </div>
  );
}