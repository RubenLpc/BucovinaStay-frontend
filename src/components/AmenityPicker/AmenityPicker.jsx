import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AMENITIES_CATALOG, AMENITY_CATEGORIES } from "../../constants/amenitiesCatalog";
import "./AmenityPicker.css";

export default function AmenityPicker({ value = [], onChange }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");

  const selected = useMemo(() => new Set(value || []), [value]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return AMENITIES_CATALOG;
    return AMENITIES_CATALOG.filter((a) => {
      const amenityLabel = a.labelKey ? t(a.labelKey) : (a.label || a.key);
      const categoryLabel = a.categoryKey ? t(a.categoryKey) : (a.category || "");
      return (
        amenityLabel.toLowerCase().includes(s) ||
        a.key.toLowerCase().includes(s) ||
        categoryLabel.toLowerCase().includes(s)
      );
    });
  }, [q, t]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const cat of AMENITY_CATEGORIES) map.set(cat, []);
    for (const a of filtered) map.get(a.categoryKey || a.category)?.push(a);
    return map;
  }, [filtered]);

  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange?.(Array.from(next));
  };

  return (
    <div className="apWrap">
      <div className="apTop">
        <div className="apSearch">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută (wifi, sauna, parcare...)"
          />
        </div>

        <div className="apCount">
          <b>{selected.size}</b> selectate
        </div>
      </div>

      {Array.from(grouped.entries()).map(([cat, items]) => {
        if (!items?.length) return null;
        return (
          <div className="apGroup" key={cat}>
            <div className="apGroupTitle">{cat?.includes?.(".") ? t(cat) : cat}</div>

            <div className="apGrid">
              {items.map((a) => {
                const Icon = a.icon;
                const active = selected.has(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    className={`apItem ${active ? "active" : ""}`}
                    onClick={() => toggle(a.key)}
                  >
                    <span className="apIcon">
                      <Icon size={18} />
                    </span>
                    <span className="apLabel">{a.labelKey ? t(a.labelKey) : (a.label || a.key)}</span>
                    {active ? (
                      <span className="apCheck">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="apCheck ghost" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
