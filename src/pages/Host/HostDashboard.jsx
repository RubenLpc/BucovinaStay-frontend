import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { hostDashboardService } from "../../api/hostDashboardService";
import { toast } from "sonner";

import {
  LayoutDashboard,
  ArrowUpDown,
  PauseCircle,
  PlayCircle,
  Home,
  Plus,
  Search,
  BarChart3,
  CreditCard,
  Settings,
  Eye,
  MousePointerClick,
  PhoneCall,
  TrendingUp,
  BadgeCheck,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import "./HostDashboard.css";

/**
 * NOTE: momentan mock data.
 * Mai târziu îl legi de API: /api/host/me, /api/host/listings, /api/host/stats
 */



const mockStats = {
  views: 1240,
  contactClicks: 86,
  phoneClicks: 31,
  whatsappClicks: 41,
  messageClicks: 14,
  ctr: 6.9, // %
  trend: "+12%",
};

const mockChart = [
  { label: "Lun", v: 80 },
  { label: "Mar", v: 120 },
  { label: "Mie", v: 95 },
  { label: "Joi", v: 160 },
  { label: "Vin", v: 210 },
  { label: "Sâm", v: 260 },
  { label: "Dum", v: 315 },
];


function statusLabel(s) {
  if (s === "draft") return "Draft";
  if (s === "pending") return "În așteptare";
  if (s === "live") return "Publicat";
  if (s === "paused") return "Pauzat";
  if (s === "rejected") return "Respins";
  return s;
}

function statusClass(s) {
  if (s === "live") return "pill-live";
  if (s === "pending") return "pill-pending";
  if (s === "draft") return "pill-draft";
  if (s === "paused") return "pill-paused";
  if (s === "rejected") return "pill-rejected";
  return "";
}

function MiniBars({ data }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="miniBars" aria-label="Grafic vizualizări (ultimele 7 zile)">
      {data.map((d) => (
        <div key={d.label} className="barWrap" title={`${d.label}: ${d.v}`}>
          <div className="bar" style={{ height: `${(d.v / max) * 100}%` }} />
          <span className="barLbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function HostDashboard() {

  // ✅ listings as state (mock CRUD)
  const { user } = useAuthStore();

  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // plan: momentan din user sau fallback
  const hostName = user?.name || user?.firstName || user?.email?.split("@")[0] || "Host";
  const subscriptionStatus = user?.subscriptionStatus || "inactive";
  const isActive = subscriptionStatus === "active";

  const initials = (hostName || "H")
  .split(" ")
  .filter(Boolean)
  .slice(0, 2)
  .map((x) => x[0].toUpperCase())
  .join("");


  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingListings(true);
        const data = await hostDashboardService.getMyListings({ page: 1, limit: 50 });
        if (!alive) return;
        setListings(data.items || []);
      } catch (e) {
        toast.error("Nu am putut încărca proprietățile", { description: e.message });
      } finally {
        if (alive) setLoadingListings(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ tabs + search
  const [listingsQuery, setListingsQuery] = useState("");
  const [listingsTab, setListingsTab] = useState("all"); // all | needs | pending | live | draft | paused | rejected

  // ✅ sorting
  const [sortKey, setSortKey] = useState("views30"); // name | status | completion | views30 | clicks30
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  // ✅ statuses grouped like "top apps"
  const NEEDS = useMemo(() => new Set(["draft", "paused", "rejected"]), []);

  // if you have a global toast system, swap these lines:
  const toastInfo = (msg) => console.log("info:", msg);
  const toastSuccess = (msg) => console.log("success:", msg);
  const toastWarn = (msg) => console.log("warn:", msg);

  const listingsCounts = useMemo(() => {
    const base = { all: 0, needs: 0, draft: 0, pending: 0, live: 0, paused: 0, rejected: 0 };
    listings.forEach((l) => {
      base.all += 1;
      if (base[l.status] !== undefined) base[l.status] += 1;
      if (NEEDS.has(l.status)) base.needs += 1;
    });
    return base;
  }, [listings, NEEDS]);

  const setSorting = (key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "name" ? "asc" : "desc");
      return key;
    });
  };

  const submitForReview = async (id) => {
    try {
      await hostDashboardService.submitForReview(id);
      toast.success("Trimis la verificare");
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "pending" } : l)));
    } catch (e) {
      toast.error("Eroare", { description: e.message });
    }
  };
  
  const toggleLivePaused = async (id) => {
    try {
      const before = listings.find((x) => x.id === id)?.status;
      await hostDashboardService.togglePause(id);
  
      // backend toggles live<->paused
      const nextStatus = before === "live" ? "paused" : "live";
      toast.success(nextStatus === "live" ? "Publicată" : "Pauzată");
  
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: nextStatus } : l)));
    } catch (e) {
      toast.error("Eroare", { description: e.message });
    }
  };
  

  const filteredListings = useMemo(() => {
    const q = listingsQuery.trim().toLowerCase();

    const arr = listings.filter((l) => {
      const tabOk =
        listingsTab === "all"
          ? true
          : listingsTab === "needs"
          ? NEEDS.has(l.status)
          : l.status === listingsTab;

      const searchOk = !q || l.name.toLowerCase().includes(q) || l.location.toLowerCase().includes(q);
      return tabOk && searchOk;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    const norm = (v) => (typeof v === "string" ? v.toLowerCase() : v);

    arr.sort((a, b) => {
      const va = norm(a[sortKey]);
      const vb = norm(b[sortKey]);

      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return ((va ?? 0) - (vb ?? 0)) * dir;
    });

    return arr;
  }, [listings, listingsQuery, listingsTab, sortKey, sortDir, NEEDS]);

  // ✅ Dashboard should not be a "full listings page"
  const dashboardListings = useMemo(() => filteredListings.slice(0, 5), [filteredListings]);

  const quickTips = useMemo(() => {
    return [
      { icon: <TrendingUp size={18} />, text: "Adaugă minim 8 poze pentru mai multe click-uri pe contact." },
      { icon: <BadgeCheck size={18} />, text: "Completează facilitățile – crește încrederea utilizatorilor." },
      { icon: <MousePointerClick size={18} />, text: "Un titlu clar + locație exactă = CTR mai bun." },
    ];
  }, []);

  const goEdit = (id) => {
    window.location.href = `/host/listings/${id}/edit`;
  };

  const stop = (e) => e.stopPropagation();

  const SortIcon = ({ k }) =>
    sortKey === k ? (
      <span className={`sortIcon ${sortDir === "asc" ? "asc" : "desc"}`} aria-hidden="true">
        <ArrowUpDown size={14} />
      </span>
    ) : null;

  return (
    <>
      {/* Sidebar */}
      

      {/* Main */}
      <div className="hostMain">
        <header className="hostTopbar">
          <div className="topLeft">
            <div className="crumb">Gazdă</div>

            <div className="titleRow">
              <h1 className="pageTitle">Dashboard</h1>

              <span className={`planChip ${isActive ? "isActive" : "isInactive"}`}>
                {isActive ? <BadgeCheck size={14} /> : <AlertTriangle size={14} />}
                {isActive ? "Plan activ" : "Plan inactiv"}
              </span>
            </div>

            <div className="subtitle">
              Salut, <strong>{hostName}</strong>
              <span className="dotSep">•</span>
              Ultimele 30 zile
            </div>
          </div>

          <div className="topRight">
            {!isActive && (
              <a className="topCta" href="/host/billing">
                Activează <ChevronRight size={16} />
              </a>
            )}

            <a className="ghostLink" href="/">
              Vezi site-ul <ExternalLink size={16} />
            </a>

            <div className="avatar">MH</div>
          </div>
        </header>

        {/* Subscription banner */}
        {!isActive && (
          <div className="banner bannerWarn">
            <div className="bannerIcon">
              <AlertTriangle size={18} />
            </div>
            <div className="bannerText">
              <div className="bannerTitle">Nu ai un abonament activ.</div>
              <div className="bannerSub">
                Poți crea proprietăți în Draft, dar pentru a le publica ai nevoie de abonament.
              </div>
            </div>
            <a className="bannerCta" href="/host/billing">
              Activează abonamentul <ChevronRight size={16} />
            </a>
          </div>
        )}

        {/* KPI grid */}
        <section className="grid3">
          <div className="kpiCard">
            <div className="kpiIcon">
              <Eye size={18} />
            </div>
            <div className="kpiMeta">
              <div className="kpiLabel">Vizualizări (30 zile)</div>
              <div className="kpiValue">{mockStats.views}</div>
              <div className="kpiHint">{mockStats.trend} față de perioada anterioară</div>
            </div>
          </div>

          <div className="kpiCard">
            <div className="kpiIcon">
              <MousePointerClick size={18} />
            </div>
            <div className="kpiMeta">
              <div className="kpiLabel">Click-uri contact</div>
              <div className="kpiValue">{mockStats.contactClicks}</div>
              <div className="kpiHint">CTR: {mockStats.ctr}%</div>
            </div>
          </div>

          <div className="kpiCard">
            <div className="kpiIcon">
              <PhoneCall size={18} />
            </div>
            <div className="kpiMeta">
              <div className="kpiLabel">Telefon / WhatsApp</div>
              <div className="kpiValue">
                {mockStats.phoneClicks} / {mockStats.whatsappClicks}
              </div>
              <div className="kpiHint">Mesaje: {mockStats.messageClicks}</div>
            </div>
          </div>
        </section>

        {/* Middle row */}
        <section className="grid2">
          <div className="panel">
            <div className="panelHead">
              <div>
                <div className="panelTitle">Activitate (ultimele 7 zile)</div>
                <div className="panelSub">Vizualizări agregate pentru listările tale.</div>
              </div>
              <a className="panelLink" href="/host/stats">
                Detalii <ChevronRight size={16} />
              </a>
            </div>
            <MiniBars data={mockChart} />
          </div>

          <div className="panel">
            <div className="panelHead">
              <div>
                <div className="panelTitle">Recomandări rapide</div>
                <div className="panelSub">Optimizări care cresc contactările.</div>
              </div>
            </div>

            <div className="tips">
              {quickTips.map((t, idx) => (
                <div className="tip" key={idx}>
                  <div className="tipIcon">{t.icon}</div>
                  <div className="tipText">{t.text}</div>
                </div>
              ))}
            </div>

            <div className="actionsRow">
              <a className="btnPrimary" href="/host/listings/new">
                <Plus size={18} /> Adaugă proprietate
              </a>
              <a className="btnSoft" href="/host/listings">
                Vezi proprietăți <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </section>

        {/* Listings table (OVERVIEW) */}
        <section className="panel">
          <div className="panelHead panelHead--listings">
            <div className="phLeft">
              <div className="panelTitle">Proprietățile tale</div>
              <div className="panelSub">Overview (top 5). Pentru tot tabelul, mergi în “Proprietățile mele”.</div>
              {loadingListings && (
  <div className="panel" style={{ padding: "1rem" }}>
    Se încarcă proprietățile...
  </div>
)}


              <div className="tabsRow" role="tablist" aria-label="Filtre status">
                <button className={`tab ${listingsTab === "all" ? "active" : ""}`} type="button" onClick={() => setListingsTab("all")}>
                  Toate <span className="tabCount">{listingsCounts.all}</span>
                </button>

                <button className={`tab ${listingsTab === "needs" ? "active" : ""}`} type="button" onClick={() => setListingsTab("needs")}>
                  Atenție <span className="tabCount">{listingsCounts.needs}</span>
                </button>

                <button className={`tab ${listingsTab === "pending" ? "active" : ""}`} type="button" onClick={() => setListingsTab("pending")}>
                  În așteptare <span className="tabCount">{listingsCounts.pending}</span>
                </button>

                <button className={`tab ${listingsTab === "live" ? "active" : ""}`} type="button" onClick={() => setListingsTab("live")}>
                  Publicate <span className="tabCount">{listingsCounts.live}</span>
                </button>
              </div>
            </div>

            <div className="phRight">
              <div className="tableSearch">
                <Search size={16} className="tsIcon" />
                <input
                  className="tsInput"
                  value={listingsQuery}
                  onChange={(e) => setListingsQuery(e.target.value)}
                  placeholder="Caută proprietate / locație..."
                  aria-label="Caută proprietate"
                />
                {listingsQuery?.length > 0 && (
                  <button className="tsClear" type="button" onClick={() => setListingsQuery("")} aria-label="Șterge căutarea">
                    ✕
                  </button>
                )}
              </div>

              <a className="addBtn" href="/host/listings/new">
                <Plus size={18} /> Adaugă
              </a>

              <a className="panelLink" href="/host/listings">
                Vezi toate <ChevronRight size={16} />
              </a>
            </div>
          </div>

          <div className="tableWrap">
            <table className="hostTable">
              <thead>
                <tr>
                  <th>
                    <button className="thBtn" type="button" onClick={() => setSorting("name")}>
                      Proprietate <SortIcon k="name" />
                    </button>
                  </th>

                  <th>
                    <button className="thBtn" type="button" onClick={() => setSorting("status")}>
                      Status <SortIcon k="status" />
                    </button>
                  </th>

                  <th>
                    <button className="thBtn" type="button" onClick={() => setSorting("completion")}>
                      Completare <SortIcon k="completion" />
                    </button>
                  </th>

                  <th className="num">
                    <button className="thBtn thBtnRight" type="button" onClick={() => setSorting("views30")}>
                      Vizualizări <SortIcon k="views30" />
                    </button>
                  </th>

                  <th className="num">
                    <button className="thBtn thBtnRight" type="button" onClick={() => setSorting("clicks30")}>
                      Click-uri <SortIcon k="clicks30" />
                    </button>
                  </th>

                  <th className="num">Acțiuni</th>
                </tr>
              </thead>

              <tbody>
                {dashboardListings.map((l) => (
                  <tr
                    key={l.id}
                    className="clickRow"
                    role="button"
                    tabIndex={0}
                    onClick={() => goEdit(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") goEdit(l.id);
                    }}
                    title="Click pentru editare"
                  >
                    <td>
                      <div className="propCell">
                        <div className="propThumb" />
                        <div>
                          <div className="propName">{l.name}</div>
                          <div className="propSub">{l.location}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`pill ${statusClass(l.status)}`}>{statusLabel(l.status)}</span>
                    </td>

                    <td>
                      <div className="progress">
                        <div className="progressBar" style={{ width: `${l.completion}%` }} />
                      </div>
                      <div className="progressText">{l.completion}%</div>
                    </td>

                    <td className="num">{l.views30}</td>
                    <td className="num">{l.clicks30}</td>

                    <td className="actions" onClick={stop}>
                      <a className="rowBtn" href={`/host/listings/${l.id}/edit`} onClick={stop}>
                        Editează
                      </a>
                      <a className="rowBtn" href={`/host/listings/${l.id}/preview`} onClick={stop}>
                        Preview
                      </a>

                      {l.status === "draft" && (
                        <button className="rowBtn rowBtnPrimary" type="button" onClick={(e) => { stop(e); submitForReview(l.id); }}>
                          Trimite
                        </button>
                      )}

                      {(l.status === "live" || l.status === "paused") && (
                        <button className="rowBtn rowBtnPrimary" type="button" onClick={(e) => { stop(e); toggleLivePaused(l.id); }}>
                          {l.status === "live" ? (
                            <>
                              <PauseCircle size={16} /> Pauză
                            </>
                          ) : (
                            <>
                              <PlayCircle size={16} /> Publică
                            </>
                          )}
                        </button>
                      )}

                      {l.status === "pending" && <span className="rowHint">În verificare</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredListings.length === 0 && (
            <div className="emptyBlock">
              <div className="emptyTitle">Nicio proprietate găsită</div>
              <div className="emptySub">Schimbă tab-ul sau caută alt termen.</div>
              
            </div>
          )}
        </section>

        <footer className="hostFoot">© {new Date().getFullYear()} BucovinaStay — Host Panel</footer>
      </div>
    </>
  );
}
