import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, CheckCircle2, XCircle, PauseCircle, PlayCircle } from "lucide-react";
import { adminListProperties, adminSetPropertyStatus } from "../../api/adminService";
import AdminPage from "./AdminPage";
import RejectReasonModal from "./RejectReasonModal";
import "./Admin.css";
import { useTranslation } from "react-i18next";

const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">
  <rect width="100%" height="100%" fill="#f3f4f6"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial" font-size="22" fill="#6b7280">BucovinaStay</text></svg>`);

function statusTone(s) {
  if (s === "live") return "good";
  if (s === "pending") return "warn";
  if (s === "rejected") return "bad";
  return "muted";
}

function canApprove(status) {
  return status === "pending";
}
function canReject(status) {
  return status === "pending";
}
function canPause(status) {
  return status === "live";
}
function canResume(status) {
  return status === "paused";
}

export default function AdminListings() {
  const { t } = useTranslation();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const limit = 12;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => setPage(1), [q, status]);

  const load = async () => {
    const res = await adminListProperties({ page, limit, q, status });
    setRows(res?.items || []);
    setTotal(res?.total || 0);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        if (!alive) return;
        toast.error(t("admin.listings.toastLoadFailTitle"), { description: e?.message || t("admin.common.error") });
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
    // eslint-disable-next-line
  }, [page, limit, q, status, t]);

  const setStatusAction = async (id, nextStatus, extra = {}) => {
    try {
      await adminSetPropertyStatus(id, { status: nextStatus, ...extra });
      toast.success(t("admin.listings.toastUpdatedTitle"));
      await load();
    } catch (e) {
      toast.error(t("admin.listings.toastUpdateFailTitle"), { description: e?.message || t("admin.common.error") });
    }
  };

  return (
    <AdminPage
      titleKey="admin.listings.pageTitle"
      subtitle={t("admin.common.resultsCount", { count: total, total })}
    >
      <div className="hdCard hdTable adListings">
        <div className="hdCardTop">
          <div>
            <div className="hdCardLabel">{t("admin.listings.cardTitle")}</div>
            <div className="hdCardHint">{t("admin.common.resultsCount", { count: total, total })}</div>
          </div>

          <div className="hdToolbar">
            <select className="hdSelect" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">{t("admin.common.status.pending")}</option>
              <option value="live">{t("admin.common.status.live")}</option>
              <option value="paused">{t("admin.common.status.paused")}</option>
              <option value="rejected">{t("admin.common.status.rejected")}</option>
              <option value="draft">{t("admin.common.status.draft")}</option>
              <option value="all">{t("admin.common.status.all")}</option>
            </select>

            <div className="adSearchWrap">
              <Search size={16} />
              <input
                className="hdSearchInput adSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("admin.listings.searchPlaceholder")}
              />
            </div>
          </div>
        </div>

        <div className="adListingsHead">
          <div>{t("admin.listings.cols.property")}</div>
          <div>{t("admin.listings.cols.status")}</div>
          <div>{t("admin.listings.cols.host")}</div>
          <div style={{ justifySelf: "end" }}>{t("admin.common.actions")}</div>
        </div>

        {loading ? (
          <div className="hdSkeleton">
            <div className="skLine" />
            <div className="skLine" />
            <div className="skLine" />
          </div>
        ) : rows.length === 0 ? (
          <div className="hdEmpty">{t("admin.common.empty")}</div>
        ) : (
          <div className="adRows">
            {rows.map((p) => {
              const thumb = p.coverImage?.url || p.images?.[0]?.url || FALLBACK_IMG;
              const hostName = p.hostId?.name || t("admin.common.fallbackHost");
              const hostEmail = p.hostId?.email || "";

              const approveOk = canApprove(p.status);
              const rejectOk = canReject(p.status);
              const pauseOk = canPause(p.status);
              const resumeOk = canResume(p.status);

              return (
                <div className="adRow adListingRow" key={p._id}>
                  <div className="hdProp">
                    <img className="hdThumb" src={thumb} alt="" onError={(e) => (e.currentTarget.src = FALLBACK_IMG)} />
                    <div className="hdPropText">
                      <div className="hdPropName" title={p.title}>
                        {p.title}
                      </div>
                      <div className="hdPropMeta">
                        {p.city}
                        {p.locality ? ` • ${p.locality}` : ""} • {p.type}
                      </div>
                      {p.status === "rejected" && p.rejectionReason ? (
                        <div className="hdCardHint" title={p.rejectionReason}>
                          {t("admin.listings.rejectedReasonPrefix")} {p.rejectionReason}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Mobile kebab */}
                  <div className="adListingMobileHead">
                    <details className="adKebab">
                      <summary className="hdBtn adKebabBtn" aria-label={t("admin.common.actions")}>
                        ⋯
                      </summary>

                      <div className="adMenu">
                        <button className="adMenuItem" disabled={!approveOk} onClick={() => setStatusAction(p._id, "live")}>
                          {t("admin.listings.actions.approve")}
                        </button>
                        <button className="adMenuItem" disabled={!pauseOk} onClick={() => setStatusAction(p._id, "paused")}>
                          {t("admin.listings.actions.pause")}
                        </button>
                        <button className="adMenuItem" disabled={!resumeOk} onClick={() => setStatusAction(p._id, "live")}>
                          {t("admin.listings.actions.resume")}
                        </button>
                        <div className="adMenuSep" />
                        <button
                          className="adMenuItem"
                          disabled={!rejectOk}
                          onClick={() => {
                            setRejectTarget(p);
                            setRejectOpen(true);
                          }}
                        >
                          {t("admin.listings.actions.reject")}
                        </button>
                      </div>
                    </details>
                  </div>

                  <div className="adListingMobileBadges">
                    <span className={`hdBadge tone-${statusTone(p.status)}`}>{t(`admin.common.status.${p.status}`)}</span>
                    <span className="hdBadge tone-muted">{hostName}</span>
                  </div>

                  <div className="hdCell">
                    <span className={`hdBadge tone-${statusTone(p.status)}`}>{t(`admin.common.status.${p.status}`)}</span>
                  </div>

                  <div className="hdCell">
                    <div className="adHostCell">
                      <div className="adHostName">{hostName}</div>
                      <div className="adHostMeta">{hostEmail}</div>
                    </div>
                  </div>

                  <div className="hdActionsCell">
                    <button
                      className={`hdBtn ${approveOk ? "hdBtnAccent" : ""}`}
                      disabled={!approveOk}
                      title={!approveOk ? t("admin.listings.tips.approveOnlyPending") : t("admin.listings.actions.approve")}
                      onClick={() => setStatusAction(p._id, "live")}
                    >
                      <CheckCircle2 size={16} /> {t("admin.listings.actions.approve")}
                    </button>

                    <button
                      className="hdBtn"
                      disabled={!pauseOk}
                      title={!pauseOk ? t("admin.listings.tips.pauseOnlyLive") : t("admin.listings.actions.pause")}
                      onClick={() => setStatusAction(p._id, "paused")}
                    >
                      <PauseCircle size={16} /> {t("admin.listings.actions.pause")}
                    </button>

                    <button
                      className="hdBtn"
                      disabled={!resumeOk}
                      title={!resumeOk ? t("admin.listings.tips.resumeOnlyPaused") : t("admin.listings.actions.resume")}
                      onClick={() => setStatusAction(p._id, "live")}
                    >
                      <PlayCircle size={16} /> {t("admin.listings.actions.resume")}
                    </button>

                    <button
                      className="hdBtn"
                      disabled={!rejectOk}
                      title={!rejectOk ? t("admin.listings.tips.rejectOnlyPending") : t("admin.listings.actions.reject")}
                      onClick={() => {
                        setRejectTarget(p);
                        setRejectOpen(true);
                      }}
                    >
                      <XCircle size={16} /> {t("admin.listings.actions.reject")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && total > 0 ? (
          <div className="hdPager">
            <button className="hdBtn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {t("admin.common.back")}
            </button>
            <div className="hdPagerText">
              {t("admin.common.pageOf", { page, totalPages })}
            </div>
            <button className="hdBtn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              {t("admin.common.next")}
            </button>
          </div>
        ) : null}
      </div>

      <RejectReasonModal
        open={rejectOpen}
        initial={rejectTarget?.rejectionReason || ""}
        onClose={() => {
          setRejectOpen(false);
          setRejectTarget(null);
        }}
        onSubmit={async (reason) => {
          if (!rejectTarget?._id) return;
          await setStatusAction(rejectTarget._id, "rejected", { reason });
          setRejectOpen(false);
          setRejectTarget(null);
        }}
      />
    </AdminPage>
    
  );
}
