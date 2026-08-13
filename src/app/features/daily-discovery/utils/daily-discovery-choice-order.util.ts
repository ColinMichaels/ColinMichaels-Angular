export interface DailyDiscoveryChoiceLike {
  readonly id: string;
  readonly text: string;
}

export interface DailyDiscoveryDisplayChoice<T extends DailyDiscoveryChoiceLike> {
  readonly choice: T;
  readonly label: string;
}

/**
 * Derives a stable visual order and position labels without replacing stored IDs.
 * The original choice ID remains the value submitted to the trusted answer check.
 */
export function createDailyDiscoveryDisplayChoices<T extends DailyDiscoveryChoiceLike>(
  choices: readonly T[],
  questionSeed: string,
): readonly DailyDiscoveryDisplayChoice<T>[] {
  const orderedChoices = [...choices];
  let randomState = hashSeed(`${questionSeed}:${choices.map(choice => choice.id).join('|')}`);

  for (let currentIndex = orderedChoices.length - 1; currentIndex > 0; currentIndex -= 1) {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    const swapIndex = randomState % (currentIndex + 1);
    [orderedChoices[currentIndex], orderedChoices[swapIndex]] = [
      orderedChoices[swapIndex],
      orderedChoices[currentIndex],
    ];
  }

  return orderedChoices.map((choice, index) => ({
    choice,
    label: alphabeticLabel(index),
  }));
}

function hashSeed(value: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }

  return hash;
}

function alphabeticLabel(index: number): string {
  let remaining = index + 1;
  let label = '';

  while (remaining > 0) {
    remaining -= 1;
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26);
  }

  return label;
}
