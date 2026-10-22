export const ACTOR_TYPES = [
  "State Legislator",
  "Union",
  "Nonprofit/Advocacy Org",
  "Individual",
  "Government Agency/Office",
  "Law Enforcement",
  "Business/Trade Association",
  "Other",
] as const;

export type ActorType = (typeof ACTOR_TYPES)[number];

const ICONS: Record<ActorType, string> = {
  "State Legislator": "🏛️",
  Union: "🤝",
  "Nonprofit/Advocacy Org": "✊",
  Individual: "👤",
  "Government Agency/Office": "🏢",
  "Law Enforcement": "🛡️",
  "Business/Trade Association": "💼",
  Other: "◽",
};

export function typeIcon(type: string): string {
  return ICONS[type as ActorType] ?? ICONS.Other;
}

/** Short label for chips: a trailing acronym in parentheses (e.g. "(NYCLU)") if there is one, else the full name. */
export function shortName(name: string): string {
  const m = name.match(/\(([^()\s]{2,8})\)\s*$/);
  return m ? m[1] : name;
}

export function initials(userName: string): string {
  const parts = userName.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2)).toUpperCase();
}
