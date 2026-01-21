import React, { useEffect, useState } from "react";
import Hero from "../../components/Hero/Hero";
import TrailsHero from "../../components/TrailsHero/TrailsHero";
import HorizontalListings from "../../components/Listing/HorizontalListings";
import HomeCategories from "../../components/Home/HomeCategories";
import HomeTrust from "../../components/Home/HomeTrust";
import HomeFinalCTA from "../../components/Home/HomeFinalCTA";

import { getHighlights } from "../../api/staysHighlightsService";
import { aiSemanticSearch } from "../../api/aiSearchService";
import { toast } from "sonner";

const MAX_FEATURED = 8;

export default function Home() {
  const [items, setItems] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [aiLoading, setAiLoading] = useState(false);
  const [mode, setMode] = useState("highlights"); // highlights | ai
  const [aiQuery, setAiQuery] = useState("");

  const loadHighlights = async () => {
    try {
      setLoadingFeatured(true);
      const data = await getHighlights({ limit: MAX_FEATURED });
      setItems(data.items || []);
      setMode("highlights");
      setAiQuery("");
    } catch (e) {
      toast.error("Nu am putut încărca cazări recomandate");
      setItems([]);
    } finally {
      setLoadingFeatured(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingFeatured(true);
        const data = await getHighlights({ limit: MAX_FEATURED });
        if (!alive) return;
        setItems(data.items || []);
      } catch {
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

  // ✅ callback primit de Hero
  const handleAISearch = async (q) => {
    try {
      const query = String(q || "").trim();
      if (!query) return;

      setAiLoading(true);
      setAiQuery(query);

      const data = await aiSemanticSearch(query, { limit: MAX_FEATURED });
      const next = data?.items || [];

      setItems(next);
      setMode("ai");

      requestAnimationFrame(() => {
        document.getElementById("hl2-listings")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      

      if (!next.length) {
        toast.info("Nu am găsit rezultate.", { description: "Încearcă o descriere diferită." });
      }
    } catch (e) {
      toast.error("Căutarea AI a eșuat.", { description: e?.message || "Încearcă din nou." });
    } finally {
      setAiLoading(false);
    }
  };

  const title =
    mode === "ai" ? `Rezultate pentru: “${aiQuery}”` : "Cazări recomandate";

  const subtitle =
    mode === "ai"
      ? "Potrivire semantică (AI)"
      : "Selecție atent aleasă pentru Bucovina";

  return (
    <>
      <Hero onAISearch={handleAISearch} aiLoading={aiLoading} />

      <HorizontalListings
        title={title}
        subtitle={subtitle}
        items={items}
        loading={loadingFeatured || aiLoading}
        onOpen={(id) => console.log("open listing", id)}
        // opțional: un buton de reset dacă ești în AI mode
        onSeeAll={mode === "ai" ? loadHighlights : undefined}
      />

      <TrailsHero />
      <div className="container">
        <HomeCategories />
        <HomeTrust variant="rating" rating={4.9} reviews={1200} />
        <HomeFinalCTA />
      </div>
    </>
  );
}
