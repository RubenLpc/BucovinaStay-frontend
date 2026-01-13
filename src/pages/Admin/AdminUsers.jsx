import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Save, UserX, UserCheck } from "lucide-react";
import { adminListUsers, adminPatchUser } from "../../api/adminService";
import AdminPage from "./AdminPage";
import "./Admin.css";

function roleTone(role) {
  if (role === "admin") return "good";
  if (role === "host") return "warn";
  return "muted";
}

export default function AdminUsers() {
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
    // initialize draft roles
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
        toast.error("Nu am putut încărca userii", { description: e?.message || "Eroare" });
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
    // eslint-disable-next-line
  }, [page, limit, q, role]);

  const patch = async (id, payload) => {
    try {
      await adminPatchUser(id, payload);
      toast.success("Actualizat");
      await load();
    } catch (e) {
      toast.error("Nu am putut actualiza", { description: e?.message || "Eroare" });
    }
  };

  return (
    <AdminPage title="Users" subtitle={`${total} rezultate`}>
      <div className="hdCard hdTable adUsers">
        <div className="hdCardTop">
          <div>
            <div className="hdCardLabel">Users</div>
            <div className="hdCardHint">{total} rezultate</div>
          </div>

          <div className="hdToolbar">
            <div className="hdFilters">
              <select className="hdSelect" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="all">All</option>
                <option value="guest">guest</option>
                <option value="host">host</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="adSearchWrap">
              <Search size={16} />
              <input
                className="hdSearchInput adSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Caută: email / nume / telefon..."
              />
            </div>
          </div>
        </div>

        <div className="adTableHead">
          <div>User</div>
          <div>Role</div>
          <div>Status</div>
          <div style={{ justifySelf: "end" }}>Acțiuni</div>
        </div>

        {loading ? (
          <div className="hdSkeleton">
            <div className="skLine" />
            <div className="skLine" />
            <div className="skLine" />
          </div>
        ) : rows.length === 0 ? (
          <div className="hdEmpty">Nimic de afișat.</div>
        ) : (
          <div className="adRows">
            {rows.map((u) => {
              const curr = u.role;
              const next = draftRole[u._id] ?? curr;
              const changed = next !== curr;

              return (
                <div className="adRow adUserRow" key={u._id}>
                  <div className="adUserCell">
                    <div className="adUserName" title={u.name}>{u.name}</div>
                    <div className="adUserMeta">{u.email}{u.phone ? ` • ${u.phone}` : ""}</div>
                  </div>
                  <div className="adUserMobileHead">
  <details className="adKebab">
    <summary className="hdBtn adKebabBtn" aria-label="Actions">⋯</summary>

    <div className="adMenu">
      <div className="adMenuTitle">Set role</div>

      <button
        className={`adMenuItem ${next === "guest" ? "isActive" : ""}`}
        type="button"
        onClick={(e) => {
          e.currentTarget.closest("details")?.removeAttribute("open");
          setDraftRole((m) => ({ ...m, [u._id]: "guest" }));
        }}
      >
        guest
      </button>

      <button
        className={`adMenuItem ${next === "host" ? "isActive" : ""}`}
        type="button"
        onClick={(e) => {
          e.currentTarget.closest("details")?.removeAttribute("open");
          setDraftRole((m) => ({ ...m, [u._id]: "host" }));
        }}
      >
        host
      </button>

      <button
        className={`adMenuItem ${next === "admin" ? "isActive" : ""}`}
        type="button"
        onClick={(e) => {
          e.currentTarget.closest("details")?.removeAttribute("open");
          setDraftRole((m) => ({ ...m, [u._id]: "admin" }));
        }}
      >
        admin
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
        Save role
      </button>

      <button
        className="adMenuItem"
        type="button"
        onClick={(e) => {
          e.currentTarget.closest("details")?.removeAttribute("open");
          patch(u._id, { disabled: !u.disabled });
        }}
      >
        {u.disabled ? "Enable user" : "Disable user"}
      </button>
    </div>
  </details>
</div>
<div className="adUserMobileBadges">
  <span className={`hdBadge tone-${roleTone(next)}`}>{next}</span>
  {changed ? <span className="hdBadge tone-warn">unsaved</span> : null}
  {u.disabled ? (
    <span className="hdBadge tone-bad">disabled</span>
  ) : (
    <span className="hdBadge tone-good">active</span>
  )}
</div>




                  <div className="hdCell">
                    <select
                      className="hdSelect"
                      value={next}
                      onChange={(e) => setDraftRole((m) => ({ ...m, [u._id]: e.target.value }))}
                      title="Set role"
                    >
                      <option value="guest">guest</option>
                      <option value="host">host</option>
                      <option value="admin">admin</option>
                    </select>

                    <div style={{ marginTop: 8 }}>
                      <span className={`hdBadge tone-${roleTone(next)}`}>{next}</span>
                      {changed ? <span className="hdBadge tone-warn" style={{ marginLeft: 8 }}>unsaved</span> : null}
                    </div>
                  </div>

                  <div className="hdCell">
                    {u.disabled ? (
                      <span className="hdBadge tone-bad">disabled</span>
                    ) : (
                      <span className="hdBadge tone-good">active</span>
                    )}
                  </div>

                  <div className="hdActionsCell">
                    <button
                      className={`hdBtn ${changed ? "hdBtnAccent" : ""}`}
                      type="button"
                      disabled={!changed}
                      onClick={() => patch(u._id, { role: next })}
                      title={changed ? "Salvează role" : "Nicio schimbare"}
                    >
                      <Save size={16} /> Save role
                    </button>

                    <button
                      className={`hdBtn ${u.disabled ? "" : "hdBtnAccent"}`}
                      type="button"
                      onClick={() => patch(u._id, { disabled: !u.disabled })}
                    >
                      {u.disabled ? <UserCheck size={16} /> : <UserX size={16} />}
                      {u.disabled ? "Enable" : "Disable"}
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
              Înapoi
            </button>
            <div className="hdPagerText">
              Pagina <b>{page}</b> din <b>{totalPages}</b>
            </div>
            <button className="hdBtn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Înainte
            </button>
          </div>
        ) : null}
      </div>
    </AdminPage>
  );
}
