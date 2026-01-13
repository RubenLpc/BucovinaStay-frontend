// client/src/pages/Trails/trailsData.js

const OFFICIAL = {
  // Județul Suceava – listă trasee montane (fiecare traseu are pagină proprie + “Vezi pe hartă”)
  judetTraseeMontane:
    "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/",

  // PDF-uri Salvamont Suceava (utile ca sursă generală / backup)
  salvamontPdf2025:
    "https://cjsuceava.ro/2025/salvamont/trasee_turistice_montane.pdf",
  salvamontPdf2016:
    "https://www.cjsuceava.ro/2016/salvamont/trasee_turistice_montane.pdf",

  // Recomandări / trasee (jandarmi)
  jandarmiTrasee: "https://www.jandarmeriasuceava.ro/trasee-montane.html",

  // Via Transilvanica
  via: "https://www.viatransilvanica.com/",
  viaMap: "https://www.viatransilvanica.com/ro/harta/",

  // Călimani (portal dedicat)
  calimaniTrasee: "https://calimani.ro/trasee-calimani",
  calimaniHarta: "https://calimani.ro/harta-calimani",
};

// imagine stabilă (seed) – merge în orice mediu
function imgSeed(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/800`;
}

// mic helper ca să nu repeți mereu
function linksDefault(extra = []) {
  return [
    { label: "Județul Suceava – Trasee montane", url: OFFICIAL.judetTraseeMontane },
    { label: "Salvamont Suceava – Trasee (PDF)", url: OFFICIAL.salvamontPdf2025 },
    { label: "Jandarmeria Suceava – Recomandări", url: OFFICIAL.jandarmiTrasee },
    ...extra,
  ];
}

const trailsData = [
  /* ================= RARĂU / GIUMALĂU (Județul Suceava) ================= */

  {
    id: "sv-01",
    name: "Cabana Zugreni – Sat Valea Putnei",
    area: "Zugreni / Valea Putnei",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "ridge", "nature"],
    image: imgSeed("bucovina-zugreni-valeaputnei"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/cabana-zugreni-sat-valea-putnei/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-02",
    name: "Sat Valea Putnei – Cabana Giumalău",
    area: "Valea Putnei / Giumalău",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "view", "nature"],
    image: imgSeed("bucovina-giumalau-cabana"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/sat-valea-putnei-cabana-giumalau/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-03",
    name: "Comuna Pojorâta – Cabana Zugreni",
    area: "Pojorâta / Zugreni",
    difficulty: "Mediu",
    durationHrs: 6,
    distanceKm: null,
    season: "Vara / Iarna (din sursă)",
    tags: ["forest", "nature"],
    image: imgSeed("pojorata-zugreni"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/comuna-pojorata-cabana-zugreni/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-04",
    name: "Vârful Giumalău – Cabana Rarău",
    area: "Giumalău / Rarău",
    difficulty: "Greu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["ridge", "view", "nature"],
    image: imgSeed("giumalau-rarau-ridge"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/varful-giumalau-cabana-rarau/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-05",
    name: "Câmpulung Moldovenesc – Hotel Alpin Rarău",
    area: "Câmpulung Moldovenesc / Rarău",
    difficulty: "Ușor",
    durationHrs: null,
    distanceKm: null,
    season: "Tot anul (estimativ)",
    tags: ["forest", "family"],
    image: imgSeed("campulung-hotel-rarau"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/campulung-moldovenesc-hotel-alpin-rarau/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-06",
    name: "Comuna Pojorâta – Hotel Rarău Alpin",
    area: "Pojorâta / Rarău",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "nature"],
    image: imgSeed("pojorata-rarau-alpin"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/comuna-pojorata-hotel-rarau-alpin/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-07",
    name: "Sat Chiril – Hotel Rarău Alpin",
    area: "Chiril / Rarău",
    difficulty: "Ușor",
    durationHrs: 3,
    distanceKm: null,
    season: "Tot anul (din sursă)",
    tags: ["forest", "family"],
    image: imgSeed("chiril-rarau-alpin"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/sat-chiril-hotel-rarau-alpin/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-08",
    name: "Câmpulung Moldovenesc – Vârful Popii Rarăului",
    area: "Câmpulung Moldovenesc / Rarău",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["view", "ridge", "nature"],
    image: imgSeed("rarau-popii"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/campulung-moldovenesc-varful-popii-raraului/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-09",
    name: "Gura Humorului – Masivul Rarău",
    area: "Gura Humorului / Rarău",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "nature", "view"],
    image: imgSeed("gura-humorului-rarau"),
    // (link-ul individual uneori se încarcă greu; păstrez sursa oficială principală)
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  {
    id: "sv-10",
    name: "Cabana Rarău – Pietrele Doamnei",
    area: "Rarău",
    difficulty: "Ușor",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["view", "family", "rocks"],
    image: imgSeed("pietrele-doamnei-rarau"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  /* ================= ZUGRENI / BISTRIȚA (Județul Suceava) ================= */

  {
    id: "sv-11",
    name: "Cabana Zugreni – Șaua La Izvorul Rău",
    area: "Zugreni / Munții Bistriței",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "ridge"],
    image: imgSeed("zugreni-izvorul-rau"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/cabana-zugreni-saua-la-izvorul-rau/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-12",
    name: "Sat Rusca – Sat Crucea",
    area: "Rusca / Crucea",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Tot anul (estimativ)",
    tags: ["forest", "nature"],
    image: imgSeed("rusca-crucea"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/sat-rusca-sat-crucea/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-13",
    name: "Ortoaia – Bârnărel (sat Crucea)",
    area: "Ortoaia / Crucea",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Tot anul (estimativ)",
    tags: ["forest", "nature"],
    image: imgSeed("ortoaia-barnarel"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/ortoaia-barnarel-sat-crucea/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-14",
    name: "Crucea – Munții Bistriței",
    area: "Crucea / Munții Bistriței",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["ridge", "view", "nature"],
    image: imgSeed("crucea-bistritei"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  /* ================= ȚARA DORNELOR / ROTUNDA / MESTECĂNIȘ ================= */

  {
    id: "sv-15",
    name: "Vatra Dornei – Pasul Rotunda",
    area: "Vatra Dornei / Rotunda",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["view", "ridge", "nature"],
    image: imgSeed("vatra-dornei-rotunda"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/vatra-dornei-pasul-rotunda/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-16",
    name: "Vatra Dornei – Pasul Mestecăniș",
    area: "Vatra Dornei / Mestecăniș",
    difficulty: "Ușor",
    durationHrs: null,
    distanceKm: null,
    season: "Tot anul (estimativ)",
    tags: ["forest", "family"],
    image: imgSeed("vatra-dornei-mestecanis"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/vatra-dornei-pasul-mestecanis/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-17",
    name: "Pasul Mestecăniș – Curmătura Prislop",
    area: "Mestecăniș / Prislop",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["ridge", "view"],
    image: imgSeed("mestecanis-prislop"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/pasul-mestecanis-curmatura-prislop/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-18",
    name: "Dorna Candrenilor – Iacobeni",
    area: "Dorna Candrenilor / Iacobeni",
    difficulty: "Ușor",
    durationHrs: null,
    distanceKm: null,
    season: "Tot anul (estimativ)",
    tags: ["forest", "relax"],
    image: imgSeed("dorna-candrenilor-iacobeni"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/dorna-candrenilor-iacobeni/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-19",
    name: "Neagra Șarului – Apa Rece",
    area: "Neagra Șarului / Călimani",
    difficulty: "Mediu",
    durationHrs: 4,
    distanceKm: null,
    season: "Tot anul (din sursă)",
    tags: ["forest", "nature"],
    image: imgSeed("neagra-sarului-apa-rece"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/neagra-sarului-apa-rece/",
    officialLinks: linksDefault(),
  },

  /* ================= CĂLIMANI (Județul Suceava + calimani.ro) ================= */

  {
    id: "sv-20",
    name: "Exploatarea minieră Călimani – Vârful Rețițiș",
    area: "Munții Călimani",
    difficulty: "Greu",
    durationHrs: null,
    distanceKm: null,
    season: "Iun–Sep (estimativ)",
    tags: ["alpine", "summit", "long"],
    image: imgSeed("calimani-retitis"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/exploatarea-miniera-calimani-varful-retitis/",
    officialLinks: linksDefault([
      { label: "Călimani – Trasee (oficial)", url: OFFICIAL.calimaniTrasee },
      { label: "Călimani – Hartă (oficial)", url: OFFICIAL.calimaniHarta },
    ]),
  },

  {
    id: "sv-21",
    name: "Gura Haitii – Sat Coverca",
    area: "Gura Haitii / Călimani",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "nature"],
    image: imgSeed("gura-haitii-coverca"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/gura-haitii-sat-coverca/",
    officialLinks: linksDefault([
      { label: "Călimani – Trasee (oficial)", url: OFFICIAL.calimaniTrasee },
      { label: "Călimani – Hartă (oficial)", url: OFFICIAL.calimaniHarta },
    ]),
  },

  {
    id: "sv-22",
    name: "Gura Haitii – Coada Pietrosului",
    area: "Gura Haitii / Călimani",
    difficulty: "Greu",
    durationHrs: null,
    distanceKm: null,
    season: "Iun–Sep (estimativ)",
    tags: ["alpine", "ridge", "long"],
    image: imgSeed("gura-haitii-coada-pietrosului"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/gura-haitii-coada-pietrosului/",
    officialLinks: linksDefault([
      { label: "Călimani – Trasee (oficial)", url: OFFICIAL.calimaniTrasee },
      { label: "Călimani – Hartă (oficial)", url: OFFICIAL.calimaniHarta },
    ]),
  },

  {
    id: "sv-23",
    name: "Vatra Dornei – Lunca Bradului",
    area: "Vatra Dornei / Călimani",
    difficulty: "Greu",
    durationHrs: 22,
    distanceKm: 70,
    season: "Fără iarnă (din sursă)",
    tags: ["alpine", "long", "ridge"],
    image: imgSeed("vatra-dornei-lunca-bradului"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/vatra-dornei-lunca-bradului/",
    officialLinks: linksDefault([
      { label: "Călimani – Trasee (oficial)", url: OFFICIAL.calimaniTrasee },
      { label: "Călimani – Hartă (oficial)", url: OFFICIAL.calimaniHarta },
    ]),
  },

  {
    id: "sv-24",
    name: "Gura Haitii – Poiana Negrii",
    area: "Gura Haitii / Poiana Negrii",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "nature"],
    image: imgSeed("gura-haitii-poiana-negrii"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/gura-haitii-poiana-negrii/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-25",
    name: "Poiana Negrii – Vârful Lucaciu",
    area: "Poiana Negrii / Călimani",
    difficulty: "Greu",
    durationHrs: null,
    distanceKm: null,
    season: "Iun–Sep (estimativ)",
    tags: ["alpine", "summit"],
    image: imgSeed("poiana-negrii-lucaciu"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  {
    id: "sv-26",
    name: "Sat Coșna – Vârful Lucaciu",
    area: "Coșna / Călimani",
    difficulty: "Greu",
    durationHrs: null,
    distanceKm: null,
    season: "Iun–Sep (estimativ)",
    tags: ["alpine", "summit"],
    image: imgSeed("cosna-lucaciu"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  {
    id: "sv-27",
    name: "Drăgoiasa – Vârful Lucaciu",
    area: "Drăgoiasa / Călimani",
    difficulty: "Greu",
    durationHrs: null,
    distanceKm: null,
    season: "Iun–Sep (estimativ)",
    tags: ["alpine", "summit"],
    image: imgSeed("dragoiasa-lucaciu"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  /* ================= ALTE TRASEE (Județul Suceava) ================= */

  {
    id: "sv-28",
    name: "Ciocănești – Coșna",
    area: "Ciocănești / Coșna",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "culture", "nature"],
    image: imgSeed("ciocanesti-cosna"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/ciocanesti-cosna/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-29",
    name: "Satul Păltiniș (comuna Vătava) – traseu montan",
    area: "Păltiniș / zona Dornelor",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "nature"],
    image: imgSeed("paltinis-vatava-trail"),
    url: "https://judetulsuceava.ro/descopera/turism/trasee-turistice/trasee-montane/satul-paltinis-comuna-vatava/",
    officialLinks: linksDefault(),
  },

  {
    id: "sv-30",
    name: "Lunca Bradului – Piatra Fântânele",
    area: "Călimani / Piatra Fântânele",
    difficulty: "Greu",
    durationHrs: null,
    distanceKm: null,
    season: "Iun–Sep (estimativ)",
    tags: ["alpine", "long"],
    image: imgSeed("lunca-bradului-piatra-fantanele"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  {
    id: "sv-31",
    name: "Broșteni – Stânișoara",
    area: "Broșteni / Stânișoara",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "nature"],
    image: imgSeed("brosteni-stanisoara"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  {
    id: "sv-32",
    name: "Sat Călinești Enache – Vârful Ciolanu",
    area: "Călinești Enache / Ciolanu",
    difficulty: "Greu",
    durationHrs: null,
    distanceKm: null,
    season: "Iun–Sep (estimativ)",
    tags: ["ridge", "view", "nature"],
    image: imgSeed("calinesti-enache-ciolanu"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  {
    id: "sv-33",
    name: "Oița – Vârful Ciolanu",
    area: "Oița / Ciolanu",
    difficulty: "Greu",
    durationHrs: null,
    distanceKm: null,
    season: "Iun–Sep (estimativ)",
    tags: ["ridge", "view", "nature"],
    image: imgSeed("oita-ciolanu"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  {
    id: "sv-34",
    name: "Comuna Dorna Candrenilor – Vârful Runcu",
    area: "Dorna Candrenilor / Runcu",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Mai–Oct (estimativ)",
    tags: ["forest", "view"],
    image: imgSeed("dorna-candrenilor-runcu"),
    url: OFFICIAL.judetTraseeMontane,
    officialLinks: linksDefault(),
  },

  /* ================= VIA TRANSILVANICA (oficial) ================= */

  {
    id: "via-01",
    name: "Via Transilvanica – segment Bucovina (start Putna)",
    area: "Putna / Bucovina",
    difficulty: "Mediu",
    durationHrs: null,
    distanceKm: null,
    season: "Primăvară–Toamnă (recomandat)",
    tags: ["forest", "culture", "long"],
    image: imgSeed("via-transilvanica-bucovina"),
    url: OFFICIAL.viaMap,
    officialLinks: [
      { label: "Via Transilvanica (oficial)", url: OFFICIAL.via },
      { label: "Via Transilvanica – Hartă (oficial)", url: OFFICIAL.viaMap },
    ],
  },
];

export default trailsData;
export { OFFICIAL };
