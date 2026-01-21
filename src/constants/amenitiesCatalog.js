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
    Leaf,
    UtensilsCrossed,
    PawPrint,
    ShieldAlert,
    FlameKindling,
    Cross,
    Cctv,
  } from "lucide-react";
  
  /**
   * IMPORTANT:
   * - key trebuie să fie EXACT ca în backend FACILITIES
   * - icon = component lucide
   * - category = folosit la grouping în picker
   */
  export const AMENITIES_CATALOG = [
    // Essentials
    { key: "wifi", label: "Wi-Fi", icon: Wifi, category: "Esentiale" },
    { key: "heating", label: "Încălzire", icon: Heater, category: "Esentiale" },
    { key: "hotWater", label: "Apă caldă", icon: Droplets, category: "Esentiale" },
    { key: "towels", label: "Prosoape", icon: Bath, category: "Esentiale" },
    { key: "bedLinen", label: "Lenjerie de pat", icon: Bed, category: "Esentiale" },
    { key: "hairDryer", label: "Uscător de păr", icon: Wind, category: "Esentiale" },
    { key: "essentials", label: "Consumabile de bază", icon: Package, category: "Esentiale" },
  
    // Parking & access
    { key: "parking", label: "Parcare", icon: Car, category: "Acces & parcare" },
    { key: "freeStreetParking", label: "Parcare la stradă (gratuit)", icon: ParkingSquare, category: "Acces & parcare" },
    { key: "privateEntrance", label: "Intrare privată", icon: DoorOpen, category: "Acces & parcare" },
    { key: "selfCheckIn", label: "Self check-in", icon: KeyRound, category: "Acces & parcare" },
  
    // Kitchen & dining
    { key: "kitchen", label: "Bucătărie", icon: CookingPot, category: "Bucătărie" },
    { key: "fridge", label: "Frigider", icon: Refrigerator, category: "Bucătărie" },
    { key: "stove", label: "Plită / aragaz", icon: Flame, category: "Bucătărie" },
    { key: "oven", label: "Cuptor", icon: Soup, category: "Bucătărie" },
    { key: "microwave", label: "Cuptor cu microunde", icon: Soup, category: "Bucătărie" },
    { key: "coffeeMaker", label: "Espressor / cafea", icon: Coffee, category: "Bucătărie" },
    { key: "kettle", label: "Fierbător", icon: GlassWater, category: "Bucătărie" },
    { key: "dishesAndCutlery", label: "Veselă & tacâmuri", icon: Utensils, category: "Bucătărie" },
    { key: "bbq", label: "Grătar / BBQ", icon: Beef, category: "Bucătărie" },
  
    // Comfort & indoor
    { key: "ac", label: "Aer condiționat", icon: Snowflake, category: "Confort" },
    { key: "fireplace", label: "Șemineu", icon: Home, category: "Confort" },
    { key: "washer", label: "Mașină de spălat", icon: WashingMachine, category: "Confort" },
    { key: "iron", label: "Fier de călcat", icon: Shirt, category: "Confort" },
    { key: "workspace", label: "Spațiu de lucru", icon: Laptop, category: "Confort" },
  
    // Entertainment
    { key: "tv", label: "TV", icon: Tv, category: "Entertainment" },
    { key: "streaming", label: "Streaming (Netflix etc.)", icon: PlaySquare, category: "Entertainment" },
    { key: "boardGames", label: "Jocuri de societate", icon: Dices, category: "Entertainment" },
  
    // Family
    { key: "crib", label: "Pătuț copil", icon: Baby, category: "Family" },
    { key: "highChair", label: "Scaun înalt copil", icon: Armchair, category: "Family" },
  
    // Outdoor / view
    { key: "terrace", label: "Terasă", icon: Sparkles, category: "Exterior & view" },
    { key: "garden", label: "Grădină", icon: Trees, category: "Exterior & view" },
    { key: "mountainView", label: "Vedere la munte", icon: Mountain, category: "Exterior & view" },
  
    // Wellness
    { key: "sauna", label: "Saună", icon: Waves, category: "Wellness" },
    { key: "hotTub", label: "Ciubăr / Hot tub", icon: Waves, category: "Wellness" },
    { key: "spa", label: "SPA", icon: Sparkles, category: "Wellness" },
  
    // Services
    { key: "breakfast", label: "Mic dejun", icon: UtensilsCrossed, category: "Servicii" },
  
    // Pets
    { key: "petFriendly", label: "Pet friendly", icon: PawPrint, category: "Animale" },
  
    // Safety
    { key: "smokeAlarm", label: "Detector fum", icon: ShieldAlert, category: "Siguranță" },
    { key: "fireExtinguisher", label: "Extinctor", icon: FlameKindling, category: "Siguranță" },
    { key: "firstAidKit", label: "Trusă prim ajutor", icon: Cross, category: "Siguranță" },
    { key: "cctvOutside", label: "Camere exterior", icon: Cctv, category: "Siguranță" },
  ];
  
  // helpers
  export const AMENITY_BY_KEY = Object.fromEntries(AMENITIES_CATALOG.map((a) => [a.key, a]));
  export const AMENITY_CATEGORIES = Array.from(new Set(AMENITIES_CATALOG.map((a) => a.category)));
  