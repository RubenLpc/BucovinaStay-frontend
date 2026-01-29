import { Trees, Home, Hotel, Building2, Warehouse, Store } from "lucide-react";

export const PROPERTY_TYPES = [
  {
    key: "cabana",
    labelKey: "propertyTypes.cabana.label",
    descKey: "propertyTypes.cabana.desc",
    Icon: Trees,
    popular: true,
    tone: "forest",
  },
  {
    key: "pensiune",
    labelKey: "propertyTypes.pensiune.label",
    descKey: "propertyTypes.pensiune.desc",
    Icon: Store,
    popular: true,
    tone: "warm",
  },
  {
    key: "hotel",
    labelKey: "propertyTypes.hotel.label",
    descKey: "propertyTypes.hotel.desc",
    Icon: Hotel,
    tone: "neutral",
  },
  {
    key: "apartament",
    labelKey: "propertyTypes.apartament.label",
    descKey: "propertyTypes.apartament.desc",
    Icon: Building2,
    popular: true,
    tone: "urban",
  },
  {
    key: "vila",
    labelKey: "propertyTypes.vila.label",
    descKey: "propertyTypes.vila.desc",
    Icon: Warehouse,
    tone: "lux",
  },
  {
    key: "tiny_house",
    labelKey: "propertyTypes.tiny_house.label",
    descKey: "propertyTypes.tiny_house.desc",
    Icon: Home,
    tone: "cozy",
  },
];
