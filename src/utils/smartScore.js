/**
 * Calculează un scor de recomandare pentru o cazare.
 * Scor mai mare = mai "ok" pentru Home / Recomandate
 */
export function smartScore(listing) {
    let score = 0;
  
    const rating = typeof listing.rating === "number" ? listing.rating : 0;
    const price = typeof listing.price === "number" ? listing.price : 999;
    const amenities = listing.amenities || [];
    const guests = listing.guests || 0;
  
    /* 1️⃣ Rating (cel mai important) */
    // 4.8 => ~105 puncte
    score += rating * 22;
  
    /* 2️⃣ Preț (mai ieftin = mai bine, dar cu limită) */
    // sub 400 lei contează, peste nu mai penalizăm
    score += Math.max(0, 400 - price) * 0.08;
  
    /* 3️⃣ Facilități cheie */
    if (amenities.includes("wifi")) score += 4;
    if (amenities.includes("parking")) score += 4;
    if (amenities.includes("breakfast")) score += 3;
    if (amenities.includes("spa") || amenities.includes("sauna")) score += 8;
    if (amenities.includes("view")) score += 5;
    if (amenities.includes("quiet")) score += 3;
  
    /* 4️⃣ Potrivit pentru mai mulți oaspeți */
    if (guests >= 4 || amenities.includes("family")) score += 3;
  
    return Math.round(score);
  }
  