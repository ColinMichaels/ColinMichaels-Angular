export interface SeasonalArchiveIndexIdentity {
  readonly path: string;
  readonly heading: string;
  readonly description: string;
  readonly publishApproved: boolean;
}

export interface SeasonalArchiveEditionIdentity {
  readonly id: string;
  readonly holidayLabel: string;
  readonly year: number;
  readonly titleLine1: string;
  readonly titleLine2: string;
  readonly archiveDescription: string;
  readonly interaction?: 'hunt' | 'reflect';
  readonly publishApproved: boolean;
}

export interface SeasonalArchivePage {
  readonly path: string;
  readonly heading: string;
  readonly description: string;
  readonly publishApproved: boolean;
  readonly edition: SeasonalArchiveEditionIdentity | null;
}

/** Indexing approval is independent of main-site calendar activation. */
export const SEASONAL_ARCHIVE_INDEX: Readonly<SeasonalArchiveIndexIdentity> = Object.freeze({
  path: '/archive/seasons',
  heading: 'Seasonal archive',
  description: 'Small seasons. Small wonders. More reasons to explore.',
  publishApproved: false,
});

/** Public presentation projection; tests keep it aligned with the app catalog. */
export const SEASONAL_ARCHIVE_EDITIONS: readonly SeasonalArchiveEditionIdentity[] = Object.freeze([
  {
    id: 'scary-christmas-2026', holidayLabel: 'Scary Christmas', year: 2026,
    titleLine1: 'Scary', titleLine2: 'Christmas.',
    archiveDescription: 'A little spooky, a little cosmic, and a whole lot of curiosity. Revisit the original candy hunt and its glowing lantern.',
    publishApproved: false,
  },
  {
    id: 'thanksgiving-2026', holidayLabel: 'Thanksgiving', year: 2026,
    titleLine1: 'Good things,', titleLine2: 'gathered.',
    archiveDescription: 'Gratitude, good company, and a more curious tomorrow. A season for looking around and noticing what matters.',
    publishApproved: false,
  },
  {
    id: 'hanukkah-2026', holidayLabel: 'Hanukkah', year: 2026,
    titleLine1: 'A little', titleLine2: 'brighter.',
    archiveDescription: 'Eight lights, a lasting idea. Reflections on resilience, hope, and the small lights that go a long way.',
    publishApproved: false,
  },
  {
    id: 'winter-solstice-2026', holidayLabel: 'Winter Solstice', year: 2026,
    titleLine1: 'The longest', titleLine2: 'night.',
    archiveDescription: 'A slower season to see more. Stories, ideas, and quiet inspiration for the turning of the light.',
    publishApproved: false,
  },
  {
    id: 'christmas-2026', holidayLabel: 'Christmas', year: 2026,
    titleLine1: 'Cosmic', titleLine2: 'Christmas.',
    archiveDescription: 'Classic magic, wider skies. A celebration of wonder, connection, and the extraordinary in the everyday.',
    publishApproved: false,
  },
  {
    id: 'kwanzaa-2026', holidayLabel: 'Kwanzaa', year: 2026,
    titleLine1: 'Together,', titleLine2: 'we glow.',
    archiveDescription: 'Community, culture, and a brighter tomorrow. Thoughts on heritage, creativity, and the light we share.',
    publishApproved: false,
  },
  {
    id: 'new-year-2027', holidayLabel: 'New Year', year: 2027,
    titleLine1: 'Next', titleLine2: 'orbit.',
    archiveDescription: 'New year. Wider horizons. A look ahead at ideas, possibilities, and the adventures still to come.',
    publishApproved: false,
  },
  {
    id: "mlk-day-2027", holidayLabel: "Martin Luther King Jr. Day", year: 2027,
    titleLine1: "Make room", titleLine2: "for service.",
    archiveDescription: "A quieter moment for community, justice, and the work of caring for one another.",
    interaction: 'reflect' as const,
    publishApproved: false,
  },
  {
    id: "lunar-new-year-2027", holidayLabel: "Lunar New Year", year: 2027,
    titleLine1: "A new", titleLine2: "beginning.",
    archiveDescription: "Gather a little hope, good company, and curiosity for the year ahead.",
    publishApproved: false,
  },
  {
    id: "valentines-day-2027", holidayLabel: "Valentine’s Day", year: 2027,
    titleLine1: "A little", titleLine2: "connection.",
    archiveDescription: "Celebrate kindness, friendship, and the people who make ordinary days brighter.",
    publishApproved: false,
  },
  {
    id: "presidents-day-2027", holidayLabel: "Presidents’ Day / Washington’s Birthday", year: 2027,
    titleLine1: "A little", titleLine2: "perspective.",
    archiveDescription: "Pause for civic history, thoughtful questions, and a wider view.",
    interaction: 'reflect' as const,
    publishApproved: false,
  },
  {
    id: "mardi-gras-2027", holidayLabel: "Mardi Gras", year: 2027,
    titleLine1: "Let a little", titleLine2: "joy in.",
    archiveDescription: "Follow bright sparks of music, creativity, and community celebration.",
    publishApproved: false,
  },
  {
    id: "ramadan-2027", holidayLabel: "Ramadan", year: 2027,
    titleLine1: "Room for", titleLine2: "reflection.",
    archiveDescription: "Make room for reflection, generosity, and the people around you.",
    interaction: 'reflect' as const,
    publishApproved: false,
  },
  {
    id: "holi-2027", holidayLabel: "Holi", year: 2027,
    titleLine1: "A little", titleLine2: "more color.",
    archiveDescription: "Welcome renewal, joyful connection, and the creativity people bring together.",
    publishApproved: false,
  },
  {
    id: "eid-al-fitr-2027", holidayLabel: "Eid al-Fitr", year: 2027,
    titleLine1: "Good things,", titleLine2: "shared.",
    archiveDescription: "Celebrate generosity, connection, and the joy of gathering with others.",
    publishApproved: false,
  },
  {
    id: "st-patricks-day-2027", holidayLabel: "St Patrick’s Day", year: 2027,
    titleLine1: "Good company,", titleLine2: "wider stories.",
    archiveDescription: "Find a little music, curiosity, and connection in Irish heritage and culture.",
    publishApproved: false,
  },
  {
    id: "easter-western-2027", holidayLabel: "Easter · Western calendar", year: 2027,
    titleLine1: "Room for", titleLine2: "renewal.",
    archiveDescription: "Gather a little hope, kindness, and wonder as the season turns.",
    publishApproved: false,
  },
  {
    id: "passover-2027", holidayLabel: "Passover", year: 2027,
    titleLine1: "Stories carried", titleLine2: "forward.",
    archiveDescription: "Make room for memory, freedom, and the stories shared across generations.",
    publishApproved: false,
  },
  {
    id: "earth-day-2027", holidayLabel: "Earth Day", year: 2027,
    titleLine1: "A little", titleLine2: "care for home.",
    archiveDescription: "Notice the living world around us and the small choices that help it thrive.",
    publishApproved: false,
  },
  {
    id: "mothers-day-us-2027", holidayLabel: "Mother’s Day · U.S.", year: 2027,
    titleLine1: "Care worth", titleLine2: "celebrating.",
    archiveDescription: "Celebrate mothers, caregivers, and the many ways people offer care.",
    publishApproved: false,
  },
  {
    id: "eid-al-adha-2027", holidayLabel: "Eid al-Adha", year: 2027,
    titleLine1: "Generosity,", titleLine2: "together.",
    archiveDescription: "Gather around care, generosity, and meaningful connection.",
    publishApproved: false,
  },
  {
    id: "memorial-day-2027", holidayLabel: "Memorial Day · U.S.", year: 2027,
    titleLine1: "A moment", titleLine2: "to remember.",
    archiveDescription: "A quieter space to remember those who died in U.S. military service.",
    interaction: 'reflect' as const,
    publishApproved: false,
  },
  {
    id: "pride-month-2027", holidayLabel: "Pride Month", year: 2027,
    titleLine1: "Room to", titleLine2: "be yourself.",
    archiveDescription: "Celebrate LGBTQ+ lives, creativity, belonging, and the work of making room for everyone.",
    publishApproved: false,
  },
  {
    id: "juneteenth-2027", holidayLabel: "Juneteenth", year: 2027,
    titleLine1: "Freedom,", titleLine2: "carried forward.",
    archiveDescription: "Make room for Black history, community, joy, and the continuing work of freedom.",
    publishApproved: false,
  },
  {
    id: "summer-solstice-2027", holidayLabel: "Summer Solstice", year: 2027,
    titleLine1: "The longest", titleLine2: "light.",
    archiveDescription: "Follow a little wonder into the bright stretch of the year.",
    publishApproved: false,
  },
  {
    id: "fathers-day-us-2027", holidayLabel: "Father’s Day · U.S.", year: 2027,
    titleLine1: "Good guidance,", titleLine2: "shared.",
    archiveDescription: "Celebrate fathers, caregivers, and the encouragement people pass along.",
    publishApproved: false,
  },
  {
    id: "independence-day-us-2027", holidayLabel: "Independence Day · U.S.", year: 2027,
    titleLine1: "A wider", titleLine2: "horizon.",
    archiveDescription: "Gather a little community, reflection, and hope for what we can build together.",
    publishApproved: false,
  },
  {
    id: "labor-day-us-2027", holidayLabel: "Labor Day · U.S.", year: 2027,
    titleLine1: "Good work,", titleLine2: "together.",
    archiveDescription: "Celebrate the people and shared effort that keep communities moving.",
    publishApproved: false,
  },
  {
    id: "rosh-hashanah-2027", holidayLabel: "Rosh Hashanah", year: 2027,
    titleLine1: "A thoughtful", titleLine2: "beginning.",
    archiveDescription: "Gather a little hope, renewal, and care for the year ahead.",
    publishApproved: false,
  },
  {
    id: "yom-kippur-2027", holidayLabel: "Yom Kippur", year: 2027,
    titleLine1: "Space for", titleLine2: "reflection.",
    archiveDescription: "A quiet space for reflection, responsibility, and connection.",
    interaction: 'reflect' as const,
    publishApproved: false,
  },
  {
    id: "indigenous-peoples-day-2027", holidayLabel: "Indigenous Peoples’ Day / Columbus Day", year: 2027,
    titleLine1: "Listen, learn,", titleLine2: "make room.",
    archiveDescription: "Make room for Indigenous histories, living cultures, and thoughtful reflection.",
    interaction: 'reflect' as const,
    publishApproved: false,
  },
  {
    id: "diwali-2027", holidayLabel: "Diwali", year: 2027,
    titleLine1: "A little", titleLine2: "more light.",
    archiveDescription: "Gather a little hope, connection, and curiosity around the season of light.",
    publishApproved: false,
  },
  {
    id: "dia-de-los-muertos-2027", holidayLabel: "Día de los Muertos", year: 2027,
    titleLine1: "Memory,", titleLine2: "held with care.",
    archiveDescription: "Honor the stories, love, and Mexican cultural traditions that keep memories close.",
    publishApproved: false,
  },
  {
    id: "veterans-day-2027", holidayLabel: "Veterans Day · U.S.", year: 2027,
    titleLine1: "A moment", titleLine2: "of respect.",
    archiveDescription: "Make room for gratitude, listening, and respect for U.S. military veterans.",
    interaction: 'reflect' as const,
    publishApproved: false,
  },
  {
    id: "scary-christmas-2027", holidayLabel: "Halloween · Scary Christmas", year: 2027,
    titleLine1: "Scary", titleLine2: "Christmas.",
    archiveDescription: "A little spooky, a little cosmic, and a fresh lantern of discoveries.",
    publishApproved: false,
  },
  {
    id: "thanksgiving-2027", holidayLabel: "Thanksgiving · U.S.", year: 2027,
    titleLine1: "Good things,", titleLine2: "gathered.",
    archiveDescription: "Notice good company, shared care, and the small things worth appreciating.",
    publishApproved: false,
  },
  {
    id: "hanukkah-2027", holidayLabel: "Hanukkah", year: 2027,
    titleLine1: "A little", titleLine2: "brighter.",
    archiveDescription: "Make room for light, resilience, and connection across the season.",
    publishApproved: false,
  },
  {
    id: "winter-solstice-2027", holidayLabel: "Winter Solstice", year: 2027,
    titleLine1: "The longest", titleLine2: "night.",
    archiveDescription: "Find a little calm, curiosity, and light as the season turns.",
    publishApproved: false,
  },
  {
    id: "christmas-2027", holidayLabel: "Christmas", year: 2027,
    titleLine1: "Cosmic", titleLine2: "Christmas.",
    archiveDescription: "Gather a little wonder, goodwill, and connection beneath wider skies.",
    publishApproved: false,
  },
  {
    id: "kwanzaa-2027", holidayLabel: "Kwanzaa", year: 2027,
    titleLine1: "Together,", titleLine2: "we glow.",
    archiveDescription: "Make room for African and African American heritage, community, purpose, and creativity.",
    publishApproved: false,
  },
  {
    id: "new-year-2028", holidayLabel: "New Year", year: 2028,
    titleLine1: "Next", titleLine2: "orbit.",
    archiveDescription: "Carry a few bright ideas and a little hope into the adventures still to come.",
    publishApproved: false,
  },
  {
    id: "vesak-2027", holidayLabel: "Vesak", year: 2027,
    titleLine1: "Compassion,", titleLine2: "carried forward.",
    archiveDescription: "Make room for kindness, calm, and thoughtful connection.",
    publishApproved: false,
  },
].map(edition => Object.freeze(edition)));

/** Reject unknown identifiers and extra segments rather than rewriting them. */
export function getSeasonalArchivePage(path: string): SeasonalArchivePage | null {
  const rawPath = path.split(/[?#]/, 1)[0];
  const canonicalPath = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;
  if (canonicalPath === SEASONAL_ARCHIVE_INDEX.path) {
    return {...SEASONAL_ARCHIVE_INDEX, edition: null};
  }
  const match = canonicalPath.match(/^\/archive\/seasons\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  const edition = match ? SEASONAL_ARCHIVE_EDITIONS.find(candidate => candidate.id === match[1]) : undefined;
  return edition ? {
    path: `${SEASONAL_ARCHIVE_INDEX.path}/${edition.id}`,
    heading: `${edition.titleLine1} ${edition.titleLine2}`,
    description: edition.archiveDescription,
    publishApproved: edition.publishApproved,
    edition,
  } : null;
}

/** Prepared archives remain discoverable by links but outside the sitemap. */
export function createSeasonalArchiveSitemapPaths(
  index: Readonly<SeasonalArchiveIndexIdentity> = SEASONAL_ARCHIVE_INDEX,
  editions: readonly SeasonalArchiveEditionIdentity[] = SEASONAL_ARCHIVE_EDITIONS,
): readonly string[] {
  return [
    ...(index.publishApproved ? [index.path] : []),
    ...editions.filter(edition => edition.publishApproved).map(edition => `${index.path}/${edition.id}`),
  ];
}
