import {
    Trees,
    Home,
    Hotel,
    Building2,
    Warehouse,
    Store,
  } from "lucide-react";
  
  export const PROPERTY_TYPES = [
    {
      key: "cabana",
      label: "Cabane",
      Icon: Trees,
      description: "Natură & liniște",
      popular: true,
      tone: "forest",
    },
    {
      key: "pensiune",
      label: "Pensiuni",
      Icon: Store,
      description: "Primitoare, tradiționale",
      popular: true,
      tone: "warm",
    },
    {
      key: "hotel",
      label: "Hoteluri",
      Icon: Hotel,
      description: "Confort complet",
      tone: "neutral",
    },
    {
      key: "apartament",
      label: "Apartamente",
      Icon: Building2,
      description: "Urban & practic",
      popular: true,
      tone: "urban",
    },
    
    {
      key: "vila",
      label: "Vile",
      Icon: Warehouse,
      description: "Spațiu & intimitate",
      tone: "lux",
    },
    {
      key: "tiny_house",
      label: "Tiny house",
      Icon: Home,
      description: "Minimal & cozy",
      tone: "cozy",
    },
  ];
  