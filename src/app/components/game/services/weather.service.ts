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
  temp: number;
  description: string;
  icon: string;
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

@Injectable({providedIn: 'root'})
export class WeatherService {
  private readonly currentUrl = 'https://api.openweathermap.org/data/2.5/weather';
  private readonly forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';
  private apiKey = environment.openWeatherMapApiKey;
  private units: 'metric' | 'imperial' = 'metric';

  /** Shared, cached bundle */
  private bundle$?: Observable<WeatherBundle>;

  constructor(private http: HttpClient) {
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
  getAverageDailyForecast(forecastEntries: ForecastEntry[]): Array<{
    date: Date;
    dayOfWeek: string;
    temp: number;
    highTemp: number;
    lowTemp: number;
    description: string;
    icon: string;
  }> {
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
    const result: Array<{
      date: Date;
      dayOfWeek: string;
      temp: number;
      highTemp: number;
      lowTemp: number;
      description: string;
      icon: string;
    }> = [];

    dailyGroups.forEach((entries, dateKey) => {
      // Calculate average temperature
      const avgTemp = entries.reduce((sum, entry) => sum + entry.temp, 0) / entries.length;

      // Find the highest and lowest temperatures
      const highTemp = Math.max(...entries.map(entry => entry.temp));
      const lowTemp = Math.min(...entries.map(entry => entry.temp));

      // Find most common description and icon
      const descriptionCounts = new Map<string, number>();
      const iconCounts = new Map<string, number>();

      entries.forEach(entry => {
        descriptionCounts.set(entry.description, (descriptionCounts.get(entry.description) || 0) + 1);
        iconCounts.set(entry.icon, (iconCounts.get(entry.icon) || 0) + 1);
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
  getWeatherBundle(): Observable<WeatherBundle> {
    if (!this.bundle$) {
      this.bundle$ = from(this.getUserPosition()).pipe(
        switchMap(coords => this.fetchBundleByCoords(coords)),
        catchError(() => throwError(() => new Error('GEO_FAILED'))),
        shareReplay({bufferSize: 1, refCount: true})
      );
    }
    return this.bundle$;
  }

  /** Fallback: fetch by city */
  getBundleByCity(city: string): Observable<WeatherBundle> {
    return this.fetchBundleByCity(city).pipe(shareReplay(1));
  }

  private getUserPosition(): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject('NOT_SUPPORTED');
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        err => reject(err)
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
      .set('appid', this.apiKey)
      .set('units', this.units);
    return this.http.get<any>(this.currentUrl, {params}).pipe(
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

  private fetchCurrentByCity(city: string) {
    const params = new HttpParams()
      .set('q', city)
      .set('appid', this.apiKey)
      .set('units', this.units);
    return this.http.get<any>(this.currentUrl, {params}).pipe(
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
      .set('appid', this.apiKey)
      .set('units', this.units)
    return this.http.get<any>(this.forecastUrl, {params}).pipe(
      map(r =>
        r.list.map((e: any) => ({
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
      .set('appid', this.apiKey)
      .set('units', this.units);
    return this.http.get<any>(this.forecastUrl, {params}).pipe(
      map(r =>
        r.list.map((e: any) => ({
          date: new Date(e.dt * 1000),
          temp: e.main.temp,
          description: e.weather[0].description,
          icon: e.weather[0].icon,
        }))
      )
    );
  }
}
