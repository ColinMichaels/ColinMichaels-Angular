export type SeasonalPlacement = 'banner' | 'trail' | 'footer';
export type SeasonalVariant = 'amber' | 'violet' | 'mint';
export type SeasonalTheme = 'halloween' | 'harvest' | 'hanukkah' | 'solstice' | 'christmas' | 'kwanzaa' | 'new-year';

export interface SeasonalCollectible {
  readonly id: string;
  readonly name: string;
  readonly clue: string;
  readonly route: string;
  readonly placement: SeasonalPlacement;
  readonly variant: SeasonalVariant;
}

export interface SeasonalEdition {
  readonly id: string;
  readonly holidayLabel: string;
  readonly year: number;
  readonly titleLine1: string;
  readonly titleLine2: string;
  readonly description: string;
  readonly archiveDescription: string;
  readonly dateLabel: string;
  readonly observanceNote: string;
  readonly learnMoreUrl: string | null;
  readonly displayStart: string;
  readonly displayEnd: string;
  readonly priority: number;
  readonly approvedForCalendar: boolean;
  readonly theme: SeasonalTheme;
  readonly heroSrc: string;
  readonly collectibleSrc: string;
  readonly collectorSrc: string;
  readonly collectorName: string;
  readonly collectibleLabel: string;
  readonly collectAction: string;
  readonly completionHeading: string;
  readonly completionMessage: string;
  readonly musicSrc: string | null;
  readonly musicTitle: string;
  readonly musicAction: string;
  readonly musicHref: string;
  readonly musicHeading: string;
  readonly interaction?: 'hunt' | 'reflect';
  readonly preparationStatus?: 'illustrated' | 'template';
  readonly dateStatus?: 'verified' | 'needs-review';
  readonly items: readonly SeasonalCollectible[];
}

export interface SeasonalConfig {
  readonly enabled: boolean;
  readonly mode: 'manual' | 'calendar' | 'off';
  readonly manualEditionId: string;
  readonly timeZone: string;
}

/** Device-local bypass; the null edition field preserves the legacy storage shape. */
export interface SeasonalVisitorPreference {
  readonly version: 1;
  readonly editionId: null;
  readonly disabled: boolean;
}
