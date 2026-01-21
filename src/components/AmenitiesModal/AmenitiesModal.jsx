import { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, CheckCircle2 } from "lucide-react";
import { AMENITIES_CATALOG, AMENITY_CATEGORIES } from "../../constants/amenitiesCatalog";
import "./AmenitiesModal.css";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export default function AmenitiesModal({
  open,
  value = [],
  onChange,
  onClose,
  title = "Alege facilități",
  subtitle = "Bifează ce este disponibil. Poți căuta rapid.",
  max = 60, // optional limit
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all"); // all or category key
  const [local, setLocal] = useState(() => Array.isArray(value) ? value : []);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  // sync when opened
  useEffect(() => {
    if (!open) return;
    setLocal(Array.isArray(value) ? value : []);
    setQ("");
    setTab("all");
    // focus search
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, value]);

  // ESC close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedSet = useMemo(() => new Set(local), [local]);

  const categories = useMemo(() => {
    // show only categories that exist in catalog
    return AMENITY_CATEGORIES?.length ? AMENITY_CATEGORIES : [
      ...new Set(AMENITIES_CATALOG.map((a) => a.category || "Altele")),
    ].sort((a, b) => a.localeCompare(b));
  }, []);

  const filtered = useMemo(() => {
    const nq = norm(q);
    return AMENITIES_CATALOG.filter((a) => {
      if (tab !== "all" && (a.category || "Altele") !== tab) return false;
      if (!nq) return true;
      const hay = norm(`${a.label} ${a.key} ${(a.category || "")}`);
      return hay.includes(nq);
    });
  }, [q, tab]);

  const selectedCountByCategory = useMemo(() => {
    const m = new Map();
    for (const k of local) {
      const a = AMENITIES_CATALOG.find((x) => x.key === k);
      const c = (a?.category || "Altele");
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [local]);

  const toggle = (key) => {
    setLocal((prev) => {
      const has = prev.includes(key);
      if (has) return prev.filter((x) => x !== key);
      if (max && prev.length >= max) return prev; // respect limit
      return [...prev, key];
    });
  };

  const clearAll = () => setLocal([]);

  const apply = () => {
    onChange?.(local);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="amodalOverlay" onMouseDown={(e) => {
      // click outside closes
      if (e.target === e.currentTarget) onClose?.();
    }}>
      <div className="amodal" role="dialog" aria-modal="true" ref={dialogRef}>
        {/* Header */}
        <div className="amodalHeader">
          <div className="amodalHeaderText">
            <div className="amodalTitle">{title}</div>
            <div className="amodalSub">{subtitle}</div>
          </div>
          <button className="amodalClose" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="amodalSearchRow">
          <div className="amodalSearch">
            <Search size={16} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Caută: wifi, saună, vedere, parcare..."
            />
          </div>

          <div className="amodalCounter">
            <CheckCircle2 size={16} />
            <span>
              <b>{local.length}</b>{max ? ` / ${max}` : ""} selectate
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="amodalTabs">
          <button
            type="button"
            className={`amodalTab ${tab === "all" ? "active" : ""}`}
            onClick={() => setTab("all")}
          >
            Toate
            {local.length ? <span className="amodalBadge">{local.length}</span> : null}
          </button>

          {categories.map((c) => {
            const cnt = selectedCountByCategory.get(c) || 0;
            return (
              <button
                key={c}
                type="button"
                className={`amodalTab ${tab === c ? "active" : ""}`}
                onClick={() => setTab(c)}
              >
                {c}
                {cnt ? <span className="amodalBadge">{cnt}</span> : null}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="amodalList">
          {filtered.length === 0 ? (
            <div className="amodalEmpty">
              Nu am găsit nimic pentru <b>“{q}”</b>.
            </div>
          ) : (
            filtered.map((a) => {
              const Icon = a.icon;
              const checked = selectedSet.has(a.key);
              return (
                <button
                  type="button"
                  key={a.key}
                  className={`amodalItem ${checked ? "checked" : ""}`}
                  onClick={() => toggle(a.key)}
                >
                  <span className="amodalItemIcon">{Icon ? <Icon size={18} /> : null}</span>

                  <span className="amodalItemText">
                    <span className="amodalItemLabel">{a.label}</span>
                    <span className="amodalItemMeta">{a.category || "Altele"}</span>
                  </span>

                  <span className={`amodalCheck ${checked ? "on" : ""}`} aria-hidden="true">
                    <span className="amodalCheckDot" />
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="amodalFooter">
          <button type="button" className="amodalBtn ghost" onClick={clearAll}>
            Șterge tot
          </button>

          <div className="amodalFooterRight">
            <button type="button" className="amodalBtn" onClick={onClose}>
              Anulează
            </button>
            <button type="button" className="amodalBtn primary" onClick={apply}>
              Aplică ({local.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
