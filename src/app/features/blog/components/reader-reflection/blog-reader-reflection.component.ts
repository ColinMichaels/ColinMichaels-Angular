import {ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, ViewChild, signal} from '@angular/core';
import type {BlogContentBlock} from '../../models/blog-post.model';

@Component({
  selector: 'app-blog-reader-reflection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="reflection" [attr.aria-labelledby]="'reflection-' + block.id">
      <h3 [id]="'reflection-' + block.id">{{ block.data.question }}</h3>
      @if (block.data.description) { <p class="description">{{ block.data.description }}</p> }
      <p class="privacy">A private reflection. Your choices stay on this page.</p>

      @if (revealed()) {
        <div #evidence class="evidence" role="region" tabindex="-1" [attr.aria-label]="'Evidence: ' + block.data.question">
          <h4>The evidence to weigh</h4>
          <p>{{ block.data.reflectionExplanation }}</p>
        </div>
        @if (firstChoiceLabel()) { <p class="first-take">Your first take: <strong>{{ firstChoiceLabel() }}</strong></p> }
        <h4 class="reconsider">Where do you stand now?</h4>
      }

      <fieldset #choices>
        <legend class="sr-only">{{ revealed() ? 'Your view after reading the evidence' : block.data.question }}</legend>
        @for (option of block.data.pollOptions; track option.id) {
          <label [class.selected]="choice() === option.id">
            <input type="radio" [name]="'reflection-choice-' + block.id" [value]="option.id"
              [checked]="choice() === option.id" (change)="choice.set(option.id)">
            <span>{{ option.label }}</span>
          </label>
        }
      </fieldset>

      @if (!revealed()) {
        <div class="actions">
          <button type="button" class="reveal" [disabled]="!choice()" (click)="reveal()">Weigh the evidence</button>
          <button type="button" class="skip" (click)="revealed.set(true)">Read without choosing</button>
        </div>
      } @else {
        <p class="reflection-status" role="status">
          @if (firstChoice() && choice() !== firstChoice()) {
            Your view changed. Which detail made the difference?
          } @else if (firstChoice()) {
            Still your view? Consider what evidence could change it.
          } @else {
            Choose a view if you like. There is no score to earn.
          }
        </p>
        <button type="button" class="skip" (click)="reset()">Start again</button>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .reflection { border-block: 1px solid var(--site-border, #3f3f46); padding-block: 1.75rem; color: var(--site-text, #f4f4f5); }
    h3 { font-size: 1.5em; font-weight: 600; line-height: 1.25; color: var(--site-heading, inherit); }
    h4 { font-weight: 600; }
    .description, .privacy, .first-take { margin-top: .75rem; line-height: 1.65; }
    .privacy { color: var(--site-muted, #a1a1aa); font-size: .8125rem; }
    fieldset { display: grid; gap: .65rem; margin-top: 1.25rem; }
    label { display: flex; align-items: start; gap: .85rem; min-height: 3rem; border: 1px solid var(--site-border, #3f3f46); padding: .9rem 1rem; cursor: pointer; line-height: 1.5; }
    label:hover, label.selected { border-color: var(--site-accent, #67e8f9); background: color-mix(in srgb, var(--site-accent, #67e8f9) 8%, transparent); }
    label span { min-width: 0; overflow-wrap: anywhere; }
    h3, .description, .evidence p, .first-take { overflow-wrap: anywhere; }
    input { flex-shrink: 0; width: 1.15rem; height: 1.15rem; margin-top: .18rem; color: var(--site-accent, #67e8f9); accent-color: var(--site-accent, #67e8f9); }
    input:checked { border-color: var(--site-accent, #67e8f9); background-color: var(--site-bg, #09090b); background-image: radial-gradient(circle, var(--site-accent, #67e8f9) 0 40%, transparent 45%); }
    .actions { display: flex; flex-wrap: wrap; gap: .5rem 1rem; margin-top: 1.25rem; }
    button { min-height: 2.75rem; padding: .65rem 1rem; font-size: .875rem; font-weight: 600; }
    .reveal { background: var(--site-accent, #67e8f9); color: var(--site-bg, #09090b); }
    .reveal:disabled { opacity: .45; cursor: not-allowed; }
    .skip { text-decoration: underline; text-underline-offset: .25em; color: var(--site-muted, #a1a1aa); }
    .evidence { margin-block: 1.5rem; border-left: 3px solid var(--site-accent, #67e8f9); padding-left: 1rem; }
    .evidence p { margin-top: .65rem; white-space: pre-line; line-height: 1.75; }
    .reconsider { margin-top: 1.5rem; }
    .reflection-status { margin-top: 1.25rem; line-height: 1.65; }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--site-accent, #67e8f9); outline-offset: 3px; }
  `,
})
export class BlogReaderReflectionComponent implements OnChanges {
  @Input({required: true}) block!: BlogContentBlock;
  @ViewChild('choices') private choices?: ElementRef<HTMLFieldSetElement>;
  @ViewChild('evidence') set evidence(element: ElementRef<HTMLElement> | undefined) {
    element?.nativeElement.focus();
  }
  protected readonly choice = signal<string | null>(null);
  protected readonly firstChoice = signal<string | null>(null);
  protected readonly revealed = signal(false);

  ngOnChanges(): void { this.reset(); }
  protected firstChoiceLabel(): string {
    return this.block.data.pollOptions?.find(option => option.id === this.firstChoice())?.label ?? '';
  }
  protected reveal(): void {
    if (!this.choice()) return;
    this.firstChoice.set(this.choice());
    this.revealed.set(true);
  }
  protected reset(): void {
    this.choice.set(null);
    this.firstChoice.set(null);
    this.revealed.set(false);
    this.choices?.nativeElement.querySelector('input')?.focus();
  }
}
