import {TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {BlogTagListComponent} from './tag-list.component';

describe('BlogTagListComponent', () => {
  it('reuses tag-chip positions while updating labels and routes between articles', async () => {
    await TestBed.configureTestingModule({
      imports: [BlogTagListComponent, RouterTestingModule],
    }).compileComponents();

    const fixture = TestBed.createComponent(BlogTagListComponent);
    fixture.componentRef.setInput('tags', Array.from({length: 10}, (_, index) => `Old Tag ${index + 1}`));
    fixture.detectChanges();

    const firstLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a');

    fixture.componentRef.setInput('tags', Array.from({length: 10}, (_, index) => `New Tag ${index + 1}`));
    fixture.detectChanges();

    const updatedFirstLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a');

    expect(updatedFirstLink).toBe(firstLink);
    expect(updatedFirstLink?.textContent?.trim()).toBe('New Tag 1');
    expect(updatedFirstLink?.getAttribute('href')).toBe('/blog/tag/new-tag-1');
  });
});
