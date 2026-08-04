import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {faCloud, faCloudRain, faSun} from '@fortawesome/free-solid-svg-icons';
import {faSnowflake} from '@fortawesome/free-regular-svg-icons';

export interface WeatherData {
  location: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  visibility: number;
  pressure: number;
  wind: WeatherWind;
  description: string;
  icon: string;
}

export interface WeatherWind {
  speed: number;
  deg?: number;
  gust?: number;
}

export interface ForecastEntry {
  date: Date;
  temp: number;
  description: string;
  icon: string;
}

export interface WeatherBundle {
  current: WeatherData;
  forecast: ForecastEntry[];
}

export interface DailyForecast {
  date: Date;
  dayOfWeek: string;
  temp: number;
  highTemp: number;
  lowTemp: number;
  description: string;
  icon: string;
}

interface DemoForecastDay {
  offset: number;
  tempCelsius: number;
  description: string;
  icon: string;
}

const DEMO_LOCATION = 'Demo Harbor';
const MILLISECONDS_PER_DAY = 86_400_000;
const DEMO_FORECAST: readonly DemoForecastDay[] = [
  {offset: 0, tempCelsius: 21, description: 'clear sky', icon: '01d'},
  {offset: 1, tempCelsius: 19, description: 'scattered clouds', icon: '03d'},
  {offset: 2, tempCelsius: 18, description: 'light rain', icon: '10d'},
  {offset: 3, tempCelsius: 22, description: 'clear sky', icon: '01d'},
  {offset: 4, tempCelsius: 20, description: 'broken clouds', icon: '04d'},
];

@Injectable({providedIn: 'root'})
export class WeatherService {
  /** This preserved OS/lab prototype intentionally performs no network or location request. */
  readonly isDemoMode = true;

  private units: 'metric' | 'imperial' = 'imperial';
  private bundle$?: Observable<WeatherBundle>;

  setUnit(toFahrenheit: boolean): void {
    this.units = toFahrenheit ? 'imperial' : 'metric';
    this.bundle$ = undefined;
  }

  getUnit(): 'F' | 'C' {
    return this.units === 'imperial' ? 'F' : 'C';
  }

  getIcon(description: string) {
    if (description.includes('rain')) {
      return faCloudRain;
    }
    if (description.includes('snow')) {
      return faSnowflake;
    }
    if (description.includes('clear sky')) {
      return faSun;
    }
    return faCloud;
  }

  /**
   * Groups forecast entries by day and calculates temperature statistics for
   * the first five days. This remains reusable if a reviewed provider is added
   * to the lab later.
   */
  getAverageDailyForecast(forecastEntries: ForecastEntry[]): DailyForecast[] {
    if (forecastEntries.length === 0) {
      return [];
    }

    const dailyGroups = new Map<string, ForecastEntry[]>();
    for (const entry of forecastEntries) {
      const dateKey = entry.date.toISOString().split('T')[0];
      const entries = dailyGroups.get(dateKey) ?? [];
      entries.push(entry);
      dailyGroups.set(dateKey, entries);
    }

    const result = [...dailyGroups.entries()].map(([dateKey, entries]) => {
      const description = this.getMostCommonValue(entries.map(entry => entry.description));
      const icon = this.getMostCommonValue(entries.map(entry => entry.icon));
      const temperatures = entries.map(entry => entry.temp);
      const representativeDate = new Date(`${dateKey}T12:00:00Z`);

      return {
        date: representativeDate,
        dayOfWeek: representativeDate.toLocaleDateString('en-US', {weekday: 'short', timeZone: 'UTC'}),
        temp: Number((temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length).toFixed(2)),
        highTemp: Number(Math.max(...temperatures).toFixed(2)),
        lowTemp: Number(Math.min(...temperatures).toFixed(2)),
        description,
        icon,
      };
    });

    return result
      .sort((left, right) => left.date.getTime() - right.date.getTime())
      .slice(0, 5);
  }

  getWeatherBundle(): Observable<WeatherBundle> {
    this.bundle$ ??= of(this.createDemoBundle(DEMO_LOCATION));
    return this.bundle$;
  }

  /** Retained for the original component contract; the city is labeled as sample data. */
  getBundleByCity(city: string): Observable<WeatherBundle> {
    const requestedCity = city.trim();
    const label = requestedCity ? `${requestedCity} (sample)` : DEMO_LOCATION;
    return of(this.createDemoBundle(label));
  }

  private createDemoBundle(location: string): WeatherBundle {
    const baseDate = new Date();
    baseDate.setHours(12, 0, 0, 0);

    return {
      current: {
        location,
        temp: this.convertTemperature(21),
        feelsLike: this.convertTemperature(20),
        humidity: 58,
        visibility: 16_000,
        pressure: 1016,
        wind: {speed: this.units === 'imperial' ? 9 : 4},
        description: 'clear sky',
        icon: '01d',
      },
      forecast: DEMO_FORECAST.map(day => ({
        date: new Date(baseDate.getTime() + day.offset * MILLISECONDS_PER_DAY),
        temp: this.convertTemperature(day.tempCelsius),
        description: day.description,
        icon: day.icon,
      })),
    };
  }

  private convertTemperature(celsius: number): number {
    return this.units === 'imperial'
      ? Math.round((celsius * 9 / 5) + 32)
      : celsius;
  }

  private getMostCommonValue(values: string[]): string {
    const counts = new Map<string, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '';
  }
}
