import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomeFinalCTA.css";
import { ArrowRight, Sparkles, Plus } from "lucide-react";

export default function HomeFinalCTA({
  title = "Gata de o escapadă în Bucovina?",
  subtitle = "Vezi toate cazările sau publică rapid un anunț ca gazdă.",
  primaryLabel = "Explorează cazările",
  secondaryLabel = "Devino gazdă",
  primaryTo = "/cazari",
  secondaryTo = "/auth/register",
}) {
  const navigate = useNavigate();

  return (
    <section className="ppSection hctaBlock">
      <div className="hctaSurface">
        <div className="hctaGlow" aria-hidden="true" />

        <div className="hctaLeft">
          <div className="hctaKicker">
            <Sparkles size={16} /> BucovinaStay
          </div>
          <h2 className="hctaTitle">{title}</h2>
          <p className="hctaSub">{subtitle}</p>
        </div>

        <div className="hctaActions">
          <button className="hctaPrimary" type="button" onClick={() => navigate(primaryTo)}>
            {primaryLabel} <ArrowRight size={16} />
          </button>
          <button className="hctaSecondary" type="button" onClick={() => navigate(secondaryTo)}>
            <Plus size={16} /> {secondaryLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
