// Reference data for Patte Conservation / Iweni LMMA. Nothing here is sample activity data.
// Everything below can be edited in the app (zones, infringements, fees, projects) once it is running.

// Iweni LMMA coordinate table as supplied by Patte Conservation (degrees, minutes, seconds; all South / East).
const dms = (d, m, s) => d + m / 60 + s / 3600;
const LMMA_POINTS = [
  [1, dms(2, 12, 37.94), dms(41, 1, 11.55)],
  [2, dms(2, 12, 54.28), dms(41, 1, 18.63), 'reference'],
  [3, dms(2, 13, 6.64), dms(41, 0, 54.3)],
  [4, dms(2, 13, 14.3), dms(41, 0, 42.5), 'reference'],
  [5, dms(2, 13, 2.9), dms(41, 0, 29.6)],
  [6, dms(2, 12, 49.5), dms(41, 0, 2.28)],
  [7, dms(2, 12, 44.42), dms(41, 0, 3.12)],
  [8, dms(2, 12, 47.06), dms(41, 0, 16.08)],
  [9, dms(2, 12, 48.5), dms(41, 0, 33.9)],
  [10, dms(2, 12, 45.8), dms(41, 0, 49.5)],
  [11, dms(2, 12, 32.8), dms(41, 0, 2), 'reference'],
  [12, dms(2, 12, 14.5), dms(41, 0, 57.2)],
].map(([n, la, lo, tag]) => ({ n, lat: -la, lon: lo, tag: tag || null }));

// Zone shapes follow the client's Figure 1. The 12 supplied points make three shapes:
//   Seagrass habitat, gear restricted zone (north strip): 11, 12, 1, 10, 9, 8, 7
//   Reef habitat, no-take zone (south, offshore):         7, 8, 9, 10, 1, 2, 3, 4, 5, 6
//   LMMA outline (both together):                         11, 12, 1, 2, 3, 4, 5, 6, 7
// Joining the points 1 to 12 in table order cuts a diagonal from 10 to 11 and leaves a wedge that belongs to no zone.
const ring = (pts) => { const r = pts.map((p) => [p.lon, p.lat]); return [...r, r[0]]; };
const pick = (ns) => ns.map((n) => LMMA_POINTS.find((p) => p.n === n));
const SEED_NOTE = 'Zone shapes follow the client Figure 1 (reef habitat south, seagrass habitat north), built from the 12 supplied points.';
const feature = (name, kind, ns, habitat) => ({
  type: 'Feature',
  properties: { name, kind, habitat, points: ns, note: SEED_NOTE },
  geometry: { type: 'Polygon', coordinates: [ring(pick(ns))] },
});

const SEED_ZONES = [
  { id: 'zone-lmma', name: 'Iweni LMMA (co-management area)', kind: 'lmma', stated_km2: 2.25,
    feature: feature('Iweni LMMA', 'lmma', [11, 12, 1, 2, 3, 4, 5, 6, 7], '') },
  { id: 'zone-gear', name: 'Seagrass habitat: Gear restricted zone', kind: 'gear', stated_km2: 1.2,
    feature: feature('Seagrass habitat: Gear restricted zone', 'gear', [11, 12, 1, 10, 9, 8, 7], 'Seagrass') },
  { id: 'zone-ntz', name: 'Reef habitat: No-take zone', kind: 'ntz', stated_km2: 1.05,
    feature: feature('Reef habitat: No-take zone', 'ntz', [7, 8, 9, 10, 1, 2, 3, 4, 5, 6], 'Reef') },
];

// Villages and landmarks shown on the maps. Admin can add more (Iweni LMMA > Coordinates).
const LANDMARKS = [{ id: 'lm-pate', name: 'Pate', kind: 'village', lat: -2.142838333, lon: 40.99678167 }];

// BMU certificate details (Beach Management Unit, Pate).
const BMU = {
  name: 'Pate Island Beach Management Unit',
  county: 'Lamu', subcounty: 'Lamu East', ward: 'Faza', village: 'Pate',
  certificate_point: { lat: -2.142838333, lon: 40.99678167 },
  co_management_area: 'Ndo Pate upto Shinda Kasi',
};

// Infringement catalogue. 'paper' is the number used on the paper Form 1A / Annex 2 where one exists.
// The grouping reflects the zone rules and the ranger Entry Log "Type of Infringement" wording. Patte and Fisheries
// should confirm legal references and penalties before this is used for prosecution.
const INFRINGEMENTS = [
  ['L1', 'Licensing and registration', 'Fishing without a valid licence', 1],
  ['L2', 'Licensing and registration', 'Craft without valid registration', 9],
  ['L3', 'Licensing and registration', 'Underage person fishing', 10],
  ['L4', 'Licensing and registration', 'Fishing in the co-management area without BMU membership or permit', null],
  ['Z1', 'Zones and seasons', 'Fishing or extraction inside the no-take zone', 3],
  ['Z2', 'Zones and seasons', 'Entering the no-take zone with fishing gear on board', null],
  ['Z3', 'Zones and seasons', 'Restricted gear used in the gear-restricted zone', 4],
  ['Z4', 'Zones and seasons', 'Fishing during a closed season', 3],
  ['G1', 'Gear', 'Beach seine net (juya)', 2],
  ['G2', 'Gear', 'Monofilament net', 2],
  ['G3', 'Gear', 'Net with mesh smaller than 2.5 inch', 2],
  ['G4', 'Gear', 'Spearfishing with scuba or compressor', 2],
  ['G5', 'Gear', 'Poison, explosives or other destructive method', 2],
  ['G6', 'Gear', 'Unmarked or unlicensed gear', null],
  ['C1', 'Catch', 'Immature or undersize fish taken', 5],
  ['C2', 'Catch', 'Endangered species caught, harmed or traded (turtle, dugong, shark, ray)', null],
  ['C3', 'Catch', 'Fish unfit for consumption', 6],
  ['C4', 'Catch', 'Shells, corals or marine curios collected', null],
  ['H1', 'Habitat', 'Stone or coral collecting', null],
  ['H2', 'Habitat', 'Anchor or vessel damage to coral or seagrass', null],
  ['H3', 'Habitat', 'Mangrove cutting', null],
  ['H4', 'Habitat', 'Pollution or dumping', 8],
  ['T1', 'Conservation fees and permits', 'Snorkelling or diving without paying the conservation fee', null],
  ['T2', 'Conservation fees and permits', 'Research without permit and fee', null],
  ['T3', 'Conservation fees and permits', 'Filming without permit and fee', null],
  ['V1', 'Vessel safety', 'Unseaworthy craft', 7],
  ['V2', 'Vessel safety', 'No life jackets or safety equipment', null],
  ['O1', 'Other', 'Other (describe in the notes)', null],
].map(([code, category, label, paper]) => ({ code, category, label, paper }));

// Conservation fee schedule from patteconservation.com (confirm before charging).
const FEES = [
  { code: 'visit-ke-adult', label: 'Visitor, Kenyan resident, adult', currency: 'KES', amount: 500 },
  { code: 'visit-ke-child', label: 'Visitor, Kenyan resident, child', currency: 'KES', amount: 300 },
  { code: 'visit-int-adult', label: 'Visitor, non-resident, adult', currency: 'USD', amount: 10 },
  { code: 'visit-int-child', label: 'Visitor, non-resident, child', currency: 'USD', amount: 6 },
  { code: 'dive-ke', label: 'Diving, Kenyan resident', currency: 'KES', amount: 1000 },
  { code: 'dive-int', label: 'Diving, non-resident', currency: 'USD', amount: 15 },
  { code: 'research', label: 'Research permit', currency: 'KES', amount: 10000 },
  { code: 'film-local', label: 'Filming, local', currency: 'KES', amount: 20000 },
  { code: 'film-int', label: 'Filming, international', currency: 'KES', amount: 30000 },
];

const PROJECTS = [
  { name: 'Coral Restoration', partner: 'The Ocean Trust Organization', description: 'Coral gardening and reef recovery around Pate.' },
  { name: 'Awareness Campaigns', partner: '', description: 'Community and school awareness on marine conservation.' },
  { name: 'Eco-Tourism', partner: '', description: 'Visitor programme and conservation fee collection.' },
];

const ROLES = {
  admin: 'Super Admin',
  board: 'Board Chairperson',
  ranger: 'Marine Ranger',
  cox: 'Coxswain',
  officer: 'Conservation Officer',
  fisheries: 'Fisheries Officer',
  bmu: 'BMU Representative',
  tourfin: 'Tourism and Finance Officer',
};

module.exports = { LMMA_POINTS, SEED_ZONES, LANDMARKS, BMU, INFRINGEMENTS, FEES, PROJECTS, ROLES };
