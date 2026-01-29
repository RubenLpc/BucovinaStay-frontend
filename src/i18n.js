import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ro from "./locales/ro.json";
import en from "./locales/en.json";

const STORAGE_KEY = "app_lang";

function getInitialLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "ro" || saved === "en") return saved;

  // fallback: detect browser
  const browser = (navigator.language || "ro").toLowerCase();
  return browser.startsWith("en") ? "en" : "ro";
}

i18n.use(initReactI18next).init({
  resources: {
    ro: { translation: ro },
    en: { translation: en }
  },
  lng: getInitialLang(),
  fallbackLng: "ro",
  interpolation: { escapeValue: false }
});

// Persist + set <html lang="">
i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {}
  try {
    document.documentElement.setAttribute("lang", lng);
  } catch {}
});

export default i18n;
export { STORAGE_KEY };
