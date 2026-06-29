import { useEffect, useState } from "react";
import AISearch from "../AISearch/AISearch";
import heroIllustration from "../../assets/images/hero-bucovina-illustration.png";
import { useTranslation } from "react-i18next";
import { getStats } from "../../api/statsService";
import "./Hero.css";

export default function Hero({ onAISearch, aiLoading }) {
  const { t, i18n } = useTranslation();

  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const locale = i18n.language?.startsWith("en") ? "en-US" : "ro-RO";

  function fmt(n) {
    if (typeof n !== "number") return null;
    return n.toLocaleString(locale);
  }

  const staysVal  = stats ? `${fmt(stats.staysCount)}+` : "—";
  const staysLbl  = t("hero.stat1Lbl");

  return (
    <section className="heroV2">
      <div className="heroV2Bg" aria-hidden="true">
        <div className="heroV2Blob heroV2BlobA" />
        <div className="heroV2Blob heroV2BlobB" />
        <div className="heroV2Grid" />
      </div>

      <div className="container heroV2Container">
        {/* LEFT */}
        <div className="heroV2Left">
          <h1 className="heroV2Title hero-enter" style={{ animationDelay: "0.05s" }}>
            {t("hero.title")}
            <span className="heroV2TitleAccent"> {t("hero.titleAccent")}</span>
          </h1>

          <p className="heroV2Subtitle hero-enter" style={{ animationDelay: "0.18s" }}>
            {t("hero.subtitle")}
          </p>

          <div className="heroV2Search hero-enter" style={{ animationDelay: "0.30s" }}>
            <AISearch onSearch={onAISearch} loading={aiLoading} />
          </div>

          <div className="heroV2Trust hero-enter" style={{ animationDelay: "0.42s" }}>
            <div className="heroV2Avatars" aria-hidden="true">
              <span className="heroV2Avatar" />
              <span className="heroV2Avatar" />
              <span className="heroV2Avatar" />
              <span className="heroV2Avatar heroV2AvatarMore">+99</span>
            </div>
            <div className="heroV2TrustText">
              <div className="heroV2TrustLine1">
                <span className="heroV2Star" aria-hidden="true">★</span>
                <b>{t("hero.trustTitle")}</b>
              </div>
              <div className="heroV2TrustLine2">{t("hero.trustSub")}</div>
            </div>
          </div>

          <div className="heroV2MiniStats hero-enter" style={{ animationDelay: "0.52s" }}>
            <div className="heroV2MiniStat">
              <div className="heroV2MiniVal">{staysVal}</div>
              <div className="heroV2MiniLbl">{staysLbl}</div>
            </div>
            <div className="heroV2MiniStat">
              <div className="heroV2MiniVal">{t("hero.stat3Val")}</div>
              <div className="heroV2MiniLbl">{t("hero.stat3Lbl")}</div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="heroV2Right">
          <div className="heroV2Art hero-enter-right" style={{ animationDelay: "0.12s" }}>
            <img
              className="heroV2Illu"
              src={heroIllustration}
              alt={t("hero.mockAlt")}
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
