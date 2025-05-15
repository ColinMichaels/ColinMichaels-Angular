import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4 text-xs">
      <div class="space-y-2">
        <label class="block space-x-2">
          <span class=" text-white/70 mb-2">Language</span>
          <select class="w-1/2 bg-zinc-800 text-white/90 p-2 rounded text-xs">
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
