import type {BlockAPI} from '@editorjs/editorjs';

import {ListPresentationTune} from './list-presentation.tune';

interface ListPresentationMenuItem {
  isActive?: boolean;
  isDisabled?: boolean;
  onActivate?: () => void;
}

function createBlockHolder(style: 'ordered' | 'unordered'): {
  block: BlockAPI;
  holder: HTMLElement;
  dispatchChange: jasmine.Spy;
} {
  const holder = document.createElement('div');
  const list = document.createElement('div');
  const dispatchChange = jasmine.createSpy('dispatchChange');
  list.className = `cdx-list cdx-list-${style}`;
  holder.append(list);

  return {
    holder,
    dispatchChange,
    block: {
      holder,
      dispatchChange,
    } as unknown as BlockAPI,
  };
}

describe('ListPresentationTune', () => {
  it('keeps Standard implicit for legacy ordered lists', () => {
    const {block, holder} = createBlockHolder('ordered');
    const tune = new ListPresentationTune({block, data: {}});
    const wrapped = tune.wrap(holder.firstElementChild as HTMLElement);

    expect(wrapped.dataset['listPresentation']).toBe('standard');
    expect(tune.save()).toEqual({});
  });

  it('round-trips the bounded Steps presentation for ordered lists', () => {
    const {block, holder} = createBlockHolder('ordered');
    const tune = new ListPresentationTune({block, data: {presentation: 'steps'}});
    const wrapped = tune.wrap(holder.firstElementChild as HTMLElement);
    const menu = tune.render() as ListPresentationMenuItem[];

    expect(wrapped.dataset['listPresentation']).toBe('steps');
    expect(menu[1].isActive).toBeTrue();
    expect(menu[1].isDisabled).toBeFalse();
    expect(tune.save()).toEqual({presentation: 'steps'});
  });

  it('preserves an explicitly stored Standard presentation', () => {
    const {block, holder} = createBlockHolder('ordered');
    const tune = new ListPresentationTune({block, data: {presentation: 'standard'}});
    tune.wrap(holder.firstElementChild as HTMLElement);

    expect(tune.save()).toEqual({presentation: 'standard'});
  });

  it('disables and drops Steps when the list is not ordered', () => {
    const {block, holder} = createBlockHolder('unordered');
    const tune = new ListPresentationTune({block, data: {presentation: 'steps'}});
    const wrapped = tune.wrap(holder.firstElementChild as HTMLElement);
    const menu = tune.render() as ListPresentationMenuItem[];

    expect(wrapped.dataset['listPresentation']).toBe('standard');
    expect(menu[1].isDisabled).toBeTrue();
    expect(tune.save()).toEqual({});
  });

  it('updates the WYSIWYG wrapper and dispatches a block change', () => {
    const {block, holder, dispatchChange} = createBlockHolder('ordered');
    const tune = new ListPresentationTune({block, data: {}});
    const wrapped = tune.wrap(holder.firstElementChild as HTMLElement);
    const menu = tune.render() as ListPresentationMenuItem[];

    menu[1].onActivate?.();

    expect(wrapped.dataset['listPresentation']).toBe('steps');
    expect(dispatchChange).toHaveBeenCalledTimes(1);
    expect(tune.save()).toEqual({presentation: 'steps'});
  });
});
