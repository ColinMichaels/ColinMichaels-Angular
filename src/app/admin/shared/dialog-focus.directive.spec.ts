import {Component, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {DialogFocusDirective} from './dialog-focus.directive';

@Component({
  imports: [DialogFocusDirective],
  template: `
    <div id="permanently-inert" inert>Unavailable application region</div>
    <button #outerLaunch id="outer-launch" type="button">Open outer dialog</button>

    @if (outerOpen()) {
      <section
        id="outer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="outer-title"
        [appDialogFocus]="outerLaunch"
      >
        <h2 id="outer-title" tabindex="-1" data-dialog-initial-focus>Outer dialog</h2>
        <button #innerLaunch id="inner-launch" type="button">Open inner dialog</button>

        @if (innerOpen()) {
          <section
            id="inner-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inner-title"
            [appDialogFocus]="innerLaunch"
          >
            <h2 id="inner-title" tabindex="-1" data-dialog-initial-focus>Inner dialog</h2>
            <button type="button">Inner action</button>
          </section>
        }
      </section>
    }
  `,
})
class DialogFocusTestHostComponent {
  readonly outerOpen = signal(true);
  readonly innerOpen = signal(false);
}

describe('DialogFocusDirective', () => {
  let fixture: ComponentFixture<DialogFocusTestHostComponent>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogFocusTestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogFocusTestHostComponent);
    root = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('preserves background regions that were inert before the dialog opened', () => {
    const launch = root.querySelector<HTMLElement>('#outer-launch')!;
    const permanentlyInert = root.querySelector<HTMLElement>('#permanently-inert')!;

    expect(launch.hasAttribute('inert')).toBeTrue();
    expect(permanentlyInert.hasAttribute('inert')).toBeTrue();

    fixture.componentInstance.outerOpen.set(false);
    fixture.detectChanges();

    expect(launch.hasAttribute('inert')).toBeFalse();
    expect(permanentlyInert.hasAttribute('inert')).toBeTrue();
    expect(document.activeElement).toBe(launch);
  });

  it('keeps outer isolation intact while a nested dialog opens and closes', () => {
    const launch = root.querySelector<HTMLElement>('#outer-launch')!;
    const permanentlyInert = root.querySelector<HTMLElement>('#permanently-inert')!;
    const outerTitle = root.querySelector<HTMLElement>('#outer-title')!;
    const innerLaunch = root.querySelector<HTMLElement>('#inner-launch')!;

    fixture.componentInstance.innerOpen.set(true);
    fixture.detectChanges();

    expect(document.activeElement).toBe(root.querySelector('#inner-title'));
    expect(outerTitle.hasAttribute('inert')).toBeTrue();
    expect(innerLaunch.hasAttribute('inert')).toBeTrue();
    expect(launch.hasAttribute('inert')).toBeTrue();
    expect(permanentlyInert.hasAttribute('inert')).toBeTrue();

    fixture.componentInstance.innerOpen.set(false);
    fixture.detectChanges();

    expect(outerTitle.hasAttribute('inert')).toBeFalse();
    expect(innerLaunch.hasAttribute('inert')).toBeFalse();
    expect(launch.hasAttribute('inert')).toBeTrue();
    expect(permanentlyInert.hasAttribute('inert')).toBeTrue();
    expect(document.activeElement).toBe(innerLaunch);

    fixture.componentInstance.outerOpen.set(false);
    fixture.detectChanges();

    expect(launch.hasAttribute('inert')).toBeFalse();
    expect(permanentlyInert.hasAttribute('inert')).toBeTrue();
    expect(document.activeElement).toBe(launch);
  });
});
