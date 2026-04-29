import React, { useEffect, useMemo, useState } from "react";
import { X, XCircle, SendHorizonal } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./RejectReasonModal.css";

export default function RejectReasonModal({ open, onClose, onSubmit, initial = "" }) {
  const { t } = useTranslation();
  const [v, setV] = useState(initial);

  const minLen = 8;
  const maxLen = 300;

  const len = useMemo(() => v.trim().length, [v]);
  const ok = len >= minLen && len <= maxLen;

  useEffect(() => {
    if (open) setV(initial || "");
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="rrOverlay">
      <button
        className="rrBackdrop"
        onClick={onClose}
        type="button"
        aria-label={t("admin.rejectModal.close")}
      />

      <div className="rrModal">
        <button className="rrCloseBtn" type="button" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="rrHeader">
          <div className="rrIcon">
            <XCircle size={24} />
          </div>

          <div>
            <h3 className="rrTitle">{t("admin.rejectModal.title")}</h3>
            <p className="rrSubtitle">
              {t("admin.rejectModal.hint", { min: minLen, max: maxLen })}
            </p>
          </div>
        </div>

        <div className="rrBody">
          <textarea
            className="rrTextarea"
            value={v}
            onChange={(e) => setV(e.target.value)}
            rows={5}
            autoFocus
            placeholder={t("admin.rejectModal.placeholder")}
          />

          <div className="rrMeta">
            <span className={ok ? "rrValid" : "rrInvalid"}>
              {len}/{maxLen}
            </span>
          </div>

          <div className="rrActions">
            <button className="rrCancelBtn" type="button" onClick={onClose}>
              {t("admin.common.cancel")}
            </button>

            <button
              className={`rrSubmitBtn ${ok ? "isReady" : ""}`}
              type="button"
              disabled={!ok}
              onClick={() => onSubmit(v.trim())}
              title={!ok ? t("admin.rejectModal.invalidTip") : t("admin.common.send")}
            >
              <SendHorizonal size={16} />
              {t("admin.common.send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}