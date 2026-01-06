// client/src/components/ConfirmModal/ConfirmModal.jsx
import React, { useEffect } from "react";
import "./ConfirmModal.css";

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = "Confirmă",
  cancelText = "Renunță",
  tone = "default", // default | danger | accent
  loading = false,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cmBackdrop" onClick={onClose}>
      <div
        className="cmModal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmHeader">
          <div className="cmTitle">{title}</div>
        </div>

        {description && <div className="cmDesc">{description}</div>}

        <div className="cmActions">
          <button className="cmBtn" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>

          <button
            className={`cmBtn cmBtnPrimary tone-${tone}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Se procesează..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
