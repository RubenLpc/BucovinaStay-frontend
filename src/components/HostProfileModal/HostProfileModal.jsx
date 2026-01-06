import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Image as ImageIcon, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { hostProfileService } from "../../api/hostProfileService";
import "./HostProfileModal.css";

const TIME_BUCKETS = [
  { key: "within_hour", label: "Într-o oră" },
  { key: "within_day", label: "În aceeași zi" },
  { key: "few_days", label: "În câteva zile" },
  { key: "unknown", label: "Necunoscut" },
];

export default function HostProfileModal({ open, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState(null);

  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const res = await hostProfileService.getMyHostProfile();
        setProfile(res?.hostProfile || null);
      } catch (e) {
        toast.error("Nu am putut încărca profilul");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const canSave = useMemo(() => {
    const dn = profile?.displayName?.trim() || "";
    return dn.length >= 2 && !saving && !uploading;
  }, [profile, saving, uploading]);

  const pickAvatar = () => fileRef.current?.click();

  async function uploadAvatar(file) {
    const sig = await hostProfileService.getCloudinarySignature({ folder: "host_avatars" });
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
    return data.secure_url;
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const avatarUrl = await uploadAvatar(file);
      setProfile((p) => ({ ...(p || {}), avatarUrl }));
      toast.success("Avatar încărcat");
    } catch (err) {
      toast.error("Nu am putut încărca avatarul", { description: err?.message || "Eroare upload" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function save() {
    if (!canSave) {
      toast.error("Completează numele de afișare (minim 2 caractere).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        displayName: profile.displayName?.trim(),
        avatarUrl: profile.avatarUrl || "",
        bio: profile.bio || "",
        languages: Array.isArray(profile.languages) ? profile.languages : [],
        responseTimeBucket: profile.responseTimeBucket || "unknown",
      };

      const res = await hostProfileService.patchMy(payload);
      toast.success("Profil salvat");
      onSaved?.(res?.hostProfile);
      onClose?.();
    } catch (e) {
      toast.error("Nu am putut salva profilul");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <button className="hpBackdrop" onClick={onClose} aria-label="Închide" />
      <div className="hpModal" role="dialog" aria-modal="true">
        <div className="hpTop">
          <div>
            <div className="hpTitle">Completează profilul de gazdă</div>
            <div className="hpSub">Necesită minim un nume de afișare. Recomand avatar + bio (crește conversia).</div>
          </div>
          <button className="hpIconBtn" onClick={onClose} type="button" aria-label="Închide">
            <X size={16} />
          </button>
        </div>

        <div className="hpBody">
          {loading ? (
            <div className="hpSkeleton">
              <div className="hpSkLine" />
              <div className="hpSkLine" />
              <div className="hpSkLine" />
            </div>
          ) : (
            <>
              <div className="hpGrid">
                <div className="hpCard">
                  <div className="hpCardLabel">Avatar</div>

                  <div className="hpAvatarRow">
                    <div
                      className="hpAvatar"
                      style={{
                        backgroundImage: profile?.avatarUrl ? `url(${profile.avatarUrl})` : undefined,
                      }}
                    >
                      {!profile?.avatarUrl && <ImageIcon size={18} />}
                    </div>

                    <div className="hpAvatarMeta">
                      <div className="hpAvatarName">{profile?.displayName?.trim() || "Gazdă"}</div>
                      <div className="hpHint">Poză clară, ideal față / logo pensiune.</div>

                      <div className="hpAvatarActions">
                        <button className="hpBtn" type="button" onClick={pickAvatar} disabled={uploading}>
                          <ImageIcon size={16} />
                          {uploading ? "Upload..." : "Încarcă"}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hpHidden" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hpCard">
                  <div className="hpCardLabel">Date publice</div>

                  <label className="hpLabel">Nume afișat *</label>
                  <input
                    className="hpInput"
                    value={profile?.displayName || ""}
                    onChange={(e) => setProfile((p) => ({ ...(p || {}), displayName: e.target.value }))}
                    placeholder="Ex: Cabana Bucovina Stay"
                  />

                  <label className="hpLabel">Bio</label>
                  <textarea
                    className="hpInput hpTextarea"
                    value={profile?.bio || ""}
                    onChange={(e) => setProfile((p) => ({ ...(p || {}), bio: e.target.value }))}
                    placeholder="Spune pe scurt ce oferi, ce te diferențiază, reguli, vibe..."
                    maxLength={1200}
                  />

                  <div className="hpRow2">
                    <div>
                      <label className="hpLabel">Timp de răspuns</label>
                      <select
                        className="hpInput"
                        value={profile?.responseTimeBucket || "unknown"}
                        onChange={(e) => setProfile((p) => ({ ...(p || {}), responseTimeBucket: e.target.value }))}
                      >
                        {TIME_BUCKETS.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="hpCallout">
                      <ShieldCheck size={16} />
                      <div>
                        <div className="hpCalloutTitle">Tip pro</div>
                        <div className="hpCalloutText">Profil complet = încredere mai mare = click-uri mai multe.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hpFooter">
                <button className="hpBtn" type="button" onClick={onClose}>
                  Renunță
                </button>

                <button className="hpBtn hpBtnAccent" type="button" onClick={save} disabled={!canSave}>
                  <Save size={16} />
                  {saving ? "Se salvează..." : "Salvează"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
