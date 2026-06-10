import { ComponentFixture, TestBed } from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {defaultSoundConfig, SOUND_SERVICE_CONFIG} from '../../../providers/sound/sound.module';

import { JokeTrayComponent } from './joke-tray.component';

describe('JokeTrayComponent', () => {
  let component: JokeTrayComponent;
  let fixture: ComponentFixture<JokeTrayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JokeTrayComponent, RouterTestingModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: SOUND_SERVICE_CONFIG, useValue: defaultSoundConfig}
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JokeTrayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
