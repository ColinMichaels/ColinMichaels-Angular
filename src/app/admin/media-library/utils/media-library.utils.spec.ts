import {MediaLibraryItem} from '../models/media-library.models';
import {createDefaultFilterState, filterMediaItems} from './media-library.utils';

function createItem(id: string, status: MediaLibraryItem['status']): MediaLibraryItem {
  return {
    id,
    displayName: id,
    mediaType: 'image',
    tags: [],
    favorite: false,
    status,
  };
}

describe('media-library filtering', () => {
  const items = [
    createItem('ready', 'ready'),
    createItem('archived', 'archived'),
    createItem('deleted', 'deleted'),
  ];

  it('keeps the ordinary and lifecycle-status views distinct', () => {
    const filters = createDefaultFilterState();

    expect(filterMediaItems(items, '', filters, 'all', null, null, null).map(item => item.id))
      .toEqual(['ready', 'archived']);
    expect(filterMediaItems(items, '', filters, 'archived', null, null, null).map(item => item.id))
      .toEqual(['archived']);
    expect(filterMediaItems(items, '', filters, 'deleted', null, null, null).map(item => item.id))
      .toEqual(['deleted']);
  });
});
