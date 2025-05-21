import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faComputer, faLaptop} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-about-app',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './about-app.component.html',
  styles: ``
})
export class AboutAppComponent {
  @Input() systemInfo = {
    model: 'ColinBook Pro',
    screen: '14-inch, 2025',
    chip: 'Colin M6 Max',
    memory: '16 GB',
    serial: 'CM59EJ312',
    os: 'Colinoia 15.3.2'
  };

  @Input() appInfo = {
    name: 'ColinTerminal OS',
    version: 'v1.0.0',
    copyright: '© 1983–2025 ColinMichaels Inc.'
  };

  protected readonly faComputer = faComputer;
  protected readonly faLaptop = faLaptop;
}
