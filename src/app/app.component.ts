import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FontAwesomeModule],
  templateUrl: './app.component.html',
  styles: [],
  standalone: true
})
export class AppComponent {
  title = 'ColinMichaels-Firebase';
}
