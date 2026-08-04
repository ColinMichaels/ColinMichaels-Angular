import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';

import {WeatherComponent} from './weather.component';
import {SettingsService} from '../../services/settings.service';

describe('WeatherComponent', () => {
  let component: WeatherComponent;
  let fixture: ComponentFixture<WeatherComponent>;
  const settingsServiceMock = {
    getSettingValue$: jasmine.createSpy('getSettingValue$').and.returnValue(new BehaviorSubject<'dark' | 'light' | null>(null)),
    updateSettingSetWithSingleValue: jasmine.createSpy('updateSettingSetWithSingleValue'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherComponent],
      providers: [{provide: SettingsService, useValue: settingsServiceMock}]
    })
      .compileComponents();

    fixture = TestBed.createComponent(WeatherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the preserved prototype as labelled local sample data', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(component.currentWeather?.current.location).toBe('Demo Harbor');
    expect(text).toContain('Sample weather only');
    expect(text).toContain('Local sample weather');
    expect(text).toContain('Demo mode');
  });

  it('reloads the local sample when the unit changes', () => {
    component.setUnits(false);
    fixture.detectChanges();

    expect(component.units).toBe('C');
    expect(component.currentWeather?.current.temp).toBe(21);
  });
});
