import {DOCUMENT} from '@angular/common';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef,
  HostListener, inject, Injector, signal, ViewChild,
} from '@angular/core';
import {RouterLink} from '@angular/router';

import {SCARY_CHRISTMAS_CONFIG} from './scary-christmas.config';
import {ScaryChristmasService} from './scary-christmas.service';

@Component({
  selector: 'app-scary-christmas-lantern',
  imports: [CdkTrapFocus, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hunt.enabled()) {
      <button id="scary-lantern-toggle" type="button" class="scary-lantern-toggle"
        [class.scary-lantern-toggle--full]="hunt.complete()"
        [attr.aria-label]="'Open your lantern: ' + hunt.count() + ' of 8 candies'"
        [attr.aria-expanded]="hunt.panelOpen()" aria-controls="scary-lantern-dialog"
        (click)="hunt.openLantern()">
        <img src="/assets/seasonal/scary-christmas/collection-lantern.webp" width="42" height="64" alt="">
        <span>{{ hunt.count() }} <span aria-hidden="true">/</span> 8</span>
      </button>
      <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {{ hunt.announcement() }}
      </p>
      @if (toast()) {
        <p class="scary-collection-announcement" aria-hidden="true">{{ toast() }}</p>
      }
    } @else {
      <button id="scary-restore-toggle" type="button" class="scary-restore-toggle" (click)="restore()">Bring back Scary Christmas</button>
    }

    @if (hunt.panelOpen() && hunt.enabled()) {
      <div class="scary-lantern-backdrop" aria-hidden="true"></div>
      <section id="scary-lantern-dialog" class="scary-lantern-dialog" role="dialog" aria-modal="true"
        aria-labelledby="scary-lantern-title" cdkTrapFocus [cdkTrapFocusAutoCapture]="true">
        <button type="button" class="scary-close-button" aria-label="Close your lantern" (click)="close()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
        <div class="scary-lantern-summary">
          <img class="scary-lantern-portrait" src="/assets/seasonal/scary-christmas/collection-lantern.webp"
            width="76" height="116" alt="A glowing brass lantern with a crescent moon and stars">
          <div>
            <h2 id="scary-lantern-title">Your lantern</h2>
            <p class="scary-lantern-count">{{ hunt.count() }} of 8 candies</p>
            <div class="scary-collection-slots" aria-label="Candy collection">
              @for (candy of hunt.candies; track candy.id) {
                <span [class.scary-slot--collected]="hunt.isCollected(candy.id)"
                  [attr.title]="hunt.isCollected(candy.id) ? candy.name + ' found' : 'A sweet still waiting'"
                  [attr.aria-label]="hunt.isCollected(candy.id) ? candy.name + ' found' : 'Not yet found'">
                  @if (hunt.isCollected(candy.id)) {
                    <img src="/assets/seasonal/scary-christmas/moon-candy.webp" width="28" height="28" alt="">
                  }
                </span>
              }
            </div>
          </div>
        </div>

        @if (hunt.complete()) {
          <div class="scary-completion" role="status">
            <h3>A lantern full of little wonders.</h3>
            <p>You found every sweet. Stay curious, stay strange, and enjoy the spooky season.</p>
          </div>
        } @else {
          <p class="scary-next-clue">{{ nextCandy()?.clue }}</p>
          <p class="scary-hunt-description">Eight little treats are hiding across the site. Tap a candy when you spot one.</p>
        }
        @if (!hunt.persistenceAvailable()) {
          <p class="scary-storage-note">Your browser is keeping this lantern for this visit only.</p>
        }

        <div class="scary-dialog-actions">
          <button type="button" class="scary-button scary-button--primary" (click)="showClues.set(!showClues())">
            {{ showClues() ? 'Hide clues' : 'Show clues' }}
          </button>
          <button type="button" id="scary-keep-exploring" class="scary-button scary-button--outline" cdkFocusInitial (click)="close()">Keep exploring</button>
        </div>

        @if (showClues()) {
          <ol class="scary-clue-list">
            @for (candy of hunt.candies; track candy.id) {
              <li [class.scary-clue--found]="hunt.isCollected(candy.id)">
                @if (hunt.isCollected(candy.id)) {
                  <span>{{ candy.name }} <small>Found</small></span>
                } @else {
                  <a [routerLink]="candy.route" [fragment]="candy.placement === 'footer' ? 'site-footer' : undefined" (click)="close()">
                    {{ candy.clue }}
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
                  </a>
                }
              </li>
            }
          </ol>
        }

        <div class="scary-soundtrack">
          <div>
            <h3>Dreadnauts after dark</h3>
            <p>Spooky · The Dreadnauts</p>
          </div>
          @if (!musicRequested()) {
            <button type="button" class="scary-button scary-button--outline" (click)="playMusic()">Play Spooky</button>
          }
          @if (musicRequested() && config.musicSrc) {
            <audio #soundtrack controls tabindex="0" preload="none" [src]="config.musicSrc" data-testid="scary-soundtrack"
              aria-label="Spooky by The Dreadnauts" (error)="musicError.set(true)">
              Your browser cannot play this audio.
            </audio>
            @if (musicError()) {
              <p class="scary-storage-note">The track could not load. Try the Dreadnauts listening page.</p>
            }
          }
          <a class="scary-listening-link" [href]="config.musicHref" target="_blank" rel="noopener noreferrer">More from the Dreadnauts</a>
        </div>

        <div class="scary-lantern-settings">
          <button type="button" (click)="disable()">Use the normal design</button>
          @if (hunt.count() > 0 && !confirmReset()) {
            <button type="button" (click)="confirmReset.set(true)">Reset candy hunt</button>
          }
        </div>
        @if (confirmReset()) {
          <div class="scary-reset-confirmation">
            <p>Empty this lantern and hunt again?</p>
            <button type="button" class="scary-button scary-button--outline" (click)="confirmReset.set(false)">Keep my candy</button>
            <button type="button" class="scary-button scary-button--primary" (click)="reset()">Start over</button>
          </div>
        }
      </section>
    }
  `,
})
export class ScaryChristmasLanternComponent {
  @ViewChild('soundtrack') private soundtrack?: ElementRef<HTMLAudioElement>;
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  protected readonly toast = signal('');
  private toastTimeout?: ReturnType<typeof setTimeout>;
  protected readonly hunt = inject(ScaryChristmasService);
  protected readonly config = SCARY_CHRISTMAS_CONFIG;
  protected readonly showClues = signal(false);
  protected readonly confirmReset = signal(false);
  protected readonly musicRequested = signal(false);
  protected readonly musicError = signal(false);
  protected readonly nextCandy = computed(() => this.hunt.candies.find(candy => !this.hunt.isCollected(candy.id)));

  constructor() {
    effect(() => {
      const announcement = this.hunt.announcement();
      clearTimeout(this.toastTimeout);
      this.toast.set(announcement);
      if (announcement) {
        this.toastTimeout = setTimeout(() => this.toast.set(''), 5000);
      }
    });
    effect(() => {
      if (!this.hunt.enabled() || !this.hunt.panelOpen()) {
        this.soundtrack?.nativeElement.pause();
        this.musicRequested.set(false);
        this.confirmReset.set(false);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.toastTimeout);
      this.soundtrack?.nativeElement.pause();
      this.hunt.closeLantern();
    });
  }

  @HostListener('document:keydown.escape') protected onEscape(): void {
    if (this.hunt.panelOpen()) {
      this.close();
    }
  }

  protected close(): void {
    this.soundtrack?.nativeElement.pause();
    this.hunt.closeLantern();
    this.musicRequested.set(false);
    this.confirmReset.set(false);
  }

  protected disable(): void {
    this.close();
    this.hunt.setEnabled(false);
    this.focusAfterRender('scary-restore-toggle');
  }

  protected restore(): void {
    this.hunt.setEnabled(true);
    this.focusAfterRender('scary-lantern-toggle');
  }

  protected reset(): void {
    this.hunt.resetHunt();
    this.confirmReset.set(false);
    this.focusAfterRender('scary-keep-exploring');
  }

  private focusAfterRender(id: string): void {
    afterNextRender(() => this.document.getElementById(id)?.focus({preventScroll: true}), {injector: this.injector});
  }

  protected playMusic(): void {
    this.musicRequested.set(true);
    this.musicError.set(false);
    afterNextRender(() => {
      this.soundtrack?.nativeElement.focus();
      void this.soundtrack?.nativeElement.play().catch(() => {
        // Native controls remain usable when browser policy requires a second gesture.
      });
    }, {injector: this.injector});
  }
}
