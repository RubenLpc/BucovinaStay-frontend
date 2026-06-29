import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";

import "./Auth.css";
import heroImage from "../../assets/images/hero-bucovina.png";
import { authService } from "../../api/authService";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const passwordValue = String(password || "");
    const confirmValue = String(confirmPassword || "");

    if (!passwordValue || !confirmValue) {
      setError(t("auth.resetMissingFields"));
      return;
    }

    if (passwordValue.length < 6) {
      setError(t("auth.resetPasswordTooShort"));
      return;
    }

    if (passwordValue !== confirmValue) {
      setError(t("auth.resetPasswordsMismatch"));
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword(token, { password: passwordValue });
      navigate("/auth/login", {
        replace: true,
        state: { message: t("auth.resetSuccess") },
      });
    } catch (err) {
      setError(err?.message || t("auth.resetFailed"));
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
              <h1 className="authTitle">{t("auth.resetTitle")}</h1>
              <p className="authSubtitle">{t("auth.resetSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="authForm">
              <div className="authField">
                <label className="authLabel">{t("auth.newPassword")}</label>
                <div className="authInputWrap">
                  <Lock size={18} className="authIcon" />
                  <input
                    className="authInput"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="authField">
                <label className="authLabel">{t("auth.confirmPassword")}</label>
                <div className="authInputWrap">
                  <Lock size={18} className="authIcon" />
                  <input
                    className="authInput"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && <p className="authError">{error}</p>}

              <button className="authSubmit" disabled={loading}>
                {loading ? t("auth.resettingPassword") : t("auth.resetPasswordBtn")}
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
