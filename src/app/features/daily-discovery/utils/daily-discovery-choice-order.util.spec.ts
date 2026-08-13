import {createDailyDiscoveryDisplayChoices} from './daily-discovery-choice-order.util';

describe('createDailyDiscoveryDisplayChoices', () => {
  const choices = [
    {id: 'a', text: 'Correct answer'},
    {id: 'b', text: 'First distractor'},
    {id: 'c', text: 'Second distractor'},
    {id: 'd', text: 'Third distractor'},
  ] as const;

  it('creates a stable shuffled order without changing the stored choices', () => {
    const firstOrder = createDailyDiscoveryDisplayChoices(choices, '2026-08-13:question-1');
    const secondOrder = createDailyDiscoveryDisplayChoices(choices, '2026-08-13:question-1');

    expect(firstOrder.map(item => item.choice.id)).toEqual(['c', 'd', 'b', 'a']);
    expect(secondOrder).toEqual(firstOrder);
    expect(choices.map(choice => choice.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('labels displayed positions alphabetically while retaining original answer ids', () => {
    const displayChoices = createDailyDiscoveryDisplayChoices(choices, '2026-08-13:question-1');

    expect(displayChoices.map(item => item.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(displayChoices.find(item => item.choice.id === 'a')?.label).toBe('D');
  });

  it('moves a stored correct answer through different displayed positions across questions', () => {
    const displayedLabels = Array.from({length: 5}, (_, index) => {
      const displayChoices = createDailyDiscoveryDisplayChoices(
        choices,
        `2026-08-13:2026-08-13-q${index + 1}`,
      );

      return displayChoices.find(item => item.choice.id === 'a')?.label;
    });

    expect(new Set(displayedLabels).size).toBeGreaterThan(1);
  });
});
