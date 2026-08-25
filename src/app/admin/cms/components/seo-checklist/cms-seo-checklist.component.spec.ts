import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CmsSeoChecklistComponent} from './cms-seo-checklist.component';

describe('CmsSeoChecklistComponent', () => {
  let fixture: ComponentFixture<CmsSeoChecklistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CmsSeoChecklistComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CmsSeoChecklistComponent);
    fixture.componentRef.setInput('checklistInput', {
      title: 'A trustworthy drone field note',
      slug: 'trustworthy-drone-field-note',
      excerpt: 'A clear field note that identifies the source, supporting evidence, and the next useful article for readers before the next flight.',
      coverImage: '/assets/images/blog/drone.webp',
      categories: ['Drones'],
      tags: ['FPV'],
      seoTitle: 'A Trustworthy Drone Field Note',
      seoDescription: 'A clear field note that identifies the source, supporting evidence, and the next useful article for readers before the next flight.',
      canonical: 'https://colinmichaels.com/blog/trustworthy-drone-field-note',
      generatedCanonicalUrl: 'https://colinmichaels.com/blog/trustworthy-drone-field-note',
      openGraphImage: '/assets/social/drone.jpg',
      editorial: {
        evidenceBasis: 'first-person',
        evidenceSummary: 'The flight observations come from Colin’s field notes; linked rules come from the FAA.',
      },
      blocks: [
        {id: 'heading', type: 'header', data: {text: 'What I found', level: 2}},
        {
          id: 'links',
          type: 'paragraph',
          data: {
            text: '<a href="https://www.faa.gov/uas">FAA UAS guidance</a> and <a href="/blog/drone-flight-field-notes">drone field notes</a>.',
          },
        },
        {id: 'image', type: 'image', data: {url: '/assets/images/blog/drone.webp', alt: 'FPV drone'}},
      ],
    });
    fixture.detectChanges();
  });

  it('presents search and content-quality checks as one discovery and trust review', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Discovery & Trust Checklist');
    expect(text).toContain('Usable references');
    expect(text).toContain('Contextual next read');
    expect(text).toContain('Supporting evidence');
    expect(text).toContain('Evidence classification');
    expect(text).toContain('14/14');
  });

  it('memoizes the checklist analysis until its input changes', () => {
    const component = fixture.componentInstance as unknown as {
      checklist: () => unknown;
    };

    expect(component.checklist()).toBe(component.checklist());
  });
});
