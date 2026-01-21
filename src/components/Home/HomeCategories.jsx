import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomeCategories.css";
import { ChevronRight } from "lucide-react";
import { PROPERTY_TYPES } from "../../constants/propertyTypes"; // ajustez path

export default function HomeTopCategories({
  title = "Categorii",
  basePath = "/cazari",
  seeAllLabel = "Vezi toate",
}) {
  const navigate = useNavigate();

  return (
    <section className="ppSection htcWrap">
      <div className="htcHead">
        <h2 className="htcTitle">{title}</h2>
        <button className="htcSeeAll" type="button" onClick={() => navigate(basePath)}>
          {seeAllLabel} <ChevronRight size={16} />
        </button>
      </div>

      <div className="htcGrid" role="list" aria-label={title}>
        {PROPERTY_TYPES.map(({ key, label, description, Icon, image }) => (
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
        ))}
      </div>
    </section>
  );
}
