// src/app/services/weather.service.ts

import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {
  Observable,
  from,
  throwError,
} from 'rxjs';
import {
  switchMap,
  catchError,
  map,
  shareReplay,
} from 'rxjs/operators';
import {environment} from '../../../../environments/environment';
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

interface OpenWeatherCondition {
  description: string;
  icon: string;
}

interface OpenWeatherCurrentResponse {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  visibility: number;
  wind: WeatherWind;
  weather: OpenWeatherCondition[];
}

interface OpenWeatherForecastItem {
  dt: number;
  main: {
    temp: number;
  };
  weather: OpenWeatherCondition[];
}

interface OpenWeatherForecastResponse {
  list: OpenWeatherForecastItem[];
}

@Injectable({providedIn: 'root'})
export class WeatherService {
  private readonly apiBaseUrl = environment.apiUrl.replace(/\/+$/, '');
  private readonly currentUrl = `${this.apiBaseUrl}/weather/current`;
  private readonly forecastUrl = `${this.apiBaseUrl}/weather/forecast`;
  private units: 'metric' | 'imperial' = 'metric';

  /** Shared, cached bundle */
  private bundle$?: Observable<WeatherBundle>;

  constructor(private readonly http: HttpClient) {
    this.setUnit(true);
  }

  setUnit(toFahrenheit: boolean) {
    this.units = toFahrenheit ? 'imperial' : 'metric';
    // Invalidate cache
    this.bundle$ = undefined;
  }

  getUnit() {
    return this.units === 'imperial' ? 'F' : 'C';
  }

  getIcon(description: string) {
    if (description) {
      if (description.includes('rain')) {
        return faCloudRain;
      } else if (description.includes('snow')) {
        return faSnowflake;
      } else if (description.includes('clear sky')) {
        return faSun;
      } else if (description.includes('clouds')) {
        return faCloud;
      } else {
        return faCloud;
      }
    } else return faCloud;

  }

  /**
   * Groups forecast entries by day and calculates temperature statistics for each day.
   * Returns an array with one entry per day for exactly 5 days, containing the date,
   * day of week (short name), average temperature, highest temperature, lowest temperature,
   * and the most common description and icon.
   */
  getAverageDailyForecast(forecastEntries: ForecastEntry[]): DailyForecast[] {
    if (forecastEntries.length === 0) {
      return [];
    }

    // Group entries by day (YYYY-MM-DD)
    const dailyGroups = new Map<string, ForecastEntry[]>();

    forecastEntries.forEach(entry => {
      const dateKey = entry.date.toISOString().split('T')[0];
      if (!dailyGroups.has(dateKey)) {
        dailyGroups.set(dateKey, []);
      }
      dailyGroups.get(dateKey)!.push(entry);
    });

    // Short day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Calculate statistics for each day
    const result: DailyForecast[] = [];

    dailyGroups.forEach((entries, dateKey) => {
      // Calculate average temperature
      const avgTemp = entries.reduce((sum, entry) => sum + entry.temp, 0) / entries.length;

      // Find the highest and lowest temperatures
      const highTemp = Math.max(...entries.map(entry => entry.temp));
      const lowTemp = Math.min(...entries.map(entry => entry.temp));

      // Find the most common description and icon
      const descriptionCounts = new Map<string, number>();
      const iconCounts = new Map<string, number>();

      entries.forEach(entry => {
        descriptionCounts.set(entry.description, (descriptionCounts.get(entry.description) ?? 0) + 1);
        iconCounts.set(entry.icon, (iconCounts.get(entry.icon) ?? 0) + 1);
      });

      const mostCommonDescription = [...descriptionCounts.entries()]
        .sort((a, b) => b[1] - a[1])[0][0];

      const mostCommonIcon = [...iconCounts.entries()]
        .sort((a, b) => b[1] - a[1])[0][0];

      // Use a date at 12:00 (noon) for the representative day
      const representativeDate = new Date(dateKey + 'T12:00:00Z');
      const dayOfWeek = dayNames[representativeDate.getDay()];

      result.push({
        date: representativeDate,
        dayOfWeek,
        temp: Number(avgTemp.toFixed(2)), // Round to 2 decimal places
        highTemp: Number(highTemp.toFixed(2)),
        lowTemp: Number(lowTemp.toFixed(2)),
        description: mostCommonDescription,
        icon: mostCommonIcon
      });
    });

    // Sort by date
    result.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Take only the first 5 days
    return result.slice(0, 5);
  }


  /**
   * Returns a cached stream of current+forecast.
   * Emits once, then replays.
   */
  /**
   * Returns a cached stream of current weather and forecast data.
   * Uses lazy initialization - only fetches data on the first subscription.
   * Later calls return the cached result.
   */
  getWeatherBundle(): Observable<WeatherBundle> {
    if (!this.bundle$) {
      this.bundle$ = this.createWeatherBundleObservable();
    }
    return this.bundle$;
  }

  /**
   * Creates an Observable that fetches the user's geolocation
   * and uses it to retrieve weather data.
   *
   * @returns Observable of WeatherBundle with caching
   * @private
   */
  private createWeatherBundleObservable(): Observable<WeatherBundle> {
    return from(this.getUserPosition()).pipe(
      switchMap(coords => this.fetchBundleByCoords(coords)),
      catchError(error => {
        const errorMessage = error === 'NOT_SUPPORTED' ?
          'Geolocation is not supported by your browser' :
          'Failed to access your location. Please check your permissions.';
        return throwError(() => new Error(errorMessage));
      }),
      shareReplay({bufferSize: 1, refCount: true})
    );
    }

  /** Fallback: fetch by city */
  getBundleByCity(city: string): Observable<WeatherBundle> {
    return this.fetchBundleByCity(city).pipe(shareReplay(1));
  }

  private getUserPosition(): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('NOT_SUPPORTED'));
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        err => reject(new Error(err.toString()))
      );
    });
  }

  private fetchBundleByCoords(coords: GeolocationCoordinates) {
    return this.fetchCurrent(coords.latitude, coords.longitude).pipe(
      switchMap(current =>
        this.fetchForecast(coords.latitude, coords.longitude).pipe(
          map(forecast => ({current, forecast}))
        )
      )
    );
  }

  private fetchBundleByCity(city: string) {
    return this.fetchCurrentByCity(city).pipe(
      switchMap(current =>
        this.fetchForecastByCity(city).pipe(
          map(forecast => ({current, forecast}))
        )
      )
    );
  }

  private fetchCurrent(lat: number, lon: number) {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString())
      .set('units', this.units);
    return this.fetchWeatherData(params);
  }

  private fetchCurrentByCity(city: string) {
    const params = new HttpParams()
      .set('q', city)
      .set('units', this.units);
    return this.fetchWeatherData(params);
  }

  private fetchWeatherData(params: HttpParams) {
    return this.http.get<OpenWeatherCurrentResponse>(this.currentUrl, {params}).pipe(
      map(r => ({
        location: r.name,
        temp: r.main.temp,
        feelsLike: r.main.feels_like,
        humidity: r.main.humidity,
        visibility: r.visibility,
        pressure: r.main.pressure,
        wind: r.wind,
        description: r.weather[0].description,
        icon: r.weather[0].icon,
      }))
    );
  }

  private fetchForecast(lat: number, lon: number) {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString())
      .set('units', this.units)
    return this.http.get<OpenWeatherForecastResponse>(this.forecastUrl, {params}).pipe(
      map(r =>
        r.list.map((e) => ({
          date: new Date(e.dt * 1000),
          temp: e.main.temp,
          description: e.weather[0].description,
          icon: e.weather[0].icon,
        }))
      )
    );
  }

  private fetchForecastByCity(city: string) {
    const params = new HttpParams()
      .set('q', city)
      .set('units', this.units);
    return this.http.get<OpenWeatherForecastResponse>(this.forecastUrl, {params}).pipe(
      map(r =>
        r.list.map((e) => ({
          date: new Date(e.dt * 1000),
          temp: e.main.temp,
          description: e.weather[0].description,
          icon: e.weather[0].icon,
        }))
      )
    );
  }
}
