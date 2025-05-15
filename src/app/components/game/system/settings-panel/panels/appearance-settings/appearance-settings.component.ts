import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService, ThemeOption } from '../../../../services/settings.service';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4 animate-fade-in">
      <div class="space-x-4 flex items-center">
        <button (click)="setTheme('light')" class="bg-white text-black px-2 py-1 rounded shadow">Light</button>
        <button (click)="setTheme('dark')" class="bg-black text-white px-2 py-1 rounded shadow">Dark</button>
        <button (click)="setTheme('system')" class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-2 py-1 rounded shadow">System</button>
      </div>

      <div class="mt-4">
        <label class="block">
          <span class="text-sm text-white/70">Accent Color</span>
          <input type="color" [value]="accentColor" (change)="updateAccentColor($event)"
                 class="w-10 h-10 rounded-full border-none bg-transparent cursor-pointer" />
        </label>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
  ]
})
export class AppearanceSettingsComponent implements OnInit {
  private settings = inject(SettingsService);
  accentColor: string = '#4f46e5';

  ngOnInit(): void {
    this.settings.accentColor$.subscribe(color => this.accentColor = color);
  }

  updateAccentColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.settings.setAccentColor(input.value);
  }

  setTheme(theme: ThemeOption): void {
    this.settings.setTheme(theme);
  }
}
