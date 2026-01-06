// client/src/pages/Host/HostReports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../../stores/authStore";
import { getHostOverview, getHostListingsStats } from "../../api/hostReportsService";
import { getMyProperties } from "../../api/hostListingsService";
import "./HostReports.css";

import {
  BarChart3,
  Eye,
  MousePointerClick,
  Percent,
  MessageSquareText,
  ExternalLink,
  Download,
  Filter,
  Clock3,
  Search,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop stop-color="#eef1ed"/>
        <stop offset="1" stop-color="#f9faf8"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
      font-family="Arial" font-size="22" fill="#6b7280">
      BucovinaStay
    </text>
  </svg>
`);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatPct(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(1).replace(".", ",")}%`;
}

function safeDiv(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || y <= 0) return 0;
  return x / y;
}

function shortDayLabel(iso) {
  // iso: YYYY-MM-DD
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}

function buildCsv(rows) {
  const esc = (s) => `"${String(s ?? "").replaceAll('"', '""')}"`;
  const head = ["ListingId", "Titlu", "Status", "Vizualizari", "Click-uri", "CTR"];
  const body = rows.map((r) =>
    [r.id, r.title, r.status, r.views, r.clicks, r.ctr].map(esc).join(",")
  );
  return [head.join(","), ...body].join("\n");
}

export default function HostReports() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (!user) return null;
  if (user.role !== "host" && user.role !== "admin") return null;

  const hostName = user?.name || user?.email?.split("@")?.[0] || "Host";

  const [range, setRange] = useState("30d"); // 7d | 30d | 90d | 365d
  const [q, setQ] = useState("");
  const [onlyLive, setOnlyLive] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [loading, setLoading] = useState(true);

  // reports data
  const [overview, setOverview] = useState(null);
  const [byListingId, setByListingId] = useState({});
  const [props, setProps] = useState([]);

  // pagination derived
  const filteredRowsAll = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = (props || []).map((p) => {
      const id = String(p._id || p.id);
      const s = byListingId?.[id] || {};
      const views = Number(s.views30 ?? s.views ?? 0);
      const clicks = Number(s.clicks30 ?? s.clicks ?? 0);
      const ctr = safeDiv(clicks, views) * 100;

      return {
        id,
        title: p.title || "Fără titlu",
        status: p.status || "—",
        city: p.city || p.locality || "—",
        type: p.type || "—",
        thumb: p.coverImage?.url || p.images?.[0]?.url || p.image || FALLBACK_IMG,
        views,
        clicks,
        ctr,
      };
    });

    let out = rows;

    if (onlyLive) out = out.filter((r) => r.status === "live");

    if (needle) {
      out = out.filter((r) =>
        (r.title || "").toLowerCase().includes(needle) ||
        (r.city || "").toLowerCase().includes(needle) ||
        (r.type || "").toLowerCase().includes(needle)
      );
    }

    // sort by views desc by default
    out.sort((a, b) => (b.views - a.views) || (b.clicks - a.clicks) || (a.title.localeCompare(b.title)));

    return out;
  }, [props, byListingId, q, onlyLive]);

  const total = filteredRowsAll.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => setPage(1), [range, q, onlyLive]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRowsAll.slice(start, start + limit);
  }, [filteredRowsAll, page, limit]);

  const kpis = useMemo(() => {
    const impressions = Number(overview?.impressions ?? 0);
    const clicks = Number(overview?.clicks ?? 0);
    const ctr = Number(overview?.ctr ?? (safeDiv(clicks, impressions) * 100)) || 0;

    const wa = Number(overview?.clickActions?.contact_whatsapp ?? 0);
    const phone = Number(overview?.clickActions?.contact_phone ?? 0);
    const sms = Number(overview?.clickActions?.contact_sms ?? 0);

    return { impressions, clicks, ctr, wa, phone, sms };
  }, [overview]);

  const daily = useMemo(() => {
    const arr = Array.isArray(overview?.daily) ? overview.daily : [];
    // normalize expected shape: { day, impressions, clicks }
    return arr.map((x) => ({
      day: x.day,
      impressions: Number(x.impressions || 0),
      clicks: Number(x.clicks || 0),
    }));
  }, [overview]);

  const maxImpr = useMemo(() => {
    return daily.reduce((m, x) => Math.max(m, x.impressions), 0) || 1;
  }, [daily]);

  const maxClicks = useMemo(() => {
    return daily.reduce((m, x) => Math.max(m, x.clicks), 0) || 1;
  }, [daily]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const [ov, ls, my] = await Promise.all([
          getHostOverview({ range }),
          getHostListingsStats({ range }),
          // luăm proprietățile ca să avem title/status/thumb
          getMyProperties({ page: 1, limit: 200, status: "all", q: "" }),
        ]);

        if (!alive) return;

        setOverview(ov);
        setByListingId(ls?.byListingId || {});
        setProps((my?.items || []).map((p) => ({ ...p, _id: p._id || p.id })));
      } catch (e) {
        if (!alive) return;
        toast.error("Nu am putut încărca rapoartele", { description: e?.message || "Eroare" });
        setOverview(null);
        setByListingId({});
        setProps([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [range]);

  const onExportCsv = () => {
    try {
      const rows = filteredRowsAll.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        views: r.views,
        clicks: r.clicks,
        ctr: formatPct(r.ctr),
      }));

      const csv = buildCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bucovinastay-reports-${range}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Nu am putut exporta CSV");
    }
  };

  return (
    <div className="hrPage">
      <div className="hrMain">
        <header className="hrHeader">
          <div>
            <div className="hrCrumb">Gazdă</div>

            <div className="hrTitleRow">
              <h1 className="hrTitle">Rapoarte</h1>

              <button className="hrGhostLink" type="button" onClick={() => navigate("/host/listings")}>
                Proprietăți <ExternalLink size={16} />
              </button>
            </div>

            <div className="hrSub">
              Salut, <strong>{hostName}</strong> • vezi performanța anunțurilor în timp (views, click-uri și CTR)
            </div>

            <div className="hrToolbar">
              <div className="hrFilters">
                <div className="hrSelect">
                  <Clock3 size={16} />
                  <select value={range} onChange={(e) => setRange(e.target.value)}>
                    <option value="7d">7 zile</option>
                    <option value="30d">30 zile</option>
                    <option value="90d">90 zile</option>
                    <option value="365d">365 zile</option>
                  </select>
                </div>

                <button
                  className={`hrSelect ${onlyLive ? "isActive" : ""}`}
                  type="button"
                  onClick={() => setOnlyLive((v) => !v)}
                  title="Filtrează doar proprietăți publicate"
                >
                  <Filter size={16} />
                  Doar live
                </button>

                <div className="hrSearch" role="search">
                  <Search size={16} className="hrSearchIcon" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Caută după titlu / oraș / tip..."
                    aria-label="Caută în rapoarte"
                  />
                </div>
              </div>

              <div className="hrActions">
                <button className="hrChip" type="button" onClick={onExportCsv}>
                  <Download size={16} /> Export CSV
                </button>
                <button className="hrChip hrChipAccent" type="button" onClick={() => toast.info("În curând", { description: "Rapoarte avansate & recomandări." })}>
                  <Sparkles size={16} /> Insights
                </button>
              </div>
            </div>

            {/* KPI */}
            <div className="hrKpis">
              <div className="hrCard">
                <div className="hrCardTop">
                  <div className="hrCardLabel">Vizualizări</div>
                  <div className="hrCardMini"><Eye size={18} /></div>
                </div>
                <div className="hrCardValue">{loading ? "—" : kpis.impressions}</div>
                <div className="hrCardHint">în {range}</div>
                <div className="hrSpark" />
              </div>

              <div className="hrCard">
                <div className="hrCardTop">
                  <div className="hrCardLabel">Click-uri</div>
                  <div className="hrCardMini"><MousePointerClick size={18} /></div>
                </div>
                <div className="hrCardValue">{loading ? "—" : kpis.clicks}</div>
                <div className="hrCardHint">telefon / WhatsApp / SMS</div>
                <div className="hrSpark" />
              </div>

              <div className="hrCard">
                <div className="hrCardTop">
                  <div className="hrCardLabel">CTR</div>
                  <div className="hrCardMini"><Percent size={18} /></div>
                </div>
                <div className="hrCardValue">{loading ? "—" : formatPct(kpis.ctr)}</div>
                <div className="hrCardHint">click-uri / vizualizări</div>
                <div className="hrSpark" />
              </div>

              <div className="hrCard">
                <div className="hrCardTop">
                  <div className="hrCardLabel">Breakdown click-uri</div>
                  <div className="hrCardMini"><MessageSquareText size={18} /></div>
                </div>
                <div className="hrCardValue">{loading ? "—" : (kpis.wa + kpis.phone + kpis.sms)}</div>
                <div className="hrCardHint">
                  WA {kpis.wa} • Tel {kpis.phone} • SMS {kpis.sms}
                </div>
                <div className="hrSpark" />
              </div>
            </div>
          </div>
        </header>

        {/* CHART */}
        <section className="hrCard hrChart">
          <div className="hrCardTop">
            <div>
              <div className="hrCardLabel">Trend zilnic</div>
              <div className="hrTiny">Vizualizări vs click-uri în perioada selectată</div>
            </div>
            <div className="hrCardMini"><BarChart3 size={18} /></div>
          </div>

          <div className="hrLegend">
            <span className="hrLegendDot" /> Vizualizări
            <span className="hrLegendDot alt" /> Click-uri
          </div>

          <div className="hrChartArea">
            {loading ? (
              <div className="hrSkeleton" style={{ width: "100%" }}>
                <div className="skLine" />
                <div className="skLine" />
                <div className="skLine" />
              </div>
            ) : (
              <div className="hrBars">
                {daily.map((d) => {
                  const h1 = clamp(Math.round((d.impressions / maxImpr) * 100), 2, 100);
                  const h2 = clamp(Math.round((d.clicks / maxClicks) * 100), 2, 100);

                  return (
                    <div className="hrBarCol" key={d.day} title={`${d.day}\nViews: ${d.impressions}\nClicks: ${d.clicks}`}>
                      <div className="hrBar" style={{ height: `${h1}%` }} />
                      <div className="hrBar alt" style={{ height: `${h2}%` }} />
                      <div className="hrBarLabel">{shortDayLabel(d.day)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* TABLE */}
        <section className="hrCard hrTable">
          <div className="hrCardTop">
            <div>
              <div className="hrCardLabel">Performanță pe proprietăți</div>
              <div className="hrTiny">
                {total} rezultate • sortat după vizualizări (desc)
              </div>
            </div>
            <div className="hrCardMini"><BarChart3 size={18} /></div>
          </div>

          <div className="hrTableHead">
            <div>Proprietate</div>
            <div>Status</div>
            <div>Vizualizări</div>
            <div>Click-uri</div>
            <div>CTR</div>
            <div style={{ justifySelf: "end" }}>Acțiune</div>
          </div>

          {loading ? (
            <div className="hrSkeleton">
              <div className="skLine" />
              <div className="skLine" />
              <div className="skLine" />
            </div>
          ) : pageRows.length === 0 ? (
            <div className="hrEmpty">
              <div className="hrEmptyTitle">Nimic de afișat</div>
              <div className="hrMuted">Încearcă alt range sau un alt termen de căutare.</div>
            </div>
          ) : (
            <div className="hrRows">
              {pageRows.map((r) => (
                <div className="hrRow" key={r.id}>
                  <div className="hrProp">
                    <img className="hrThumb" src={r.thumb} alt="" loading="lazy" />
                    <div className="hrPropText">
                      <div className="hrPropName" title={r.title}>{r.title}</div>
                      <div className="hrPropMeta">{r.city} • {r.type}</div>
                    </div>
                  </div>

                  <div className="hrCell">
                    <span className={`hrBadge tone-${r.status === "live" ? "good" : r.status === "pending" ? "warn" : r.status === "rejected" ? "bad" : "muted"}`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="hrCell">{r.views}</div>
                  <div className="hrCell">{r.clicks}</div>
                  <div className="hrCell"><b>{formatPct(r.ctr)}</b></div>

                  <button
                    className="hrLinkBtn"
                    type="button"
                    onClick={() => navigate(`/cazari/${r.id}`)}
                    title="Deschide preview"
                  >
                    Preview →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* PAGER */}
          {!loading && total > 0 ? (
            <div className="hrPager">
              <button
                className="hrBtn ghost"
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ArrowLeft size={16} /> Înapoi
              </button>

              <div className="hrPagerText">
                Pagina <b>{page}</b> din <b>{totalPages}</b>
              </div>

              <button
                className="hrBtn ghost"
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Înainte <ArrowRight size={16} />
              </button>
            </div>
          ) : null}

          <div className="hrHint">
            <Sparkles size={16} />
            Tip: crește CTR cu un cover luminos + titlu scurt + WhatsApp vizibil.
          </div>
        </section>
      </div>
    </div>
  );
}
