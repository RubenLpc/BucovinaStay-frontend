import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminPage from "./AdminPage";
import { adminGetSettings, adminSaveSettings } from "../../api/adminService";
import { useTranslation } from "react-i18next";

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

export default function AdminSettings() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);

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
          setSettings({
            moderation: { ...DEFAULTS.moderation, ...(res.settings.moderation || {}) },
            limits: { ...DEFAULTS.limits, ...(res.settings.limits || {}) },
            branding: { ...DEFAULTS.branding, ...(res.settings.branding || {}) },
          });
        }
      } catch (e) {
        toast.error(t("admin.settings.toastLoadFailTitle"), { description: e?.message || t("admin.common.error") });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [t]);

  const canSave = useMemo(() => {
    const m = settings?.moderation || {};
    const l = settings?.limits || {};
    const b = settings?.branding || {};

    const okReasonLen = Number.isFinite(Number(m.minRejectionReasonLength)) && Number(m.minRejectionReasonLength) >= 0 && Number(m.minRejectionReasonLength) <= 300;
    const okImg = Number.isFinite(Number(l.maxImagesPerListing)) && Number(l.maxImagesPerListing) >= 1 && Number(l.maxImagesPerListing) <= 200;
    const okListings = Number.isFinite(Number(l.maxListingsPerHost)) && Number(l.maxListingsPerHost) >= 0 && Number(l.maxListingsPerHost) <= 100000;
    const okEmail = String(b.supportEmail || "").length <= 120;
    const okMsg = String(b.maintenanceMessage || "").length <= 300;

    return okReasonLen && okImg && okListings && okEmail && okMsg;
  }, [settings]);

  const save = async () => {
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
      await adminSaveSettings(payload);
      toast.success(t("admin.settings.toastSavedTitle"));
    } catch (e) {
      toast.error(t("admin.settings.toastSaveFailTitle"), { description: e?.message || t("admin.common.error") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage titleKey="admin.settings.pageTitle" subtitleKey="admin.settings.pageSubtitle">
      <div className="hdGrid adSettingsGrid">
        {/* Moderation */}
        <div className="hdCard">
          <div className="hdCardTop">
            <div>
              <div className="hdCardLabel">{t("admin.settings.sections.moderation.title")}</div>
              <div className="hdCardHint">{t("admin.settings.sections.moderation.hint")}</div>
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
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.moderation.requireSubmitToPublish}
                    onChange={(e) => setPath("moderation.requireSubmitToPublish", e.target.checked)}
                  />
                }
              />

              <Row
                title={t("admin.settings.moderation.allowUnpublish.title")}
                hint={t("admin.settings.moderation.allowUnpublish.hint")}
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.moderation.allowAdminUnpublish}
                    onChange={(e) => setPath("moderation.allowAdminUnpublish", e.target.checked)}
                  />
                }
              />

              <Row
                title={t("admin.settings.moderation.allowReject.title")}
                hint={t("admin.settings.moderation.allowReject.hint")}
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.moderation.allowAdminReject}
                    onChange={(e) => setPath("moderation.allowAdminReject", e.target.checked)}
                  />
                }
              />

              <Row
                title={t("admin.settings.moderation.allowPause.title")}
                hint={t("admin.settings.moderation.allowPause.hint")}
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.moderation.allowAdminPause}
                    onChange={(e) => setPath("moderation.allowAdminPause", e.target.checked)}
                  />
                }
              />

              <label className="adField">
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
              </label>
            </div>
          )}
        </div>

        {/* Limits */}
        <div className="hdCard">
          <div className="hdCardTop">
            <div>
              <div className="hdCardLabel">{t("admin.settings.sections.limits.title")}</div>
              <div className="hdCardHint">{t("admin.settings.sections.limits.hint")}</div>
            </div>
          </div>

          {loading ? (
            <div className="hdSkeleton">
              <div className="skLine" />
              <div className="skLine" />
            </div>
          ) : (
            <div className="adForm">
              <label className="adField">
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
              </label>

              <label className="adField">
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
              </label>
            </div>
          )}
        </div>

        {/* Branding / Maintenance */}
        <div className="hdCard">
          <div className="hdCardTop">
            <div>
              <div className="hdCardLabel">{t("admin.settings.sections.branding.title")}</div>
              <div className="hdCardHint">{t("admin.settings.sections.branding.hint")}</div>
            </div>
          </div>

          {loading ? (
            <div className="hdSkeleton">
              <div className="skLine" />
              <div className="skLine" />
            </div>
          ) : (
            <div className="adForm">
              <label className="adField">
                <div className="adFieldLabel">{t("admin.settings.branding.supportEmail.title")}</div>
                <div className="adFieldHint">{t("admin.settings.branding.supportEmail.hint")}</div>
                <input
                  className="adInput"
                  value={settings.branding.supportEmail}
                  onChange={(e) => setPath("branding.supportEmail", e.target.value)}
                  placeholder={t("admin.settings.branding.supportEmail.placeholder")}
                />
              </label>

              <Row
                title={t("admin.settings.branding.maintenanceMode.title")}
                hint={t("admin.settings.branding.maintenanceMode.hint")}
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.branding.maintenanceMode}
                    onChange={(e) => setPath("branding.maintenanceMode", e.target.checked)}
                  />
                }
              />

              <label className="adField">
                <div className="adFieldLabel">{t("admin.settings.branding.maintenanceMsg.title")}</div>
                <div className="adFieldHint">{t("admin.settings.branding.maintenanceMsg.hint")}</div>
                <textarea
                  className="adTextarea"
                  rows={4}
                  value={settings.branding.maintenanceMessage}
                  onChange={(e) => setPath("branding.maintenanceMessage", e.target.value)}
                  placeholder={t("admin.settings.branding.maintenanceMsg.placeholder")}
                />
              </label>

              <div className="adActions">
                <button className="hdBtn" type="button" disabled={!canSave || saving} onClick={save}>
                  {saving ? t("admin.common.saving") : t("admin.common.save")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
