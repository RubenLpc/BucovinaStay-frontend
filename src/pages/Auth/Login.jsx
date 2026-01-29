import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock } from "lucide-react";

import "./Auth.css";
import heroImage from "../../assets/images/hero-bucovina.png";

import { authService } from "../../api/authService";
import { useAuthStore } from "../../stores/authStore";
import { listStays } from "../../api/staysService";
import StayCard from "../../components/Stays/StayCard";

const LANES = [
  { left: "-25%", delay: "0s", duration: "40s", anim: "authFlowUpRight" },
  { left: "-25%", delay: "-20s", duration: "40s", anim: "authFlowUpRight" },
  { left: "5%", delay: "-5s", duration: "45s", anim: "authFlowUpRight" },
  { left: "5%", delay: "-25s", duration: "45s", anim: "authFlowUpRight" },
  { left: "25%", delay: "-10s", duration: "48s", anim: "authFlowUpRight" },
  { left: "25%", delay: "-30s", duration: "48s", anim: "authFlowUpRight" },
  { left: "65%", delay: "-8s", duration: "42s", anim: "authFlowDownLeft" },
  { left: "65%", delay: "-28s", duration: "42s", anim: "authFlowDownLeft" },
  { left: "85%", delay: "-2s", duration: "46s", anim: "authFlowDownLeft" },
  { left: "85%", delay: "-22s", duration: "46s", anim: "authFlowDownLeft" },
  { left: "-15%", delay: "-8s", duration: "42s", anim: "authFlowDownLeft" },
  { left: "-15%", delay: "-26s", duration: "42s", anim: "authFlowDownLeft" },
];

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [stays, setStays] = useState([]);
  const [bgBlur, setBgBlur] = useState(false);

  useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await listStays({ page: 1, limit: 18 });
        const items =
          res?.items ||
          res?.data?.items ||
          res?.stays ||
          res?.data?.stays ||
          res?.data ||
          [];
        const clean = Array.isArray(items) ? items : [];
        if (!alive) return;
        setStays(clean);
      } catch {
        if (!alive) return;
        setStays([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const backgroundCards = useMemo(() => {
    const source = stays.length ? stays : [];
    const pool = source.length ? [...source, ...source, ...source] : [];
    return LANES.map((lane, idx) => ({
      ...lane,
      id: `lane-${idx}`,
      stay: pool.length ? pool[idx % pool.length] : null,
    }));
  }, [stays]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const eVal = String(email || "").trim();
    const pVal = String(password || "").trim();
    if (!eVal || !pVal) {
      setError(t("auth.missingFields"));
      return;
    }

    try {
      setLoading(true);
      const res = await authService.login({ email: eVal, password: pVal });
      const loggedUser = res?.user;

      const from = location.state?.from;
      if (from) return navigate(from, { replace: true });

      if (loggedUser?.role === "host") navigate("/host/dashboard", { replace: true });
      else if (loggedUser?.role === "admin") navigate("/admin", { replace: true });
      else navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authWrap">
      <div className="authBg" style={{ backgroundImage: `url(${heroImage})` }} />

      <div className={`authAnimatedBg ${bgBlur ? "isBlurred" : ""}`} aria-hidden="true">
        {backgroundCards.map((card) => (
          <div key={card.id} className="authLane" style={{ left: card.left }}>
            <div
              className="authVisualCard"
              style={{
                animation: `${card.anim} ${card.duration} linear infinite`,
                animationDelay: card.delay,
              }}
            >
              <div className="authVisualInner">
                {card.stay ? (
                  <StayCard stay={card.stay} />
                ) : (
                  <div className="authGhost">
                    <div className="authGhostMedia" />
                    <div className="authGhostMeta">
                      <div className="authGhostPill" />
                      <div className="authGhostTitle" />
                      <div className="authGhostLine" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="authVignette" />
        <div className="authNoise" />
      </div>

      <div className="authOverlay" />

      <main className="authContent container">
        <div
          className="authContainer"
          onMouseEnter={() => setBgBlur(true)}
          onMouseLeave={() => setBgBlur(false)}
        >
          <div className="authCard">
            <div className="authHeader">
              <h1 className="authTitle">{t("auth.loginTitle")}</h1>
              <p className="authSubtitle">{t("auth.loginSubtitle")}</p>
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

              <div className="authField">
                <label className="authLabel">{t("auth.password")}</label>
                <div className="authInputWrap">
                  <Lock size={18} className="authIcon" />
                  <input
                    className="authInput"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && <p className="authError">{error}</p>}

              <button className="authSubmit" disabled={loading}>
                {loading ? t("auth.loggingIn") : t("auth.loginBtn")}
              </button>
            </form>

            <div className="authFooter">
              {t("auth.noAccount")}{" "}
              <Link to="/auth/register" className="authLink">
                {t("auth.createOne")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
