import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogTableOfContentsComponent} from './blog-table-of-contents.component';

describe('BlogTableOfContentsComponent', () => {
  let fixture: ComponentFixture<BlogTableOfContentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogTableOfContentsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogTableOfContentsComponent);
  });

  it('renders post-scoped section links with active section state', () => {
    fixture.componentRef.setInput('postPath', '/blog/test-post');
    fixture.componentRef.setInput('activeHeadingId', 'second-heading');
    fixture.componentRef.setInput('items', [
      {
        blockId: 'heading-1',
        id: 'first-heading',
        level: 2,
        text: 'First Heading',
      },
      {
        blockId: 'heading-2',
        id: 'second-heading',
        level: 3,
        text: 'Second Heading',
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));

    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/blog/test-post#first-heading',
      '/blog/test-post#second-heading',
    ]);
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(links[1].getAttribute('aria-current')).toBe('location');
    expect(links[1].classList).toContain('border-cyan-300');
  });

  it('smooth-scrolls to headings when a TOC link is clicked', () => {
    const heading = document.createElement('h2');
    heading.id = 'smooth-heading';
    heading.scrollIntoView = jasmine.createSpy('scrollIntoView');
    document.body.appendChild(heading);

    fixture.componentRef.setInput('items', [
      {
        blockId: 'heading-1',
        id: 'smooth-heading',
        level: 2,
        text: 'Smooth Heading',
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>('a');
    const clickEvent = new MouseEvent('click', {bubbles: true, cancelable: true});

    link?.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBeTrue();
    expect(heading.scrollIntoView).toHaveBeenCalledOnceWith({behavior: 'smooth', block: 'start'});

    document.body.removeChild(heading);
  });
});
