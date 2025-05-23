import {Component, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SettingsService} from '../../services/settings.service';

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class WeatherComponent implements OnInit {
  private settingsService = inject(SettingsService);
  isDarkMode = signal(false);

  ngOnInit() {
    // Check if dark mode is enabled in settings or use system preference
    const savedTheme = this.settingsService.getSettingValue$('weather-app', 'theme');
    if (savedTheme) {
      this.isDarkMode.set(true);
    } else {
      // Default to browser preference if available
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(prefersDark);
      this.settingsService.updateSettingSetWithSingleValue('weather-app', 'theme', prefersDark ? 'dark' : 'light');
    }

    // Apply theme to document or container
    this.applyTheme();
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
}
