import {TestBed} from '@angular/core/testing';
import {BlogReaderReflectionComponent} from './blog-reader-reflection.component';
import {BlogBlockRendererComponent} from '../block-renderer/blog-block-renderer.component';
import {isBlogContentBlock} from '../../utils/blog-validation.util';

const block = {id: 'reflection', type: 'poll' as const, data: {pollMode: 'reflection' as const,
  question: 'What convinces you?', description: 'Choose a first take.',
  pollOptions: [{id: 'clip', label: 'The clip'}, {id: 'repeat', label: 'Repeatable tests'}],
  reflectionExplanation: 'One demonstration leaves questions about repeatability.'}};

describe('BlogReaderReflectionComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(BlogReaderReflectionComponent);
    fixture.componentRef.setInput('block', block);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps the first choice while allowing a changed view after the evidence', () => {
    const fixture = setup();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.evidence')).toBeNull();
    root.querySelector<HTMLInputElement>('input[value="clip"]')!.click(); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.reveal')!.click(); fixture.detectChanges();
    expect(root.querySelector('.evidence')!.textContent).toContain('repeatability');
    expect(root.querySelector('.first-take')!.textContent).toContain('The clip');
    root.querySelector<HTMLInputElement>('input[value="repeat"]')!.click(); fixture.detectChanges();
    expect(root.querySelector('[role="status"]')!.textContent).toContain('Your view changed');
    expect(root.querySelector('.first-take')!.textContent).toContain('The clip');
  });

  it('allows reading without a choice and clears state when the question changes', () => {
    const fixture = setup(); const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.skip')!.click(); fixture.detectChanges();
    expect(root.querySelector('.evidence')).not.toBeNull();
    expect(root.querySelector('.first-take')).toBeNull();
    fixture.componentRef.setInput('block', {...block, id: 'another'}); fixture.detectChanges();
    expect(root.querySelector('.evidence')).toBeNull();
    expect(root.querySelector('input:checked')).toBeNull();
  });

  it('renders reflections through the public block renderer without creating a poll service', () => {
    const fixture = TestBed.createComponent(BlogBlockRendererComponent);
    fixture.componentRef.setInput('blocks', [block]); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-blog-reader-reflection')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-blog-poll')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Sign in');
  });
  it('rejects malformed reflection definitions at the public read boundary', () => {
    expect(isBlogContentBlock(block)).toBeTrue();
    expect(isBlogContentBlock({...block, data: {...block.data, pollMode: 'unknown'}})).toBeFalse();
    expect(isBlogContentBlock({...block, data: {...block.data, pollOptions: []}})).toBeFalse();
    expect(isBlogContentBlock({...block, data: {...block.data, reflectionExplanation: ''}})).toBeFalse();
  });

});
