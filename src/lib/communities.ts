export const COMMUNITY_FLOOR_MAP: Record<string, string> = {
  "tech": "Floor 3 — Tech Lab",
  "arts-music": "Floor 2 — Arts Studio",
  "biolab": "Floor 4 — Bio Lab",
  "social": "Floor 1 — Social Hall",
  "wellness": "Floor 5 — Wellness Studio",
};

export function getFloorsForCommunities(communities: string[]): { slug: string; label: string }[] {
  return communities
    .filter(c => COMMUNITY_FLOOR_MAP[c])
    .map(c => ({ slug: c, label: COMMUNITY_FLOOR_MAP[c] }));
}
