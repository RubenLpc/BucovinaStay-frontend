import {
  Wifi,
  Heater,
  Droplets,
  Bath,
  Bed,
  Wind,
  Package,
  Car,
  ParkingSquare,
  DoorOpen,
  KeyRound,
  Refrigerator,
  CookingPot,
  Flame,
  Soup,
  Coffee,
  GlassWater,
  Utensils,
  Beef,
  Snowflake,
  Home,
  WashingMachine,
  Shirt,
  Laptop,
  Tv,
  PlaySquare,
  Dices,
  Baby,
  Armchair,
  Trees,
  Mountain,
  Sparkles,
  Waves,
  UtensilsCrossed,
  PawPrint,
  ShieldAlert,
  FlameKindling,
  Cross,
  Cctv,
} from "lucide-react";

/**
 * IMPORTANT:
 * - key = EXACT ca în backend FACILITIES
 * - icon = component lucide
 * - categoryKey = folosit la grouping (tradus din i18n)
 * - labelKey = tradus din i18n
 */
export const AMENITIES_CATALOG = [
  // Essentials
  { key: "wifi", labelKey: "amenities.wifi", icon: Wifi, categoryKey: "amenityCats.essentials" },
  { key: "heating", labelKey: "amenities.heating", icon: Heater, categoryKey: "amenityCats.essentials" },
  { key: "hotWater", labelKey: "amenities.hotWater", icon: Droplets, categoryKey: "amenityCats.essentials" },
  { key: "towels", labelKey: "amenities.towels", icon: Bath, categoryKey: "amenityCats.essentials" },
  { key: "bedLinen", labelKey: "amenities.bedLinen", icon: Bed, categoryKey: "amenityCats.essentials" },
  { key: "hairDryer", labelKey: "amenities.hairDryer", icon: Wind, categoryKey: "amenityCats.essentials" },
  { key: "essentials", labelKey: "amenities.essentials", icon: Package, categoryKey: "amenityCats.essentials" },

  // Parking & access
  { key: "parking", labelKey: "amenities.parking", icon: Car, categoryKey: "amenityCats.accessParking" },
  { key: "freeStreetParking", labelKey: "amenities.freeStreetParking", icon: ParkingSquare, categoryKey: "amenityCats.accessParking" },
  { key: "privateEntrance", labelKey: "amenities.privateEntrance", icon: DoorOpen, categoryKey: "amenityCats.accessParking" },
  { key: "selfCheckIn", labelKey: "amenities.selfCheckIn", icon: KeyRound, categoryKey: "amenityCats.accessParking" },

  // Kitchen & dining
  { key: "kitchen", labelKey: "amenities.kitchen", icon: CookingPot, categoryKey: "amenityCats.kitchen" },
  { key: "fridge", labelKey: "amenities.fridge", icon: Refrigerator, categoryKey: "amenityCats.kitchen" },
  { key: "stove", labelKey: "amenities.stove", icon: Flame, categoryKey: "amenityCats.kitchen" },
  { key: "oven", labelKey: "amenities.oven", icon: Soup, categoryKey: "amenityCats.kitchen" },
  { key: "microwave", labelKey: "amenities.microwave", icon: Soup, categoryKey: "amenityCats.kitchen" },
  { key: "coffeeMaker", labelKey: "amenities.coffeeMaker", icon: Coffee, categoryKey: "amenityCats.kitchen" },
  { key: "kettle", labelKey: "amenities.kettle", icon: GlassWater, categoryKey: "amenityCats.kitchen" },
  { key: "dishesAndCutlery", labelKey: "amenities.dishesAndCutlery", icon: Utensils, categoryKey: "amenityCats.kitchen" },
  { key: "bbq", labelKey: "amenities.bbq", icon: Beef, categoryKey: "amenityCats.kitchen" },

  // Comfort & indoor
  { key: "ac", labelKey: "amenities.ac", icon: Snowflake, categoryKey: "amenityCats.comfort" },
  { key: "fireplace", labelKey: "amenities.fireplace", icon: Home, categoryKey: "amenityCats.comfort" },
  { key: "washer", labelKey: "amenities.washer", icon: WashingMachine, categoryKey: "amenityCats.comfort" },
  { key: "iron", labelKey: "amenities.iron", icon: Shirt, categoryKey: "amenityCats.comfort" },
  { key: "workspace", labelKey: "amenities.workspace", icon: Laptop, categoryKey: "amenityCats.comfort" },

  // Entertainment
  { key: "tv", labelKey: "amenities.tv", icon: Tv, categoryKey: "amenityCats.entertainment" },
  { key: "streaming", labelKey: "amenities.streaming", icon: PlaySquare, categoryKey: "amenityCats.entertainment" },
  { key: "boardGames", labelKey: "amenities.boardGames", icon: Dices, categoryKey: "amenityCats.entertainment" },

  // Family
  { key: "crib", labelKey: "amenities.crib", icon: Baby, categoryKey: "amenityCats.family" },
  { key: "highChair", labelKey: "amenities.highChair", icon: Armchair, categoryKey: "amenityCats.family" },

  // Outdoor / view
  { key: "terrace", labelKey: "amenities.terrace", icon: Sparkles, categoryKey: "amenityCats.outdoorView" },
  { key: "garden", labelKey: "amenities.garden", icon: Trees, categoryKey: "amenityCats.outdoorView" },
  { key: "mountainView", labelKey: "amenities.mountainView", icon: Mountain, categoryKey: "amenityCats.outdoorView" },

  // Wellness
  { key: "sauna", labelKey: "amenities.sauna", icon: Waves, categoryKey: "amenityCats.wellness" },
  { key: "hotTub", labelKey: "amenities.hotTub", icon: Waves, categoryKey: "amenityCats.wellness" },
  { key: "spa", labelKey: "amenities.spa", icon: Sparkles, categoryKey: "amenityCats.wellness" },

  // Services
  { key: "breakfast", labelKey: "amenities.breakfast", icon: UtensilsCrossed, categoryKey: "amenityCats.services" },

  // Pets
  { key: "petFriendly", labelKey: "amenities.petFriendly", icon: PawPrint, categoryKey: "amenityCats.pets" },

  // Safety
  { key: "smokeAlarm", labelKey: "amenities.smokeAlarm", icon: ShieldAlert, categoryKey: "amenityCats.safety" },
  { key: "fireExtinguisher", labelKey: "amenities.fireExtinguisher", icon: FlameKindling, categoryKey: "amenityCats.safety" },
  { key: "firstAidKit", labelKey: "amenities.firstAidKit", icon: Cross, categoryKey: "amenityCats.safety" },
  { key: "cctvOutside", labelKey: "amenities.cctvOutside", icon: Cctv, categoryKey: "amenityCats.safety" },
];

// helpers (rămân ok)
export const AMENITY_BY_KEY = Object.fromEntries(AMENITIES_CATALOG.map((a) => [a.key, a]));
export const AMENITY_CATEGORIES = Array.from(new Set(AMENITIES_CATALOG.map((a) => a.categoryKey)));
