import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AMENITIES_CATALOG } from "../../constants/amenitiesCatalog";
import "./AmenitiesPanel.css";

function groupByCategory(keys) {
  const byKey = new Map(AMENITIES_CATALOG.map((a) => [a.key, a]));
  const groups = new Map();

  for (const k of keys || []) {
    const a = byKey.get(k);
    if (!a) continue;
    const cat = a.category || "Altele";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(a);
  }

  // sort categories by count desc, then name
  return Array.from(groups.entries())
    .map(([category, items]) => ({
      category,
      items: items.sort((x, y) => x.label.localeCompare(y.label)),
    }))
    .sort((a, b) => b.items.length - a.items.length || a.category.localeCompare(b.category));
}

export default function AmenitiesPanel({ facilities = [], limit = 12 }) {
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => groupByCategory(facilities), [facilities]);

  // flatten for limited view
  const flat = useMemo(() => {
    const all = [];
    grouped.forEach((g) => g.items.forEach((i) => all.push(i)));
    return all;
  }, [grouped]);

  const shown = open ? flat : flat.slice(0, limit);
  const hasMore = flat.length > limit;

  return (
    <section className="amWrap">
      <div className="amHead">
        <div>
          <h3 className="amTitle">Facilități</h3>
          <div className="amSub">
            {flat.length ? `${flat.length} disponibile` : "Nu au fost specificate facilități"}
          </div>
        </div>

        {hasMore ? (
          <button type="button" className="amToggle" onClick={() => setOpen((v) => !v)}>
            {open ? (
              <>
                <span>Arată mai puțin</span>
                <ChevronUp size={16} />
              </>
            ) : (
              <>
                <span>Arată toate</span>
                <ChevronDown size={16} />
              </>
            )}
          </button>
        ) : null}
      </div>

      {/* View compact: grid simplu */}
      {!open ? (
        <div className="amGrid">
          {shown.map((a) => {
            const Icon = a.icon;
            return (
              <div className="amItem" key={a.key}>
                <span className="amIcon">
                  <Icon size={18} />
                </span>
                <span className="amLabel">{a.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        // View extins: pe categorii
        <div className="amCats">
          {grouped.map((g) => (
            <div className="amCat" key={g.category}>
              <div className="amCatTitle">{g.category}</div>
              <div className="amGrid">
                {g.items.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div className="amItem" key={a.key}>
                      <span className="amIcon">
                        <Icon size={18} />
                      </span>
                      <span className="amLabel">{a.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
