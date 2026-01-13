// client/src/pages/Admin/AdminSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminPage from "./AdminPage";
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

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);

  // helper: update nested
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
          // merge defaults so missing keys don't break UI
          setSettings({
            moderation: { ...DEFAULTS.moderation, ...(res.settings.moderation || {}) },
            limits: { ...DEFAULTS.limits, ...(res.settings.limits || {}) },
            branding: { ...DEFAULTS.branding, ...(res.settings.branding || {}) },
          });
        }
      } catch (e) {
        toast.error("Nu am putut încărca setările", { description: e?.message || "Eroare" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const canSave = useMemo(() => {
    const m = settings?.moderation || {};
    const l = settings?.limits || {};
    const b = settings?.branding || {};

    const okReasonLen =
      Number.isFinite(Number(m.minRejectionReasonLength)) &&
      Number(m.minRejectionReasonLength) >= 0 &&
      Number(m.minRejectionReasonLength) <= 300;

    const okImg =
      Number.isFinite(Number(l.maxImagesPerListing)) &&
      Number(l.maxImagesPerListing) >= 1 &&
      Number(l.maxImagesPerListing) <= 200;

    const okListings =
      Number.isFinite(Number(l.maxListingsPerHost)) &&
      Number(l.maxListingsPerHost) >= 0 &&
      Number(l.maxListingsPerHost) <= 100000;

    const okEmail = String(b.supportEmail || "").length <= 120;
    const okMsg = String(b.maintenanceMessage || "").length <= 300;

    return okReasonLen && okImg && okListings && okEmail && okMsg;
  }, [settings]);

  const save = async () => {
    if (!canSave) {
      toast.error("Corectează valorile invalide înainte de Save.");
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
      toast.success("Salvat");
    } catch (e) {
      toast.error("Nu am putut salva", { description: e?.message || "Eroare" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title="Settings" subtitle="Control platformă">
      <div className="hdGrid adSettingsGrid">
        {/* Moderation */}
        <div className="hdCard">
          <div className="hdCardTop">
            <div>
              <div className="hdCardLabel">Moderation rules</div>
              <div className="hdCardHint">Ce are voie adminul + guardrails</div>
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
                title="Require submit to publish"
                hint="Admin poate aproba/pune live doar dacă listing-ul e trimis (pending)."
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.moderation.requireSubmitToPublish}
                    onChange={(e) => setPath("moderation.requireSubmitToPublish", e.target.checked)}
                  />
                }
              />

              <Row
                title="Allow admin unpublish"
                hint="Admin poate da jos un listing live (ex: reclamații)."
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.moderation.allowAdminUnpublish}
                    onChange={(e) => setPath("moderation.allowAdminUnpublish", e.target.checked)}
                  />
                }
              />

              <Row
                title="Allow admin reject"
                hint="Admin poate respinge listing-uri trimise (pending)."
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.moderation.allowAdminReject}
                    onChange={(e) => setPath("moderation.allowAdminReject", e.target.checked)}
                  />
                }
              />

              <Row
                title="Allow admin pause"
                hint="De obicei OFF. Pauza e acțiune de host; adminul unpublish, nu pause."
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.moderation.allowAdminPause}
                    onChange={(e) => setPath("moderation.allowAdminPause", e.target.checked)}
                  />
                }
              />

              <label className="adField">
                <div className="adFieldLabel">Min rejection reason length</div>
                <div className="adFieldHint">0–300. Se aplică în RejectReasonModal.</div>
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
              <div className="hdCardLabel">Limits</div>
              <div className="hdCardHint">Protecție resurse + reguli platformă</div>
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
                <div className="adFieldLabel">Max listings per host</div>
                <div className="adFieldHint">0 = unlimited</div>
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
                <div className="adFieldLabel">Max images per listing</div>
                <div className="adFieldHint">1–200</div>
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
              <div className="hdCardLabel">Branding & Maintenance</div>
              <div className="hdCardHint">Mesaje publice + support</div>
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
                <div className="adFieldLabel">Support email</div>
                <div className="adFieldHint">Apare în footer/mesaje.</div>
                <input
                  className="adInput"
                  value={settings.branding.supportEmail}
                  onChange={(e) => setPath("branding.supportEmail", e.target.value)}
                  placeholder="support@bucovinastay.ro"
                />
              </label>

              <Row
                title="Maintenance mode"
                hint="Dacă e ON: blochezi accesul public (except admin)."
                right={
                  <input
                    type="checkbox"
                    checked={!!settings.branding.maintenanceMode}
                    onChange={(e) => setPath("branding.maintenanceMode", e.target.checked)}
                  />
                }
              />

              <label className="adField">
                <div className="adFieldLabel">Maintenance message</div>
                <div className="adFieldHint">0–300 caractere</div>
                <textarea
                  className="adTextarea"
                  rows={4}
                  value={settings.branding.maintenanceMessage}
                  onChange={(e) => setPath("branding.maintenanceMessage", e.target.value)}
                  placeholder="Revenim imediat. Mulțumim!"
                />
              </label>

              <div className="adActions">
                <button className="hdBtn" type="button" disabled={!canSave || saving} onClick={save}>
                  {saving ? "Saving..." : "Save settings"}
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
