// client/src/data/stays.js

const amenityMap = {
    // keys din listingsMock -> keys folosite în Stays (AMENITIES)
    wifi: "wifi",
    parking: "parcare",
    breakfast: "micdejun",
    "pet-friendly": "pet",
    pet: "pet",
    spa: "spa",
    kitchen: "bucatarie",
    "self-checkin": "selfcheckin",
    fireplace: "semineu",
    view: "view",
    garden: "garden",
    family: "family",
    nature: "nature",
    quiet: "quiet",
    balcony: "balcony",
  };
  
  const normalizeAmenities = (arr = []) =>
    Array.from(new Set(arr.map((a) => amenityMap[a] || a).filter(Boolean)));
  
  const computeBadges = (s) => {
    const b = [];
  
    // exemple simple (ajustezi cum vrei)
    if (s.rating >= 4.85) b.push("Super Host");
    if (s.amenities?.includes("micdejun")) b.push("Mic dejun inclus");
    if (s.amenities?.includes("spa") || s.amenities?.includes("sauna")) b.push("Spa");
    if (s.pricePerNight <= 240) b.push("Best Value");
  
    // max 2 ca să nu aglomereze cardul
    return b.slice(0, 2);
  };
  
  // ✅ Un singur dataset unificat (schema stays)
  export const stays = [
    // --- Din stays-ul tău existent (cu createdAt adăugat) ---
    {
      id: "casa-bucovina",
      name: "Casa Bucovina",
      subtitle: "View spre munți",
      location: "Vatra Dornei",
      type: "Cabana",
      pricePerNight: 320,
      rating: 4.8,
      reviews: 124,
      maxGuests: 6,
      createdAt: "2025-12-10",
      amenities: ["wifi", "parcare", "bucatarie", "semineu", "view"],
      image:
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80",
    },
    {
      id: "pensiunea-dorna",
      name: "Pensiunea Dorna",
      subtitle: "Traditional & cozy",
      location: "Dorna Arini",
      type: "Pensiune",
      pricePerNight: 260,
      rating: 4.6,
      reviews: 88,
      maxGuests: 4,
      createdAt: "2025-12-03",
      amenities: ["wifi", "parcare", "micdejun", "spa"],
      image:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80",
    },
    {
      id: "apartament-central",
      name: "Apartament Central",
      subtitle: "Self check-in",
      location: "Suceava",
      type: "Apartament",
      pricePerNight: 210,
      rating: 4.7,
      reviews: 203,
      maxGuests: 2,
      createdAt: "2025-12-20",
      amenities: ["wifi", "bucatarie", "aer", "pet", "selfcheckin"],
      image:
        "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
    },
    {
      id: "villa-rarau",
      name: "Villa Rarău",
      subtitle: "Saună & ciubăr",
      location: "Câmpulung Moldovenesc",
      type: "Vila",
      pricePerNight: 540,
      rating: 4.9,
      reviews: 57,
      maxGuests: 10,
      createdAt: "2025-11-28",
      amenities: ["wifi", "parcare", "sauna", "spa", "bucatarie"],
      image:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80",
    },
    {
      id: "tiny-house",
      name: "Tiny House Bucovina",
      subtitle: "Minimal, instagrammable",
      location: "Gura Humorului",
      type: "Tiny House",
      pricePerNight: 280,
      rating: 4.5,
      reviews: 41,
      maxGuests: 2,
      createdAt: "2025-12-14",
      amenities: ["wifi", "parcare", "pet", "bucatarie"],
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    },
  
    // --- Din listingsMock (convertit) ---
    {
      id: "cabana-vedere-munte",
      name: "Cabana cu vedere la munte",
      subtitle: "Liniște, natură, panoramă",
      location: "Vatra Dornei",
      type: "Cabana",
      pricePerNight: 320,
      rating: 4.8,
      reviews: 120,
      maxGuests: 4,
      createdAt: "2025-12-10",
      amenities: normalizeAmenities(["wifi", "parking", "fireplace", "view"]),
      image: "https://picsum.photos/seed/bucovina1/1200/800",
    },
    {
      id: "pensiune-trad-bucovina",
      name: "Pensiune tradițională Bucovina",
      subtitle: "Tradițional & confort",
      location: "Gura Humorului",
      type: "Pensiune",
      pricePerNight: 240,
      rating: 4.6,
      reviews: 90,
      maxGuests: 2,
      createdAt: "2025-12-03",
      amenities: normalizeAmenities(["wifi", "breakfast", "parking"]),
      image: "https://picsum.photos/seed/bucovina2/1200/800",
    },
    {
      id: "ap-central-cozy",
      name: "Apartament central & cozy",
      subtitle: "Perfect pentru city break",
      location: "Suceava",
      type: "Apartament",
      pricePerNight: 210,
      rating: 4.4,
      reviews: 80,
      maxGuests: 2,
      createdAt: "2025-12-20",
      amenities: normalizeAmenities(["wifi", "kitchen", "self-checkin"]),
      image: "https://picsum.photos/seed/bucovina3/1200/800",
    },
    {
      id: "casa-oaspeti-rustic",
      name: "Casă de oaspeți în stil rustic",
      subtitle: "Curte & vibe tradițional",
      location: "Câmpulung Moldovenesc",
      type: "Vila",
      pricePerNight: 260,
      rating: 4.7,
      reviews: 70,
      maxGuests: 6,
      createdAt: "2025-11-28",
      amenities: normalizeAmenities(["wifi", "parking", "garden", "family"]),
      image: "https://picsum.photos/seed/bucovina4/1200/800",
    },
    {
      id: "cabana-lemn-padure",
      name: "Cabana din lemn la marginea pădurii",
      subtitle: "Relaxare & natură",
      location: "Fundul Moldovei",
      type: "Cabana",
      pricePerNight: 290,
      rating: 4.5,
      reviews: 60,
      maxGuests: 4,
      createdAt: "2025-12-14",
      amenities: normalizeAmenities(["parking", "fireplace", "nature", "quiet"]),
      image: "https://picsum.photos/seed/bucovina5/1200/800",
    },
    {
      id: "pensiune-moderna-spa",
      name: "Pensiune modernă cu spa",
      subtitle: "Spa & mic dejun",
      location: "Voroneț",
      type: "Pensiune",
      pricePerNight: 350,
      rating: 4.9,
      reviews: 110,
      maxGuests: 2,
      createdAt: "2025-12-02",
      amenities: normalizeAmenities(["wifi", "parking", "spa", "breakfast"]),
      image: "https://picsum.photos/seed/bucovina6/1200/800",
    },
  ].map((s) => ({
    ...s,
    amenities: normalizeAmenities(s.amenities),
    badges: s.badges?.length ? s.badges : computeBadges(s),
  }));
  
  // ✅ pentru Home page: “featured”
  export const featuredStays = stays.slice(0, 6);
  
  // ✅ ca să nu mai crape Home.jsx dacă importă default
  export default stays;
  