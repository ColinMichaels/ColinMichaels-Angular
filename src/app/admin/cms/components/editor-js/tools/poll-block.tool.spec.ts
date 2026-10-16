import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {PollBlockData, PollBlockTool} from './poll-block.tool';

function createTool(data: PollBlockData = {}, readOnly = false): PollBlockTool {
  return new PollBlockTool({data, readOnly} as BlockToolConstructorOptions<PollBlockData>);
}

describe('PollBlockTool', () => {
  const data: PollBlockData = {
    placement: 'rail',
    question: 'Which topic should I cover next?',
    description: 'Choose one answer.',
    pollOptions: [
      {id: 'angular', label: 'Angular'},
      {id: 'firebase', label: 'Firebase'},
    ],
    pollResultsVisibility: 'afterVote',
  };

  it('renders and saves a valid poll definition', () => {
    const tool = createTool(data);
    const element = tool.render();

    expect(PollBlockTool.toolbox.title).toBe('Poll');
    expect(element.querySelectorAll('[data-poll-option-row]').length).toBe(2);
    expect(tool.save(element)).toEqual(data);
    expect(tool.validate(data)).toBeTrue();
  });

  it('adds and removes answer rows within the supported bounds', () => {
    const tool = createTool(data);
    const element = tool.render();
    const addButton = [...element.querySelectorAll('button')]
      .find(button => button.textContent === 'Add answer');

    addButton?.click();
    expect(element.querySelectorAll('[data-poll-option-row]').length).toBe(3);

    const removeButton = [...element.querySelectorAll('button')]
      .find(button => button.textContent === 'Remove');
    removeButton?.click();
    expect(element.querySelectorAll('[data-poll-option-row]').length).toBe(2);
  });

  it('rejects incomplete or duplicate poll options', () => {
    const tool = createTool();

    expect(tool.validate({question: '', pollOptions: data.pollOptions})).toBeFalse();
    expect(tool.validate({
      question: 'Choose one',
      pollOptions: [{id: 'same', label: 'One'}, {id: 'same', label: 'Two'}],
    })).toBeFalse();
    expect(tool.validate({
      question: 'Choose one',
      pollOptions: [{id: 'one', label: 'Same answer'}, {id: 'two', label: 'same answer'}],
    })).toBeFalse();
    expect(tool.validate({
      question: 'Choose one',
      pollOptions: [{id: 'one', label: 'Only one'}],
    })).toBeFalse();
  });

  it('honors read-only mode', () => {
    const element = createTool(data, true).render();

    expect([...element.querySelectorAll<HTMLInputElement>('input')].every(input => input.readOnly)).toBeTrue();
    expect([...element.querySelectorAll<HTMLButtonElement>('button')].every(button => button.disabled)).toBeTrue();
    expect([...element.querySelectorAll<HTMLSelectElement>('select')].every(select => select.disabled)).toBeTrue();
  });
  it('authors a private reflection with bounded evidence without changing community defaults', () => {
    const reflection: PollBlockData = {...data, placement: 'content', pollMode: 'reflection',
      reflectionExplanation: 'One clip does not establish repeatability.'};
    const tool = createTool(reflection); const element = tool.render();
    expect(tool.save(element)).toEqual(reflection);
    expect(tool.validate(reflection)).toBeTrue();
    expect(tool.validate({...reflection, reflectionExplanation: ''})).toBeFalse();
    expect(tool.validate({...reflection, reflectionExplanation: 'x'.repeat(5001)})).toBeFalse();
    expect(element.textContent).toContain('Choices stay in page memory');
    expect(element.querySelector('[data-poll-results-visibility]')!.parentElement!.style.display).toBe('none');
    expect(element.querySelector('[data-reflection-explanation]')!.parentElement!.style.display).toBe('grid');
  });

});
