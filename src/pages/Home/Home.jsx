// client/src/pages/Home/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import Hero from "../../components/Hero/Hero";
import TrailsHero from "../../components/TrailsHero/TrailsHero";
import HorizontalListings from "../../components/Listing/HorizontalListings";
import { getHighlights } from "../../api/staysHighlightsService"; // 👈 service (fetch API)
import { toast } from "sonner";

const MAX_FEATURED = 8;

export default function Home() {
  const [items, setItems] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingFeatured(true);
        const data = await getHighlights({ limit: MAX_FEATURED });
        if (!alive) return;
        setItems(data.items || []);
      } catch (e) {
        toast.error("Nu am putut încărca cazări recomandate");
        setItems([]);
      } finally {
        if (alive) setLoadingFeatured(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Hero />

      <HorizontalListings
        title="Cazări recomandate"
        subtitle="Selecție atent aleasă pentru Bucovina"
        items={items}
        loading={loadingFeatured}          // 👈 opțional (dacă vrei skeleton)
        onOpen={(id) => console.log("open listing", id)} // sau navighezi
      />

      <TrailsHero />
    </>
  );
}
