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
    capacity: p.capacity,
    maxGuests: p.maxGuests ?? p.capacity,

    rating: p.ratingAvg || 0,
    reviews: p.reviewsCount || 0,

    amenities: p.amenities || p.facilities || [],
    badges: p.badges || [],

    image: p.image || p.coverImage?.url || p.images?.[0]?.url || "",

    // ✅ IMPORTANT pentru pini:
    geo: p.geo || null,
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
  const data = await apiFetch(`/properties/${id}`, { method: "GET" });
  return mapPropertyToStay(data.property); // ✅
}

