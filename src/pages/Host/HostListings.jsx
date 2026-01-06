// client/src/pages/Host/HostListings.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../../stores/authStore";
import {
  getMyProperties,
  submitForReview,
  togglePause,
  deleteProperty,
} from "../../api/hostListingsService";

import {
  Search,
  Plus,
  ChevronRight,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  Trash2,
  Pencil,
  Eye,
  Send,
  ArrowUpDown,
  X,
  Loader2,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import "./HostListings.css";

function statusLabel(s) {
  if (s === "draft") return "Draft";
  if (s === "pending") return "În așteptare";
  if (s === "live") return "Publicat";
  if (s === "paused") return "Pauzat";
  if (s === "rejected") return "Respins";
  return s || "—";
}

function statusTone(s) {
  if (s === "live") return "tone-good";
  if (s === "pending") return "tone-warn";
  if (s === "draft") return "tone-muted";
  if (s === "paused") return "tone-muted";
  if (s === "rejected") return "tone-bad";
  return "tone-muted";
}

// fallback image dacă nu există cover/poze
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

function formatMoney(n, currency) {
  const v = Number(n);
  if (!Number.isFinite(v)) return `${n ?? ""} ${currency || "RON"}`.trim();
  try {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: currency || "RON",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${v} ${currency || "RON"}`;
  }
}

function safeDate(ts) {
  const d = new Date(ts || 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function timeAgo(ts) {
  const d = safeDate(ts);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "acum";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days} zile`;
}

function useDebouncedValue(value, delayMs = 350) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return deb;
}

function Modal({ open, title, children, onClose }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="hlModalOverlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="hlModal">
        <div className="hlModalHead">
          <div className="hlModalTitle">{title}</div>
          <button ref={closeBtnRef} className="hlIconBtn" type="button" onClick={onClose} aria-label="Închide">
            <X size={18} />
          </button>
        </div>
        <div className="hlModalBody">{children}</div>
      </div>
    </div>
  );
}

export default function HostListings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // guard
  if (!user) return null;
  if (user.role !== "host" && user.role !== "admin") {
    return (
      <div className="container" style={{ padding: "2rem 0" }}>
        <h2>Acces restricționat</h2>
        <p>Pagina este disponibilă doar pentru gazde.</p>
      </div>
    );
  }

  const hostName = user?.name || user?.firstName || user?.email?.split("@")[0] || "Host";

  const [tab, setTab] = useState("all"); // all | draft | pending | live | paused | rejected
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);

  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // sorting (client side)
  const [sortKey, setSortKey] = useState("updatedAt"); // updatedAt | pricePerNight | title
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  // per-item loading states
  const [busy, setBusy] = useState({}); // { [id]: "submit" | "toggle" | "delete" }
  const setBusyFor = (id, action) => setBusy((p) => ({ ...p, [id]: action }));
  const clearBusyFor = (id) =>
    setBusy((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  const [confirm, setConfirm] = useState({
    open: false,
    id: null,
    title: "",
    message: "",
    action: null, // () => Promise<void>
  });

  const openConfirm = ({ id, title, message, action }) => {
    setConfirm({ open: true, id, title, message, action });
  };
  const closeConfirm = () => setConfirm({ open: false, id: null, title: "", message: "", action: null });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getMyProperties({ page, limit, status: tab, q: debouncedQ });

      const normalized = (data.items || []).map((p) => ({
        ...p,
        id: p._id || p.id,
        __thumb: p.coverImage?.url || p.images?.[0]?.url || p.image || FALLBACK_IMG,
      }));

      setItems(normalized);
      setTotal(data.total ?? normalized.length);
    } catch (e) {
      toast.error("Nu am putut încărca proprietățile", { description: e?.message || "Eroare" });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [tab, debouncedQ]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchData();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedQ, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const countsLocal = useMemo(() => {
    const base = { all: 0, draft: 0, pending: 0, live: 0, paused: 0, rejected: 0 };
    items.forEach((x) => {
      base.all += 1;
      if (base[x.status] != null) base[x.status] += 1;
    });
    return base;
  }, [items]);

  const stats = useMemo(() => {
    const s = { live: 0, pending: 0, draft: 0, paused: 0, rejected: 0, avgPrice: null };
    if (!items.length) return s;

    let sum = 0;
    let cnt = 0;

    items.forEach((p) => {
      if (p.status in s) s[p.status] += 1;
      const price = Number(p.pricePerNight);
      if (Number.isFinite(price)) {
        sum += price;
        cnt += 1;
      }
    });

    s.avgPrice = cnt ? Math.round(sum / cnt) : null;
    return s;
  }, [items]);

  const sortedItems = useMemo(() => {
    const arr = [...items];
    const dir = sortDir === "asc" ? 1 : -1;

    const getV = (x) => {
      if (sortKey === "title") return String(x.title || "").toLowerCase();
      if (sortKey === "pricePerNight") return Number(x.pricePerNight || 0);
      if (sortKey === "updatedAt") return new Date(x.updatedAt || x.createdAt || 0).getTime();
      return 0;
    };

    arr.sort((a, b) => {
      const va = getV(a);
      const vb = getV(b);
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });

    return arr;
  }, [items, sortKey, sortDir]);

  const toggleSorting = (key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "title" ? "asc" : "desc");
      return key;
    });
  };

  // --- actions ---
  const doSubmit = async (id) => {
    setBusyFor(id, "submit");
    try {
      await submitForReview(id);
      toast.success("Trimis la verificare");
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: "pending" } : x)));
    } catch (e) {
      toast.error("Eroare la trimitere", { description: e?.message || "Eroare" });
    } finally {
      clearBusyFor(id);
    }
  };

  const doTogglePause = async (id) => {
    const current = items.find((x) => x.id === id);
    if (!current) return;

    setBusyFor(id, "toggle");
    try {
      await togglePause(id);
      const nextStatus = current.status === "live" ? "paused" : "live";
      toast.success(nextStatus === "live" ? "Publicată" : "Pauzată");
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: nextStatus } : x)));
    } catch (e) {
      toast.error("Eroare", { description: e?.message || "Eroare" });
    } finally {
      clearBusyFor(id);
    }
  };

  const doDelete = async (id) => {
    setBusyFor(id, "delete");
    try {
      await deleteProperty(id);
      toast.success("Șters");
      await fetchData();
    } catch (e) {
      toast.error("Eroare la ștergere", { description: e?.message || "Eroare" });
    } finally {
      clearBusyFor(id);
    }
  };

  // routes (keep consistent with TopNav)
  const goEdit = (id) => navigate(`/host/${id}/edit`);
  const goPreview = (id) => navigate(`/cazari/${id}`);
  const goNew = () => navigate(`/host/add`);

  const SortIcon = ({ k }) =>
    sortKey === k ? (
      <span className={`hlSortIcon ${sortDir === "asc" ? "asc" : "desc"}`} aria-hidden="true">
        <ArrowUpDown size={14} />
      </span>
    ) : null;

  const tabs = [
    ["all", "Toate"],
    ["draft", "Draft"],
    ["pending", "În așteptare"],
    ["live", "Publicate"],
    ["paused", "Pauzate"],
    ["rejected", "Respinse"],
  ];

  return (
    <div className="hlPage">
      <div className="hlMain">
        {/* TOPBAR */}
        <header className="hlHeader">
          <div>
            <div className="hlCrumb">Gazdă</div>

            <div className="hlTitleRow">
              <h1 className="hlTitle">Proprietățile mele</h1>

              <a className="hlGhostLink" href="/" title="Vezi site-ul">
                Vezi site-ul <ExternalLink size={16} />
              </a>
            </div>

            <div className="hlSub">
              Salut, <strong>{hostName}</strong> • gestionează draft-urile și publicările
            </div>

            <div className="hlKpis">
              <div className="hlKpi">
                <div className="hlKpiTop">
                  <div className="hlKpiLabel">În listă (pagina curentă)</div>
                  <div className="hlKpiIcon">
                    <Layers size={18} />
                  </div>
                </div>
                <div className="hlKpiVal">{items.length}</div>
                <div className="hlKpiHint">Carduri încărcate în pagina curentă</div>
              </div>

              <div className="hlKpi">
                <div className="hlKpiTop">
                  <div className="hlKpiLabel">Publicate</div>
                  <div className="hlKpiIcon good">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="hlKpiVal">{stats.live}</div>
                <div className="hlKpiHint">Din pagina curentă</div>
              </div>

              <div className="hlKpi">
                <div className="hlKpiTop">
                  <div className="hlKpiLabel">În așteptare</div>
                  <div className="hlKpiIcon warn">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="hlKpiVal">{stats.pending}</div>
                <div className="hlKpiHint">Se verifică de admin</div>
              </div>

              <div className="hlKpi">
                <div className="hlKpiTop">
                  <div className="hlKpiLabel">Preț mediu</div>
                  <div className="hlKpiIcon">
                    <Sparkles size={18} />
                  </div>
                </div>
                <div className="hlKpiVal">
                  {stats.avgPrice != null ? formatMoney(stats.avgPrice, items?.[0]?.currency || "RON") : "—"}
                </div>
                <div className="hlKpiHint">Doar pentru cele încărcate</div>
              </div>
            </div>
          </div>

          <div className="hlHeaderActions">
            <button className="hlBtn hlBtnAccent" type="button" onClick={goNew}>
              <Plus size={18} /> Adaugă
            </button>
            <button className="hlBtn" type="button" onClick={() => navigate("/host")}>
              Dashboard <ChevronRight size={16} />
            </button>
          </div>
        </header>

        {/* PANEL */}
        <section className="hlCard">
          <div className="hlCardTopbar">
            <div className="hlTabs" role="tablist" aria-label="Filtre status">
              {tabs.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`hlTab ${tab === k ? "active" : ""}`}
                  onClick={() => setTab(k)}
                >
                  {label}
                  <span className="hlCount">{k === "all" ? total : countsLocal[k] ?? 0}</span>
                </button>
              ))}
            </div>

            <div className="hlControls">
              <div className="hlSearch" role="search">
                <Search size={16} className="hlSearchIcon" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Caută după titlu / oraș / localitate..."
                  aria-label="Caută proprietăți"
                />
                {!!q && (
                  <button className="hlIconBtn" type="button" onClick={() => setQ("")} aria-label="Șterge căutarea">
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="hlSort" aria-label="Sortare">
                <button className="hlSortBtn" type="button" onClick={() => toggleSorting("updatedAt")}>
                  Updated <SortIcon k="updatedAt" />
                </button>
                <button className="hlSortBtn" type="button" onClick={() => toggleSorting("title")}>
                  Titlu <SortIcon k="title" />
                </button>
                <button className="hlSortBtn" type="button" onClick={() => toggleSorting("pricePerNight")}>
                  Preț <SortIcon k="pricePerNight" />
                </button>
              </div>
            </div>
          </div>

          {/* BODY */}
          {loading ? (
            <div className="hlLoading">
              <div className="hlSkelGrid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div className="hlSkelCard" key={i}>
                    <div className="hlSkelImg" />
                    <div className="hlSkelLine w80" />
                    <div className="hlSkelLine w60" />
                    <div className="hlSkelLine w50" />
                    <div className="hlSkelBtns" />
                  </div>
                ))}
              </div>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="hlEmpty">
              <div className="hlEmptyIcon">
                <AlertTriangle size={22} />
              </div>
              <h3>Nicio proprietate</h3>
              <p>Încearcă alt tab sau caută alt termen.</p>
              <button className="hlBtn hlBtnAccent" type="button" onClick={goNew}>
                <Plus size={18} /> Adaugă proprietate
              </button>
            </div>
          ) : (
            <>
              {/* GRID/CARDS */}
              <div className="hlGrid">
                {sortedItems.map((p) => {
                  const isBusy = Boolean(busy[p.id]);
                  const busyAction = busy[p.id];

                  const canSubmit = p.status === "draft" || p.status === "rejected";
                  const canToggle = p.status === "live" || p.status === "paused";

                  return (
                    <article className="hlListingCard" key={p.id}>
                      <button className="hlMedia" type="button" onClick={() => goEdit(p.id)} aria-label="Editează">
                        <img src={p.__thumb} alt="" loading="lazy" />
                        <div className="hlMediaOverlay">
                          <span className={`hlBadge ${statusTone(p.status)}`}>{statusLabel(p.status)}</span>
                          <span className="hlBadge tone-muted">
                            {formatMoney(p.pricePerNight, p.currency)} / noapte
                          </span>
                        </div>
                      </button>

                      <div className="hlBody">
                        <div className="hlTitleLine" title={p.title || ""}>
                          {p.title || "Fără titlu"}
                        </div>

                        <div className="hlMeta">
                          <span>{p.locality || p.city || "—"}</span>
                          <span className="dot">•</span>
                          <span>{p.type || "—"}</span>
                          <span className="dot">•</span>
                          <span>max {p.capacity ?? "—"}</span>
                        </div>

                        {p.subtitle ? <div className="hlSubline">{p.subtitle}</div> : null}

                        <div className="hlFoot">
                          <div className="hlUpdated">
                            <Clock size={14} />
                            <span>updated {timeAgo(p.updatedAt || p.createdAt)}</span>
                          </div>

                          <div className="hlActions">
  <div className="hlActionRowTop">
    <button className="hlBtnEq" type="button" onClick={() => goEdit(p.id)} disabled={isBusy}>
      <Pencil size={16} /> Edit
    </button>

    <button className="hlBtnEq" type="button" onClick={() => goPreview(p.id)} disabled={isBusy}>
      <Eye size={16} /> Preview
    </button>

    {canSubmit ? (
      <button className="hlBtnEq hlBtnEqAccent" type="button" disabled={isBusy} onClick={() => doSubmit(p.id)}>
        <Send size={16} /> Trimite
      </button>
    ) : canToggle ? (
      <button className="hlBtnEq hlBtnEqAccent" type="button" disabled={isBusy} onClick={() => doTogglePause(p.id)}>
        {p.status === "live" ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
        {p.status === "live" ? "Pauză" : "Publică"}
      </button>
    ) : (
      <button className="hlBtnEq" type="button" disabled>
        —
      </button>
    )}
  </div>

  <button
  className="hlDeleteFull"
  type="button"
  disabled={isBusy}
  onClick={() =>
    openConfirm({
      id: p.id,
      title: "Ștergi proprietatea?",
      message: `Ștergerea este permanentă. "${p.title || "Fără titlu"}" va fi eliminată definitiv.`,
      action: async () => {
        await doDelete(p.id);
      },
    })
  }
>
  <Trash2 size={16} /> Delete
</button>

</div>

                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* PAGINATION */}
              <div className="hlPager">
                <button
                  className="hlBtn"
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Înapoi
                </button>

                <div className="hlPagerText">
                  Pagina <strong>{page}</strong> din <strong>{totalPages}</strong>
                  <span className="sep">•</span>
                  <span className="muted">{total} total</span>
                </div>

                <button
                  className="hlBtn"
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Înainte →
                </button>
              </div>
            </>
          )}
        </section>

        {/* CONFIRM MODAL */}
        <Modal
          open={confirm.open}
          title={confirm.title}
          onClose={() => {
            if (confirm.id && busy[confirm.id]) return;
            closeConfirm();
          }}
        >
          <p className="hlModalText">{confirm.message}</p>

          <div className="hlModalActions">
            <button
              className="hlBtn"
              type="button"
              onClick={() => {
                if (confirm.id && busy[confirm.id]) return;
                closeConfirm();
              }}
            >
              Anulează
            </button>

            <button
  className="hlBtn danger"
  type="button"
  onClick={async () => {
    if (!confirm.action) return;
    try {
      setBusyFor(confirm.id, "delete");
      await confirm.action();
    } finally {
      clearBusyFor(confirm.id);
      closeConfirm();
    }
  }}
  disabled={busy[confirm.id]}
>
  {busy[confirm.id] ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
  Șterge definitiv
</button>

          </div>

          <div className="hlModalHint">
            <Sparkles size={16} />
            Tip: păstrează 8–12 poze și un cover luminos pentru CTR mai bun.
          </div>
        </Modal>
      </div>
    </div>
  );
}
