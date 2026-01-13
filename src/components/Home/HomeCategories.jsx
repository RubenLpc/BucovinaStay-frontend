import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomeCategories.css";
import {
  Trees,
  Sparkles,
  Users,
  Mountain,
  Flame,
  Home as HomeIcon,
  ChevronRight,
} from "lucide-react";

const DEFAULT_CATEGORIES = [
  { key: "cabana", label: "Cabane", Icon: Trees, query: { type: "cabana" } },
  { key: "spa", label: "Spa & Relax", Icon: Sparkles, query: { amenity: "spa" } },
  { key: "family", label: "Familie", Icon: Users, query: { tag: "family" } },
  { key: "view", label: "Priveliște", Icon: Mountain, query: { tag: "view" } },
  { key: "fireplace", label: "Șemineu", Icon: Flame, query: { amenity: "fireplace" } },
  { key: "apart", label: "Apartamente", Icon: HomeIcon, query: { type: "apartament" } },
];

function buildQuery(q) {
  const p = new URLSearchParams();
  Object.entries(q || {}).forEach(([k, v]) => {
    if (v == null) return;
    const s = String(v).trim();
    if (!s) return;
    p.set(k, s);
  });
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

export default function HomeCategories({
  title = "Categorii",
  subtitle = "Alege un vibe și explorează rapid.",
  categories = DEFAULT_CATEGORIES,
  basePath = "/cazari",
}) {
  const navigate = useNavigate();
  const [active, setActive] = useState(null);

  const list = useMemo(() => (Array.isArray(categories) ? categories : DEFAULT_CATEGORIES), [categories]);

  const onPick = (c) => {
    setActive(c.key);
    navigate(`${basePath}${buildQuery(c.query)}`);
  };

  return (
    <section className="ppSection hcBlock">
      <div className="hcHead">
        <div className="hcHeadLeft">
          <h2 className="ppH2">{title}</h2>
          {subtitle ? <div className="hcSub">{subtitle}</div> : null}
        </div>

        <button className="hcSeeAll" type="button" onClick={() => navigate(basePath)}>
          Vezi toate <ChevronRight size={16} />
        </button>
      </div>

      <div className="hcRow" role="list" aria-label="Categorii">
        {list.map(({ key, label, Icon }) => {
          const isOn = active === key;
          return (
            <button
              key={key}
              type="button"
              role="listitem"
              className={`hcPill ${isOn ? "isActive" : ""}`}
              onClick={() => onPick(list.find((x) => x.key === key))}
              title={label}
            >
              <span className="hcIcon">
                <Icon size={16} />
              </span>
              <span className="hcLabel">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="hcHint">
        Tip: poți combina filtrele din pagina de căutare pentru rezultate mai bune.
      </div>
    </section>
  );
}
