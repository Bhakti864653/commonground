/**
 * The offices the Routing Agent can choose from, in one place so they're easy to change.
 *
 * EVERY CONTACT HERE IS A PLACEHOLDER. CommonGround is a student demo with no agreement with any
 * office, so none of these are real government contacts: the addresses use the reserved
 * `.invalid` domain (it can never deliver mail) and the phone numbers are all zeros. The names
 * are generic job descriptions ("public works"), not the names of real institutions. Before
 * anything here could ever point at a real office, someone would have to verify the contact from
 * a primary source and get the office's agreement (see docs/AGENTIC_PIPELINE.md).
 *
 * `categoryIds` are the community categories that usually belong to an office (across every
 * community); `keywords` are lower-case, accent-free words in the seven interface languages that
 * point to it. Both only help the Routing Agent and its rule-based fallback rank the offices; a
 * moderator makes the final call.
 */
export type ReferralOffice = {
  id: string;
  name: string;
  nameEs: string;
  /** One line on what the office handles, given to the Routing Agent. */
  handles: string;
  categoryIds: string[];
  keywords: string[];
  contact: { email: string; phone: string };
};

export const REFERRAL_OFFICES: ReferralOffice[] = [
  {
    id: "public-works",
    name: "Public works and roads (example office)",
    nameEs: "Obras públicas y vías (oficina de ejemplo)",
    handles: "Potholes, damaged roads, sidewalks, bridges, and other public infrastructure.",
    categoryIds: ["road-infrastructure"],
    keywords: [
      "bache", "baches", "via", "calle", "carretera", "acera", "puente", "asfalto", "hueco",
      "pothole", "road", "street", "sidewalk", "bridge", "pavement",
      "buraco", "estrada", "calcada", "ponte", "nid-de-poule", "route", "trottoir", "pont",
      "buca", "strada", "marciapiede", "坑", "道路", "桥", "सड़क", "गड्ढा", "पुल",
    ],
    contact: { email: "obras-publicas@example.invalid", phone: "+000 0000-0001" },
  },
  {
    id: "sanitation",
    name: "Sanitation and garbage collection (example office)",
    nameEs: "Aseo y recolección de basura (oficina de ejemplo)",
    handles: "Uncollected garbage, illegal dumping, overflowing bins, and street cleaning.",
    categoryIds: ["garbage-sanitation"],
    keywords: [
      "basura", "desechos", "recoleccion", "vertedero", "contenedor", "olor",
      "garbage", "trash", "waste", "dumping", "litter", "bin",
      "lixo", "coleta", "ordures", "dechets", "poubelle", "spazzatura", "rifiuti",
      "垃圾", "कचरा", "कूड़ा",
    ],
    contact: { email: "aseo@example.invalid", phone: "+000 0000-0002" },
  },
  {
    id: "drainage",
    name: "Drainage and flooding (example office)",
    nameEs: "Drenaje e inundaciones (oficina de ejemplo)",
    handles: "Blocked drains and sewers, standing water, and recurring flooding.",
    categoryIds: ["flooding-drainage"],
    keywords: [
      "drenaje", "alcantarilla", "inundacion", "charco", "agua", "tapado", "cuneta", "desague",
      "drain", "drainage", "sewer", "flood", "flooding", "puddle", "water",
      "bueiro", "enchente", "alagamento", "egout", "inondation", "fogna", "allagamento", "tombino",
      "排水", "积水", "洪水", "नाली", "बाढ़", "पानी",
    ],
    contact: { email: "drenaje@example.invalid", phone: "+000 0000-0003" },
  },
  {
    id: "lighting",
    name: "Street lighting and electricity (example office)",
    nameEs: "Alumbrado público y electricidad (oficina de ejemplo)",
    handles: "Broken or dark streetlights, damaged poles, and electrical hazards on public land.",
    categoryIds: ["streetlights"],
    keywords: [
      "poste", "luz", "luminaria", "luminarias", "alumbrado", "farola", "cable", "electricidad", "apagado",
      "streetlight", "light", "lamp", "pole", "wire", "electric", "electricity",
      "iluminacao", "lampada", "eclairage", "lampadaire", "illuminazione", "lampione",
      "路灯", "电线", "बिजली", "खंभा", "लाइट",
    ],
    contact: { email: "alumbrado@example.invalid", phone: "+000 0000-0004" },
  },
  {
    id: "transit",
    name: "Transit and traffic (example office)",
    nameEs: "Transporte y tránsito (oficina de ejemplo)",
    handles: "Bus stops, routes, traffic signals, signs, and road safety for traffic.",
    categoryIds: ["transit"],
    keywords: [
      "bus", "parada", "transporte", "semaforo", "transito", "senal", "trafico",
      "stop", "transit", "traffic", "signal", "sign",
      "onibus", "ponto", "transito", "autobus", "arret", "feu", "fermata", "semaforo",
      "公交", "红绿灯", "बस", "ट्रैफ़िक",
    ],
    contact: { email: "transito@example.invalid", phone: "+000 0000-0005" },
  },
  {
    id: "parks",
    name: "Parks and public spaces (example office)",
    nameEs: "Parques y espacios públicos (oficina de ejemplo)",
    handles: "Parks, plazas, playgrounds, trees, and green areas.",
    categoryIds: ["park-maintenance"],
    keywords: [
      "parque", "plaza", "juegos", "arbol", "arboles", "cancha", "jardin",
      "park", "playground", "tree", "trees", "plaza", "field",
      "praca", "arvore", "parc", "jardin", "arbre", "parco", "albero", "giardino",
      "公园", "树", "पार्क", "पेड़",
    ],
    contact: { email: "parques@example.invalid", phone: "+000 0000-0006" },
  },
  {
    id: "other",
    name: "General municipal services (example office)",
    nameEs: "Servicios municipales generales (oficina de ejemplo)",
    handles: "Anything that doesn't clearly belong to another office.",
    categoryIds: ["other"],
    keywords: [],
    contact: { email: "servicios@example.invalid", phone: "+000 0000-0007" },
  },
];

export const FALLBACK_OFFICE_ID = "other";

export function getReferralOffice(id: string): ReferralOffice | undefined {
  return REFERRAL_OFFICES.find((o) => o.id === id);
}

export const REFERRAL_OFFICE_IDS = REFERRAL_OFFICES.map((o) => o.id) as [string, ...string[]];
