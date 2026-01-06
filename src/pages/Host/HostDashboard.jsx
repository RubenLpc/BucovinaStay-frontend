// client/src/pages/HostDashboard/HostDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../../components/TopNav/TopNav";
import { useAuthStore } from "../../stores/authStore";
import { hostDashboardService } from "../../api/hostDashboardService";
import { getHostInbox } from "../../api/hostMessagesService";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { getHostListingsStats,getHostOverviewStats } from "../../api/analyticsService";


import { toast } from "sonner";
import "./HostDashboard.css";


const STATUS_LABEL = {
  all: "Toate",
  draft: "Draft",
  pending: "În așteptare",
  live: "Publicat",
  paused: "Pauzat",
  rejected: "Respins",
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function HostDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("Dashboard");
  

  const [subscription, setSubscription] = useState({
    plan: "free",
    subscriptionStatus: "inactive",
    nextBillingDate: null,
  });

  const [overview, setOverview] = useState(null);


  const [listingsRes, setListingsRes] = useState({ items: [], total: 0, page: 1, limit: 6 });
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("views_desc"); // views_desc | clicks_desc | completion_desc | name_asc
  const [page, setPage] = useState(1);
  const limit = 6;

  const [confirm, setConfirm] = useState(null);


  const daily = overview?.daily || [];
const maxY = Math.max(
  1,
  ...daily.map((d) => Math.max(d.impressions || 0, d.clicks || 0))
);
const shown = daily.slice(-9);

/*
confirm = {
  title,
  description,
  tone,
  action: async () => {}
}
*/
const [confirmLoading, setConfirmLoading] = useState(false);


async function load() {
  setLoading(true);
  try {
    const [res, statsMapRes, overviewRes, inboxRaw] = await Promise.all([
      hostDashboardService.getMyListings({
        page,
        limit,
        ...(status !== "all" ? { status } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      }),
      getHostListingsStats({ range: "30d" }),
      getHostOverviewStats({ range: "30d" }),
      getHostInbox({ limit: 6 }),
    ]);

    setOverview(overviewRes || null);
    console.log("overviewRes", overviewRes);


    const byId = statsMapRes?.byListingId || {};
    const mergedItems = (res?.items || []).map((p) => ({
      ...p,
      views30: byId[p.id]?.views30 ?? 0,
      clicks30: byId[p.id]?.clicks30 ?? 0,
    }));

    setListingsRes({
      items: mergedItems,
      total: res?.total || 0,
      page: res?.page || page,
      limit: res?.limit || limit,
    });

    setInbox(inboxRaw?.items || inboxRaw || []);
  } catch (err) {
    toast.error("Eroare dashboard", {
      description: err?.message || "Nu am putut încărca datele.",
    });
  } finally {
    setLoading(false);
  }
}



  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await load();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, q]);

  const allListings = listingsRes.items || [];

  // sortare client-side (maximal + consistent)
  const listings = useMemo(() => {
    const arr = [...allListings];

    arr.sort((a, b) => {
      if (sort === "views_desc") return (b.views30 ?? 0) - (a.views30 ?? 0);
      if (sort === "clicks_desc") return (b.clicks30 ?? 0) - (a.clicks30 ?? 0);
      if (sort === "completion_desc") return (b.completion ?? 0) - (a.completion ?? 0);
      if (sort === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""), "ro");
      return 0;
    });

    return arr;
  }, [allListings, sort]);

  // KPIs reale din items (nu depind de stats global)
  const kpis = useMemo(() => {
    const impressions = overview?.impressions ?? 0;
    const clicks = overview?.clicks ?? 0;
    const ctr = overview?.ctr ?? 0;
  
    // completion tot din listing-uri (e ok)
    const avgCompletion =
      listings.length
        ? Math.round(listings.reduce((a, x) => a + (Number(x.completion) || 0), 0) / listings.length)
        : 0;
  
    return [
      { label: "Vizualizări (30 zile)", value: impressions, hint: "Impressions reale" },
      { label: "Click-uri contact", value: clicks, hint: "Click-uri reale" },
      { label: "Completare medie", value: `${avgCompletion}%`, hint: "Calitate anunț" },
      { label: "CTR", value: `${ctr}%`, hint: "Click / view" },
    ];
  }, [overview, listings]);
  

  const pagesCount = useMemo(() => {
    const total = Number(listingsRes.total) || 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [listingsRes.total]);

  function statusTone(s) {
    if (s === "live") return "good";
    if (s === "pending") return "warn";
    if (s === "draft") return "muted";
    if (s === "paused") return "muted";
    if (s === "rejected") return "bad";
    return "muted";
  }

  async function onSubmitForReview(id) {
    try {
      await hostDashboardService.submitForReview(id);
      toast.success("Trimis la verificare", { description: "Anunțul a intrat în procesul de review." });
      await load();
    } catch (err) {
      toast.error("Nu s-a putut trimite", { description: err?.message || "Încearcă din nou." });
    }
  }

  async function onTogglePause(id) {
    try {
      await hostDashboardService.togglePause(id);
      toast.success("Actualizat", { description: "Statusul a fost modificat." });
      await load();
    } catch (err) {
      toast.error("Nu s-a putut modifica", { description: err?.message || "Încearcă din nou." });
    }
  }

  function openConfirm(cfg){
    setConfirm(cfg);
  }
  
  function closeConfirm(){
    setConfirm(null);
    setConfirmLoading(false);
  }
  
  async function runConfirm(){
    if (!confirm?.action) return;
    try{
      setConfirmLoading(true);
      await confirm.action();
      closeConfirm();
    }catch(err){
      setConfirmLoading(false);
      toast.error("Acțiunea a eșuat", {
        description: err?.message || "Încearcă din nou."
      });
    }
  }
  

  function onEdit(id) {
    // schimbă ruta dacă la tine e alta
    navigate(`/host/properties/${id}/edit`);
  }

  function handleOpenSettings() {
    toast("Setări", { description: "Deschidere pagină / modal setări." });
  }
  function handleOpenBilling() {
    toast("Abonament", { description: "Administrare abonament și facturare." });
  }
  function handleUpgrade() {
    toast("Upgrade", { description: "Upgrade plan abonament." });
  }

  return (
    <div className="hdPage">
      

      <main className="hdMain">
        <div className="hdHeader">
          <div>
            <div className="hdTitle">Prezentare generală</div>
            <div className="hdSub">Monitorizează performanța proprietăților și administrează anunțurile.</div>
          </div>

          <div className="hdActions">
            <button className="hdChip hdChipAccent" type="button">📅 Ultimele 30 zile</button>
            <button className="hdChip" type="button">Export</button>
          </div>
        </div>

        <section className="hdGrid">
          {/* KPI */}
          <div className="hdKpis">
            {kpis.map((k) => (
              <div key={k.label} className="hdCard">
                <div className="hdCardTop">
                  <div className="hdCardLabel">{k.label}</div>
                  <div className="hdCardMini">↗</div>
                </div>
                <div className="hdCardValue">{k.value}</div>
                <div className="hdCardHint">{k.hint}</div>
                <div className="hdSpark" />
              </div>
            ))}
          </div>

          {/* Chart placeholder (maximal, dar încă demo) */}
          <div className="hdCard hdChart">
            <div className="hdCardTop">
              <div className="hdCardLabel">Activitate</div>
              <div className="hdLegend">
                <span className="hdLegendDot" /> Vizualizări
                <span className="hdLegendDot alt" /> Click-uri
              </div>
            </div>
            <div className="hdChartArea">
            <div className="hdBars">
  {shown.map((d) => {
    const hViews = Math.round(((d.impressions || 0) / maxY) * 100);
    const hClicks = Math.round(((d.clicks || 0) / maxY) * 100);

    return (
      <div
        key={d.day}
        className="hdBarCol"
        title={`${d.day}\nVizualizări: ${d.impressions}\nClick-uri: ${d.clicks}`}
      >
        <div className="hdBar" style={{ height: `${hViews}%` }} />
        <div className="hdBar alt" style={{ height: `${hClicks}%` }} />
      </div>
    );
  })}
</div>

            </div>
          </div>

          {/* Listings table (corect + filtre reale) */}
          <div className="hdCard hdTable">
            <div className="hdCardTop">
              <div className="hdCardLabel">Anunțurile tale</div>

              <div className="hdToolbar">
                <div className="hdFilters">
                  <select
                    className="hdSelect"
                    value={status}
                    onChange={(e) => { setPage(1); setStatus(e.target.value); }}
                    aria-label="Filtru status"
                  >
                    {Object.keys(STATUS_LABEL).map((k) => (
                      <option key={k} value={k}>{STATUS_LABEL[k]}</option>
                    ))}
                  </select>

                  <select
                    className="hdSelect"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    aria-label="Sortare"
                  >
                    <option value="views_desc">Sortare: Vizualizări ↓</option>
                    <option value="clicks_desc">Sortare: Click-uri ↓</option>
                    <option value="completion_desc">Sortare: Completare ↓</option>
                    <option value="name_asc">Sortare: Nume A→Z</option>
                  </select>
                </div>

                <div className="hdSearch">
                  <input
                    className="hdSearchInput"
                    value={q}
                    onChange={(e) => { setPage(1); setQ(e.target.value); }}
                    placeholder="Caută după titlu / locație…"
                  />
                </div>
              </div>
            </div>

            <div className="hdTableHead">
              <div>Proprietate</div>
              <div>Status</div>
              <div>Completare</div>
              <div>Vizualizări</div>
              <div>Click-uri</div>
              <div />
            </div>

            <div className="hdRows">
              {loading && (
                <div className="hdSkeleton">
                  <div className="skLine" />
                  <div className="skLine" />
                  <div className="skLine" />
                </div>
              )}

              {!loading && listings.map((p) => {
                const tone = statusTone(p.status);
                const completion = clamp(Number(p.completion) || 0, 0, 100);

                return (
                  <div className="hdRow" key={p.id}>
                    <div className="hdProp">
                      <div
                        className="hdThumb"
                        style={{
                          backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                      <div className="hdPropText">
                        <div className="hdPropName">{p.name}</div>
                        <div className="hdPropMeta">{p.location}</div>
                      </div>
                    </div>

                    <div className="hdCell">
                      <span className={`hdBadge tone-${tone}`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    </div>

                    <div className="hdCell">
                      <div className="hdProgress">
                        <div className="hdProgressBar" style={{ width: `${completion}%` }} />
                      </div>
                      <div className="hdProgressText">{completion}%</div>
                    </div>

                    <div className="hdCell">{p.views30}</div>
                    <div className="hdCell">{p.clicks30}</div>

                    <div className="hdCell hdActionsCell">
                      {p.status === "draft" && (
                        <button
                        className="hdBtn hdBtnAccent"
                        onClick={() =>
                          openConfirm({
                            title: "Trimite anunțul la verificare?",
                            description:
                              "După trimitere, nu vei mai putea modifica anunțul până la finalizarea verificării.",
                            tone: "accent",
                            action: async () => {
                              await hostDashboardService.submitForReview(p.id);
                              toast.success("Trimis la verificare");
                              await load();
                            },
                          })
                        }
                      >
                        Trimite
                      </button>
                      
                      )}

                      {(p.status === "live" || p.status === "paused") && (
                        <button
                        className="hdBtn"
                        onClick={() =>
                          openConfirm({
                            title: p.status === "paused" ? "Reiei anunțul?" : "Pui anunțul pe pauză?",
                            description:
                              p.status === "paused"
                                ? "Anunțul va redeveni vizibil pentru clienți."
                                : "Anunțul nu va mai fi vizibil până îl reiei.",
                            tone: "default",
                            action: async () => {
                              await hostDashboardService.togglePause(p.id);
                              toast.success("Status actualizat");
                              await load();
                            },
                          })
                        }
                      >
                        {p.status === "paused" ? "Reia" : "Pauză"}
                      </button>
                      
                      )}

                      <button className="hdBtn" onClick={() => onEdit(p.id)} type="button">
                        Editează
                      </button>
                    </div>
                  </div>
                );
              })}

              {!loading && (!listings || listings.length === 0) && (
                <div className="hdEmpty">
                  Nu există proprietăți pentru filtrul selectat.
                </div>
              )}

              {!loading && pagesCount > 1 && (
                <div className="hdPager">
                  <button className="hdBtn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    ← Înapoi
                  </button>
                  <div className="hdPagerText">Pagina {page} / {pagesCount}</div>
                  <button className="hdBtn" onClick={() => setPage((p) => Math.min(pagesCount, p + 1))} disabled={page >= pagesCount}>
                    Înainte →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Inbox */}
          <div className="hdCard hdInbox">
            <div className="hdCardTop">
              <div className="hdCardLabel">Mesaje</div>
              <button className="hdChip" type="button">Inbox</button>
            </div>

            <div className="hdInboxList">
              {(inbox || []).slice(0, 6).map((m) => (
                <div className="hdMsg" key={m.id || m._id}>
                  <div className="hdMsgAvatar" />
                  <div className="hdMsgBody">
                    <div className="hdMsgTop">
                      <div className="hdMsgName">{m.fromName || m.name || "Client"}</div>
                      <div className="hdMsgTime">{m.time || ""}</div>
                    </div>
                    <div className="hdMsgText">{m.text || m.message || "—"}</div>
                  </div>
                </div>
              ))}

              {(!inbox || inbox.length === 0) && !loading && (
                <div className="hdEmpty">Nu ai mesaje.</div>
              )}
            </div>
          </div>

          <ConfirmModal
  open={!!confirm}
  title={confirm?.title}
  description={confirm?.description}
  tone={confirm?.tone}
  confirmText="Confirmă"
  cancelText="Renunță"
  loading={confirmLoading}
  onConfirm={runConfirm}
  onClose={closeConfirm}
/>

        </section>
      </main>
    </div>
  );
}
