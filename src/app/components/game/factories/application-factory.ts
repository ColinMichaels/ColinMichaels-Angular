import {Injectable} from '@angular/core';
import {AppEntry, ApplicationInstance} from '../services/application-manager.service';

@Injectable({providedIn: 'root'})
export class ApplicationFactory {
  createInstance(
    id: string,
    app: AppEntry,
    offsetX: number,
    offsetY: number
  ): ApplicationInstance {
    // Dynamic defaults or more sophisticated rules can go here
    const memory = app.memory || 64; // Default memory
    const running = app.running ?? false;

    return {
      id,
      maxInstances: app.maxInstances,
      type: app.type,
      parent: app,
      title: app.title,
      component: app.component,
      memory,
      autofit: app.autofit ?? false,
      icon: app.icon,
      offsetX,
      offsetY,
      running,
      installed: app.installed,
      instanceIndex: app.instanceIndex,
      focused: app.focused ?? false,
    };
  }
}
