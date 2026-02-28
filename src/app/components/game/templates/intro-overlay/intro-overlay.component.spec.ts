import { ComponentFixture, TestBed } from '@angular/core/testing';
import {SoundService} from '../../services/sound.service';
import {RouterTestingModule} from '@angular/router/testing';

import { IntroOverlayComponent } from './intro-overlay.component';

describe('IntroOverlayComponent', () => {
  let component: IntroOverlayComponent;
  let fixture: ComponentFixture<IntroOverlayComponent>;
  const soundServiceMock = jasmine.createSpyObj<SoundService>('SoundService', ['bootAudio', 'playVariant']);
  soundServiceMock.bootAudio.and.returnValue(Promise.resolve());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntroOverlayComponent, RouterTestingModule],
      providers: [{provide: SoundService, useValue: soundServiceMock}]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntroOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
