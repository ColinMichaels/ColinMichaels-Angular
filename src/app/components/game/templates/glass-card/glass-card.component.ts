import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-glass-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './glass-card.component.html',
  styles: `
    @layer components {
      .terminal-window {
        @apply bg-white/5 backdrop-blur-md backdrop-saturate-150 border border-white/20 shadow-xl rounded-md;
      }
    }`
})
export class GlassCardComponent {
  @Input() title?: string;
  @Input() width = 'w-[400px]';
  @Input() padding = 'p-4';
}
