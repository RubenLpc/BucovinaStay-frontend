// client/src/utils/format.js
export function formatMoney(amount, currency = "RON") {
    try {
      return new Intl.NumberFormat("ro-RO", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  }
  
  export function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  