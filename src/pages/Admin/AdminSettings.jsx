import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Gauge, Wrench, History, TriangleAlert, CheckCircle2, CircleAlert } from "lucide-react";
import AdminPage from "./AdminPage";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { adminGetSettings, adminSaveSettings } from "../../api/adminService";

const DEFAULTS = {
  moderation: {
    requireSubmitToPublish: true,
    allowAdminPause: false,
    allowAdminReject: true,
    allowAdminUnpublish: true,
    minRejectionReasonLength: 10,
  },
  limits: {
    maxListingsPerHost: 0,
    maxImagesPerListing: 20,
  },
  branding: {
    supportEmail: "",
    maintenanceMode: false,
    maintenanceMessage: "",
  },
};

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSettings(src) {
  return {
    moderation: { ...DEFAULTS.moderation, ...(src?.moderation || {}) },
    limits: { ...DEFAULTS.limits, ...(src?.limits || {}) },
    branding: { ...DEFAULTS.branding, ...(src?.branding || {}) },
  };
}

function supportEmailValid(v) {
  if (!String(v || "").trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

export default function AdminSettings() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);
  const [initialSettings, setInitialSettings] = useState(DEFAULTS);
  const [meta, setMeta] = useState({ updatedAt: "", updatedBy: null, changeLog: [] });
  const [confirmSave, setConfirmSave] = useState(false);

  const setPath = (path, value) => {
    const [a, b] = path.split(".");
    setSettings((s) => ({
      ...s,
      [a]: { ...(s[a] || {}), [b]: value },
    }));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await adminGetSettings();
        if (!alive) return;
        if (res?.settings) {
          const normalized = normalizeSettings(res.settings);
          setSettings(normalized);
          setInitialSettings(normalized);
          setMeta({
            updatedAt: res.settings.updatedAt || "",
            updatedBy: res.settings.updatedBy || null,
            changeLog: res.settings.changeLog || [],
          });
        }
      } catch (e) {
        toast.error(t("admin.settings.toastLoadFailTitle"), { description: e?.message || t("admin.common.error") });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  const errors = useMemo(() => {
    const m = settings?.moderation || {};
    const l = settings?.limits || {};
    const b = settings?.branding || {};
    return {
      supportEmail:
        String(b.supportEmail || "").length > 120 || !supportEmailValid(b.supportEmail),
      minRejectionReasonLength:
        !Number.isFinite(Number(m.minRejectionReasonLength)) ||
        Number(m.minRejectionReasonLength) < 0 ||
        Number(m.minRejectionReasonLength) > 300,
      maxListingsPerHost:
        !Number.isFinite(Number(l.maxListingsPerHost)) ||
        Number(l.maxListingsPerHost) < 0 ||
        Number(l.maxListingsPerHost) > 100000,
      maxImagesPerListing:
        !Number.isFinite(Number(l.maxImagesPerListing)) ||
        Number(l.maxImagesPerListing) < 1 ||
        Number(l.maxImagesPerListing) > 200,
      maintenanceMessage: String(b.maintenanceMessage || "").length > 300,
    };
  }, [settings]);

  const canSave = useMemo(
    () => !Object.values(errors).some(Boolean),
    [errors]
  );

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initialSettings),
    [initialSettings, settings]
  );

  const hasCriticalChanges = useMemo(() => {
    return (
      settings.branding.maintenanceMode !== initialSettings.branding.maintenanceMode ||
      settings.moderation.requireSubmitToPublish !== initialSettings.moderation.requireSubmitToPublish ||
      settings.moderation.allowAdminReject !== initialSettings.moderation.allowAdminReject ||
      settings.moderation.allowAdminUnpublish !== initialSettings.moderation.allowAdminUnpublish ||
      settings.moderation.allowAdminPause !== initialSettings.moderation.allowAdminPause
    );
  }, [initialSettings, settings]);

  const performSave = async () => {
    if (!canSave) {
      toast.error(t("admin.settings.toastInvalidTitle"), {
        description: t("admin.settings.toastInvalidDesc"),
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        moderation: {
          ...settings.moderation,
          minRejectionReasonLength: num(settings.moderation.minRejectionReasonLength, 10),
        },
        limits: {
          ...settings.limits,
          maxListingsPerHost: num(settings.limits.maxListingsPerHost, 0),
          maxImagesPerListing: num(settings.limits.maxImagesPerListing, 20),
        },
        branding: {
          ...settings.branding,
        },
      };
      const res = await adminSaveSettings(payload);
      const normalized = normalizeSettings(res?.settings || payload);
      setSettings(normalized);
      setInitialSettings(normalized);
      setMeta({
        updatedAt: res?.settings?.updatedAt || "",
        updatedBy: res?.settings?.updatedBy || null,
        changeLog: res?.settings?.changeLog || [],
      });
      toast.success(t("admin.settings.toastSavedTitle"));
    } catch (e) {
      toast.error(t("admin.settings.toastSaveFailTitle"), { description: e?.message || t("admin.common.error") });
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (hasCriticalChanges) {
      setConfirmSave(true);
      return;
    }
    await performSave();
  };

  const reset = () => setSettings(initialSettings);

  const formatDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminPage titleKey="admin.settings.pageTitle" subtitleKey="admin.settings.pageSubtitle">
      <div className="hdCard adSettingsHero">
        <div className="adSettingsHeroTop">
          <div>
            <div className="adSettingsHeroTitle">{t("admin.settings.ui.title")}</div>
            <div className="adSettingsHeroHint">{t("admin.settings.ui.hint")}</div>
          </div>
          <div className="adSettingsHeroBadges">
            <span className={`adSettingsPill ${isDirty ? "warn" : "good"}`}>
              {isDirty ? <CircleAlert size={14} /> : <CheckCircle2 size={14} />}
              {isDirty ? t("admin.settings.ui.unsaved") : t("admin.settings.ui.saved")}
            </span>
            {hasCriticalChanges ? (
              <span className="adSettingsPill danger">
                <TriangleAlert size={14} />
                {t("admin.settings.ui.critical")}
              </span>
            ) : null}
            {settings.branding.maintenanceMode ? (
              <span className="adSettingsPill danger">
                <TriangleAlert size={14} />
                {t("admin.settings.ui.maintenanceOn")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="adSettingsMetaRow">
          <div className="adSettingsMetaBox">
            <div className="adSettingsMetaLabel">{t("admin.settings.audit.lastUpdate")}</div>
            <div className="adSettingsMetaValue">
              {formatDateTime(meta.updatedAt)}
              {meta.updatedBy?.name ? ` • ${meta.updatedBy.name}` : ""}
            </div>
          </div>
          <div className="adSettingsMetaBox">
            <div className="adSettingsMetaLabel">{t("admin.settings.ui.readiness")}</div>
            <div className="adSettingsMetaValue">
              {canSave ? t("admin.settings.ui.ready") : t("admin.settings.ui.needsFix")}
            </div>
          </div>
        </div>
      </div>

      <div className="hdGrid adSettingsGrid">
        <section className="hdCard adSettingsCard">
          <div className="hdCardTop">
            <div className="adSectionLead">
              <div className="adSectionIcon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="hdCardLabel">{t("admin.settings.sections.moderation.title")}</div>
                <div className="hdCardHint">{t("admin.settings.sections.moderation.hint")}</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="hdSkeleton">
              <div className="skLine" />
              <div className="skLine" />
              <div className="skLine" />
            </div>
          ) : (
            <div className="adForm">
              <Row
                title={t("admin.settings.moderation.requireSubmit.title")}
                hint={t("admin.settings.moderation.requireSubmit.hint")}
                right={<Toggle checked={!!settings.moderation.requireSubmitToPublish} onChange={(v) => setPath("moderation.requireSubmitToPublish", v)} />}
              />

              <Row
                title={t("admin.settings.moderation.allowUnpublish.title")}
                hint={t("admin.settings.moderation.allowUnpublish.hint")}
                right={<Toggle checked={!!settings.moderation.allowAdminUnpublish} onChange={(v) => setPath("moderation.allowAdminUnpublish", v)} />}
              />

              <Row
                title={t("admin.settings.moderation.allowReject.title")}
                hint={t("admin.settings.moderation.allowReject.hint")}
                right={<Toggle checked={!!settings.moderation.allowAdminReject} onChange={(v) => setPath("moderation.allowAdminReject", v)} />}
              />

              <Row
                title={t("admin.settings.moderation.allowPause.title")}
                hint={t("admin.settings.moderation.allowPause.hint")}
                right={<Toggle checked={!!settings.moderation.allowAdminPause} onChange={(v) => setPath("moderation.allowAdminPause", v)} />}
              />

              <label className={`adField ${errors.minRejectionReasonLength ? "isInvalid" : ""}`}>
                <div className="adFieldLabel">{t("admin.settings.moderation.minReason.title")}</div>
                <div className="adFieldHint">{t("admin.settings.moderation.minReason.hint")}</div>
                <input
                  className="adInput"
                  type="number"
                  min={0}
                  max={300}
                  value={settings.moderation.minRejectionReasonLength}
                  onChange={(e) => setPath("moderation.minRejectionReasonLength", e.target.value)}
                />
                {errors.minRejectionReasonLength ? <div className="adFieldError">{t("admin.settings.ui.invalidRange")}</div> : null}
              </label>
            </div>
          )}
        </section>

        <section className="hdCard adSettingsCard">
          <div className="hdCardTop">
            <div className="adSectionLead">
              <div className="adSectionIcon">
                <Gauge size={18} />
              </div>
              <div>
                <div className="hdCardLabel">{t("admin.settings.sections.limits.title")}</div>
                <div className="hdCardHint">{t("admin.settings.sections.limits.hint")}</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="hdSkeleton">
              <div className="skLine" />
              <div className="skLine" />
            </div>
          ) : (
            <div className="adForm">
              <label className={`adField ${errors.maxListingsPerHost ? "isInvalid" : ""}`}>
                <div className="adFieldLabel">{t("admin.settings.limits.maxListings.title")}</div>
                <div className="adFieldHint">{t("admin.settings.limits.maxListings.hint")}</div>
                <input
                  className="adInput"
                  type="number"
                  min={0}
                  max={100000}
                  value={settings.limits.maxListingsPerHost}
                  onChange={(e) => setPath("limits.maxListingsPerHost", e.target.value)}
                />
                {errors.maxListingsPerHost ? <div className="adFieldError">{t("admin.settings.ui.invalidRange")}</div> : null}
              </label>

              <label className={`adField ${errors.maxImagesPerListing ? "isInvalid" : ""}`}>
                <div className="adFieldLabel">{t("admin.settings.limits.maxImages.title")}</div>
                <div className="adFieldHint">{t("admin.settings.limits.maxImages.hint")}</div>
                <input
                  className="adInput"
                  type="number"
                  min={1}
                  max={200}
                  value={settings.limits.maxImagesPerListing}
                  onChange={(e) => setPath("limits.maxImagesPerListing", e.target.value)}
                />
                {errors.maxImagesPerListing ? <div className="adFieldError">{t("admin.settings.ui.invalidRange")}</div> : null}
              </label>
            </div>
          )}
        </section>

        <section className={`hdCard adSettingsCard ${settings.branding.maintenanceMode ? "adSettingsCardDanger" : ""}`}>
          <div className="hdCardTop">
            <div className="adSectionLead">
              <div className="adSectionIcon isDanger">
                <Wrench size={18} />
              </div>
              <div>
                <div className="hdCardLabel">{t("admin.settings.sections.branding.title")}</div>
                <div className="hdCardHint">{t("admin.settings.sections.branding.hint")}</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="hdSkeleton">
              <div className="skLine" />
              <div className="skLine" />
            </div>
          ) : (
            <div className="adForm">
              <label className={`adField ${errors.supportEmail ? "isInvalid" : ""}`}>
                <div className="adFieldLabel">{t("admin.settings.branding.supportEmail.title")}</div>
                <div className="adFieldHint">{t("admin.settings.branding.supportEmail.hint")}</div>
                <input
                  className="adInput"
                  type="email"
                  value={settings.branding.supportEmail}
                  onChange={(e) => setPath("branding.supportEmail", e.target.value)}
                  placeholder={t("admin.settings.branding.supportEmail.placeholder")}
                />
                {errors.supportEmail ? <div className="adFieldError">{t("admin.settings.ui.invalidEmail")}</div> : null}
              </label>

              <div className="adDangerZone">
                <Row
                  title={t("admin.settings.branding.maintenanceMode.title")}
                  hint={t("admin.settings.branding.maintenanceMode.hint")}
                  right={<Toggle checked={!!settings.branding.maintenanceMode} onChange={(v) => setPath("branding.maintenanceMode", v)} tone="danger" />}
                />
              </div>

              <label className={`adField ${errors.maintenanceMessage ? "isInvalid" : ""}`}>
                <div className="adFieldLabel">{t("admin.settings.branding.maintenanceMsg.title")}</div>
                <div className="adFieldHint">{t("admin.settings.branding.maintenanceMsg.hint")}</div>
                <textarea
                  className="adTextarea"
                  rows={4}
                  value={settings.branding.maintenanceMessage}
                  onChange={(e) => setPath("branding.maintenanceMessage", e.target.value)}
                  placeholder={t("admin.settings.branding.maintenanceMsg.placeholder")}
                />
                <div className="adFieldCounter">{String(settings.branding.maintenanceMessage || "").length}/300</div>
                {errors.maintenanceMessage ? <div className="adFieldError">{t("admin.settings.ui.messageTooLong")}</div> : null}
              </label>
            </div>
          )}
        </section>

        <section className="hdCard adSettingsCard">
          <div className="hdCardTop">
            <div className="adSectionLead">
              <div className="adSectionIcon">
                <History size={18} />
              </div>
              <div>
                <div className="hdCardLabel">{t("admin.settings.sections.audit.title")}</div>
                <div className="hdCardHint">{t("admin.settings.sections.audit.hint")}</div>
              </div>
            </div>
          </div>

          <div className="adAuditMeta">
            <div className="adAuditMetaTitle">{t("admin.settings.audit.lastUpdate")}</div>
            <div className="adAuditMetaText">
              {formatDateTime(meta.updatedAt)}
              {meta.updatedBy?.name ? ` • ${meta.updatedBy.name}` : ""}
            </div>
          </div>

          <div className="adAuditList">
            {(meta.changeLog || []).length === 0 ? (
              <div className="hdEmpty">{t("admin.settings.audit.empty")}</div>
            ) : (
              meta.changeLog.map((entry, idx) => (
                <div className="adAuditItem" key={`${entry.changedAt || "x"}-${idx}`}>
                  <div className="adAuditItemTop">
                    <div className="adAuditWho">{entry.changedBy?.name || t("admin.settings.audit.system")}</div>
                    <div className="adAuditWhen">{formatDateTime(entry.changedAt)}</div>
                  </div>
                  <div className="adAuditChanges">{(entry.changes || []).join(" • ")}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="hdCard adSettingsFooter">
        <div className="adSettingsFooterText">
          <div className="adSettingsFooterTitle">{t("admin.settings.ui.footerTitle")}</div>
          <div className="adSettingsFooterHint">
            {!canSave ? t("admin.settings.ui.needsFix") : isDirty ? t("admin.settings.ui.footerDirty") : t("admin.settings.ui.footerClean")}
          </div>
        </div>
        <div className="adActions">
          <button className="hdBtn" type="button" disabled={!isDirty || saving} onClick={reset}>
            {t("admin.settings.actions.reset")}
          </button>
          <button className="hdBtn hdBtnAccent" type="button" disabled={!canSave || !isDirty || saving} onClick={save}>
            {saving ? t("admin.common.saving") : t("admin.common.save")}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmSave}
        title={t("admin.settings.confirm.title")}
        description={t("admin.settings.confirm.description")}
        confirmText={t("admin.common.save")}
        cancelText={t("admin.common.cancel")}
        tone="danger"
        loading={saving}
        onClose={() => {
          if (saving) return;
          setConfirmSave(false);
        }}
        onConfirm={async () => {
          await performSave();
          setConfirmSave(false);
        }}
      />
    </AdminPage>
  );
}

function Row({ title, hint, right }) {
  return (
    <div className="adRowLine">
      <div>
        <div className="adRowTitle">{title}</div>
        <div className="adRowHint">{hint}</div>
      </div>
      <div className="adRowRight">{right}</div>
    </div>
  );
}

function Toggle({ checked, onChange, tone = "default" }) {
  return (
    <button
      type="button"
      className={`adToggle tone-${tone} ${checked ? "isOn" : ""}`}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="adToggleTrack">
        <span className="adToggleKnob" />
      </span>
      <span className="adToggleLabel">{checked ? "ON" : "OFF"}</span>
    </button>
  );
}
