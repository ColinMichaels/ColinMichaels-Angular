import {firstValueFrom} from 'rxjs';

import {ForecastEntry, WeatherService} from './weather.service';

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(() => {
    service = new WeatherService();
  });

  it('returns local sample weather without requiring a provider', async () => {
    const bundle = await firstValueFrom(service.getWeatherBundle());

    expect(service.isDemoMode).toBeTrue();
    expect(service.getUnit()).toBe('F');
    expect(bundle.current.location).toBe('Demo Harbor');
    expect(bundle.current.temp).toBe(70);
    expect(bundle.forecast.length).toBe(5);
  });

  it('invalidates the sample bundle when units change', async () => {
    service.setUnit(false);
    const metric = await firstValueFrom(service.getWeatherBundle());

    expect(service.getUnit()).toBe('C');
    expect(metric.current.temp).toBe(21);
    expect(metric.current.wind.speed).toBe(4);
  });

  it('groups repeated readings into ordered daily summaries', () => {
    const entries: ForecastEntry[] = [
      {date: new Date('2026-08-05T18:00:00Z'), temp: 24, description: 'clear sky', icon: '01d'},
      {date: new Date('2026-08-04T18:00:00Z'), temp: 20, description: 'light rain', icon: '10d'},
      {date: new Date('2026-08-04T21:00:00Z'), temp: 22, description: 'light rain', icon: '10d'},
    ];

    const result = service.getAverageDailyForecast(entries);

    expect(result.length).toBe(2);
    expect(result[0].temp).toBe(21);
    expect(result[0].highTemp).toBe(22);
    expect(result[0].lowTemp).toBe(20);
    expect(result[0].description).toBe('light rain');
    expect(result[1].temp).toBe(24);
  });
});
