import {By} from '@angular/platform-browser';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';

import {AuthService} from '../../../../services/auth.service';
import {BlogBlockRendererComponent} from '../../../../features/blog/components/block-renderer/blog-block-renderer.component';
import {BlogContentBlock} from '../../../../features/blog/models/blog-post.model';
import {BlogPollService} from '../../../../features/blog/services/blog-poll.service';
import {CmsProductionPreviewComponent} from './cms-production-preview.component';

const supportedBlockFixture: readonly BlogContentBlock[] = [
  {id: 'paragraph', type: 'paragraph', data: {text: 'Paragraph <strong>content</strong>.<script>unsafe()</script>'}},
  {id: 'heading-two', type: 'header', data: {text: 'Section heading', level: 2}},
  {id: 'heading-three', type: 'header', data: {text: 'Subheading', level: 3}},
  {
    id: 'image',
    type: 'image',
    data: {
      url: 'https://images.example.com/preview.jpg',
      alt: 'Preview fixture image',
      caption: 'Image caption',
      width: 1200,
      height: 800,
      imageLayout: 'contained',
      imageSize: 'large',
    },
  },
  {
    id: 'embed',
    type: 'embed',
    data: {embedUrl: 'https://www.youtube.com/embed/L229QDxDakU', caption: 'Video fixture'},
  },
  {
    id: 'list',
    type: 'list',
    data: {
      listStyle: 'checklist',
      listItems: [{content: 'Nested list item', meta: {checked: true}, items: []}],
    },
  },
  {
    id: 'steps-list',
    type: 'list',
    data: {
      listStyle: 'ordered',
      listPresentation: 'steps',
      listItems: [{content: 'Preview the first step', meta: {}, items: []}],
    },
  },
  {id: 'quote', type: 'quote', data: {text: 'Quoted fixture', caption: 'Fixture source'}},
  {id: 'code', type: 'code', data: {language: 'typescript', code: 'const preview = true;'}},
  {id: 'markdown', type: 'markdown', data: {markdown: 'Markdown **fixture**'}},
  {id: 'delimiter', type: 'delimiter', data: {}},
  {id: 'typography', type: 'typography', data: {variant: 'keyTakeaway', text: 'Key takeaway fixture'}},
  {
    id: 'stats',
    type: 'stats',
    data: {title: 'Fixture statistics', stats: [{label: 'Blocks', value: '15'}]},
  },
  {
    id: 'chart',
    type: 'chart',
    data: {
      title: 'Fixture chart',
      chartType: 'bar',
      chartPoints: [{label: 'Preview', value: 3}],
      accessibilitySummary: 'One bar with a value of three.',
    },
  },
  {
    id: 'poll',
    type: 'poll',
    data: {
      question: 'Preview poll fixture?',
      pollOptions: [{id: 'yes', label: 'Yes'}, {id: 'no', label: 'No'}],
      pollResultsVisibility: 'afterVote',
    },
  },
  {id: 'cat-corner', type: 'catCornerUnlock', data: {}},
  {id: 'html', type: 'html', data: {html: '<p>Sanitized HTML fixture</p><script>unsafe()</script>'}},
];

const expectedSupportedBlockTypes = [
  'catCornerUnlock',
  'chart',
  'code',
  'delimiter',
  'embed',
  'header',
  'html',
  'image',
  'list',
  'markdown',
  'paragraph',
  'poll',
  'quote',
  'stats',
  'typography',
] as const;

describe('CmsProductionPreviewComponent', () => {
  let fixture: ComponentFixture<CmsProductionPreviewComponent>;
  let pollService: {getResults: jasmine.Spy; submitVote: jasmine.Spy};

  beforeEach(async () => {
    pollService = {
      getResults: jasmine.createSpy('getResults'),
      submitVote: jasmine.createSpy('submitVote'),
    };

    await TestBed.configureTestingModule({
      imports: [CmsProductionPreviewComponent],
      providers: [
        provideRouter([]),
        {provide: AuthService, useValue: {user$: of(null)}},
        {provide: BlogPollService, useValue: pollService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CmsProductionPreviewComponent);
    fixture.componentRef.setInput('title', 'Unsaved production preview');
    fixture.componentRef.setInput('excerpt', 'Current metadata is visible without saving.');
    fixture.componentRef.setInput('postId', 'preview-post');
    fixture.componentRef.setInput('postSlug', 'preview-post');
  });

  it('passes every supported block through the public renderer and keeps preview polls read-only', () => {
    fixture.componentRef.setInput('blocks', supportedBlockFixture);
    fixture.detectChanges();

    const renderer = fixture.debugElement.query(By.directive(BlogBlockRendererComponent))
      .componentInstance as BlogBlockRendererComponent;
    const element = fixture.nativeElement as HTMLElement;

    expect(renderer.blocks).toBe(supportedBlockFixture);
    expect(renderer.previewMode).toBeTrue();
    expect(element.querySelector('.public-reader-scope.site-theme-scope')).not.toBeNull();
    expect(element.querySelector('h1.blog-article-title')?.textContent).toContain('Unsaved production preview');
    expect([...new Set(supportedBlockFixture.map(block => block.type))].sort()).toEqual(expectedSupportedBlockTypes);
    expect(element.textContent).toContain('Paragraph content.');
    expect(element.textContent).toContain('Section heading');
    expect(element.textContent).toContain('Nested list item');
    expect(element.textContent).toContain('Preview the first step');
    expect(element.querySelector('ol.blog-list-steps[data-list-presentation="steps"]')).not.toBeNull();
    expect(element.textContent).toContain('Quoted fixture');
    expect(element.textContent).toContain('const preview = true;');
    expect(element.textContent).toContain('Markdown fixture');
    expect(element.textContent).toContain('Key takeaway fixture');
    expect(element.textContent).toContain('Fixture statistics');
    expect(element.textContent).toContain('Fixture chart');
    expect(element.textContent).toContain('Preview poll fixture?');
    expect(element.textContent).toContain('Production preview only. Voting is disabled.');
    expect(element.textContent).toContain('Sanitized HTML fixture');
    expect(element.querySelector('img[alt="Preview fixture image"]')).not.toBeNull();
    expect(element.querySelector('figure[data-image-size="large"]')).not.toBeNull();
    expect(element.querySelector('iframe[title="Video fixture"]')).not.toBeNull();
    expect(element.querySelector('hr')).not.toBeNull();
    expect(element.querySelector('app-cat-corner-easter-egg')).not.toBeNull();
    expect(element.querySelector('script')).toBeNull();
    expect(pollService.getResults).not.toHaveBeenCalled();
    expect(pollService.submitVote).not.toHaveBeenCalled();
  });

  it('reports compatibility-protected blocks without exposing their opaque payload', () => {
    fixture.componentRef.setInput('blocks', [
      ...supportedBlockFixture.slice(0, 1),
      {
        id: 'unsupported',
        type: 'unsupported',
        data: {
          unsupportedBlock: {
            originalType: 'privateWidget',
            originalData: {secret: 'never-render-this-value'},
          },
        },
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('1 compatibility-protected block omitted');
    expect(element.textContent).not.toContain('privateWidget');
    expect(element.textContent).not.toContain('never-render-this-value');
  });

  it('applies theme, viewport, reader scale, and reduced-motion settings to the isolated reader scope', () => {
    fixture.componentRef.setInput('blocks', supportedBlockFixture.slice(0, 1));
    fixture.detectChanges();

    clickButton(fixture, 'Dark');
    clickButton(fixture, 'Mobile');
    clickButton(fixture, '200%');
    clickButton(fixture, 'Reduce motion');
    fixture.detectChanges();

    const frame = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-testid="cms-production-preview-frame"]');

    expect(frame?.classList).toContain('dark');
    expect(frame?.classList).toContain('reader-font-200');
    expect(frame?.classList).toContain('reader-motion-reduce');
    expect(frame?.dataset['previewViewport']).toBe('mobile');
    expect(frame?.dataset['previewTheme']).toBe('dark');
    expect(frame?.style.width).toBe('390px');
  });

  it('keeps long content complete and exposes keyboard-native setting controls', () => {
    const longText = Array.from({length: 120}, (_, index) => `Long preview sentence ${index + 1}.`).join(' ');
    fixture.componentRef.setInput('blocks', [{id: 'long', type: 'paragraph', data: {text: longText}}]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('header button'));

    expect(element.textContent).toContain('Long preview sentence 120.');
    expect(buttons.length).toBe(9);
    expect(buttons.every(button => button.type === 'button')).toBeTrue();
    expect(buttons.every(button => button.hasAttribute('aria-pressed'))).toBeTrue();
  });
});

function clickButton(fixture: ComponentFixture<CmsProductionPreviewComponent>, label: string): void {
  const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
    .find(candidate => candidate.textContent?.trim() === label);

  expect(button).withContext(`Expected preview control "${label}"`).toBeTruthy();
  button?.click();
}
