import React, { useMemo } from "react";
import { ArrowRight, Route, Timer, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import trailsData from "../../pages/Trails/trailsData";
import heroArt from "../../assets/hero_art.png";
import "./TrailsHero.css";

/* ─── helpers ────────────────────────────────────────── */
const DIFF_CLASS = { "Ușor": "diff-easy", "Mediu": "diff-mid", "Greu": "diff-hard" };

function smartScore(t) {
  const ORDER = { "Ușor": 1, "Mediu": 2, "Greu": 3 };
  let s = (4 - (ORDER[t.difficulty] || 2)) * 10;
  const dur = t.durationHrs ?? 99;
  s += Math.max(0, 8 - dur) * 2;
  if ((t.tags || []).includes("view"))   s += 8;
  if ((t.tags || []).includes("family")) s += 4;
  if (t.durationHrs)                     s += 6;
  return s;
}

function pickRepresentative(trails) {
  const pick = (diff) =>
    [...trails]
      .filter((t) => t.difficulty === diff)
      .sort((a, b) => smartScore(b) - smartScore(a))[0];
  return ["Ușor", "Mediu", "Greu"].map(pick).filter(Boolean);
}

/* ─── Trail preview card ─────────────────────────────── */
function TrailCard({ trail, index }) {
  const diffClass = DIFF_CLASS[trail.difficulty] || "diff-mid";
  return (
    <div className={`trh-tcard trh-tcard--${index}`}>
      <div className={`trh-tcard-bar ${diffClass}`} />
      <div className="trh-tcard-body">
        <div className="trh-tcard-top">
          <span className="trh-tcard-name">{trail.name}</span>
          <span className={`trh-tcard-badge ${diffClass}`}>{trail.difficulty}</span>
        </div>
        <div className="trh-tcard-meta">
          <span><MapPin size={10} aria-hidden="true" />{trail.area}</span>
          {trail.durationHrs && <span><Timer size={10} aria-hidden="true" />{trail.durationHrs}h</span>}
          {trail.distanceKm  && <span>~{trail.distanceKm} km</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Page component ─────────────────────────────────── */
export default function TrailsHero() {
  const navigate = useNavigate();
  const { t }    = useTranslation();

  const featured = useMemo(() => pickRepresentative(trailsData), []);
  const total    = trailsData.length;
  const knownDurationCount = useMemo(
    () => trailsData.filter((trail) => typeof trail.durationHrs === "number" && trail.durationHrs > 0).length,
    []
  );

  return (
    <section className="trh-section">
      <div className="container">
        <div className="trh-card">
          <div className="trh-ambient trh-ambient-a" aria-hidden="true" />
          <div className="trh-ambient trh-ambient-b" aria-hidden="true" />

          {/* ── LEFT ── */}
          <div className="trh-left">

            <div className="trh-badge">
              <Route size={13} aria-hidden="true" />
              <span>{t("trailsHero.badge")}</span>
            </div>

            <h2 className="trh-title">
              {t("trailsHero.titleLine1")}{" "}
              <span className="trh-highlight">
                {t("trailsHero.titleHighlight")}
                <span className="trh-highlight-bg" aria-hidden="true" />
              </span>
              <br />
              {t("trailsHero.titleLine2")}
            </h2>

            <p className="trh-subtitle">{t("trailsHero.subtitle")}</p>

            {/* Stats */}
            <div className="trh-stats">
              <div className="trh-stat trh-stat-card">
                <span className="trh-stat-kicker">{knownDurationCount}+ cu durată estimată</span>
                <span className="trh-stat-val">{total}</span>
                <span className="trh-stat-lbl">trasee</span>
              </div>
              <div className="trh-stat-div" />
              <div className="trh-stat trh-stat-card">
                <span className="trh-stat-kicker">de la plimbări lejere</span>
                <span className="trh-stat-val">3</span>
                <span className="trh-stat-lbl">niveluri</span>
              </div>
              <div className="trh-stat-div" />
              <div className="trh-stat trh-stat-card">
                <span className="trh-stat-kicker">Rarău, Călimani și altele</span>
                <span className="trh-stat-val">4</span>
                <span className="trh-stat-lbl">zone montane</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="trh-actionsWrap">
              <div className="trh-actions">
              <button
                className="trh-btn trh-btn-primary"
                type="button"
                onClick={() => navigate("/trasee")}
              >
                {t("trailsHero.ctaTrails")} <ArrowRight size={15} aria-hidden="true" />
              </button>
              <button
                className="trh-btn trh-btn-secondary"
                type="button"
                onClick={() => navigate("/cazari")}
              >
                {t("trailsHero.ctaStays")} <ChevronRight size={14} aria-hidden="true" />
              </button>
              </div>

              <div className="trh-actionsHint">
                <Route size={14} aria-hidden="true" />
                <span>alegeri rapide pentru o ieșire de weekend</span>
              </div>
            </div>

            {/* Difficulty pills */}
            <div className="trh-diff-row">
              <span className="trh-diff-pill easy">● Ușor</span>
              <span className="trh-diff-pill mid">● Mediu</span>
              <span className="trh-diff-pill hard">● Greu</span>
            </div>

          </div>

          {/* ── RIGHT ── */}
          <div className="trh-right">
            <div className="trh-artWrap">
              <img
                src={heroArt}
                alt=""
                aria-hidden="true"
                className="trh-art"
                draggable="false"
              />
              <div className="trh-cards-wrap">
                {featured.map((trail, i) => (
                  <TrailCard key={trail.id} trail={trail} index={i} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
