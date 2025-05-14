import { Injectable } from '@angular/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCoffee, faRocket, faCogs, faBolt, faFire, faBug, faTools, faMagic, faGamepad } from '@fortawesome/free-solid-svg-icons';

const ICON_POOL: IconDefinition[] = [
  faCoffee, faRocket, faCogs, faBolt, faFire, faBug, faTools, faMagic, faGamepad
];

@Injectable({ providedIn: 'root' })
export class IconGeneratorService {
  getRandomIcon(title: string): IconDefinition {
    const hash = this.simpleHash(title);
    return ICON_POOL[hash % ICON_POOL.length];
  }

  private simpleHash(str: string): number {
    return Array.from(str).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
}
