import {Injectable} from '@angular/core';
import {AppEntry, ApplicationInstance} from './application-manager.models';

@Injectable({providedIn: 'root'})
export class ApplicationFactory {
  createInstance(
    id: string,
    app: AppEntry,
    offsetX: number,
    offsetY: number,
    params?: unknown,
    instanceIndex?: number
  ): ApplicationInstance {
    // Dynamic defaults or more sophisticated rules can go here
    const memory = app.memory || 64; // Default memory
    const resolvedInstanceIndex = Number.isFinite(instanceIndex) && (instanceIndex ?? 0) > 0
      ? (instanceIndex as number)
      : 1;

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
      running: true,
      minimized: false,
      installed: app.installed,
      instanceIndex: resolvedInstanceIndex,
      focused: app.focused ?? false,
      params: params ?? app.params,
    };
  }
}
