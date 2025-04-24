import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {SocialsComponent} from './components/socials/socials.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SocialsComponent],
  templateUrl: './app.component.html',
  styles: [],
  standalone: true
})
export class AppComponent {
  title = 'ColinMichaels-Firebase';
}
