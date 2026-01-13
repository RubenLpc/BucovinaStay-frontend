import React, { useEffect, useState } from "react";
import "./RejectReasonModal.css";

export default function RejectReasonModal({ open, onClose, onSubmit, initial = "" }) {
  const [v, setV] = useState(initial);

  useEffect(() => {
    if (open) setV(initial || "");
  }, [open, initial]);

  if (!open) return null;

  const ok = v.trim().length >= 8 && v.trim().length <= 300;

  return (
    <div className="ppModalOverlay">
      <button className="ppModalBackdrop" onClick={onClose} type="button" aria-label="Close" />
      <div className="ppModal ppModal-lg">
        <h3 className="ppModalTitle">Motiv respingere</h3>
        <div className="ppModalBody">
          <div className="ppTinyHint">8–300 caractere. Motivul apare hostului.</div>

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
            placeholder="Ex: lipsesc imagini, descriere incompletă, locație neclară..."
          />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="ppGhostBtn" type="button" onClick={onClose}>Renunță</button>
            <button
              className={`rrPrimaryBtn ${ok ? "rrPrimaryBtnSolid" : ""}`}
              type="button"
              disabled={!ok}
              onClick={() => onSubmit(v.trim())}
              title={!ok ? "Completează un motiv valid" : "Trimite"}
            >
              Trimite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
