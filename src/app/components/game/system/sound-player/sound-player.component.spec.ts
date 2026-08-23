import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoundPlayerComponent } from './sound-player.component';

describe('SoundPlayerComponent', () => {
  let component: SoundPlayerComponent;
  let fixture: ComponentFixture<SoundPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoundPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SoundPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the tray range synchronized with root volume changes', () => {
    component.musicService.setVolume(0.6);
    fixture.detectChanges();

    expect(component.volume()).toBe(0.6);
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[aria-label="Music volume"]')?.value)
      .toBe('60');
  });
});
