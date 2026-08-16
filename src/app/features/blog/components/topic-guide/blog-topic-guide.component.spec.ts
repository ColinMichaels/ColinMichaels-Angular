import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {TOPIC_HUBS} from '../../../topics/topic-hubs.data';
import {BlogTopicGuideComponent} from './blog-topic-guide.component';

describe('BlogTopicGuideComponent', () => {
  let fixture: ComponentFixture<BlogTopicGuideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogTopicGuideComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogTopicGuideComponent);
    fixture.componentRef.setInput(
      'topic',
      TOPIC_HUBS.find(topicHub => topicHub.slug === 'drones-fpv')!
    );
    fixture.detectChanges();
  });

  it('renders one descriptive route into the matched topic guide', () => {
    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector('a');

    expect(element.querySelector('h2')?.textContent).toContain('Drones & FPV');
    expect(element.textContent).toContain('Flight stories');
    expect(link?.getAttribute('href')).toBe('/topics/drones-fpv');
    expect(link?.textContent).toContain('Explore Drones');
  });
});
