import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { hostProfileService } from "../../api/hostProfileService";
import { hostSettingsService } from "../../api/hostSettingsService";
import { authService } from "../../api/authService";
import "./HostSettings.css";
import { useSettingsStore } from "../../stores/settingsStore";

import {
  User, Bell, SlidersHorizontal, Shield, Save,
  Image as ImageIcon, KeyRound, ExternalLink, Loader2,
  ShieldCheck, Eye, EyeOff, Trash2,
} from "lucide-react";

const TABS = [
  { key: "profile",       label: "Profil",      Icon: User },
  { key: "notifications", label: "Notificări",   Icon: Bell },
  { key: "preferences",  label: "Preferințe",   Icon: SlidersHorizontal },
  { key: "security",     label: "Securitate",   Icon: Shield },
];

const TIME_BUCKETS = [
  { key: "within_hour", label: "Într-o oră" },
  { key: "within_day",  label: "În aceeași zi" },
  { key: "few_days",    label: "În câteva zile" },
  { key: "unknown",     label: "Necunoscut" },
];

const TIMEZONES = [
  { value: "Europe/Bucharest", label: "Europe/Bucharest (România)" },
  { value: "Europe/London",    label: "Europe/London (UK)" },
  { value: "Europe/Paris",     label: "Europe/Paris (FR)" },
  { value: "Europe/Berlin",    label: "Europe/Berlin (DE)" },
  { value: "Europe/Rome",      label: "Europe/Rome (IT)" },
  { value: "UTC",              label: "UTC" },
];

const MAX_AVATAR_MB = 5;

function clampStr(s, max = 1200) {
  const x = String(s ?? "");
  return x.length > max ? x.slice(0, max) : x;
}

function safeJsonEqual(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

function normalizeProfile(p) {
  return {
    displayName:        String(p?.displayName ?? ""),
    avatarUrl:          String(p?.avatarUrl ?? ""),
    bio:                String(p?.bio ?? ""),
    languages:          Array.isArray(p?.languages) ? [...p.languages].map(String).sort() : [],
    responseTimeBucket: String(p?.responseTimeBucket ?? "unknown"),
  };
}

function normalizeSettings(s) {
  return {
    notifications: {
      messages:      !!s?.notifications?.messages,
      listingStatus: !!s?.notifications?.listingStatus,
      weeklyReport:  !!s?.notifications?.weeklyReport,
      marketing:     !!s?.notifications?.marketing,
    },
    preferences: {
      currency:     String(s?.preferences?.currency ?? "RON"),
      locale:       String(s?.preferences?.locale ?? "ro-RO"),
      timezone:     String(s?.preferences?.timezone ?? "Europe/Bucharest"),
      reduceMotion: !!s?.preferences?.reduceMotion,
    },
  };
}

function passwordStrength(pwd) {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8)            score++;
  if (pwd.length >= 12)           score++;
  if (/[A-Z]/.test(pwd))          score++;
  if (/[0-9]/.test(pwd))          score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;
  if (score <= 1) return { level: "weak",   label: "Slabă",     color: "#dc2626" };
  if (score <= 3) return { level: "medium", label: "Medie",     color: "#d97706" };
  return          { level: "strong", label: "Puternică", color: "#059669" };
}

export default function HostSettings() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();

  // toate hook-urile ÎNAINTE de orice return condiționat
  const [tab,            setTab]            = useState("profile");
  const [loading,        setLoading]        = useState(true);
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar,setUploadingAvatar]= useState(false);

  // show/hide password
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });

  const fileRef = useRef(null);

  const [profile, setProfile] = useState(normalizeProfile({
    displayName: "", avatarUrl: "", bio: "", languages: [], responseTimeBucket: "unknown",
  }));

  const [settings, setSettings] = useState(normalizeSettings({
    notifications: { messages: true, listingStatus: true, weeklyReport: false, marketing: false },
    preferences:   { currency: "RON", locale: "ro-RO", timezone: "Europe/Bucharest", reduceMotion: false },
  }));

  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const [initialProfile,  setInitialProfile]  = useState(null);
  const [initialSettings, setInitialSettings] = useState(null);

  const dirtyProfile  = useMemo(() => {
    if (!initialProfile) return false;
    return !safeJsonEqual(normalizeProfile(initialProfile), normalizeProfile(profile));
  }, [initialProfile, profile]);

  const dirtySettings = useMemo(() => {
    if (!initialSettings) return false;
    return !safeJsonEqual(normalizeSettings(initialSettings), normalizeSettings(settings));
  }, [initialSettings, settings]);

  const pwdStrength  = useMemo(() => passwordStrength(pwd.newPassword), [pwd.newPassword]);
  const pwdMismatch  = pwd.confirmPassword.length > 0 && pwd.newPassword !== pwd.confirmPassword;

  // fix: dependency pe user._id, nu pe displayName
  useEffect(() => {
    if (!user?._id) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const [p, s] = await Promise.all([
          hostProfileService.getMyHostProfile(),
          hostSettingsService.getMy(),
        ]);
        if (!alive) return;

        const hp = p?.hostProfile || {};
        const nextProfile = normalizeProfile({
          displayName:        hp.displayName || displayName,
          avatarUrl:          hp.avatarUrl || "",
          bio:                hp.bio || "",
          languages:          Array.isArray(hp.languages) ? hp.languages : [],
          responseTimeBucket: hp.responseTimeBucket || "unknown",
        });
        setProfile(nextProfile);
        setInitialProfile(nextProfile);

        const hs = s?.settings || s || {};
        const nextSettings = normalizeSettings({ notifications: hs?.notifications, preferences: hs?.preferences });
        setSettings(nextSettings);
        setInitialSettings(nextSettings);
      } catch (e) {
        toast.error("Nu am putut încărca setările", { description: e?.message || "Eroare" });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickAvatar = () => fileRef.current?.click();

  async function uploadAvatar(file) {
    const sig = await hostProfileService.getCloudinarySignature({ folder: "host_avatars" });
    const fd  = new FormData();
    fd.append("file", file);
    fd.append("api_key",   sig.apiKey);
    fd.append("timestamp", sig.timestamp);
    fd.append("signature", sig.signature);
    fd.append("folder",    sig.folder);

    const res  = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Upload eșuat");
    return data.secure_url;
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // validare client-side
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tip de fișier invalid", { description: "Acceptăm JPG, PNG, WEBP sau GIF." });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast.error(`Fișier prea mare`, { description: `Maxim ${MAX_AVATAR_MB}MB.` });
      e.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadAvatar(file);
      setProfile((p) => normalizeProfile({ ...p, avatarUrl }));
      toast.success("Avatar încărcat — salvează pentru a aplica.");
    } catch (err) {
      toast.error("Upload eșuat", { description: err?.message });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  function removeAvatar() {
    setProfile((p) => normalizeProfile({ ...p, avatarUrl: "" }));
    toast.info("Avatar eliminat — salvează pentru a aplica.");
  }

  const saveProfile = async () => {
    const dn = (profile.displayName || "").trim();
    if (dn.length < 2) { toast.error("Completează numele (min 2 caractere)."); return; }

    setSavingProfile(true);
    try {
      const payload = normalizeProfile({
        displayName:        clampStr(dn, 60),
        avatarUrl:          clampStr(profile.avatarUrl, 800).trim(),
        bio:                clampStr(profile.bio, 1200),
        languages:          Array.isArray(profile.languages) ? profile.languages.slice(0, 10) : [],
        responseTimeBucket: profile.responseTimeBucket || "unknown",
      });
      const res = await hostProfileService.patchMy(payload);
      const hp  = res?.hostProfile || {};
      const mapped = normalizeProfile({
        displayName:        hp.displayName        ?? payload.displayName,
        avatarUrl:          hp.avatarUrl          ?? payload.avatarUrl,
        bio:                hp.bio                ?? payload.bio,
        languages:          Array.isArray(hp.languages) ? hp.languages : payload.languages,
        responseTimeBucket: hp.responseTimeBucket ?? payload.responseTimeBucket,
      });
      setProfile(mapped);
      setInitialProfile(mapped);
      toast.success("Profil salvat");
    } catch (e) {
      toast.error("Eroare", { description: e?.message || "Nu am putut salva profilul." });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload  = normalizeSettings(settings);
      const res      = await hostSettingsService.patchMy(payload);
      const returned = res?.settings || res || payload;
      const next     = normalizeSettings(returned);
      setSettings(next);
      setInitialSettings(next);
      useSettingsStore.getState().apply(returned);
      toast.success("Setări salvate");
    } catch (e) {
      toast.error("Eroare", { description: e?.message || "Nu am putut salva setările." });
    } finally {
      setSavingSettings(false);
    }
  };

  const changePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = pwd;
    if (!currentPassword || !newPassword) { toast.info("Completează parolele"); return; }
    if (newPassword.length < 6)           { toast.info("Parola nouă e prea scurtă", { description: "Minim 6 caractere." }); return; }
    if (newPassword !== confirmPassword)  { toast.error("Parolele nu coincid"); return; }

    setSavingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success("Parola a fost schimbată");
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPwd({ current: false, next: false, confirm: false });
    } catch (e) {
      toast.error("Eroare", { description: e?.message || "Nu am putut schimba parola." });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;
  if (user.role !== "host" && user.role !== "admin") return null;

  const displayName = user?.name || user?.email || "Host";

  if (loading) {
    return (
      <div className="hsPage">
        <div className="hsMain">
          <div className="hsSkelCard">
            <div className="hsSkelLine w50" />
            <div className="hsSkelLine w80" />
            <div className="hsSkelLine w65" />
          </div>
        </div>
      </div>
    );
  }

  const busyAny = savingProfile || savingSettings || savingPassword || uploadingAvatar;

  return (
    <div className="hsPage">
      <div className="hsMain">
        <header className="hsHeader">
          <div>
            <div className="hsCrumb">Gazdă</div>
            <div className="hsTitleRow">
              <h1 className="hsTitle">Setări</h1>
              <button className="hsGhostLink" type="button" onClick={() => navigate("/host/dashboard")}>
                Dashboard <ExternalLink size={16} />
              </button>
            </div>
            <div className="hsSub">
              Gestionează profilul public, notificările și preferințele contului.
              <span className="hsHint">Cont: <b>{displayName}</b></span>
            </div>
          </div>
        </header>

        <section className="hsCard">
          <div className="hsTabs" role="tablist">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                className={`hsTab ${tab === key ? "active" : ""}`}
                type="button"
                onClick={() => setTab(key)}
              >
                <Icon size={16} />{label}
              </button>
            ))}
          </div>

          {/* ── PROFIL ── */}
          {tab === "profile" && (
            <div className="hsGrid">
              <div className="hsBlock">
                <div className="hsBlockHead">
                  <div>
                    <div className="hsBlockTitle">Profil public</div>
                    <div className="hsBlockSub">Apare în pagina proprietății la "Gazda ta".</div>
                  </div>
                  <button
                    className="hsBtn hsBtnAccent"
                    type="button"
                    onClick={saveProfile}
                    disabled={(savingProfile || uploadingAvatar) || !dirtyProfile}
                    title={!dirtyProfile ? "Nimic de salvat" : "Salvează profil"}
                  >
                    {savingProfile ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    {savingProfile ? "Se salvează..." : "Salvează"}
                  </button>
                </div>

                <div className="hsProfileHero">
                  <div
                    className="hsAvatarBig"
                    style={{ backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined }}
                    role="img" aria-label="Avatar"
                  >
                    {!profile.avatarUrl && <ImageIcon size={18} />}
                  </div>

                  <div className="hsProfileMeta">
                    <div className="hsProfileName">{(profile.displayName || "Gazdă").trim()}</div>
                    <div className="hsTiny">Avatar clar + bio = încredere mai mare.</div>
                    <div className="hsProfileActions">
                      <button className="hsBtn" type="button" onClick={pickAvatar} disabled={uploadingAvatar || savingProfile}>
                        <ImageIcon size={16} />
                        {uploadingAvatar ? "Upload..." : "Încarcă avatar"}
                      </button>
                      {profile.avatarUrl && (
                        <button className="hsBtn hsBtnDanger" type="button" onClick={removeAvatar} disabled={uploadingAvatar || savingProfile}>
                          <Trash2 size={16} /> Șterge
                        </button>
                      )}
                      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPickFile} className="hsHidden" />
                    </div>
                    <div className="hsTiny" style={{ marginTop: 4 }}>Max {MAX_AVATAR_MB}MB · JPG, PNG, WEBP, GIF</div>
                  </div>

                  <div className="hsCallout">
                    <ShieldCheck size={16} />
                    <div>
                      <div className="hsCalloutTitle">Pro tip</div>
                      <div className="hsCalloutText">Răspuns rapid + bio clar = mai multe rezervări.</div>
                    </div>
                  </div>
                </div>

                <div className="hsRow2">
                  <div className="hsField">
                    <label>Nume afișat *</label>
                    <input
                      value={profile.displayName}
                      onChange={(e) => setProfile((p) => normalizeProfile({ ...p, displayName: e.target.value }))}
                      placeholder="Ex: Cabana Bucovina Stay"
                      maxLength={60}
                    />
                    <div className="hsTiny">{(profile.displayName || "").length}/60</div>
                  </div>
                  <div className="hsField">
                    <label>Timp de răspuns</label>
                    <select
                      value={profile.responseTimeBucket || "unknown"}
                      onChange={(e) => setProfile((p) => normalizeProfile({ ...p, responseTimeBucket: e.target.value }))}
                    >
                      {TIME_BUCKETS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <div className="hsTiny">Apare la secțiunea "Gazdă" din pagina proprietății.</div>
                  </div>
                </div>

                <div className="hsField">
                  <label>Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile((p) => normalizeProfile({ ...p, bio: e.target.value }))}
                    placeholder="Spune pe scurt ce oferi, vibe, reguli..."
                    rows={7}
                    maxLength={1200}
                  />
                  <div className="hsTiny">{(profile.bio || "").length}/1200</div>
                </div>

                <div className="hsPreviewCard">
                  <div className="hsPreviewTop">
                    <div
                      className="hsPreviewAvatar"
                      style={{ backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined }}
                    >
                      {!profile.avatarUrl && <ImageIcon size={16} />}
                    </div>
                    <div className="hsPreviewText">
                      <div className="hsPreviewName">{(profile.displayName || "Gazdă").trim()}</div>
                      <div className="hsPreviewSub">
                        Gazdă · răspuns {TIME_BUCKETS.find((x) => x.key === profile.responseTimeBucket)?.label || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="hsPreviewBio">{profile.bio?.trim() || "Bio nu e setat încă."}</div>
                </div>
              </div>

              <div className="hsBlock">
                <div className="hsBlockTitle">Limbile vorbite</div>
                <div className="hsBlockSub">Afișate în profilul gazdei.</div>
                <div className="hsLangChips">
                  {["ro", "en", "de", "fr", "it"].map((code) => {
                    const on = profile.languages?.includes(code);
                    return (
                      <button
                        key={code}
                        className={`hsChip ${on ? "on" : ""}`}
                        type="button"
                        onClick={() =>
                          setProfile((p) => {
                            const cur  = Array.isArray(p.languages) ? p.languages : [];
                            const next = on ? cur.filter((x) => x !== code) : [...cur, code];
                            return normalizeProfile({ ...p, languages: next });
                          })
                        }
                      >
                        {code.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
                <div className="hsTiny" style={{ marginTop: 8 }}>Se salvează împreună cu profilul.</div>
              </div>
            </div>
          )}

          {/* ── NOTIFICĂRI ── */}
          {tab === "notifications" && (
            <div className="hsBlock">
              <div className="hsBlockHead">
                <div>
                  <div className="hsBlockTitle">Notificări</div>
                  <div className="hsBlockSub">Controlează ce notificări primești în platformă.</div>
                </div>
                <button className="hsBtn hsBtnAccent" type="button" onClick={saveSettings} disabled={savingSettings || !dirtySettings}>
                  {savingSettings ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  {savingSettings ? "Se salvează..." : "Salvează"}
                </button>
              </div>
              <div className="hsToggles">
                <Toggle
                  label="Mesaje noi"
                  desc="Notificări când cineva îți scrie."
                  value={settings.notifications.messages}
                  onChange={(v) => setSettings((s) => normalizeSettings({ ...s, notifications: { ...s.notifications, messages: v } }))}
                />
                <Toggle
                  label="Status proprietăți"
                  desc="Când un listing e aprobat, respins sau suspendat."
                  value={settings.notifications.listingStatus}
                  onChange={(v) => setSettings((s) => normalizeSettings({ ...s, notifications: { ...s.notifications, listingStatus: v } }))}
                />
                <Toggle
                  label="Raport săptămânal"
                  desc="Sumar cu vizualizări și performanța listing-urilor."
                  value={settings.notifications.weeklyReport}
                  onChange={(v) => setSettings((s) => normalizeSettings({ ...s, notifications: { ...s.notifications, weeklyReport: v } }))}
                />
                <Toggle
                  label="Marketing"
                  desc="Noutăți, sfaturi și oferte din platformă."
                  value={settings.notifications.marketing}
                  onChange={(v) => setSettings((s) => normalizeSettings({ ...s, notifications: { ...s.notifications, marketing: v } }))}
                />
              </div>
            </div>
          )}

          {/* ── PREFERINȚE ── */}
          {tab === "preferences" && (
            <div className="hsBlock">
              <div className="hsBlockHead">
                <div>
                  <div className="hsBlockTitle">Preferințe</div>
                  <div className="hsBlockSub">Monedă, limbă și interfață.</div>
                </div>
                <button className="hsBtn hsBtnAccent" type="button" onClick={saveSettings} disabled={savingSettings || !dirtySettings}>
                  {savingSettings ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  {savingSettings ? "Se salvează..." : "Salvează"}
                </button>
              </div>

              <div className="hsRow2">
                <div className="hsField">
                  <label>Monedă implicită</label>
                  <select
                    value={settings.preferences.currency}
                    onChange={(e) => setSettings((s) => normalizeSettings({ ...s, preferences: { ...s.preferences, currency: e.target.value } }))}
                  >
                    <option value="RON">RON — Leu românesc</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
                <div className="hsField">
                  <label>Limbă interfață</label>
                  <select
                    value={settings.preferences.locale}
                    onChange={(e) => setSettings((s) => normalizeSettings({ ...s, preferences: { ...s.preferences, locale: e.target.value } }))}
                  >
                    <option value="ro-RO">Română (RO)</option>
                    <option value="en-GB">English (GB)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>
              </div>

              <div className="hsRow2">
                <div className="hsField">
                  <label>Fus orar</label>
                  <select
                    value={settings.preferences.timezone}
                    onChange={(e) => setSettings((s) => normalizeSettings({ ...s, preferences: { ...s.preferences, timezone: e.target.value } }))}
                  >
                    {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
                <div className="hsField">
                  <label>Interfață</label>
                  <div style={{ marginTop: 4 }}>
                    <Toggle
                      label="Reduce animații"
                      desc="Dezactivează tranzițiile și animațiile UI."
                      value={settings.preferences.reduceMotion}
                      onChange={(v) => setSettings((s) => normalizeSettings({ ...s, preferences: { ...s.preferences, reduceMotion: v } }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITATE ── */}
          {tab === "security" && (
            <div className="hsBlock">
              <div className="hsBlockTitle">Securitate</div>
              <div className="hsBlockSub">Schimbă parola contului.</div>

              <div className="hsRow2" style={{ marginTop: 14 }}>
                <div className="hsField">
                  <label>Parola curentă</label>
                  <div className="hsFieldInner">
                    <input
                      type={showPwd.current ? "text" : "password"}
                      value={pwd.currentPassword}
                      onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
                      autoComplete="current-password"
                    />
                    <button type="button" className="hsEyeBtn" onClick={() => setShowPwd((s) => ({ ...s, current: !s.current }))}>
                      {showPwd.current ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="hsField">
                  <label>Parola nouă</label>
                  <div className="hsFieldInner">
                    <input
                      type={showPwd.next ? "text" : "password"}
                      value={pwd.newPassword}
                      onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                    <button type="button" className="hsEyeBtn" onClick={() => setShowPwd((s) => ({ ...s, next: !s.next }))}>
                      {showPwd.next ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {pwdStrength && (
                    <div className="hsPwdStrength">
                      <div className="hsPwdBar">
                        <div className={`hsPwdFill hsPwdFill--${pwdStrength.level}`} />
                      </div>
                      <span style={{ color: pwdStrength.color }}>{pwdStrength.label}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="hsField">
                <label>Confirmă parola nouă</label>
                <div className="hsFieldInner">
                  <input
                    type={showPwd.confirm ? "text" : "password"}
                    value={pwd.confirmPassword}
                    onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
                    autoComplete="new-password"
                    className={pwdMismatch ? "hsInputError" : ""}
                  />
                  <button type="button" className="hsEyeBtn" onClick={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}>
                    {showPwd.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwdMismatch && <div className="hsFieldError">Parolele nu coincid.</div>}
              </div>

              <div className="hsActions">
                <button
                  className="hsBtn hsBtnAccent"
                  type="button"
                  disabled={savingPassword || pwdMismatch || !pwd.currentPassword || !pwd.newPassword}
                  onClick={changePassword}
                >
                  {savingPassword ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />}
                  {savingPassword ? "Se schimbă..." : "Schimbă parola"}
                </button>
              </div>
            </div>
          )}
        </section>

        {(dirtyProfile || dirtySettings) && (
          <div className="hsStickyBar">
            <div className="hsStickyInner">
              <div className="hsStickyLeft">
                <span className="hsStickyDot" />
                <span className="hsStickyText">
                  Ai modificări nesalvate
                  <span className="hsStickyMeta">
                    {dirtyProfile && "profil"}
                    {dirtyProfile && dirtySettings && " + "}
                    {dirtySettings && "setări"}
                  </span>
                </span>
              </div>
              <div className="hsStickyActions">
                {dirtyProfile && (
                  <button className="hsStickyBtn primary" onClick={saveProfile} disabled={busyAny}>
                    <Save size={16} /> Salvează profil
                  </button>
                )}
                {dirtySettings && (
                  <button className="hsStickyBtn ghost" onClick={saveSettings} disabled={busyAny}>
                    Salvează setări
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="hsToggle">
      <div className="hsToggleText">
        <div className="hsToggleLabel">{label}</div>
        {desc && <div className="hsToggleDesc">{desc}</div>}
      </div>
      <button
        className={`hsSwitch ${value ? "on" : ""}`}
        type="button"
        aria-pressed={value}
        onClick={() => onChange?.(!value)}
      >
        <span className="hsKnob" />
      </button>
    </div>
  );
}
