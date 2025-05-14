import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">General Settings</h2>

      <div class="space-y-2">
        <label class="block">
          <span class="text-sm text-white/70">Language</span>
          <select class="w-full bg-zinc-800 text-white p-2 rounded">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
          </select>
        </label>

        <label class="flex items-center space-x-2">
          <input type="checkbox" class="accent-blue-500" />
          <span class="text-sm text-white/70">Enable Notifications</span>
        </label>
      </div>
    </div>
  `,
})
export class GeneralSettingsComponent {}
