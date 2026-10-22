import 'server-only';
export function levelTitleForXp(xp: number) { return xp < 200 ? 'Novice Archivist' : xp < 500 ? 'Scholar' : xp < 1000 ? 'Senior Curator' : 'Master Archivist'; }
