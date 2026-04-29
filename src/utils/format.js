export function formatMoney(amount, currency = "RON", locale = "ro-RO") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDateTz(date, timezone = "Europe/Bucharest", locale = "ro-RO") {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleString(locale);
  }
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
