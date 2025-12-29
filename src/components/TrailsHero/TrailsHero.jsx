import React from "react";
import { ArrowRight, Mountain, SlidersHorizontal, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./TrailsHero.css";

import heroArt from "../../assets/hero_art.png";

export default function TrailsHero() {
  const navigate = useNavigate();

  return (
    <section className="trh-section">
      <div className="container">
        <div className="trh-card">
          {/* LEFT */}
          <div className="trh-left">
            <div className="trh-badge">
              <Route size={14} />
              <span>Trasee montane în Bucovina</span>
            </div>

            <h2 className="trh-title">
              Descoperă <span className="trh-highlight">poteci</span>
              <br />
              care îți rămân în suflet
            </h2>

            <p className="trh-subtitle">
              Idei de drumeții, nivel de dificultate, durată și linkuri către ghiduri
              oficiale. Alege rapid trasee potrivite pentru weekend.
            </p>

            <div className="trh-actions">
              <button
                className="trh-btn trh-btn-primary"
                onClick={() => navigate("/trasee")}
              >
                Vezi trasee 
              </button>

              <button
                className="trh-btn trh-btn-secondary"
                onClick={() => navigate("/cazari")}
              >
                Vezi cazări
              </button>
            </div>

            <div className="trh-features">
              <div className="trh-feature">
                <SlidersHorizontal size={18} />
                <div>
                  <div className="trh-feature-title">Trasee curate</div>
                  <div className="trh-feature-sub">
                    Structurate + ușor de filtrat
                  </div>
                </div>
              </div>

              <div className="trh-feature">
                <Mountain size={18} />
                <div>
                  <div className="trh-feature-title">Nivel clar</div>
                  <div className="trh-feature-sub">
                    Ușor / Mediu / Greu
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="trh-right">
            <img className="trh-art" src={heroArt} alt="" draggable={false} />
          </div>
        </div>
      </div>
    </section>
  );
}
