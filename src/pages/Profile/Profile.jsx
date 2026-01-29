import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Mail, Phone, Shield, User2, Pencil, X, Save } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { authService } from "../../api/authService";
import { useTranslation } from "react-i18next";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout, setUser } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  const locale = i18n.language?.startsWith("en") ? "en-US" : "ro-RO";

  const initials = useMemo(() => {
    const name = (user?.name || t("roles.user")).trim();
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }, [user, t]);

  const roleLabel = useMemo(() => {
    const role = user?.role || "user";
    return t(`roles.${role}`, { defaultValue: t("roles.user") });
  }, [user, t]);

  const onLogout = () => {
    logout();
    localStorage.removeItem("token");
    toast.success(t("toasts.loggedOut"), { description: t("toasts.loggedOutDesc") });
    navigate("/", { replace: true });
  };

  const startEdit = () => {
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
    });
  };

  const saveEdit = async () => {
    if (!form.name.trim()) {
      toast.error(t("toasts.nameRequired"));
      return;
    }

    try {
      setSaving(true);

      const updatedUser = await authService.updateMe({
        name: form.name.trim(),
        phone: form.phone.trim(),
      });

      setUser(updatedUser);

      toast.success(t("toasts.profileUpdated"), {
        description: t("toasts.profileUpdatedDesc"),
      });

      setIsEditing(false);
    } catch (err) {
      toast.error(t("toasts.saveError"), {
        description: err?.message || t("toasts.tryAgain"),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="container profile-wrap">
        <div className="profile-card">
          <div className="profile-top">
            <div className="profile-avatar" aria-hidden="true">
              {initials}
            </div>

            <div className="profile-meta">
              <h1 className="profile-name">{user.name}</h1>
              <p className="profile-sub">{t("profile.titleHint")}</p>
            </div>

            <div className="profile-top-actions">
              {!isEditing ? (
                <button className="profile-action" onClick={startEdit} type="button">
                  <Pencil size={18} />
                  {t("profile.edit")}
                </button>
              ) : (
                <button className="profile-action ghost" onClick={cancelEdit} type="button">
                  <X size={18} />
                  {t("profile.cancel")}
                </button>
              )}

              <button className="profile-logout" onClick={onLogout} type="button">
                <LogOut size={18} />
                {t("profile.logout")}
              </button>
            </div>
          </div>

          {/* INFO GRID */}
          <div className="profile-grid">
            <div className="profile-item">
              <div className="profile-label">
                <Mail size={16} />
                {t("profile.email")}
              </div>
              <div className="profile-value">{user.email || "-"}</div>
            </div>

            <div className="profile-item">
              <div className="profile-label">
                <Shield size={16} />
                {t("profile.role")}
              </div>
              <div className="profile-value role-pill">{roleLabel}</div>
            </div>

            <div className="profile-item">
              <div className="profile-label">
                <Phone size={16} />
                {t("profile.phone")}
              </div>

              {!isEditing ? (
                <div className="profile-value">{user.phone || "-"}</div>
              ) : (
                <input
                  className="profile-input"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder={t("profile.phonePlaceholder")}
                />
              )}
            </div>

            <div className="profile-item">
              <div className="profile-label">
                <User2 size={16} />
                {t("profile.memberSince")}
              </div>
              <div className="profile-value">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : "-"}
              </div>
            </div>

            {/* EDIT NAME FULL WIDTH */}
            <div className="profile-item wide">
              <div className="profile-label">
                <User2 size={16} />
                {t("profile.name")}
              </div>

              {!isEditing ? (
                <div className="profile-value">{user.name || "-"}</div>
              ) : (
                <input
                  className="profile-input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t("profile.namePlaceholder")}
                />
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="profile-actions">
            {isEditing ? (
              <button className="btn btn-primary" type="button" onClick={saveEdit} disabled={saving}>
                <Save size={18} />
                {saving ? t("profile.saving") : t("profile.save")}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => navigate("/")}>
                {t("profile.backToStays")}
              </button>
            )}

            {isEditing ? (
              <button className="btn profile-secondary" type="button" onClick={cancelEdit}>
                {t("profile.discard")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
