import React from "react";
import "./Admin.css";
import { useTranslation } from "react-i18next";

export default function AdminPage({
  titleKey = "admin.page.defaultTitle",
  subtitleKey = "admin.page.defaultSubtitle",
  title,
  subtitle,
  children,
}) {
  const { t } = useTranslation();

  const finalTitle = title ?? t(titleKey);
  const finalSubtitle = subtitle ?? t(subtitleKey);

  return (
    <div className="hdPage">
      <div className="hdMain adPagePad">
        <div className="adTop">
          <div>
            <div className="adCrumb">{t("admin.page.crumb")}</div>
            <div className="adTitleRow">
              <h1 className="hdTitle">{finalTitle}</h1>
              <div className="adHint">{finalSubtitle}</div>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
