import {SCARY_CHRISTMAS_CANDIES, SCARY_CHRISTMAS_CONFIG} from '../scary-christmas/scary-christmas.config';
import {SeasonalCollectible, SeasonalEdition, SeasonalTheme} from './seasonal.models';
import {SEASONAL_PLANS, SeasonalPlan} from './seasonal.plans';

const COLLECTOR_SRC = '/assets/seasonal/scary-christmas/collection-lantern.webp';
const HIDING_PLACES = SCARY_CHRISTMAS_CANDIES.map(({route, placement, variant}) => ({route, placement, variant}));
const LOCATION_CLUES = [
  'Look among the homepage’s stories, topics, and video discoveries.', 'The homepage has another little surprise tucked into its content.',
  'A curious reader knows where the stories begin.', 'Explore the blog’s reading suggestions as well as its stories.',
  'Find a little wonder among the gadgets.', 'Look where the flyers gather.',
  'Experiments leave a little room for discovery.', 'Every good story has a storyteller.',
];

function makeItems(prefix: string, names: readonly string[], clues?: readonly string[]): readonly SeasonalCollectible[] {
  return Object.freeze(names.map((name, index) => Object.freeze({
    id: `${prefix}-${index + 1}`,
    name,
    clue: clues?.[index] ?? LOCATION_CLUES[index],
    ...HIDING_PLACES[index],
  })));
}

type EditionDraft = Pick<SeasonalEdition,
  'id' | 'holidayLabel' | 'year' | 'titleLine1' | 'titleLine2' | 'description' | 'archiveDescription'
  | 'dateLabel' | 'observanceNote' | 'displayStart' | 'displayEnd' | 'priority' | 'theme'
  | 'collectibleLabel' | 'collectAction' | 'completionMessage' | 'items'
> & {readonly learnMoreUrl?: string | null};

function futureEdition(draft: EditionDraft): SeasonalEdition {
  return Object.freeze({
    ...draft,
    approvedForCalendar: false,
    learnMoreUrl: draft.learnMoreUrl ?? null,
    heroSrc: `/assets/seasonal/${draft.id}/hero.webp`,
    collectibleSrc: draft.theme === 'harvest' ? '/assets/seasonal/shared/leaf.webp' : '/assets/seasonal/shared/star.webp',
    collectorSrc: COLLECTOR_SRC,
    collectorName: 'lantern',
    completionHeading: 'A little more light.',
    musicSrc: null,
    musicTitle: 'Dreadnauts after dark',
    musicAction: 'Listen to Dreadnauts',
    musicHref: SCARY_CHRISTMAS_CONFIG.musicHref,
    musicHeading: 'Music for the season',
  });
}

const KWANZAA_ITEMS = makeItems('kwanzaa', [
  'Umoja · Unity',
  'Kujichagulia · Self-determination',
  'Ujima · Collective work and responsibility',
  'Ujamaa · Cooperative economics',
  'Nia · Purpose',
  'Kuumba · Creativity',
  'Imani · Faith',
], [
  'Build connection within family and community.',
  'Make room for people to define their own stories.',
  'Share the work of helping a community thrive.',
  'Support the businesses and livelihoods around you.',
  'Consider what gives shared work its direction.',
  'Create something that leaves your community brighter.',
  'Carry trust in people and a better future.',
]);

/** All editions are available for explicit preview; calendar approval is separate. */
const ILLUSTRATED_EDITIONS: readonly SeasonalEdition[] = Object.freeze([
  Object.freeze({
    id: 'scary-christmas-2026', holidayLabel: 'Scary Christmas', year: 2026,
    titleLine1: 'Scary', titleLine2: 'Christmas.',
    description: 'A little spooky. A little cosmic. A whole lot of candy.',
    archiveDescription: 'A little spooky, a little cosmic, and a whole lot of curiosity. Revisit the original candy hunt and its glowing lantern.',
    dateLabel: 'October 1–November 1, 2026',
    observanceNote: 'This is an editorial Halloween display window. Halloween falls on October 31.',
    learnMoreUrl: null, displayStart: '2026-10-01', displayEnd: '2026-11-01', priority: 100,
    approvedForCalendar: true, theme: 'halloween' as SeasonalTheme,
    heroSrc: '/assets/seasonal/scary-christmas/haunted-lantern-night.webp',
    collectibleSrc: '/assets/seasonal/scary-christmas/moon-candy.webp',
    collectorSrc: COLLECTOR_SRC, collectorName: 'lantern', collectibleLabel: 'candies', collectAction: 'Collect',
    completionHeading: 'A lantern full of little wonders.',
    completionMessage: 'You found every sweet. Stay curious, stay strange, and enjoy the spooky season.',
    musicSrc: null,
    musicTitle: SCARY_CHRISTMAS_CONFIG.musicTitle,
    musicAction: 'Play Spooky', musicHref: SCARY_CHRISTMAS_CONFIG.musicHref, musicHeading: 'Dreadnauts after dark',
    items: SCARY_CHRISTMAS_CANDIES,
  }),
  futureEdition({
    id: 'thanksgiving-2026', holidayLabel: 'Thanksgiving', year: 2026,
    titleLine1: 'Good things,', titleLine2: 'gathered.',
    description: 'Warm light, good company, and a few small things worth finding.',
    archiveDescription: 'Gratitude, good company, and a more curious tomorrow. A season for looking around and noticing what matters.',
    dateLabel: 'November 20–29, 2026',
    observanceNote: 'This editorial display window surrounds U.S. Thanksgiving on November 26, 2026.',
    displayStart: '2026-11-20', displayEnd: '2026-11-29', priority: 100, theme: 'harvest',
    collectibleLabel: 'leaves', collectAction: 'Gather',
    completionMessage: 'A few good things, gathered together. Keep noticing what matters.',
    items: makeItems('thanksgiving', ['Gratitude', 'Good company', 'Kindness', 'Curiosity', 'A useful find', 'A wider view', 'A shared idea', 'A good story']),
  }),
  futureEdition({
    id: 'hanukkah-2026', holidayLabel: 'Hanukkah', year: 2026,
    titleLine1: 'A little', titleLine2: 'brighter.',
    description: 'Eight nights of light, a little wonder, and room to gather together.',
    archiveDescription: 'Eight lights, a lasting idea. Reflections on resilience, hope, and the small lights that go a long way.',
    dateLabel: 'December 4–12, 2026',
    observanceNote: 'Hanukkah begins at sundown on December 4 and ends at nightfall on December 12, 2026. This collection is a seasonal reflection, with display dates separate from observance times.',
    learnMoreUrl: 'https://www.hebcal.com/holidays/chanukah-2026',
    displayStart: '2026-12-04', displayEnd: '2026-12-12', priority: 110, theme: 'hanukkah',
    collectibleLabel: 'lights', collectAction: 'Collect',
    completionMessage: 'Eight small lights, and a little more room for hope and connection.',
    items: makeItems('hanukkah', ['Resilience', 'Hope', 'Generosity', 'Curiosity', 'Creativity', 'Connection', 'Persistence', 'A brighter future']),
  }),
  futureEdition({
    id: 'winter-solstice-2026', holidayLabel: 'Winter Solstice', year: 2026,
    titleLine1: 'The longest', titleLine2: 'night.',
    description: 'Follow the quiet glow. Find a little light in the longest night.',
    archiveDescription: 'A slower season to see more. Stories, ideas, and quiet inspiration for the turning of the light.',
    dateLabel: 'December 20–22, 2026',
    observanceNote: 'This Northern Hemisphere edition surrounds the December 21, 2026 solstice. Display dates are editorial; the Southern Hemisphere is entering summer.',
    learnMoreUrl: 'https://aa.usno.navy.mil/data/Earth_Seasons',
    displayStart: '2026-12-20', displayEnd: '2026-12-22', priority: 120, theme: 'solstice',
    collectibleLabel: 'stars', collectAction: 'Collect',
    completionMessage: 'A little light for the longest night. There is still more to notice.',
    items: makeItems('solstice', ['Quiet glow', 'Starlight', 'Stillness', 'Reflection', 'A small discovery', 'A wide horizon', 'Turning light', 'Tomorrow']),
  }),
  futureEdition({
    id: 'christmas-2026', holidayLabel: 'Christmas', year: 2026,
    titleLine1: 'Cosmic', titleLine2: 'Christmas.',
    description: 'Evergreen wonder, copper starlight, and a little magic to carry with you.',
    archiveDescription: 'Classic magic, wider skies. A celebration of wonder, connection, and the extraordinary in the everyday.',
    dateLabel: 'December 13–25, 2026',
    observanceNote: 'This is an editorial Christmas display window ending on December 25. Traditions and observance dates vary between communities.',
    displayStart: '2026-12-13', displayEnd: '2026-12-25', priority: 100, theme: 'christmas',
    collectibleLabel: 'stars', collectAction: 'Collect',
    completionMessage: 'A lantern full of wonder. Carry a little connection into the season.',
    items: makeItems('christmas', ['Evergreen wonder', 'Copper starlight', 'Goodwill', 'A shared story', 'A curious gift', 'Wider skies', 'A little magic', 'Connection']),
  }),
  futureEdition({
    id: 'kwanzaa-2026', holidayLabel: 'Kwanzaa', year: 2026,
    titleLine1: 'Together,', titleLine2: 'we glow.',
    description: 'Community, heritage, and creativity. Seven ideas to carry into a brighter tomorrow.',
    archiveDescription: 'Community, culture, and a brighter tomorrow. Thoughts on heritage, creativity, and the light we share.',
    dateLabel: 'December 26, 2026–January 1, 2027',
    observanceNote: 'Kwanzaa is observed December 26–January 1. The seven tokens introduce its principles; this collection is a reflection on community, not a reenactment of observance.',
    learnMoreUrl: 'https://nmaahc.si.edu/explore/moments/kwanzaa',
    displayStart: '2026-12-26', displayEnd: '2027-01-01', priority: 110, theme: 'kwanzaa',
    collectibleLabel: 'tokens', collectAction: 'Collect',
    completionMessage: 'Seven ideas gathered. Carry community, purpose, and creativity into tomorrow.',
    items: KWANZAA_ITEMS,
  }),
  futureEdition({
    id: 'new-year-2027', holidayLabel: 'New Year', year: 2027,
    titleLine1: 'Next', titleLine2: 'orbit.',
    description: 'Gather a few bright sparks for the ideas and adventures still to come.',
    archiveDescription: 'New year. Wider horizons. A look ahead at ideas, possibilities, and the adventures still to come.',
    dateLabel: 'December 31, 2026–January 3, 2027',
    observanceNote: 'This editorial display window surrounds January 1, 2027 in the Gregorian calendar.',
    displayStart: '2026-12-31', displayEnd: '2027-01-03', priority: 120, theme: 'new-year',
    collectibleLabel: 'sparks', collectAction: 'Collect',
    completionMessage: 'A few bright sparks for the next orbit. Stay open to what comes next.',
    items: makeItems('new-year', ['New idea', 'Open possibility', 'Fresh perspective', 'A small beginning', 'A useful experiment', 'Next adventure', 'Creative spark', 'Wider horizons']),
  }),
]);

function prepareEdition(seed: SeasonalPlan): SeasonalEdition {
  const recurringId = seed.id.replace(/-202[78]$/, '-2026');
  const recurring = ILLUSTRATED_EDITIONS.find(edition => edition.id === recurringId
    || (seed.id === 'halloween-2027' && edition.theme === 'halloween')
    || (seed.id === 'new-year-2028' && edition.id === 'new-year-2027'));
  const items = seed.reflective ? Object.freeze([]) : recurring?.items ?? makeItems(seed.id, [
    'A little kindness', 'Good company', 'A curious thought', 'A shared story',
    'A small wonder', 'A wider horizon', 'A creative spark', 'A brighter tomorrow',
  ]);
  return Object.freeze({
    ...futureEdition({
      ...seed,
      archiveDescription: seed.description,
      dateLabel: seed.dateStatus === 'verified'
        ? (seed.displayStart === seed.displayEnd ? seed.displayStart : seed.displayStart + ' – ' + seed.displayEnd)
        : 'Community calendars vary',
      priority: 100,
      collectibleLabel: recurring?.collectibleLabel ?? 'sparks',
      collectAction: 'Collect',
      completionMessage: 'A few small wonders gathered. Carry a little kindness and curiosity into the season.',
      items,
    }),
    heroSrc: recurring?.heroSrc ?? '/assets/seasonal/shared/year-round.webp',
    collectibleSrc: recurring?.collectibleSrc ?? '/assets/seasonal/shared/star.webp',
    interaction: seed.reflective ? 'reflect' : 'hunt',
    preparationStatus: 'template',
    dateStatus: seed.dateStatus,
  });
}

/** Prepared editions share a replaceable art master until their own creative pass. */
export const SEASONAL_EDITIONS: readonly SeasonalEdition[] = Object.freeze([
  ...ILLUSTRATED_EDITIONS,
  ...SEASONAL_PLANS.map(prepareEdition),
]);

export function getSeasonalEdition(id: string): SeasonalEdition | null {
  return SEASONAL_EDITIONS.find(edition => edition.id === id) ?? null;
}
