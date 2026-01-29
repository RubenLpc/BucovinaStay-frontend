import React, { useEffect, useMemo, useRef, useState } from "react";
import "./MessageHostModal.css";
import { X, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../stores/authStore";
import defaultAvatar from "../../assets/default_avatar.png";
import { useTranslation } from "react-i18next";

export default function MessageHostModal({ open, onClose, host, property, onSend }) {
  const { t } = useTranslation();

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef(null);

  const user = useAuthStore((s) => s.user);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const hostName = host?.name || t("messageHost.fallbackHostName");
  const hostAvatar = host?.avatarUrl || defaultAvatar;

  const defaultText = useMemo(() => {
    const title = property?.title ? ` ${t("messageHost.default.about")} „${property.title}”` : "";
    return t("messageHost.default.text", { hostName, title });
  }, [hostName, property, t]);

  useEffect(() => {
    if (!open) return;
    setMessage(defaultText);

    // dacă e logat, nu păstrăm accidental guest data
    if (user) {
      setGuestName("");
      setGuestEmail("");
      setGuestPhone("");
    }

    setTimeout(() => ref.current?.focus(), 50);
  }, [open, defaultText, user]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  function formatRoPhone(input) {
    let v = String(input || "").trim();
    v = v.replace(/[^\d+]/g, "");
    v = v.startsWith("+") ? "+" + v.slice(1).replace(/\+/g, "") : v.replace(/\+/g, "");

    if (v.startsWith("07")) v = "+4" + v;
    if (v.startsWith("40")) v = "+" + v;
    if (v.startsWith("0040")) v = "+40" + v.slice(4);

    if (v.startsWith("+40")) {
      const digits = v.replace(/\D/g, "");
      const rest = digits.slice(2, 11);
      let out = "+40";
      if (rest.length > 0) out += " " + rest.slice(0, 3);
      if (rest.length > 3) out += " " + rest.slice(3, 6);
      if (rest.length > 6) out += " " + rest.slice(6, 9);
      return out.trim();
    }

    return v;
  }

  function isValidPhone(input) {
    const digits = String(input || "").replace(/\D/g, "");
    return digits.length >= 9;
  }

  async function handleSend() {
    const text = message.trim();
    if (text.length < 10) {
      toast.error(t("messageHost.toasts.shortTitle"), {
        description: t("messageHost.toasts.shortDesc"),
      });
      return;
    }

    const isAuthed = !!user;

    if (!isAuthed) {
      const n = guestName.trim();
      const e = guestEmail.trim();
      const p = guestPhone.trim();

      if (n.length < 2) {
        toast.error(t("messageHost.toasts.nameTitle"), {
          description: t("messageHost.toasts.nameDesc"),
        });
        return;
      }

      if (!e || !/^\S+@\S+\.\S+$/.test(e)) {
        toast.error(t("messageHost.toasts.emailTitle"), {
          description: t("messageHost.toasts.emailDesc"),
        });
        return;
      }

      if (!p || !isValidPhone(p)) {
        toast.error(t("messageHost.toasts.phoneTitle"), {
          description: t("messageHost.toasts.phoneDesc"),
        });
        return;
      }
    }

    setSending(true);
    try {
      await onSend?.({
        hostId: host?.id,
        propertyId: property?._id || property?.id,
        message: text,

        guestName: isAuthed ? undefined : guestName.trim(),
        guestEmail: isAuthed ? undefined : guestEmail.trim(),
        guestPhone: isAuthed ? undefined : guestPhone.trim(),
      });

      toast.success(t("messageHost.toasts.sentTitle"), {
        description: t("messageHost.toasts.sentDesc"),
      });
      onClose?.();
    } catch (err) {
      toast.error(t("messageHost.toasts.errorTitle"), {
        description: err?.message || t("messageHost.toasts.errorDesc"),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mhOverlay" role="dialog" aria-modal="true" aria-label={t("messageHost.aria.dialog")}>
      <div className="mhBackdrop" onClick={onClose} />
      <div className="mhModal">
        <div className="mhTop">
          <div className="mhTitle">
            {t("messageHost.title")} <span>{hostName}</span>
          </div>
          <button className="mhClose" onClick={onClose} aria-label={t("messageHost.aria.close")}>
            <X size={18} />
          </button>
        </div>

        <div className="mhHostRow">
          <img className="mhAvatar" src={hostAvatar} alt={t("messageHost.aria.avatarAlt", { name: hostName })} />
          <div className="mhMeta">
            <div className="mhName">
              {hostName}
              {host?.isSuperHost ? (
                <span className="mhSuper">
                  <ShieldCheck size={16} />
                  {t("messageHost.superhost")}
                </span>
              ) : null}
            </div>
            <div className="mhSub">
              {property?.title ? (
                <>
                  {t("messageHost.property")} <b>{property.title}</b>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* ✅ Guest fields doar dacă NU e logat */}
        {!user ? (
          <div className="mhGuestGrid">
            <div>
              <label className="mhLabel">
                {t("messageHost.guest.name")} <span className="mhReq">*</span>
              </label>
              <input
                className="mhInput"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t("messageHost.guest.namePh")}
                maxLength={80}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="mhLabel">
                {t("messageHost.guest.email")} <span className="mhReq">*</span>
              </label>
              <input
                className="mhInput"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder={t("messageHost.guest.emailPh")}
                maxLength={120}
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mhLabel">
                {t("messageHost.guest.phone")} <span className="mhReq">*</span>
              </label>
              <input
                className="mhInput"
                value={guestPhone}
                onChange={(e) => setGuestPhone(formatRoPhone(e.target.value))}
                placeholder={t("messageHost.guest.phonePh")}
                maxLength={24}
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>
        ) : null}

        <label className="mhLabel">{t("messageHost.message.label")}</label>
        <textarea
          ref={ref}
          className="mhTextarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1200}
          placeholder={t("messageHost.message.ph")}
        />

        <div className="mhFooter">
          <div className="mhHint">{t("messageHost.hint")}</div>
          <button className="mhSend" onClick={handleSend} disabled={sending}>
            <Send size={18} />
            {sending ? t("messageHost.sending") : t("messageHost.send")}
          </button>
        </div>
      </div>
    </div>
  );
}
