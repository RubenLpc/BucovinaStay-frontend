import React from "react";
import { useLocation } from "react-router-dom";
import "./Maintenance.css";
import { useNavigate } from "react-router-dom";
export default function Maintenance() {
  const { state } = useLocation();
  const message = state?.message;
  const supportEmail = state?.supportEmail;
const navigate = useNavigate();
  return (
    <div className="mtPage">
      <div className="mtCard">
        <div className="mtBadge">BucovinaStay</div>
        <h1 className="mtTitle">Mentenanță</h1>

        <p className="mtText">
          {message || "Platforma e în mentenanță. Revenim în curând."}
        </p>

        {supportEmail ? (
          <p className="mtSub">
            Contact: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        ) : null}

        <div className="mtActions">
          <button className="mtBtn" onClick={() => navigate("/")}>
            Reîncearcă
          </button>
        </div>
      </div>
    </div>
  );
}
