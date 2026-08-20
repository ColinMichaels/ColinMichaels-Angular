import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {PwaPushService} from '../pwa/pwa-push.service';
import {CommunicationPreferencesComponent} from './communication-preferences.component';

describe('CommunicationPreferencesComponent', () => {
  let fixture: ComponentFixture<CommunicationPreferencesComponent>;
  let push: jasmine.SpyObj<PwaPushService> & {
    available: ReturnType<typeof signal<boolean>>;
    busy: ReturnType<typeof signal<boolean>>;
    subscribed: ReturnType<typeof signal<boolean>>;
    statusMessage: ReturnType<typeof signal<string | null>>;
  };

  beforeEach(async () => {
    push = Object.assign(
      jasmine.createSpyObj<PwaPushService>('PwaPushService', ['toggleSubscription']),
      {
        available: signal(true),
        busy: signal(false),
        subscribed: signal(false),
        statusMessage: signal<string | null>(null),
      }
    );

    await TestBed.configureTestingModule({
      imports: [CommunicationPreferencesComponent],
      providers: [{provide: PwaPushService, useValue: push}],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunicationPreferencesComponent);
    fixture.detectChanges();
  });

  it('shows only the active browser-alert channel and never promises inactive email delivery', () => {
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('button[role="switch"]');

    expect(element.textContent).toContain('Browser notifications');
    expect(element.textContent).not.toContain('New-post emails');
    expect(element.textContent).not.toContain('Occasional newsletter');

    toggle?.click();

    expect(push.toggleSubscription).toHaveBeenCalledOnceWith();
  });
});
