import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Search, Plus, ChevronRight, ExternalLink,
  PauseCircle, PlayCircle, Trash2, Pencil, Eye, Send,
  ArrowUpDown, ChevronUp, ChevronDown,
  X, Loader2, Sparkles, Layers, Clock,
  CheckCircle2, AlertTriangle, Images, ImageOff,
} from "lucide-react";

import "./HostListings.css";

/* ─── constants & utils ──────────────────────────────── */
const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">` +
    `<defs><linearGradient id="g" x1="0" x2="1">` +
    `<stop stop-color="#eef1ed"/><stop offset="1" stop-color="#f9faf8"/>` +
    `</linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="22" fill="#6b7280">BucovinaStay</text>` +
    `</svg>`
  );

const EMPTY_COUNTS = { all: 0, draft: 0, pending: 0, live: 0, paused: 0, rejected: 0 };

const TABS = [
  ["all",      "Toate"],
  ["draft",    "Draft"],
  ["pending",  "În așteptare"],
  ["live",     "Publicate"],
  ["paused",   "Pauzate"],
  ["rejected", "Respinse"],
];

function statusLabel(s) {
  if (s === "draft")    return "Draft";
  if (s === "pending")  return "În așteptare";
  if (s === "live")     return "Publicat";
  if (s === "paused")   return "Pauzat";
  if (s === "rejected") return "Respins";
  return s || "—";
}

function statusTone(s) {
  if (s === "live")     return "tone-good";
  if (s === "pending")  return "tone-warn";
  if (s === "rejected") return "tone-bad";
  return "tone-muted";
}

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

function timeAgo(ts) {
  const d = new Date(ts || 0);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return "acum";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

function completeness(p) {
  const imgCount = p.__imgCount ?? (Array.isArray(p.images) ? p.images.length : 0);
  const checks = [
    Boolean(p.title?.trim()),
    Boolean(p.description?.trim()),
    imgCount >= 3,
    Number(p.pricePerNight) > 0,
    Number(p.capacity) > 0,
    Boolean(p.city?.trim() || p.locality?.trim()),
    Boolean(p.type),
    (p.facilities?.length || 0) >= 1,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function complTone(score) {
  if (score >= 90) return "c-good";
  if (score >= 60) return "c-warn";
  return "c-bad";
}

/* ─── custom hook ────────────────────────────────────── */
function useDebouncedValue(value, delayMs = 350) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return deb;
}

/* ─── Modal ──────────────────────────────────────────── */
function Modal({ open, title, children, onClose }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
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

/* ─── Page ───────────────────────────────────────────── */
export default function HostListings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  /* ── ALL hooks BEFORE any conditional return ── */
  const [tab, setTab]                   = useState("all");
  const [q, setQ]                       = useState("");
  const debouncedQ                      = useDebouncedValue(q, 350);
  const [page, setPage]                 = useState(1);
  const [limit]                         = useState(12);
  const [loading, setLoading]           = useState(true);
  const [items, setItems]               = useState([]);
  const [total, setTotal]               = useState(0);
  const [statusCounts, setStatusCounts] = useState(EMPTY_COUNTS);
  const [sortKey, setSortKey]           = useState("updatedAt");
  const [sortDir, setSortDir]           = useState("desc");
  const [busy, setBusy]                 = useState({});
  const [confirm, setConfirm]           = useState({
    open: false, id: null, title: "", message: "", action: null,
  });

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  const avgPrice = useMemo(() => {
    let sum = 0, cnt = 0;
    items.forEach((p) => {
      const v = Number(p.pricePerNight);
      if (Number.isFinite(v)) { sum += v; cnt++; }
    });
    return cnt ? Math.round(sum / cnt) : null;
  }, [items]);

  const sortedItems = useMemo(() => {
    const arr = [...items];
    const dir = sortDir === "asc" ? 1 : -1;
    const getV = (x) => {
      if (sortKey === "title")         return String(x.title || "").toLowerCase();
      if (sortKey === "pricePerNight") return Number(x.pricePerNight || 0);
      return new Date(x.updatedAt || x.createdAt || 0).getTime();
    };
    arr.sort((a, b) => {
      const va = getV(a), vb = getV(b);
      if (typeof va === "string") return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
    return arr;
  }, [items, sortKey, sortDir]);

  const setBusyFor   = useCallback((id, action) => setBusy((p) => ({ ...p, [id]: action })), []);
  const clearBusyFor = useCallback((id) => setBusy((p) => { const n = { ...p }; delete n[id]; return n; }), []);

  const openConfirm  = useCallback(({ id, title, message, action }) =>
    setConfirm({ open: true, id, title, message, action }), []);
  const closeConfirm = useCallback(() =>
    setConfirm({ open: false, id: null, title: "", message: "", action: null }), []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyProperties({ page, limit, status: tab, q: debouncedQ });
      const normalized = (data.items || []).map((p) => ({
        ...p,
        id: p._id || p.id,
        __thumb: p.coverImage?.url || p.images?.[0]?.url || p.image || FALLBACK_IMG,
        __imgCount: Array.isArray(p.images) ? p.images.length : 0,
      }));
      setItems(normalized);
      setTotal(data.total ?? normalized.length);
      if (data.statusCounts) setStatusCounts(data.statusCounts);
    } catch (e) {
      toast.error("Nu am putut încărca proprietățile", { description: e?.message });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, tab, debouncedQ]);

  useEffect(() => { setPage(1); }, [tab, debouncedQ]);
  useEffect(() => {
    let alive = true;
    fetchData().finally(() => { if (!alive) return; });
    return () => { alive = false; };
  }, [fetchData]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /* ── Guards (after all hooks) ── */
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

  /* ── Sorting toggle ── */
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

  /* ── Actions ── */
  const doSubmit = async (id) => {
    setBusyFor(id, "submit");
    try {
      await submitForReview(id);
      toast.success("Trimis la verificare");
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: "pending" } : x)));
    } catch (e) {
      toast.error("Eroare la trimitere", { description: e?.message });
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
      toast.error("Eroare", { description: e?.message });
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
      toast.error("Eroare la ștergere", { description: e?.message });
    } finally {
      clearBusyFor(id);
    }
  };

  const goEdit    = (id) => navigate(`/host/${id}/edit`);
  const goPreview = (id) => window.open(`/cazari/${id}`, "_blank", "noopener,noreferrer");
  const goNew     = () => navigate("/host/add");

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <ArrowUpDown size={12} className="hlSortIconDim" aria-hidden="true" />;
    return sortDir === "asc"
      ? <ChevronUp   size={12} className="hlSortIconActive" aria-hidden="true" />
      : <ChevronDown size={12} className="hlSortIconActive" aria-hidden="true" />;
  };

  /* ── Render ── */
  return (
    <div className="hlPage">
      <div className="hlMain">

        {/* HEADER */}
        <header className="hlHeader">
          <div className="hlHeaderLeft">
            <div className="hlCrumb">Gazdă</div>
            <div className="hlTitleRow">
              <h1 className="hlTitle">Proprietățile mele</h1>
              <a
                className="hlGhostLink"
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                title="Deschide site-ul"
              >
                Site <ExternalLink size={13} />
              </a>
            </div>
            <div className="hlSub">
              Salut, <strong>{hostName}</strong> — gestionează draft-urile și publicările
            </div>

            <div className="hlKpis">
              <div className="hlKpi">
                <div className="hlKpiTop">
                  <span className="hlKpiLabel">Total</span>
                  <span className="hlKpiIcon"><Layers size={15} /></span>
                </div>
                <div className="hlKpiVal">{statusCounts.all}</div>
                <div className="hlKpiHint">Toate proprietățile</div>
              </div>

              <div className="hlKpi">
                <div className="hlKpiTop">
                  <span className="hlKpiLabel">Publicate</span>
                  <span className="hlKpiIcon good"><CheckCircle2 size={15} /></span>
                </div>
                <div className="hlKpiVal">{statusCounts.live}</div>
                <div className="hlKpiHint">Vizibile pe site acum</div>
              </div>

              <div className="hlKpi">
                <div className="hlKpiTop">
                  <span className="hlKpiLabel">În așteptare</span>
                  <span className="hlKpiIcon warn"><Clock size={15} /></span>
                </div>
                <div className="hlKpiVal">{statusCounts.pending}</div>
                <div className="hlKpiHint">Se verifică de admin</div>
              </div>

              <div className="hlKpi">
                <div className="hlKpiTop">
                  <span className="hlKpiLabel">Preț mediu</span>
                  <span className="hlKpiIcon"><Sparkles size={15} /></span>
                </div>
                <div className="hlKpiVal">
                  {avgPrice != null
                    ? formatMoney(avgPrice, items[0]?.currency || "RON")
                    : "—"}
                </div>
                <div className="hlKpiHint">Media paginii curente</div>
              </div>
            </div>
          </div>

          <div className="hlHeaderActions">
            <button className="hlBtn hlBtnAccent" type="button" onClick={goNew}>
              <Plus size={16} /> Adaugă
            </button>
            <button className="hlBtn" type="button" onClick={() => navigate("/host")}>
              Dashboard <ChevronRight size={15} />
            </button>
          </div>
        </header>

        {/* PANEL */}
        <section className="hlCard">
          <div className="hlCardTopbar">
            <div className="hlTabs" role="tablist" aria-label="Filtre status">
              {TABS.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`hlTab ${tab === k ? "active" : ""}`}
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                >
                  {label}
                  <span className="hlCount">
                    {k === "all" ? statusCounts.all : (statusCounts[k] ?? 0)}
                  </span>
                </button>
              ))}
            </div>

            <div className="hlControls">
              <div className="hlSearch" role="search">
                <Search size={14} className="hlSearchIcon" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Caută după titlu / oraș / localitate…"
                  aria-label="Caută proprietăți"
                />
                {!!q && (
                  <button className="hlIconBtn" type="button" onClick={() => setQ("")} aria-label="Șterge căutarea">
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="hlSort" aria-label="Sortare">
                <button
                  className={`hlSortBtn ${sortKey === "updatedAt" ? "active" : ""}`}
                  type="button"
                  onClick={() => toggleSorting("updatedAt")}
                >
                  Updated <SortIcon k="updatedAt" />
                </button>
                <button
                  className={`hlSortBtn ${sortKey === "title" ? "active" : ""}`}
                  type="button"
                  onClick={() => toggleSorting("title")}
                >
                  Titlu <SortIcon k="title" />
                </button>
                <button
                  className={`hlSortBtn ${sortKey === "pricePerNight" ? "active" : ""}`}
                  type="button"
                  onClick={() => toggleSorting("pricePerNight")}
                >
                  Preț <SortIcon k="pricePerNight" />
                </button>
              </div>
            </div>
          </div>

          {/* BODY */}
          {loading ? (
            <div className="hlSkelGrid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="hlSkelCard" key={i}>
                  <div className="hlSkelImg" />
                  <div className="hlSkelLines">
                    <div className="hlSkelLine w80" />
                    <div className="hlSkelLine w50" />
                    <div className="hlSkelLine w60" />
                    <div className="hlSkelLine w40" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="hlEmpty">
              <div className="hlEmptyIcon"><AlertTriangle size={24} /></div>
              <h3>Nicio proprietate</h3>
              <p>
                {tab !== "all" || q
                  ? "Încearcă alt tab sau caută alt termen."
                  : "Adaugă prima ta proprietate!"}
              </p>
              <button className="hlBtn hlBtnAccent" type="button" onClick={goNew}>
                <Plus size={15} /> Adaugă proprietate
              </button>
            </div>
          ) : (
            <>
              <div className="hlGrid">
                {sortedItems.map((p) => {
                  const isBusy   = Boolean(busy[p.id]);
                  const canSubmit = p.status === "draft" || p.status === "rejected";
                  const canToggle = p.status === "live"  || p.status === "paused";
                  const comp      = completeness(p);
                  const imgCount  = p.__imgCount ?? 0;

                  return (
                    <article
                      className={`hlListingCard ${imgCount === 0 ? "hlCardDim" : ""}`}
                      key={p.id}
                    >
                      {/* Thumbnail */}
                      <button
                        className="hlMedia"
                        type="button"
                        onClick={() => goEdit(p.id)}
                        aria-label={`Editează ${p.title || "proprietatea"}`}
                      >
                        <img src={p.__thumb} alt="" loading="lazy" />
                        <div className="hlMediaOverlay">
                          <span className={`hlBadge ${statusTone(p.status)}`}>
                            {statusLabel(p.status)}
                          </span>
                          <span className="hlBadge tone-muted">
                            {formatMoney(p.pricePerNight, p.currency)} / noapte
                          </span>
                        </div>
                        {imgCount > 0 ? (
                          <div className="hlImgCount">
                            <Images size={11} aria-hidden="true" />
                            <span>{imgCount}</span>
                          </div>
                        ) : (
                          <div className="hlImgZero">
                            <ImageOff size={12} aria-hidden="true" />
                            <span>Fără poze</span>
                          </div>
                        )}
                      </button>

                      {/* Completeness bar */}
                      {comp < 100 && (
                        <div className="hlComplRow">
                          <div className="hlComplBar">
                            <div
                              className={`hlComplFill ${complTone(comp)}`}
                              style={{ width: `${comp}%` }}
                            />
                          </div>
                          <span className={`hlComplLabel ${complTone(comp)}`}>{comp}%</span>
                        </div>
                      )}

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

                        {/* Rejection reason */}
                        {p.status === "rejected" && p.rejectionReason && (
                          <div className="hlRejReason">
                            <AlertTriangle size={13} aria-hidden="true" />
                            <span>{p.rejectionReason}</span>
                          </div>
                        )}

                        {p.subtitle && (
                          <div className="hlSubline">{p.subtitle}</div>
                        )}

                        <div className="hlFoot">
                          <div className="hlUpdated">
                            <Clock size={12} />
                            <span>updated {timeAgo(p.updatedAt || p.createdAt)}</span>
                          </div>

                          <div className="hlActions">
                            <div className="hlActionRowTop">
                              <button
                                className="hlBtnEq"
                                type="button"
                                onClick={() => goEdit(p.id)}
                                disabled={isBusy}
                              >
                                <Pencil size={13} /> Edit
                              </button>

                              <button
                                className="hlBtnEq"
                                type="button"
                                onClick={() => goPreview(p.id)}
                                disabled={isBusy}
                              >
                                <Eye size={13} /> Preview
                              </button>

                              {canSubmit ? (
                                <button
                                  className="hlBtnEq hlBtnEqAccent"
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => doSubmit(p.id)}
                                >
                                  {busy[p.id] === "submit"
                                    ? <Loader2 size={13} className="spin" />
                                    : <Send size={13} />}
                                  Trimite
                                </button>
                              ) : canToggle ? (
                                <button
                                  className="hlBtnEq hlBtnEqAccent"
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => doTogglePause(p.id)}
                                >
                                  {busy[p.id] === "toggle"
                                    ? <Loader2 size={13} className="spin" />
                                    : p.status === "live"
                                      ? <PauseCircle size={13} />
                                      : <PlayCircle size={13} />}
                                  {p.status === "live" ? "Pauză" : "Publică"}
                                </button>
                              ) : (
                                <button className="hlBtnEq" type="button" disabled>—</button>
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
                                  message: `Ștergerea este permanentă. „${p.title || "Fără titlu"}" va fi eliminată definitiv.`,
                                  action: async () => { await doDelete(p.id); },
                                })
                              }
                            >
                              {busy[p.id] === "delete"
                                ? <Loader2 size={13} className="spin" />
                                : <Trash2 size={13} />}
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="hlPager">
                  <button
                    className="hlBtn"
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Înapoi
                  </button>
                  <div className="hlPagerText">
                    <strong>{page}</strong> / <strong>{totalPages}</strong>
                    <span className="hlPagerTotal"> · {total} total</span>
                  </div>
                  <button
                    className="hlBtn"
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Înainte
                  </button>
                </div>
              )}
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
              disabled={!!busy[confirm.id]}
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
            >
              {busy[confirm.id]
                ? <Loader2 size={14} className="spin" />
                : <Trash2 size={14} />}
              Șterge definitiv
            </button>
          </div>
          <div className="hlModalHint">
            <Sparkles size={13} />
            Tip: 8–12 poze + cover luminos = CTR mai bun.
          </div>
        </Modal>

      </div>
    </div>
  );
}
