import { apiFetch } from "./client";
import { toast } from "sonner";
async function createDraft(payload) {
  try {
    const body = { ...payload };

    // ✅ dacă nu ai coordonate valide, nu trimite geo deloc
    const coords = body?.geo?.coordinates;
    const okCoords = Array.isArray(coords) && coords.length === 2;

    if (!okCoords) {
      delete body.geo;
    } else {
      body.geo = { type: "Point", coordinates: coords };
    }

    // (restul mai jos)
    const data = await apiFetch("/properties/host", {
      method: "POST",
      body: JSON.stringify(body),
    });

    toast.success("Draft creat", { description: "Poți continua completarea." });
    return data;
  } catch (err) {
    toast.error("Eroare", { description: err.message || "Nu am putut crea draft-ul." });
    throw err;
  }
}


async function updateDraft(id, payload) {
  try {
    const data = await apiFetch(`/properties/host/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    toast.success("Salvat", { description: "Draft actualizat." });
    return data;
  } catch (err) {
    toast.error("Eroare", { description: err.message || "Nu am putut salva." });
    throw err;
  }
}

async function submitForReview(id) {
  try {
    const data = await apiFetch(`/properties/host/${id}/submit`, { method: "POST" });
    toast.success("Trimis la verificare", { description: "Admin-ul îl va aproba." });
    return data;
  } catch (err) {
    toast.error("Eroare", { description: err.message || "Nu am putut trimite." });
    throw err;
  }
}

async function getCloudinarySignature() {
  // endpointul tău din backend: /uploads/cloudinary-signature
  try {
    return await apiFetch("/properties/cloudinary-signature", { method: "POST" });
  } catch (err) {
    toast.error("Eroare upload", { description: err.message || "Nu am putut obține semnătura." });
    throw err;
  }
}

export const hostPropertyService = {
  createDraft,
  updateDraft,
  submitForReview,
  getCloudinarySignature,
};
