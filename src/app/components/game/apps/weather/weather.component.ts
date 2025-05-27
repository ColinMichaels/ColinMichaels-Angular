import {Component, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SettingsService} from '../../services/settings.service';
import {WeatherService} from '../../services/weather.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TooltipDirective} from '../../directives/tooltip.directive';

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  standalone: true,
  imports: [CommonModule, FaIconComponent, TooltipDirective],
})
export class WeatherComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private weatherService = inject(WeatherService);
  isDarkMode = signal(false);
  currentWeather: any;
  fiveDayForecast: any;
  lastLoadDate: Date = new Date();

  ngOnInit() {
    // Check if dark mode is enabled in settings or use system preference
    this.loadWeather();
    const savedTheme = this.settingsService.getSettingValue$('weather-app', 'theme');
    if (savedTheme) {
      this.isDarkMode.set(true);
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
    console.warn(fahrenheit);
    this.weatherService.setUnit(fahrenheit);
  }
}
