import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";

import "./Auth.css";
import heroImage from "../../assets/images/hero-bucovina.png";
import { authService } from "../../api/authService";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const emailValue = String(email || "").trim();
    if (!emailValue) {
      setError(t("auth.forgotMissingEmail"));
      return;
    }

    try {
      setLoading(true);
      const res = await authService.forgotPassword({ email: emailValue });
      setMessage(res?.message || t("auth.forgotSuccess"));
    } catch (err) {
      setError(err?.message || t("auth.forgotFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authWrap">
      <div className="authBg" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="authOverlay" />

      <main className="authContent container">
        <div className="authContainer">
          <div className="authCard">
            <div className="authHeader">
              <h1 className="authTitle">{t("auth.forgotTitle")}</h1>
              <p className="authSubtitle">{t("auth.forgotSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="authForm">
              <div className="authField">
                <label className="authLabel">{t("auth.email")}</label>
                <div className="authInputWrap">
                  <Mail size={18} className="authIcon" />
                  <input
                    className="authInput"
                    type="email"
                    placeholder="student@upb.ro"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              {error && <p className="authError">{error}</p>}
              {message && <p className="authSuccess">{message}</p>}

              <button className="authSubmit" disabled={loading}>
                {loading ? t("auth.sendingReset") : t("auth.sendResetLink")}
              </button>
            </form>

            <div className="authFooter">
              <Link to="/auth/login" className="authLink">
                {t("auth.backToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
