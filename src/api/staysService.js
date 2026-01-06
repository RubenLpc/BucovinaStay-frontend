// client/src/api/staysService.js
import { apiFetch } from "./client";

function mapPropertyToStay(p) {
  return {
    id: p._id,
    name: p.title,
    subtitle: p.subtitle || "",
    location: p.locality || p.city || "",
    type: p.type,

    pricePerNight: p.pricePerNight,
    capacity: p.capacity,                 // fallback
    maxGuests: p.maxGuests ?? p.capacity, // ✅ virtual dacă vine, fallback dacă nu

    rating: p.ratingAvg || 0,
    reviews: p.reviewsCount || 0,

    amenities: p.amenities || p.facilities || [], // ✅ virtual sau direct
    badges: p.badges || [],

    // ✅ FOARTE IMPORTANT: imaginea
    image: p.image || p.coverImage?.url || p.images?.[0]?.url || "",
  };
}

export async function listStays(params) {
  const qs = new URLSearchParams(params).toString();
  const data = await apiFetch(`/properties${qs ? `?${qs}` : ""}`, { method: "GET" });

  return {
    ...data,
    items: (data.items || []).map(mapPropertyToStay),
  };
}

export async function getStay(id) {
  const p = await apiFetch(`/properties/${id}`, { method: "GET" });
  return mapPropertyToStay(p);
}
