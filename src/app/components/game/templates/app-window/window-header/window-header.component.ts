import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent, FaStackComponent, FaStackItemSizeDirective} from '@fortawesome/angular-fontawesome';
import {faCircle, faMinus, faTimes, faUpRightAndDownLeftFromCenter} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-window-header',
  imports: [
    FaStackComponent,
    FaIconComponent,
    FaStackItemSizeDirective
  ],
  templateUrl: './window-header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .app-window-header {
      @apply rounded-t-lg bg-black/30 backdrop-blur-md backdrop-saturate-150;
    }
  `
})
export class WindowHeaderComponent {
  showSizeIcons = false;
  @Input() title= 'ColinTerminal OS';

/*  @Input() resetWindowSize: (() => void) | undefined;
  @Input() showSizeIcons: boolean | undefined;
  @Input() closeApp: (() => void) | undefined;
  @Input() faCircle: IconDefinition | undefined;
  @Input() faTimes: IconDefinition | undefined;
  @Input() collapseApp: (() => void) | undefined;
  @Input() faMinus: IconDefinition | undefined;
  @Input() minimizeToDock: (() => void) | undefined;
  @Input() faUpRightAndDownLeftFromCenter: IconDefinition | undefined;
  @Input() autoFit: boolean | undefined;
  @Input() isCollapsed: boolean | undefined;
  @Input() focused: boolean | undefined;
  @Input() title: string | undefined;*/
  protected readonly faCircle = faCircle;
  protected readonly faTimes = faTimes;
  protected readonly faMinus = faMinus;
  protected readonly faUpRightAndDownLeftFromCenter = faUpRightAndDownLeftFromCenter;
}
