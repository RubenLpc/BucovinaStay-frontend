import { create } from "zustand";
import { hostSettingsService } from "../api/hostSettingsService";
import i18n from "../i18n";

function applyReduceMotion(value) {
  if (value) {
    document.documentElement.setAttribute("data-reduce-motion", "true");
  } else {
    document.documentElement.removeAttribute("data-reduce-motion");
  }
}

function applyLocale(locale) {
  const lang = (locale || "ro-RO").split("-")[0];
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang);
  }
}

const DEFAULTS = {
  currency: "RON",
  locale: "ro-RO",
  timezone: "Europe/Bucharest",
  reduceMotion: false,
  notifications: {
    messages: true,
    listingStatus: true,
    weeklyReport: false,
    marketing: false,
  },
};

export const useSettingsStore = create((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  apply(raw) {
    const prefs = raw?.preferences || {};
    const notifs = raw?.notifications || {};

    const next = {
      currency:     prefs.currency     ?? DEFAULTS.currency,
      locale:       prefs.locale       ?? DEFAULTS.locale,
      timezone:     prefs.timezone     ?? DEFAULTS.timezone,
      reduceMotion: prefs.reduceMotion ?? DEFAULTS.reduceMotion,
      notifications: {
        messages:      notifs.messages      ?? DEFAULTS.notifications.messages,
        listingStatus: notifs.listingStatus ?? DEFAULTS.notifications.listingStatus,
        weeklyReport:  notifs.weeklyReport  ?? DEFAULTS.notifications.weeklyReport,
        marketing:     notifs.marketing     ?? DEFAULTS.notifications.marketing,
      },
      loaded: true,
    };

    applyReduceMotion(next.reduceMotion);
    applyLocale(next.locale);

    set(next);
  },

  async load() {
    try {
      const res = await hostSettingsService.getMy();
      get().apply(res?.settings || {});
    } catch {
      // defaults rămân, fără crash
    }
  },

  reset() {
    applyReduceMotion(false);
    set({ ...DEFAULTS, loaded: false });
  },
}));
