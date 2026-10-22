import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const JURISDICTION = "New York State";
const ISSUE = "Government surveillance policy";

type Seed = { name: string; type: string; affiliation: string; description: string };

const GOV = "Government Agency/Office";
const LEG = "State Legislator";
const LAW = "Law Enforcement";
const NPO = "Nonprofit/Advocacy Org";

// Offices and organizations only. `currentHolder` is left blank for staff to verify and fill in.
const ACTORS: Seed[] = [
  { name: "Governor of New York (Executive Chamber)", type: GOV, affiliation: "Executive Chamber", description: "Proposes the state budget, signs or vetoes legislation, and directs executive agencies." },
  { name: "NYS Senate Majority Leader", type: LEG, affiliation: "NYS Senate", description: "Leads the Senate majority conference and shapes the Senate's floor agenda." },
  { name: "NYS Assembly Speaker", type: LEG, affiliation: "NYS Assembly", description: "Presides over the Assembly and controls its floor agenda and committee structure." },
  { name: "Chair, Senate Internet & Technology Committee", type: LEG, affiliation: "NYS Senate", description: "Chairs the Senate committee with jurisdiction over technology and internet policy." },
  { name: "Chair, Assembly Science & Technology Committee", type: LEG, affiliation: "NYS Assembly", description: "Chairs the Assembly committee with jurisdiction over science and technology policy." },
  { name: "Chair, Senate Codes Committee", type: LEG, affiliation: "NYS Senate", description: "Chairs the Senate committee that reviews criminal procedure and public safety legislation." },
  { name: "Chair, Assembly Codes Committee", type: LEG, affiliation: "NYS Assembly", description: "Chairs the Assembly committee that reviews criminal procedure and public safety legislation." },
  { name: "NYS Senate Minority (Republican) Conference", type: LEG, affiliation: "NYS Senate, Republican", description: "The Republican minority conference in the State Senate." },
  { name: "New York State Attorney General", type: GOV, affiliation: "Office of the Attorney General", description: "State's chief legal officer; enforces state law and can issue legal guidance and opinions." },
  { name: "New York City Police Department (NYPD)", type: LAW, affiliation: "City of New York", description: "The city's police force and a major user of surveillance technology." },
  { name: "Office of the Mayor of New York City", type: GOV, affiliation: "City of New York", description: "Executive office of the city; oversees city agencies including the police department." },
  { name: "Police Benevolent Association of the City of New York (PBA)", type: "Union", affiliation: "NYC police officers' union", description: "Union representing NYPD police officers." },
  { name: "New York State Sheriffs' Association", type: LAW, affiliation: "Statewide association", description: "Professional association of the state's county sheriffs." },
  { name: "District Attorneys Association of the State of New York", type: LAW, affiliation: "Statewide association", description: "Professional association of the state's district attorneys." },
  { name: "New York Civil Liberties Union (NYCLU)", type: NPO, affiliation: "ACLU state affiliate", description: "Civil liberties organization engaged in litigation, advocacy, and lobbying." },
  { name: "Surveillance Technology Oversight Project (S.T.O.P.)", type: NPO, affiliation: "Advocacy organization", description: "Advocacy and litigation organization focused on surveillance and privacy." },
  { name: "The Legal Aid Society", type: NPO, affiliation: "NYC legal services provider", description: "Provider of legal services, including criminal defense, to low-income New Yorkers." },
  { name: "New York Immigration Coalition", type: NPO, affiliation: "Statewide coalition", description: "Coalition of immigrant-serving and advocacy organizations." },
  { name: "New York State United Teachers (NYSUT)", type: "Union", affiliation: "Statewide teachers' union", description: "Union representing teachers and other education and health care professionals." },
  { name: "Tech:NYC", type: "Business/Trade Association", affiliation: "Technology trade association", description: "Trade association representing New York City's technology sector." },
];

async function main() {
  let map = await db.map.findFirst({ where: { jurisdiction: JURISDICTION, issue: ISSUE } });
  if (!map) map = await db.map.create({ data: { jurisdiction: JURISDICTION, issue: ISSUE } });

  // Idempotent: only seed actors that don't already exist (by name), never touch existing ones.
  const existing = new Set((await db.actor.findMany({ where: { mapId: map.id }, select: { name: true } })).map((a) => a.name));
  const fresh = ACTORS.filter((a) => !existing.has(a.name));
  for (const a of fresh) await db.actor.create({ data: { ...a, mapId: map.id } });

  const total = await db.actor.count({ where: { mapId: map.id } });
  console.log(`Map ${map.id}: seeded ${fresh.length} new actors (${total} total).`);
}

main().finally(() => db.$disconnect());
