import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {NotificationServerComponent} from './components/game/utils/notifications-server/notifications-server.component';
import {fadeToBlackAnimation} from './route-animations';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationServerComponent],
  templateUrl: './app.component.html',
  styles: [],
  standalone: true,
  animations: [fadeToBlackAnimation]

})
export class AppComponent {
  prepareRoute(outlet: RouterOutlet): string | null {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'] || null;
  }

}
