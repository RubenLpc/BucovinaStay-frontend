import React from "react";
import Hero from "../../components/Hero/Hero";
import listingsMock from "../../data/listings.mock";
import HorizontalListings from "../../components/Listing/HorizontalListings";
import TrailsHero from "../../components/TrailsHero/TrailsHero";
import { smartScore } from "../../utils/smartScore";
const MAX_FEATURED = 8;
const featuredListings = [...listingsMock]
  .sort((a, b) => smartScore(b) - smartScore(a))
  .slice(0, MAX_FEATURED);

export default function Home() {
  return (
    <>
      <Hero />

      <HorizontalListings
        title="Cazări recomandate"
        subtitle="Selecție atent aleasă pentru Bucovina"
        items={featuredListings}
        onOpen={(id) => console.log("open listing", id)}
        
      />

<TrailsHero />

    </>
  );
}
