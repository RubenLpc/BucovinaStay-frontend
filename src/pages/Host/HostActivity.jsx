import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../../stores/authStore";
import { getMyHostActivity } from "../../api/hostActivityService";
import "./HostActivity.css";

import { Search, Filter, Clock3, MousePointerClick, Eye, MessageSquareText, Layers } from "lucide-react";

function timeAgo(ts) {
  const d = new Date(ts || 0);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "acum";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days} zile`;
}

function eventLabel(type) {
  const m = {
    property_created: "Proprietate creată",
    property_updated: "Proprietate actualizată",
    property_submitted: "Trimisă la verificare",
    property_published: "Publicată",
    property_paused: "Pauzată",
    property_resumed: "Republicată",
    property_rejected: "Respinsă",
    property_deleted: "Ștearsă",

    message_received: "Mesaj primit",
    message_sent: "Mesaj trimis",

    impression: "Vizualizare",
    click_contact_phone: "Click: Telefon",
    click_contact_whatsapp: "Click: WhatsApp",
    click_contact_sms: "Click: SMS",
    click_share: "Click: Share",
    click_gallery: "Galerie deschisă",
  };
  return m[type] || type || "—";
}

function eventIcon(type) {
  if (type === "impression") return Eye;
  if (String(type).startsWith("click_")) return MousePointerClick;
  if (String(type).startsWith("message_")) return MessageSquareText;
  if (String(type).startsWith("property_")) return Layers;
  return Clock3;
}

const KPI_FALLBACK = { impressions: 0, clicks: 0, messages: 0, propertyActions: 0 };

export default function HostActivity() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [range, setRange] = useState("7d");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(30);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [kpi, setKpi] = useState(KPI_FALLBACK);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  useEffect(() => setPage(1), [range, type, q]);

  useEffect(() => {
    if (!user) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getMyHostActivity({ range, type, q, page, limit });
        if (!alive) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total || 0));
        setKpi(data?.kpi ? { ...KPI_FALLBACK, ...data.kpi } : KPI_FALLBACK);
      } catch (e) {
        if (!alive) return;
        toast.error("Nu am putut încărca activitatea", { description: e?.message || "Eroare" });
        setItems([]);
        setTotal(0);
        setKpi(KPI_FALLBACK);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user, range, type, q, page, limit]);

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "Toate" },
      { value: "impression", label: "Vizualizări" },
      { value: "click_contact_phone", label: "Click: Telefon" },
      { value: "click_contact_whatsapp", label: "Click: WhatsApp" },
      { value: "click_contact_sms", label: "Click: SMS" },
      { value: "message_received", label: "Mesaje primite" },
      { value: "property_submitted", label: "Trimise la verificare" },
      { value: "property_published", label: "Publicate" },
      { value: "property_paused", label: "Pauzate" },
      { value: "property_deleted", label: "Șterse" },
    ],
    []
  );

  if (!user) return null;
  if (user.role !== "host" && user.role !== "admin") return null;

  return (
    <div className="haPage">
      <div className="haMain">
        <header className="hacHeader">
          <div className="haCrumb">Gazdă</div>

          <div className="haTitleRow">
            <h1 className="haTitle">Activitate</h1>

            <button className="haGhostLink" type="button" onClick={() => navigate("/host/listings")}>
              Proprietăți →
            </button>
          </div>

          <div className="haSub">Evenimente recente: vizualizări, click-uri, mesaje și acțiuni pe anunțuri.</div>

          <div className="haKpis">
            <div className="haKpi">
              <div className="haKpiTop">
                <div className="haKpiLabel">Vizualizări</div>
                <div className="haKpiIcon">
                  <Eye size={18} />
                </div>
              </div>
              <div className="haKpiVal">{kpi.impressions}</div>
              <div className="haKpiHint">în perioada selectată</div>
            </div>

            <div className="haKpi">
              <div className="haKpiTop">
                <div className="haKpiLabel">Click-uri</div>
                <div className="haKpiIcon">
                  <MousePointerClick size={18} />
                </div>
              </div>
              <div className="haKpiVal">{kpi.clicks}</div>
              <div className="haKpiHint">telefon / WhatsApp / SMS</div>
            </div>

            <div className="haKpi">
              <div className="haKpiTop">
                <div className="haKpiLabel">Mesaje</div>
                <div className="haKpiIcon">
                  <MessageSquareText size={18} />
                </div>
              </div>
              <div className="haKpiVal">{kpi.messages}</div>
              <div className="haKpiHint">primite / trimise</div>
            </div>

            <div className="haKpi">
              <div className="haKpiTop">
                <div className="haKpiLabel">Acțiuni</div>
                <div className="haKpiIcon">
                  <Layers size={18} />
                </div>
              </div>
              <div className="haKpiVal">{kpi.propertyActions}</div>
              <div className="haKpiHint">publicare, pauză, ștergere</div>
            </div>
          </div>
        </header>

        <section className="haCard">
          <div className="haTopbar">
            <div className="haFilters">
              <div className="haSelect">
                <Clock3 size={16} />
                <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Interval">
                  <option value="24h">24h</option>
                  <option value="7d">7 zile</option>
                  <option value="30d">30 zile</option>
                </select>
              </div>

              <div className="haSelect">
                <Filter size={16} />
                <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tip eveniment">
                  {typeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="haSearch" role="search">
                <Search size={16} className="haSearchIcon" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Caută după proprietate / tip..."
                  aria-label="Caută activitate"
                />
              </div>
            </div>

            <div className="haMeta">
              <span className="haMuted">{total} evenimente</span>
            </div>
          </div>

          {loading ? (
            <div className="haLoading">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="haSkelRow" key={i}>
                  <div className="haSkelDot" />
                  <div className="haSkelLine w60" />
                  <div className="haSkelLine w35" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="haEmpty">
              <div className="haEmptyTitle">Nu există activitate încă</div>
              <p className="haEmptyDesc">Publică o proprietate sau așteaptă primele vizualizări.</p>
            </div>
          ) : (
            <>
              <div className="haList">
                {items.map((e) => {
                  const Icon = eventIcon(e.type);
                  const title = eventLabel(e.type);

                  return (
                    <div className="haRow" key={e._id || e.id}>
                      <div className="haDot">
                        <Icon size={16} />
                      </div>

                      <div className="haRowMain">
                        <div className="haRowTop">
                          <div className="haRowTitle">{title}</div>
                          <div className="haRowTime" title={new Date(e.createdAt).toLocaleString()}>
                            {timeAgo(e.createdAt)}
                          </div>
                        </div>

                        <div className="haRowSub">
                          {e.propertyId ? (
                            <button
                              type="button"
                              className="haLink"
                              onClick={() => navigate(`/cazari/${e.propertyId}`)}
                              title="Deschide preview"
                            >
                              {e.propertyTitle || "Proprietate"}
                            </button>
                          ) : (
                            <span className="haMuted">—</span>
                          )}

                          {e.actor ? <span className="haBadge">actor: {e.actor}</span> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="haPager">
                <button
                  className="haBtn ghost"
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Înapoi
                </button>

                <div className="haPagerText">
                  Pagina <b>{page}</b> din <b>{totalPages}</b>
                </div>

                <button
                  className="haBtn ghost"
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Înainte
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
