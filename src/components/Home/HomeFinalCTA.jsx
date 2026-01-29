import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomeFinalCTA.css";
import { ArrowRight, Sparkles, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function HomeFinalCTA({
  title,
  subtitle,
  primaryLabel,
  secondaryLabel,
  primaryTo = "/cazari",
  secondaryTo = "/auth/register",
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const computedTitle = title ?? t("homeFinalCTA.title");
  const computedSubtitle = subtitle ?? t("homeFinalCTA.subtitle");
  const computedPrimary = primaryLabel ?? t("homeFinalCTA.primary");
  const computedSecondary = secondaryLabel ?? t("homeFinalCTA.secondary");

  return (
    <section className="ppSection hctaBlock">
      <div className="hctaSurface">
        <div className="hctaGlow" aria-hidden="true" />

        <div className="hctaLeft">
          <div className="hctaKicker">
            <Sparkles size={16} /> {t("homeFinalCTA.kicker")}
          </div>
          <h2 className="hctaTitle">{computedTitle}</h2>
          <p className="hctaSub">{computedSubtitle}</p>
        </div>

        <div className="hctaActions">
          <button className="hctaPrimary" type="button" onClick={() => navigate(primaryTo)}>
            {computedPrimary} <ArrowRight size={16} />
          </button>
          <button className="hctaSecondary" type="button" onClick={() => navigate(secondaryTo)}>
            <Plus size={16} /> {computedSecondary}
          </button>
        </div>
      </div>
    </section>
  );
}
