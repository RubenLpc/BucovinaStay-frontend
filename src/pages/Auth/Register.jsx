import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock, User } from "lucide-react";

import "./Auth.css";
import heroImage from "../../assets/images/hero-bucovina.png";

import { authService } from "../../api/authService";
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

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [asHost, setAsHost] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [stays, setStays] = useState([]);
  const [bgBlur, setBgBlur] = useState(false);

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

    const nVal = String(name || "").trim();
    const eVal = String(email || "").trim();
    const pVal = String(password || "").trim();

    if (!nVal || !eVal || !pVal) {
      setError(t("auth.registerMissingFields"));
      return;
    }

    try {
      setLoading(true);
      await authService.register({
        email: eVal,
        password: pVal,
        name: nVal,
        role: asHost ? "host" : "guest",
      });
      navigate(asHost ? "/host/dashboard" : "/", { replace: true });
    } catch (err) {
      setError(err?.message || t("auth.registerFailed"));
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
              <h1 className="authTitle">{t("auth.registerTitle")}</h1>
              <p className="authSubtitle">{t("auth.registerSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="authForm">
              <div className="authField">
                <label className="authLabel">{t("auth.fullName")}</label>
                <div className="authInputWrap">
                  <User size={18} className="authIcon" />
                  <input
                    className="authInput"
                    type="text"
                    placeholder="Lupancu Ruben"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="authField">
                <label className="authLabel">{t("auth.email")}</label>
                <div className="authInputWrap">
                  <Mail size={18} className="authIcon" />
                  <input
                    className="authInput"
                    type="email"
                    placeholder="student@university.edu"
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
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && <p className="authError">{error}</p>}

              <button className="authSubmit" disabled={loading}>
                {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
              </button>

              <label className="authCheck">
                <input
                  type="checkbox"
                  checked={asHost}
                  onChange={(e) => setAsHost(e.target.checked)}
                />
                <span className="authCheckBox" />
                <span className="authCheckText">{t("auth.hostOptIn")}</span>
              </label>
            </form>

            <div className="authFooter">
              {t("auth.alreadyHave")}{" "}
              <Link to="/auth/login" className="authLink">
                {t("auth.signIn")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
