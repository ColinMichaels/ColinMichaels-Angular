import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-network-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">Network Settings</h2>

      <div class="space-y-2">
        <label class="block">
          <span class="text-sm text-white/70">Wi-Fi SSID</span>
          <input type="text" placeholder="Network Name"
                 class="w-full bg-zinc-800 text-white p-2 rounded" />
        </label>

        <label class="flex items-center space-x-2">
          <input type="checkbox" class="accent-blue-500" />
          <span class="text-sm text-white/70">Auto-connect on startup</span>
        </label>
      </div>
    </div>
  `,
})
export class NetworkSettingsComponent {}
