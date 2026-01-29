import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Save, UserX, UserCheck } from "lucide-react";
import { adminListUsers, adminPatchUser } from "../../api/adminService";
import AdminPage from "./AdminPage";
import "./Admin.css";
import { useTranslation } from "react-i18next";

function roleTone(role) {
  if (role === "admin") return "good";
  if (role === "host") return "warn";
  return "muted";
}

export default function AdminUsers() {
  const { t } = useTranslation();

  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // local edits (per row)
  const [draftRole, setDraftRole] = useState({}); // {userId: "host"}

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => setPage(1), [q, role]);

  const load = async () => {
    const res = await adminListUsers({ page, limit, q, role });
    setRows(res?.items || []);
    setTotal(res?.total || 0);
    const map = {};
    (res?.items || []).forEach((u) => (map[u._id] = u.role));
    setDraftRole(map);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        if (!alive) return;
        toast.error(t("admin.users.toastLoadFailTitle"), { description: e?.message || t("admin.common.error") });
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
    // eslint-disable-next-line
  }, [page, limit, q, role, t]);

  const patch = async (id, payload) => {
    try {
      await adminPatchUser(id, payload);
      toast.success(t("admin.users.toastUpdatedTitle"));
      await load();
    } catch (e) {
      toast.error(t("admin.users.toastUpdateFailTitle"), { description: e?.message || t("admin.common.error") });
    }
  };

  return (
    <AdminPage
      titleKey="admin.users.pageTitle"
      subtitle={t("admin.common.resultsCount", { count: total, total })}
    >
      <div className="hdCard hdTable adUsers">
        <div className="hdCardTop">
          <div>
            <div className="hdCardLabel">{t("admin.users.cardTitle")}</div>
            <div className="hdCardHint">{t("admin.common.resultsCount", { count: total, total })}</div>
          </div>

          <div className="hdToolbar">
            <div className="hdFilters">
              <select className="hdSelect" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="all">{t("admin.users.roles.all")}</option>
                <option value="guest">{t("admin.users.roles.guest")}</option>
                <option value="host">{t("admin.users.roles.host")}</option>
                <option value="admin">{t("admin.users.roles.admin")}</option>
              </select>
            </div>

            <div className="adSearchWrap">
              <Search size={16} />
              <input
                className="hdSearchInput adSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("admin.users.searchPlaceholder")}
              />
            </div>
          </div>
        </div>

        <div className="adTableHead">
          <div>{t("admin.users.cols.user")}</div>
          <div>{t("admin.users.cols.role")}</div>
          <div>{t("admin.users.cols.status")}</div>
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
            {rows.map((u) => {
              const curr = u.role;
              const next = draftRole[u._id] ?? curr;
              const changed = next !== curr;

              const statusKey = u.disabled ? "disabled" : "active";

              return (
                <div className="adRow adUserRow" key={u._id}>
                  <div className="adUserCell">
                    <div className="adUserName" title={u.name}>
                      {u.name}
                    </div>
                    <div className="adUserMeta">
                      {u.email}
                      {u.phone ? ` • ${u.phone}` : ""}
                    </div>
                  </div>

                  {/* Mobile kebab */}
                  <div className="adUserMobileHead">
                    <details className="adKebab">
                      <summary className="hdBtn adKebabBtn" aria-label={t("admin.common.actions")}>
                        ⋯
                      </summary>

                      <div className="adMenu">
                        <div className="adMenuTitle">{t("admin.users.mobile.setRole")}</div>

                        <button
                          className={`adMenuItem ${next === "guest" ? "isActive" : ""}`}
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.closest("details")?.removeAttribute("open");
                            setDraftRole((m) => ({ ...m, [u._id]: "guest" }));
                          }}
                        >
                          {t("admin.users.roles.guest")}
                        </button>

                        <button
                          className={`adMenuItem ${next === "host" ? "isActive" : ""}`}
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.closest("details")?.removeAttribute("open");
                            setDraftRole((m) => ({ ...m, [u._id]: "host" }));
                          }}
                        >
                          {t("admin.users.roles.host")}
                        </button>

                        <button
                          className={`adMenuItem ${next === "admin" ? "isActive" : ""}`}
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.closest("details")?.removeAttribute("open");
                            setDraftRole((m) => ({ ...m, [u._id]: "admin" }));
                          }}
                        >
                          {t("admin.users.roles.admin")}
                        </button>

                        <div className="adMenuSep" />

                        <button
                          className="adMenuItem"
                          type="button"
                          disabled={!changed}
                          onClick={(e) => {
                            e.currentTarget.closest("details")?.removeAttribute("open");
                            patch(u._id, { role: next });
                          }}
                        >
                          {t("admin.users.actions.saveRole")}
                        </button>

                        <button
                          className="adMenuItem"
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.closest("details")?.removeAttribute("open");
                            patch(u._id, { disabled: !u.disabled });
                          }}
                        >
                          {u.disabled ? t("admin.users.actions.enable") : t("admin.users.actions.disable")}
                        </button>
                      </div>
                    </details>
                  </div>

                  <div className="adUserMobileBadges">
                    <span className={`hdBadge tone-${roleTone(next)}`}>{t(`admin.users.roles.${next}`)}</span>
                    {changed ? <span className="hdBadge tone-warn">{t("admin.users.badges.unsaved")}</span> : null}
                    <span className={`hdBadge tone-${u.disabled ? "bad" : "good"}`}>
                      {t(`admin.users.status.${statusKey}`)}
                    </span>
                  </div>

                  {/* Desktop role */}
                  <div className="hdCell">
                    <select
                      className="hdSelect"
                      value={next}
                      onChange={(e) => setDraftRole((m) => ({ ...m, [u._id]: e.target.value }))}
                      title={t("admin.users.tips.setRole")}
                    >
                      <option value="guest">{t("admin.users.roles.guest")}</option>
                      <option value="host">{t("admin.users.roles.host")}</option>
                      <option value="admin">{t("admin.users.roles.admin")}</option>
                    </select>

                    <div style={{ marginTop: 8 }}>
                      <span className={`hdBadge tone-${roleTone(next)}`}>{t(`admin.users.roles.${next}`)}</span>
                      {changed ? (
                        <span className="hdBadge tone-warn" style={{ marginLeft: 8 }}>
                          {t("admin.users.badges.unsaved")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Desktop status */}
                  <div className="hdCell">
                    <span className={`hdBadge tone-${u.disabled ? "bad" : "good"}`}>
                      {t(`admin.users.status.${statusKey}`)}
                    </span>
                  </div>

                  {/* Desktop actions */}
                  <div className="hdActionsCell">
                    <button
                      className={`hdBtn ${changed ? "hdBtnAccent" : ""}`}
                      type="button"
                      disabled={!changed}
                      onClick={() => patch(u._id, { role: next })}
                      title={changed ? t("admin.users.tips.saveRole") : t("admin.users.tips.noChanges")}
                    >
                      <Save size={16} /> {t("admin.users.actions.saveRole")}
                    </button>

                    <button
                      className={`hdBtn ${u.disabled ? "" : "hdBtnAccent"}`}
                      type="button"
                      onClick={() => patch(u._id, { disabled: !u.disabled })}
                      title={u.disabled ? t("admin.users.actions.enable") : t("admin.users.actions.disable")}
                    >
                      {u.disabled ? <UserCheck size={16} /> : <UserX size={16} />}
                      {u.disabled ? t("admin.users.actions.enable") : t("admin.users.actions.disable")}
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
            <div className="hdPagerText">{t("admin.common.pageOf", { page, totalPages })}</div>
            <button className="hdBtn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              {t("admin.common.next")}
            </button>
          </div>
        ) : null}
      </div>
    </AdminPage>
  );
}
