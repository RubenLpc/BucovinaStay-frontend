import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomeCategories.css";
import { ChevronRight } from "lucide-react";
import { PROPERTY_TYPES } from "../../constants/propertyTypes";
import { useTranslation } from "react-i18next";

export default function HomeTopCategories({
  title,
  basePath = "/cazari",
  seeAllLabel,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const computedTitle = title ?? t("homeCategories.title");
  const computedSeeAll = seeAllLabel ?? t("homeCategories.seeAll");

  return (
    <section className="ppSection htcWrap">
      <div className="htcHead">
        <h2 className="htcTitle">{computedTitle}</h2>
        <button className="htcSeeAll" type="button" onClick={() => navigate(basePath)}>
          {computedSeeAll} <ChevronRight size={16} />
        </button>
      </div>

      <div className="htcGrid" role="list" aria-label={computedTitle}>
        {PROPERTY_TYPES.map(({ key, labelKey, descKey, Icon, image }) => {
          const label = labelKey ? t(labelKey) : key;
          const description = descKey ? t(descKey) : "";

          return (
            <button
              key={key}
              type="button"
              role="listitem"
              className="htcCard"
              onClick={() => navigate(`${basePath}?type=${key}`)}
              title={label}
            >
              <div className="htcThumb" aria-hidden>
                {image ? (
                  <img src={image} alt="" loading="lazy" />
                ) : (
                  <div className="htcThumbFallback">
                    <Icon size={26} strokeWidth={1.8} />
                  </div>
                )}
              </div>

              <div className="htcText">
                <div className="htcLabel">{label}</div>
                <div className="htcDesc">{description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
