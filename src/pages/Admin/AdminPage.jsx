import React from "react";
import "./Admin.css";

export default function AdminPage({ title = "Admin Panel", subtitle = "Moderare + utilizatori + statusuri", children }) {
  return (
    <div className="hdPage">
      <div className="hdMain adPagePad">
        <div className="adTop">
          <div>
            <div className="adCrumb">Admin</div>
            <div className="adTitleRow">
              <h1 className="hdTitle">{title}</h1>
              <div className="adHint">{subtitle}</div>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
