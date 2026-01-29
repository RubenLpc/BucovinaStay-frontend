import React, { useEffect, useMemo, useState } from "react";
import "./RejectReasonModal.css";
import { useTranslation } from "react-i18next";

export default function RejectReasonModal({ open, onClose, onSubmit, initial = "" }) {
  const { t } = useTranslation();
  const [v, setV] = useState(initial);

  useEffect(() => {
    if (open) setV(initial || "");
  }, [open, initial]);

  if (!open) return null;

  const minLen = 8;
  const maxLen = 300;

  const len = useMemo(() => v.trim().length, [v]);
  const ok = len >= minLen && len <= maxLen;

  return (
    <div className="ppModalOverlay">
      <button className="ppModalBackdrop" onClick={onClose} type="button" aria-label={t("admin.rejectModal.close")} />
      <div className="ppModal ppModal-lg">
        <h3 className="ppModalTitle">{t("admin.rejectModal.title")}</h3>
        <div className="ppModalBody">
          <div className="ppTinyHint">{t("admin.rejectModal.hint", { min: minLen, max: maxLen })}</div>

          <textarea
            value={v}
            onChange={(e) => setV(e.target.value)}
            rows={5}
            style={{
              width: "100%",
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(17,24,39,0.12)",
              background: "rgba(17,24,39,0.03)",
              fontWeight: 700,
              outline: "none",
            }}
            placeholder={t("admin.rejectModal.placeholder")}
          />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="ppGhostBtn" type="button" onClick={onClose}>
              {t("admin.common.cancel")}
            </button>

            <button
              className={`rrPrimaryBtn ${ok ? "rrPrimaryBtnSolid" : ""}`}
              type="button"
              disabled={!ok}
              onClick={() => onSubmit(v.trim())}
              title={!ok ? t("admin.rejectModal.invalidTip") : t("admin.common.send")}
            >
              {t("admin.common.send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
