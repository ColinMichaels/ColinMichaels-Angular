import {DOCUMENT} from '@angular/common';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, EnvironmentInjector,
  HostListener, inject, signal,
} from '@angular/core';
import {RouterLink} from '@angular/router';

import {SeasonalService} from '../seasonal.service';

@Component({
  selector: 'app-seasonal-lantern',
  imports: [CdkTrapFocus, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seasonal-controls" aria-label="Seasonal controls">
      @if (hunt.edition(); as edition) {
        @if (hunt.enabled()) {
          <button id="seasonal-lantern-toggle" type="button" class="seasonal-lantern-toggle"
            [class.seasonal-lantern-toggle--full]="hunt.complete() && edition.interaction !== 'reflect'"
            [attr.aria-label]="edition.interaction === 'reflect' ? 'About this holiday' : 'Open your ' + edition.collectorName + ': ' + hunt.count() + ' of ' + hunt.total() + ' ' + edition.collectibleLabel"
            [attr.aria-expanded]="hunt.panelOpen()" aria-controls="seasonal-lantern-dialog"
            (click)="hunt.openLantern()">
            @if (edition.interaction === 'reflect') {
              <span class="seasonal-reflection-symbol" aria-hidden="true">✦</span>
              <span>About this holiday</span>
            } @else {
              <img [src]="edition.collectorSrc" width="42" height="64" alt="">
              <span>{{ hunt.count() }} <span aria-hidden="true">/</span> {{ hunt.total() }}</span>
            }
          </button>
          @if (edition.interaction !== 'reflect') {
            <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ hunt.announcement() }}</p>
            @if (toast()) {
              <p class="seasonal-collection-announcement" aria-hidden="true">{{ toast() }}</p>
            }
          }
        } @else if (hunt.canCustomize()) {
          <button id="seasonal-restore-toggle" type="button" class="seasonal-restore-toggle" (click)="restore()">Bring back {{ edition.holidayLabel }}</button>
        }
      }
      @if (hunt.canCustomize()) {
      <button id="seasonal-theme-toggle" type="button" class="seasonal-theme-toggle"
        [attr.aria-expanded]="optionsOpen()" aria-controls="seasonal-lantern-dialog" (click)="openOptions()">
        <span aria-hidden="true" class="seasonal-theme-dot"></span>Holiday options
      </button>
      }
    </div>

    @if (hunt.panelOpen() || optionsOpen()) {
      <div class="seasonal-lantern-backdrop" aria-hidden="true"></div>
      <section id="seasonal-lantern-dialog" class="seasonal-lantern-dialog" role="dialog" aria-modal="true"
        aria-labelledby="seasonal-lantern-title" cdkTrapFocus [cdkTrapFocusAutoCapture]="true">
        <button type="button" class="seasonal-close-button" [attr.aria-label]="closeLabel()" (click)="close()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
        <div class="seasonal-lantern-summary">
          @if (showHunt()) {
            <img class="seasonal-lantern-portrait" [src]="hunt.edition()?.collectorSrc" width="76" height="116" alt="">
          }
          <div>
            <h2 id="seasonal-lantern-title">{{ dialogTitle() }}</h2>
            @if (showHunt()) {
              <p class="seasonal-lantern-count">{{ hunt.count() }} of {{ hunt.total() }} {{ hunt.edition()?.collectibleLabel }}</p>
              <div class="seasonal-collection-slots" [attr.aria-label]="hunt.edition()?.collectibleLabel + ' collection'">
                @for (item of hunt.items(); track item.id) {
                  <span [class.seasonal-slot--collected]="hunt.isCollected(item.id)"
                    [attr.title]="hunt.isCollected(item.id) ? item.name + ' found' : 'Still waiting to be found'"
                    [attr.aria-label]="hunt.isCollected(item.id) ? item.name + ' found' : 'Not yet found'">
                    @if (hunt.isCollected(item.id)) {
                      <img [src]="hunt.edition()?.collectibleSrc" width="28" height="28" alt="">
                    }
                  </span>
                }
              </div>
            } @else if (hunt.edition(); as edition) {
              <p class="seasonal-options-edition">{{ edition.holidayLabel }} {{ edition.year }}</p>
            }
          </div>
        </div>

        @if (hunt.canCustomize()) {
        <div class="seasonal-theme-settings">
          <p class="seasonal-storage-note">Holiday decorations follow the site's celebrations. You can use the normal design at any time.</p>
          @if (hunt.visitorDisabled()) {
            <p class="seasonal-storage-note">The normal design is on. Your collection is saved.</p>
            <button type="button" class="seasonal-normal-button" (click)="restore(); close()">Use the site's holiday design</button>
          } @else {
            <button type="button" class="seasonal-normal-button" (click)="disable()">Use the normal design</button>
          }
        </div>

        }

        @if (hunt.edition(); as edition) {
          @if (edition.interaction === 'reflect') {
            <div class="seasonal-reflection-note">
              <p>{{ edition.observanceNote }}</p>
              @if (edition.learnMoreUrl) {
                <a [href]="edition.learnMoreUrl" target="_blank" rel="noopener noreferrer">Learn more about {{ edition.holidayLabel }}</a>
              }
            </div>
          } @else if (showHunt()) {
            @if (hunt.complete()) {
              <div class="seasonal-completion" role="status">
                <h3>{{ edition.completionHeading }}</h3>
                <p>{{ edition.completionMessage }}</p>
              </div>
            } @else {
              <p class="seasonal-next-clue">{{ nextItem()?.clue }}</p>
              <p class="seasonal-hunt-description">
                @if (hunt.archiveMode()) {
                  This archive is a collection guide. Finds are earned across the site while this season is active.
                } @else {
                  {{ hunt.total() }} little {{ edition.collectibleLabel }} are hiding across the site. Tap one when you spot it.
                }
              </p>
            }
            @if (!hunt.persistenceAvailable()) {
              <p class="seasonal-storage-note">Your browser is keeping this collection for this visit only.</p>
            }
          }
        }

        <div class="seasonal-dialog-actions">
          @if (showHunt()) {
            <button type="button" class="seasonal-button seasonal-button--primary" (click)="showClues.set(!showClues())">{{ showClues() ? 'Hide clues' : 'Show clues' }}</button>
          }
          <button type="button" id="seasonal-keep-exploring" class="seasonal-button seasonal-button--outline" cdkFocusInitial (click)="close()">Keep exploring</button>
        </div>

        @if (showHunt() && showClues()) {
          <ol class="seasonal-clue-list">
            @for (item of hunt.items(); track item.id) {
              <li [class.seasonal-clue--found]="hunt.isCollected(item.id)">
                @if (hunt.isCollected(item.id)) {
                  <span>{{ item.name }} <small>Found</small></span>
                } @else {
                  <a [routerLink]="hunt.archiveMode() ? archiveUrl() : item.route"
                    [fragment]="hunt.archiveMode() ? 'seasonal-item-' + item.id : (item.placement === 'footer' ? 'site-footer' : undefined)" (click)="close()">
                    {{ item.clue }}
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
                  </a>
                }
              </li>
            }
          </ol>
        }

        @if (hunt.edition(); as edition) {
          @if (!optionsOpen() && edition.musicHref) {
            <a class="seasonal-listening-link" [href]="edition.musicHref" target="_blank" rel="noopener noreferrer">Listen to the Dreadnauts ↗</a>
          }
          @if (showHunt()) {
            <div class="seasonal-lantern-settings">
              @if (hunt.count() > 0 && !confirmReset()) {
                <button type="button" (click)="confirmReset.set(true)">Reset hunt</button>
              }
            </div>
            @if (confirmReset()) {
              <div class="seasonal-reset-confirmation">
                <p>Empty this {{ edition.collectorName }} and hunt again?</p>
                <button type="button" class="seasonal-button seasonal-button--outline" (click)="confirmReset.set(false)">Keep my collection</button>
                <button type="button" class="seasonal-button seasonal-button--primary" (click)="reset()">Start over</button>
              </div>
            }
          }
        }
      </section>
    }
  `,
})
export class SeasonalLanternComponent {
  private readonly focusInjector = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);
  private toastTimeout?: ReturnType<typeof setTimeout>;
  private previousEditionId: string | null = null;
  protected readonly hunt = inject(SeasonalService);
  protected readonly optionsOpen = signal(false);
  protected readonly toast = signal('');
  protected readonly showClues = signal(false);
  protected readonly confirmReset = signal(false);
  protected readonly nextItem = computed(() => this.hunt.items().find(item => !this.hunt.isCollected(item.id)));
  protected readonly archiveUrl = computed(() => '/archive/seasons/' + this.hunt.edition()?.id);
  protected readonly showHunt = computed(() => this.hunt.enabled() && !this.optionsOpen() && this.hunt.edition()?.interaction !== 'reflect');
  protected readonly dialogTitle = computed(() => this.optionsOpen() ? 'Seasonal options'
    : this.hunt.edition()?.interaction === 'reflect' ? 'About this season' : 'Your ' + this.hunt.edition()?.collectorName);
  protected readonly closeLabel = computed(() => this.optionsOpen() || this.hunt.edition()?.interaction === 'reflect'
    ? 'Close seasonal options' : 'Close your ' + this.hunt.edition()?.collectorName);

  constructor() {
    effect(() => {
      const announcement = this.hunt.announcement();
      clearTimeout(this.toastTimeout);
      this.toast.set(announcement);
      if (announcement) { this.toastTimeout = setTimeout(() => this.toast.set(''), 5000); }
    });
    effect(() => {
      if (!this.hunt.canCustomize() && this.optionsOpen()) {
        this.close();
        this.focusAfterRender(this.hunt.edition() ? 'seasonal-lantern-toggle' : 'main-content');
      }
    });
    effect(() => {
      const editionId = this.hunt.edition()?.id ?? null;
      const changedEdition = this.previousEditionId !== null && editionId !== this.previousEditionId;
      if (changedEdition || !this.hunt.enabled() || !this.hunt.panelOpen()) {
        this.confirmReset.set(false);
      }
      if (changedEdition) {
        this.showClues.set(false);
        this.optionsOpen.set(false);
      }
      this.previousEditionId = editionId;
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.optionsOpen() && !this.hunt.canCustomize()) this.focusAfterRender('main-content');
      clearTimeout(this.toastTimeout);
      this.hunt.closeLantern();
    });
  }

  @HostListener('document:keydown.escape') protected onEscape(): void {
    if (this.hunt.panelOpen() || this.optionsOpen()) { this.close(); }
  }

  protected close(): void {
    this.hunt.closeLantern();
    this.optionsOpen.set(false);
    this.confirmReset.set(false);
  }

  protected openOptions(): void {
    if (!this.hunt.canCustomize()) return;
    this.hunt.closeLantern();
    this.optionsOpen.set(true);
  }

  protected disable(): void {
    this.close();
    this.hunt.setEnabled(false);
    this.focusAfterRender(this.hunt.edition() ? 'seasonal-restore-toggle' : 'seasonal-theme-toggle');
  }

  protected restore(): void {
    this.hunt.setEnabled(true);
    this.focusAfterRender(this.hunt.edition() ? 'seasonal-lantern-toggle' : 'main-content');
  }

  protected reset(): void {
    this.hunt.resetHunt();
    this.confirmReset.set(false);
    this.focusAfterRender('seasonal-keep-exploring');
  }

  private focusAfterRender(id: string): void {
    // Restoring the default can destroy this control before the next render.
    afterNextRender(() => this.document.getElementById(id)?.focus({preventScroll: true}), {injector: this.focusInjector});
  }
}
