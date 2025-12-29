import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Mail, Phone, Shield, User2, Pencil, X, Save } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { authService } from "../../api/authService";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  const initials = useMemo(() => {
    const name = (user?.name || "Utilizator").trim();
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }, [user]);

  const roleLabel = useMemo(() => {
    return (
      {
        guest: "Turist",
        host: "Gazdă",
        admin: "Administrator",
      }[user?.role] || "Utilizator"
    );
  }, [user]);

  const onLogout = () => {
    logout();
    localStorage.removeItem("token");
    toast.success("Te-ai delogat", { description: "Pe curând 👋" });
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
      toast.error("Numele este obligatoriu");
      return;
    }

    try {
      setSaving(true);

      const updatedUser = await authService.updateMe({
        name: form.name.trim(),
        phone: form.phone.trim(),
      });

      // update store (și UI-ul)
      setUser(updatedUser);

      toast.success("Profil actualizat", {
        description: "Modificările au fost salvate cu succes.",
      });

      setIsEditing(false);
    } catch (err) {
      toast.error("Eroare la salvare", {
        description: err.message || "Încearcă din nou.",
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
              <p className="profile-sub">
                Gestionează datele contului și preferințele tale.
              </p>
            </div>

            <div className="profile-top-actions">
              {!isEditing ? (
                <button className="profile-action" onClick={startEdit} type="button">
                  <Pencil size={18} />
                  Editează
                </button>
              ) : (
                <button className="profile-action ghost" onClick={cancelEdit} type="button">
                  <X size={18} />
                  Anulează
                </button>
              )}

              <button className="profile-logout" onClick={onLogout} type="button">
                <LogOut size={18} />
                Deconectare
              </button>
            </div>
          </div>

          {/* INFO GRID */}
          <div className="profile-grid">
            <div className="profile-item">
              <div className="profile-label">
                <Mail size={16} />
                Email
              </div>
              <div className="profile-value">{user.email || "-"}</div>
            </div>

            <div className="profile-item">
              <div className="profile-label">
                <Shield size={16} />
                Rol
              </div>
              <div className="profile-value role-pill">{roleLabel}</div>
            </div>

            <div className="profile-item">
              <div className="profile-label">
                <Phone size={16} />
                Telefon
              </div>

              {!isEditing ? (
                <div className="profile-value">{user.phone || "-"}</div>
              ) : (
                <input
                  className="profile-input"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Ex: 0740 000 000"
                />
              )}
            </div>

            <div className="profile-item">
              <div className="profile-label">
                <User2 size={16} />
                Membru din
              </div>
              <div className="profile-value">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
              </div>
            </div>

            {/* EDIT NAME FULL WIDTH */}
            <div className="profile-item wide">
              <div className="profile-label">
                <User2 size={16} />
                Nume
              </div>

              {!isEditing ? (
                <div className="profile-value">{user.name || "-"}</div>
              ) : (
                <input
                  className="profile-input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Numele tău"
                />
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="profile-actions">
            {isEditing ? (
              <button
                className="btn btn-primary"
                type="button"
                onClick={saveEdit}
                disabled={saving}
              >
                <Save size={18} />
                {saving ? "Se salvează..." : "Salvează"}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => navigate("/")}>
                Înapoi la cazări
              </button>
            )}

            {!isEditing ? (
              <button
                className="btn profile-secondary"
                type="button"
                onClick={() => toast("În curând", { description: "Preferințele vor fi adăugate ulterior." })}
              >
                Preferințe
              </button>
            ) : (
              <button className="btn profile-secondary" type="button" onClick={cancelEdit}>
                Renunță
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
