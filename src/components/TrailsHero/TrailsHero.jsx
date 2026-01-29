import React from "react";
import { ArrowRight, Mountain, SlidersHorizontal, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./TrailsHero.css";

import heroArt from "../../assets/hero_art.png";

export default function TrailsHero() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="trh-section">
      <div className="container">
        <div className="trh-card">
          {/* LEFT */}
          <div className="trh-left">
            <div className="trh-badge">
              <Route size={14} />
              <span>{t("trailsHero.badge")}</span>
            </div>

            <h2 className="trh-title">
              {t("trailsHero.titleLine1")}{" "}
              <span className="trh-highlight">
                {t("trailsHero.titleHighlight")}
              </span>
              <br />
              {t("trailsHero.titleLine2")}
            </h2>

            <p className="trh-subtitle">
              {t("trailsHero.subtitle")}
            </p>

            <div className="trh-actions">
              <button
                className="trh-btn trh-btn-primary"
                onClick={() => navigate("/trasee")}
              >
                {t("trailsHero.ctaTrails")}
              </button>

              <button
                className="trh-btn trh-btn-secondary"
                onClick={() => navigate("/cazari")}
              >
                {t("trailsHero.ctaStays")}
              </button>
            </div>

            <div className="trh-features">
              <div className="trh-feature">
                <SlidersHorizontal size={18} />
                <div>
                  <div className="trh-feature-title">
                    {t("trailsHero.feature1Title")}
                  </div>
                  <div className="trh-feature-sub">
                    {t("trailsHero.feature1Sub")}
                  </div>
                </div>
              </div>

              <div className="trh-feature">
                <Mountain size={18} />
                <div>
                  <div className="trh-feature-title">
                    {t("trailsHero.feature2Title")}
                  </div>
                  <div className="trh-feature-sub">
                    {t("trailsHero.feature2Sub")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="trh-right">
            <img
              className="trh-art"
              src={heroArt}
              alt=""
              draggable={false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
