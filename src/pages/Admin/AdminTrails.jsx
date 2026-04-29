import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  MapPin,
  Mountain,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AdminPage from "./AdminPage";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import trailsSeed from "../Trails/trailsData";
import {
  adminCreateTrail,
  adminDeleteTrail,
  adminGetCloudinarySignature,
  adminImportTrails,
  adminListTrails,
  adminUpdateTrail,
} from "../../api/adminService";
import { useTranslation } from "react-i18next";
import "./Admin.css";

const DIFF_BAR = { "Ușor": "easy", "Mediu": "mid", "Greu": "hard" };

const EMPTY_FORM = {
  name: "",
  area: "",
  difficulty: "Mediu",
  durationHrs: "",
  distanceKm: "",
  season: "",
  tags: "",
  image: null,
  imageFallbackUrl: "",
  sourceUrl: "",
  sourceLabel: "",
  summary: "",
  status: "draft",
  isVerified: false,
};

function statusTone(status) {
  if (status === "published") return "good";
  if (status === "archived") return "bad";
  return "warn";
}

function formatMetaValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return null;
  return `${value}${suffix}`;
}

function formFromTrail(trail) {
  return {
    name: trail?.name || "",
    area: trail?.area || "",
    difficulty: trail?.difficulty || "Mediu",
    durationHrs: trail?.durationHrs ?? "",
    distanceKm: trail?.distanceKm ?? "",
    season: trail?.season || "",
    tags: Array.isArray(trail?.tags) ? trail.tags.join(", ") : "",
    image: trail?.image || null,
    imageFallbackUrl: trail?.imageFallbackUrl || "",
    sourceUrl: trail?.sourceUrl || "",
    sourceLabel: trail?.sourceLabel || "",
    summary: trail?.summary || "",
    status: trail?.status || "draft",
    isVerified: Boolean(trail?.isVerified),
  };
}

export default function AdminTrails() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [status, setStatus] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 12;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, draft: 0, published: 0, archived: 0 });

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const reqSeq = useRef(0);
  const imageInputRef = useRef(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  useEffect(() => {
    setPage(1);
  }, [deferredQ, status, difficulty]);

  const load = async () => {
    const seq = ++reqSeq.current;
    const res = await adminListTrails({
      page,
      limit,
      q: deferredQ,
      status,
      difficulty,
    });
    if (seq !== reqSeq.current) return;
    setRows(res?.items || []);
    setTotal(res?.total || 0);
    setSummary(res?.summary || { total: 0, draft: 0, published: 0, archived: 0 });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        if (!alive) return;
        toast.error(t("admin.trails.toastLoadFailTitle"), {
          description: e?.message || t("admin.common.error"),
        });
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, deferredQ, status, difficulty, t]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadToCloudinary = async (file) => {
    const sig = await adminGetCloudinarySignature({ folder: "trail_images" });
    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", sig.timestamp);
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);

    const res = await fetch(url, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Cloudinary upload failed");

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
    };
  };

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploaded = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, image: uploaded, imageFallbackUrl: "" }));
      toast.success(t("admin.trails.toastUploadedTitle"));
    } catch (err) {
      toast.error(t("admin.trails.toastUploadFailTitle"), {
        description: err?.message || t("admin.common.error"),
      });
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    setForm((prev) => ({ ...prev, image: null }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        area: form.area,
        difficulty: form.difficulty,
        durationHrs: form.durationHrs === "" ? null : Number(form.durationHrs),
        distanceKm: form.distanceKm === "" ? null : Number(form.distanceKm),
        season: form.season,
        tags: form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        image: form.image,
        imageFallbackUrl: form.imageFallbackUrl,
        sourceUrl: form.sourceUrl,
        sourceLabel: form.sourceLabel,
        summary: form.summary,
        status: form.status,
        isVerified: Boolean(form.isVerified),
      };

      if (editingId) {
        await adminUpdateTrail(editingId, payload);
        toast.success(t("admin.trails.toastUpdatedTitle"));
      } else {
        await adminCreateTrail(payload);
        toast.success(t("admin.trails.toastCreatedTitle"));
      }

      resetForm();
      await load();
    } catch (e2) {
      toast.error(t("admin.trails.toastSaveFailTitle"), {
        description: e2?.message || t("admin.common.error"),
      });
    } finally {
      setSaving(false);
    }
  };

  const onImport = async () => {
    try {
      setImporting(true);
      const res = await adminImportTrails(trailsSeed);
      toast.success(t("admin.trails.toastImportedTitle"), {
        description: t("admin.trails.toastImportedDesc", {
          count: res?.imported || trailsSeed.length,
        }),
      });
      await load();
    } catch (e) {
      toast.error(t("admin.trails.toastImportFailTitle"), {
        description: e?.message || t("admin.common.error"),
      });
    } finally {
      setImporting(false);
    }
  };

  const quickSetStatus = async (trail, nextStatus) => {
    try {
      await adminUpdateTrail(trail._id, { status: nextStatus });
      toast.success(t("admin.trails.toastUpdatedTitle"));
      if (editingId === trail._id) {
        setForm((prev) => ({ ...prev, status: nextStatus }));
      }
      await load();
    } catch (e) {
      toast.error(t("admin.trails.toastSaveFailTitle"), {
        description: e?.message || t("admin.common.error"),
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setDeleting(true);
      await adminDeleteTrail(deleteTarget._id);
      toast.success(t("admin.trails.toastDeletedTitle"));
      if (editingId === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(t("admin.trails.toastDeleteFailTitle"), {
        description: e?.message || t("admin.common.error"),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminPage
      titleKey="admin.trails.pageTitle"
      subtitle={t("admin.common.resultsCount", { count: total, total })}
    >
      <section className="adTrailStats">
        <div className="adStatCard adStatTrailTotal">
          <div className="adStatTop">
            <div className="adStatMini"><Compass size={16} /></div>
          </div>
          <div className="adStatLabel">{t("admin.trails.stats.total")}</div>
          <div className="adStatValue">{summary.total || 0}</div>
          <div className="adStatHint">{t("admin.trails.stats.seedHint")}</div>
        </div>

        <div className="adStatCard adStatTrailPublished">
          <div className="adStatTop">
            <div className="adStatMini"><Eye size={16} /></div>
          </div>
          <div className="adStatLabel">{t("admin.trails.stats.published")}</div>
          <div className="adStatValue">{summary.published || 0}</div>
          <div className="adStatHint">{t("admin.trails.stats.visible")}</div>
        </div>

        <div className="adStatCard adStatTrailDraft">
          <div className="adStatTop">
            <div className="adStatMini"><Plus size={16} /></div>
          </div>
          <div className="adStatLabel">{t("admin.trails.stats.draft")}</div>
          <div className="adStatValue">{summary.draft || 0}</div>
          <div className="adStatHint">{t("admin.trails.stats.needsReview")}</div>
        </div>

        <div className="adStatCard adStatTrailArchived">
          <div className="adStatTop">
            <div className="adStatMini"><ShieldCheck size={16} /></div>
          </div>
          <div className="adStatLabel">{t("admin.trails.stats.archived")}</div>
          <div className="adStatValue">{summary.archived || 0}</div>
          <div className="adStatHint">{t("admin.trails.stats.keptForLater")}</div>
        </div>
      </section>

      <section className="adTrailLayout">
        <div className="hdCard adTrailComposer">
          <div className="hdCardTop adTrailComposerTop">
            <div>
              <div className="hdCardLabel">
                {editingId ? t("admin.trails.form.editTitle") : t("admin.trails.form.createTitle")}
              </div>
              <div className="hdCardHint">{t("admin.trails.form.hint")}</div>
            </div>

            <button className="hdBtn" type="button" onClick={resetForm}>
              {t("admin.trails.form.new")}
            </button>
          </div>

          <form className="adTrailForm" onSubmit={onSubmit}>
            <div className="adFormSectLabel">Informații de bază</div>

            <label className="adField">
              <span className="adFieldLabel">{t("admin.trails.fields.name")}</span>
              <input
                className="hdSearchInput adFieldInput"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder={t("admin.trails.placeholders.name")}
              />
            </label>

            <label className="adField">
              <span className="adFieldLabel">{t("admin.trails.fields.area")}</span>
              <input
                className="hdSearchInput adFieldInput"
                value={form.area}
                onChange={(e) => onChange("area", e.target.value)}
                placeholder={t("admin.trails.placeholders.area")}
              />
            </label>

            <div className="adFormSectLabel">Detalii traseu</div>

            <div className="adTrailGrid2">
              <label className="adField">
                <span className="adFieldLabel">{t("admin.trails.fields.difficulty")}</span>
                <select
                  className="hdSelect adFieldSelect"
                  value={form.difficulty}
                  onChange={(e) => onChange("difficulty", e.target.value)}
                >
                  <option value="Ușor">{t("trails.difficulty.Ușor")}</option>
                  <option value="Mediu">{t("trails.difficulty.Mediu")}</option>
                  <option value="Greu">{t("trails.difficulty.Greu")}</option>
                </select>
              </label>

              <label className="adField">
                <span className="adFieldLabel">{t("admin.trails.fields.status")}</span>
                <select
                  className="hdSelect adFieldSelect"
                  value={form.status}
                  onChange={(e) => onChange("status", e.target.value)}
                >
                  <option value="draft">{t("admin.trails.status.draft")}</option>
                  <option value="published">{t("admin.trails.status.published")}</option>
                  <option value="archived">{t("admin.trails.status.archived")}</option>
                </select>
              </label>
            </div>

            <div className="adTrailGrid2">
              <label className="adField">
                <span className="adFieldLabel">{t("admin.trails.fields.duration")}</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="hdSearchInput adFieldInput"
                  value={form.durationHrs}
                  onChange={(e) => onChange("durationHrs", e.target.value)}
                  placeholder={t("admin.trails.placeholders.duration")}
                />
              </label>

              <label className="adField">
                <span className="adFieldLabel">{t("admin.trails.fields.distance")}</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="hdSearchInput adFieldInput"
                  value={form.distanceKm}
                  onChange={(e) => onChange("distanceKm", e.target.value)}
                  placeholder={t("admin.trails.placeholders.distance")}
                />
              </label>
            </div>

            <label className="adField">
              <span className="adFieldLabel">{t("admin.trails.fields.season")}</span>
              <input
                className="hdSearchInput adFieldInput"
                value={form.season}
                onChange={(e) => onChange("season", e.target.value)}
                placeholder={t("admin.trails.placeholders.season")}
              />
            </label>

            <label className="adField">
              <span className="adFieldLabel">{t("admin.trails.fields.tags")}</span>
              <input
                className="hdSearchInput adFieldInput"
                value={form.tags}
                onChange={(e) => onChange("tags", e.target.value)}
                placeholder={t("admin.trails.placeholders.tags")}
              />
            </label>

            <div className="adFormSectLabel">Media &amp; Sursă</div>

            <label className="adField">
              <span className="adFieldLabel">{t("admin.trails.fields.image")}</span>
              <div className="adTrailUpload">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="adHiddenInput"
                  onChange={onPickImage}
                />

                <div className={`adTrailImageFrame ${(form.image?.url || form.imageFallbackUrl) ? "has" : ""}`}>
                  {form.image?.url || form.imageFallbackUrl ? (
                    <img src={form.image?.url || form.imageFallbackUrl} alt="" />
                  ) : (
                    <div className="adTrailImageEmpty">
                      <ImagePlus size={18} />
                      <span>{t("admin.trails.imageEmpty")}</span>
                    </div>
                  )}
                </div>

                <div className="adTrailUploadActions">
                  <button
                    className="hdBtn"
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <UploadCloud size={16} />
                    {uploadingImage ? t("admin.trails.actions.uploadingImage") : t("admin.trails.actions.uploadImage")}
                  </button>

                  {form.image?.url ? (
                    <button className="hdBtn" type="button" disabled={uploadingImage} onClick={clearImage}>
                      <X size={16} /> {t("admin.trails.actions.removeImage")}
                    </button>
                  ) : null}
                </div>
              </div>
            </label>

            <label className="adField">
              <span className="adFieldLabel">{t("admin.trails.fields.imageFallbackUrl")}</span>
              <input
                className="hdSearchInput adFieldInput"
                value={form.imageFallbackUrl}
                onChange={(e) => onChange("imageFallbackUrl", e.target.value)}
                placeholder={t("admin.trails.placeholders.imageFallbackUrl")}
              />
            </label>

            <label className="adField">
              <span className="adFieldLabel">{t("admin.trails.fields.sourceUrl")}</span>
              <input
                className="hdSearchInput adFieldInput"
                value={form.sourceUrl}
                onChange={(e) => onChange("sourceUrl", e.target.value)}
                placeholder="https://..."
              />
            </label>

            <label className="adField">
              <span className="adFieldLabel">{t("admin.trails.fields.sourceLabel")}</span>
              <input
                className="hdSearchInput adFieldInput"
                value={form.sourceLabel}
                onChange={(e) => onChange("sourceLabel", e.target.value)}
                placeholder={t("admin.trails.placeholders.sourceLabel")}
              />
            </label>

            <div className="adFormSectLabel">Conținut</div>

            <label className="adField">
              <span className="adFieldLabel">{t("admin.trails.fields.summary")}</span>
              <textarea
                className="hdSearchInput adFieldTextarea"
                rows={4}
                value={form.summary}
                onChange={(e) => onChange("summary", e.target.value)}
                placeholder={t("admin.trails.placeholders.summary")}
              />
            </label>

            <label className="adTrailToggle">
              <input
                type="checkbox"
                checked={form.isVerified}
                onChange={(e) => onChange("isVerified", e.target.checked)}
              />
              <span>{t("admin.trails.fields.verified")}</span>
            </label>

            <div className="adTrailActions">
              <button className="hdBtn" type="button" onClick={onImport} disabled={importing}>
                <UploadCloud size={16} /> {importing ? t("admin.trails.actions.importing") : t("admin.trails.actions.importSeed")}
              </button>
              <button className="hdBtn hdBtnAccent" type="submit" disabled={saving}>
                <Save size={16} /> {saving ? t("admin.common.saving") : t("admin.common.save")}
              </button>
            </div>
          </form>
        </div>

        <div className="hdCard hdTable adTrailTable">
          <div className="hdCardTop">
            <div>
              <div className="hdCardLabel">{t("admin.trails.cardTitle")}</div>
              <div className="hdCardHint">{t("admin.common.resultsCount", { count: total, total })}</div>
            </div>

            <div className="hdToolbar">
              <select className="hdSelect" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">{t("admin.trails.status.all")}</option>
                <option value="draft">{t("admin.trails.status.draft")}</option>
                <option value="published">{t("admin.trails.status.published")}</option>
                <option value="archived">{t("admin.trails.status.archived")}</option>
              </select>

              <select className="hdSelect" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="all">{t("admin.trails.difficulty.all")}</option>
                <option value="Ușor">{t("trails.difficulty.Ușor")}</option>
                <option value="Mediu">{t("trails.difficulty.Mediu")}</option>
                <option value="Greu">{t("trails.difficulty.Greu")}</option>
              </select>

              <div className="adSearchWrap">
                <Search size={16} />
                <input
                  className="hdSearchInput adSearch"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("admin.trails.searchPlaceholder")}
                />
              </div>
            </div>
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
              {rows.map((trail) => (
                <article className="adRow adTrailRow" key={trail._id}>
                  <div className={`adTrailDiffBar adTrailDiffBar--${DIFF_BAR[trail.difficulty] || "mid"}`} />
                  <div className="adTrailCardMain">
                    <div className="adTrailThumb">
                      {trail.image?.url || trail.imageFallbackUrl ? (
                        <img src={trail.image?.url || trail.imageFallbackUrl} alt="" />
                      ) : (
                        <div className="adTrailThumbEmpty">
                          <Mountain size={20} />
                        </div>
                      )}
                    </div>

                    <div className="adTrailCopy">
                      <div className="adTrailNameRow">
                        <div className="adTrailNameWrap">
                          <div className="adTrailName">{trail.name}</div>
                          <div className="adTrailMeta">
                            <span className="adMetaItem">
                              <MapPin size={14} />
                              {trail.area}
                            </span>
                            {trail.seedId ? (
                              <span className="adMetaItem">
                                <Compass size={14} />
                                {trail.seedId}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="adTrailBadges">
                          <span className={`hdBadge tone-${statusTone(trail.status)}`}>
                            {t(`admin.trails.status.${trail.status}`)}
                          </span>
                          <span className={`hdBadge adDiffBadge adDiffBadge--${DIFF_BAR[trail.difficulty] || "mid"}`}>
                            {t(`trails.difficulty.${trail.difficulty}`, {
                              defaultValue: trail.difficulty,
                            })}
                          </span>
                          {trail.isVerified ? (
                            <span className="hdBadge tone-good">{t("admin.trails.badges.verified")}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="adTrailMeta adTrailMetaRich">
                        {formatMetaValue(trail.durationHrs, "h") ? (
                          <span className="adMetaItem">{formatMetaValue(trail.durationHrs, "h")}</span>
                        ) : null}
                        {formatMetaValue(trail.distanceKm, " km") ? (
                          <span className="adMetaItem">{formatMetaValue(trail.distanceKm, " km")}</span>
                        ) : null}
                        {trail.season ? <span className="adMetaItem">{trail.season}</span> : null}
                      </div>

                      {trail.summary ? <div className="adTrailSummary">{trail.summary}</div> : null}

                      <div className="adTrailTagRow">
                        {(trail.tags || []).slice(0, 5).map((tag) => (
                          <span key={tag} className="adTrailTag">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {trail.sourceUrl ? (
                        <a
                          className="adTrailSource"
                          href={trail.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={12} />
                          {trail.sourceLabel || t("admin.trails.sourceFallback")}
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="hdActionsCell adTrailButtons">
                    <button
                      className="hdBtn"
                      type="button"
                      onClick={() => {
                        setEditingId(trail._id);
                        setForm(formFromTrail(trail));
                      }}
                    >
                      {t("admin.trails.actions.edit")}
                    </button>

                    {trail.status === "published" ? (
                      <button className="hdBtn" type="button" onClick={() => quickSetStatus(trail, "draft")}>
                        <EyeOff size={16} /> {t("admin.trails.actions.unpublish")}
                      </button>
                    ) : (
                      <button
                        className="hdBtn hdBtnAccent"
                        type="button"
                        onClick={() => quickSetStatus(trail, "published")}
                      >
                        <Eye size={16} /> {t("admin.trails.actions.publish")}
                      </button>
                    )}

                    <button className="hdBtn" type="button" onClick={() => setDeleteTarget(trail)}>
                      <Trash2 size={16} /> {t("admin.trails.actions.delete")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="hdPager">
            <button className="hdBtn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {t("admin.common.back")}
            </button>
            <div className="hdCardHint">{t("admin.common.pageOf", { page, totalPages })}</div>
            <button
              className="hdBtn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("admin.common.next")}
            </button>
          </div>
        </div>
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t("admin.trails.confirm.title", { name: deleteTarget?.name || "" })}
        description={t("admin.trails.confirm.description")}
        confirmText={t("admin.trails.actions.delete")}
        cancelText={t("admin.common.cancel")}
        tone="danger"
        loading={deleting}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}
