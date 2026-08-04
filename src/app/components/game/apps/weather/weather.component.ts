import {Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SettingsService} from '../../services/settings.service';
import {DailyForecast, WeatherBundle, WeatherService} from '../../services/weather.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TooltipDirective} from '../../directives/tooltip.directive';

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, FaIconComponent, TooltipDirective],
})
export class WeatherComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly weatherService = inject(WeatherService);

  readonly isDemoMode = this.weatherService.isDemoMode;
  isDarkMode = signal(false);
  currentWeather?: WeatherBundle;
  fiveDayForecast: DailyForecast[] = [];
  lastLoadDate: Date = new Date();

  ngOnInit() {
    // Check if dark mode is enabled in settings or use system preference
    this.loadWeather();
    const savedTheme = this.settingsService.getSettingValue$<'dark' | 'light'>('weather-app', 'theme').value;
    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.isDarkMode.set(savedTheme === 'dark');
    } else {
      // Default to browser preference if available
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(prefersDark);
      this.settingsService.updateSettingSetWithSingleValue('weather-app', 'theme', prefersDark ? 'dark' : 'light');
    }

    // Apply theme to container
    this.applyTheme();
  }

  protected loadWeather() {
    this.weatherService.getWeatherBundle().subscribe(weather => {
      if (weather) {
        this.currentWeather = weather;
        this.fiveDayForecast = this.weatherService.getAverageDailyForecast(weather.forecast);
        this.lastLoadDate = new Date();
      }
    });
  }

  get units() {
    return this.weatherService.getUnit();
  }

  getWeatherIcon(description: string) {
    return this.weatherService.getIcon(description);
  }

  toggleTheme() {
    this.isDarkMode.update(isDark => {
      const newTheme = !isDark ? 'dark' : 'light';
      this.settingsService.updateSettingSetWithSingleValue('weather-app', 'theme', newTheme);
      this.applyTheme();
      return !isDark;
    });
  }

  private applyTheme() {
    // Apply dark mode class to document html element
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }

  setUnits(fahrenheit: boolean) {
    this.weatherService.setUnit(fahrenheit);
    this.loadWeather();
  }
}
