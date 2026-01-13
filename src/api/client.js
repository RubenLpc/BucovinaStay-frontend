const API_URL = "http://localhost:3000";

let maintenanceListeners = new Set();
let maintenanceActive = false; // ✅ latch

export function onMaintenance(cb) {
  maintenanceListeners.add(cb);
  return () => maintenanceListeners.delete(cb);
}

function emitMaintenance(payload) {
  if (maintenanceActive) return; // ✅ emit o singură dată
  maintenanceActive = true;
  for (const cb of maintenanceListeners) cb(payload);
}

// opțional: când revine platforma, poți reseta latch-ul
export function clearMaintenance() {
  maintenanceActive = false;
}

async function safeJson(res) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  return res.json().catch(() => null);
}

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(API_URL + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await safeJson(res);

  // ✅ maintenance handling
  if (res.status === 503) {
    emitMaintenance({
      message: data?.message,
      supportEmail: data?.supportEmail,
    });

    // IMPORTANT: arunc un error special ca să-l poți ignora în catch
    const err = new Error("MAINTENANCE");
    err.code = "MAINTENANCE";
    err.payload = data;
    throw err;
  }

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  // dacă a fost mentenanță și acum e ok, poți reseta latch
  if (maintenanceActive) maintenanceActive = false;

  return data;
}

export async function checkHealth() {
  return apiFetch("/health", { method: "GET" });
}
