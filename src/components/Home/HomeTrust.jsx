import React from "react";
import "./HomeTrust.css";
import { ShieldCheck, Star, BadgeCheck } from "lucide-react";

export default function HomeTrust({
  rating = 4.9,
  reviews = 1200,
  verifiedHosts = 100,
  variant = "rating", // "rating" | "verified" | "secure"
}) {
  const items = {
    rating: {
      Icon: Star,
      title: `${Number(rating).toFixed(1).replace(".", ",")} / 5`,
      desc: `din peste ${Number(reviews).toLocaleString("ro-RO")} recenzii`,
      pill: "Recenzii",
    },
    verified: {
      Icon: BadgeCheck,
      title: `${Number(verifiedHosts).toLocaleString("ro-RO")}+ gazde verificate`,
      desc: "profiluri cu informații complete și activitate constantă",
      pill: "Verificat",
    },
    secure: {
      Icon: ShieldCheck,
      title: "Cazări verificate",
      desc: "fotografii clare + detalii complete înainte de publicare",
      pill: "Siguranță",
    },
  };

  const it = items[variant] || items.rating;
  const Icon = it.Icon;

  return (
    <section className="ppSection htBlock" aria-label="Social proof">
      <div className="htInner">
        <div className="htIcon">
          <Icon size={18} />
        </div>

        <div className="htText">
          <div className="htTitle">{it.title}</div>
          <div className="htDesc">{it.desc}</div>
        </div>

        <div className="htRight">
          <span className="htPill">{it.pill}</span>
        </div>
      </div>
    </section>
  );
}
