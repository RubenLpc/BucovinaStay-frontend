//const API_URL = "http://localhost:3000"; // schimbă după nevoie 
const API_URL = "https://bucovinastay-backend-2.onrender.com"; 
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
  
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // setează Content-Type doar dacă NU e FormData
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(API_URL + url, {
    ...options,
    headers,
  });

  const data = await safeJson(res);

  if (res.status === 503) {
    emitMaintenance({ message: data?.message, supportEmail: data?.supportEmail });
    const err = new Error("MAINTENANCE");
    err.code = "MAINTENANCE";
    err.payload = data;
    throw err;
  }

  if (!res.ok) {
    // vezi și status ca să-ți fie clar
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  if (maintenanceActive) maintenanceActive = false;
  return data;
}

export async function checkHealth() {
  return apiFetch("/health", { method: "GET" });
}
