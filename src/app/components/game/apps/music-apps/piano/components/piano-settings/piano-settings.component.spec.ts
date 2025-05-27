import {ComponentFixture, TestBed} from '@angular/core/testing';

import {PianoSettingsComponent} from './piano-settings.component';

describe('PianoSettingsComponent', () => {
  let component: PianoSettingsComponent;
  let fixture: ComponentFixture<PianoSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PianoSettingsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PianoSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
