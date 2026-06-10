// app-window.component.ts
import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  AfterViewInit,
  ViewContainerRef,
  Type, computed, OnChanges, OnDestroy, ComponentRef,
  ChangeDetectionStrategy
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CliGameComponent} from '../../apps/cli-game/cli-game.component';
import {
  ApplicationManagerService
} from '../../services/application-manager.service';
import {
  WINDOW_HEIGHT_MAX,
  WINDOW_HEIGHT_MIN,
  WINDOW_WIDTH_MAX,
  WINDOW_WIDTH_MIN
} from '../../services/application-manager.models';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCircle, faMinus, faTimes, faUpRightAndDownLeftFromCenter} from '@fortawesome/free-solid-svg-icons';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

// Define constants for common default values
const DEFAULT_OFFSET = 40;
const DEFAULT_WIDTH = 'w-[640px]';
const DEFAULT_HEIGHT = 'h-auto';


@Component({
  selector: 'app-window',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './app-window.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    /* app-window.component.scss */
    .window-unfocused {
      @apply opacity-80 transition-opacity duration-500 ease-in-out;
    }

    .title-unfocused {
      @apply text-zinc-500;
    }

    .app-window {
      @apply overflow-hidden rounded-lg shadow-lg max-h-[800px] max-w-[1200px];
      transition: width 0.05s ease-out, height 0.05s ease-out;
    }

    .app-window.resizing {
      transition: none;
    }

  `
})
export class AppWindowComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** HTML Template References */
  @ViewChild('appWindow') appWindowRef!: ElementRef<HTMLDivElement>;
  @ViewChild('header') headerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('resizeHandle') resizeRef!: ElementRef<HTMLDivElement>;
  @ViewChild('appWindowContent', {read: ViewContainerRef}) containerRef!: ViewContainerRef;

  /** Inputs */
  @Input() id!: string;
  @Input() title = 'Terminal';
  @Input() defaultWidth = DEFAULT_WIDTH;
  @Input() defaultHeight = DEFAULT_HEIGHT;
  @Input() autoFit = false;
  @Input() embeddedComponent: Type<any> = CliGameComponent;
  @Input() minWidth: number = WINDOW_WIDTH_MIN;
  @Input() maxWidth: number = WINDOW_WIDTH_MAX;
  @Input() minHeight: number = WINDOW_HEIGHT_MIN;
  @Input() maxHeight: number = WINDOW_HEIGHT_MAX;
  @Input() focused: boolean = false;
  @Input() params: any;

  private componentRef?: ComponentRef<any>;

  /** Font Awesome Icons */
  faTimes = faTimes;
  faMinus = faMinus;
  faUpRightAndDownLeftFromCenter = faUpRightAndDownLeftFromCenter;
  faCircle = faCircle;

  /** State and Flags */
  isCollapsed = false;
  isVisible = true;
  isMinimized = false;
  isDragging = false;
  private isResizing = false;
  showSizeIcons = false;

  /** Private Properties */

  private offsetX = DEFAULT_OFFSET;
  private offsetY = DEFAULT_OFFSET;

  private startX = DEFAULT_OFFSET;
  private startY = DEFAULT_OFFSET;
  private initialWidth = WINDOW_WIDTH_MIN;
  private initialHeight = WINDOW_HEIGHT_MIN;


  embeddedApp = computed(() => {
    return this.appManager.getAppByID(this.id);
  });

  constructor(
    private appManager: ApplicationManagerService
  ) {
    this.subscribeToFocusEvents();
  }

  ngOnChanges(changes: any) {
    if(changes.id){
      this.focused = this.embeddedApp()?.id === changes.id.currentValue;
    }
  }

  ngAfterViewInit(): void {
    this.initializeEventListeners();
    this.loadEmbeddedComponent();
    this.setInitialPosition(); // Set the position of the window based on offsets
  }

  /** Set the initial position of the screen */
  private setInitialPosition(): void {
    const terminal = this.appWindowRef.nativeElement;
    // Use offsetX and offsetY passed as inputs
    this.focused = true;
    terminal.style.left = `${this.offsetX}px`;
    terminal.style.top = `${this.offsetY}px`;
    terminal.style.width = `${this.defaultWidth}`;
    terminal.style.height = `${this.defaultHeight}`;
    terminal.style.zIndex = '49';
    terminal.style.position = 'fixed';
  }

  /** Subscribe to terminal focus events */
  private subscribeToFocusEvents(): void {
    this.appManager
      .getFocus$()
      .pipe(takeUntilDestroyed())
      .subscribe(focus => {
        if(focus && this.id){
          this.focused = focus?.toLowerCase() === this.id?.toLowerCase();
        }
      });
  }

  /** Attach drag and resize event listeners */
  private initializeEventListeners(): void {
    const header = this.headerRef.nativeElement;
    const resizer = this.resizeRef.nativeElement;

    header.addEventListener('pointerdown', this.onPointerDown);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointermove', this.onPointerMove);

    resizer.addEventListener('pointerdown', this.onResizeStart);
  }

  /** Load the embedded component dynamically */
  private loadEmbeddedComponent(): void {
    if (this.embeddedComponent) {
      this.containerRef.clear();
      this.componentRef = this.containerRef.createComponent(this.embeddedComponent);
      this.componentRef.instance.params = this.params;
    }
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.target === this.resizeRef.nativeElement) return;
    this.isDragging = true;
    this.offsetX = event.clientX - this.appWindowRef.nativeElement.offsetLeft;
    this.offsetY = event.clientY - this.appWindowRef.nativeElement.offsetTop;
    document.body.style.userSelect = 'none';
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.isResizing) {
      event.preventDefault();
      event.stopPropagation();
      this.updateResizingClass();
    }

    this.isDragging = false;
    this.isResizing = false;
    document.body.style.userSelect = '';
  };


  private onPointerMove = (event: PointerEvent) => {
    if (!this.isDragging && !this.isResizing) return;

    const appWindow = this.appWindowRef.nativeElement;

    if (this.isDragging) {
      const newLeft = event.clientX - this.offsetX;
      const newTop = event.clientY - this.offsetY;
      const {clampedLeft, clampedTop} = this.getMaxLeftTop(appWindow, newLeft, newTop);

      appWindow.style.left = `${clampedLeft}px`;
      appWindow.style.top = `${clampedTop}px`;
    } else if (this.isResizing) {
      // Calculate the difference from the starting position
      const deltaX = event.clientX - this.startX;
      const deltaY = event.clientY - this.startY;

      // Calculate new dimensions
      let newWidth = this.initialWidth + deltaX;
      let newHeight = this.initialHeight + deltaY;

      // Apply minimum and maximum constraints
      newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
      newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));

      // Update the window size
      requestAnimationFrame(() => {
        appWindow.style.width = `${newWidth}px`;
        appWindow.style.height = `${newHeight}px`;
      });
    }
  };


  private getMaxLeftTop(appWindow: HTMLDivElement, newLeft = 0, newTop = 0){
    // Calculate viewport dimensions
    const viewportWidth = window.innerWidth - 10;
    const viewportHeight = window.innerHeight - 10;

    // Calculate the app window dimensions
    const windowWidth = appWindow.offsetWidth;
    const windowHeight = appWindow.offsetHeight;

    // Calculate maximum limits for left and top
    const maxLeft = viewportWidth - windowWidth;
    const maxTop = viewportHeight - windowHeight;

    // Clamp the new position within boundaries
    const clampedLeft = Math.max(0, Math.min(maxLeft, newLeft)); // Prevent off-screen to the left/right
    const clampedTop = Math.max(0, Math.min(maxTop, newTop));

    return {clampedLeft, clampedTop};
  }

  updateResizingClass() {
    const appWindow = this.appWindowRef.nativeElement;
    if (this.isResizing) {
      appWindow.classList.add('resizing');
    } else {
      appWindow.classList.remove('resizing');
    }
  }


  private onResizeStart = (event: PointerEvent) => {
    if (this.autoFit) return;

    event.preventDefault();
    event.stopPropagation();

    this.isResizing = true;
    this.isDragging = false;
    this.updateResizingClass();


    // Store the initial mouse position
    this.startX = event.clientX;
    this.startY = event.clientY;

    // Store the initial window dimensions
    this.initialWidth = this.appWindowRef.nativeElement.offsetWidth;
    this.initialHeight = this.appWindowRef.nativeElement.offsetHeight;

    document.body.style.userSelect = 'none';
  };

  collapseApp() {
    this.isCollapsed = !this.isCollapsed;
  }

  closeApp() {
    this.appManager.closeApplication(this.id);
    this.isVisible = false;
  }

  bringToFront(event: MouseEvent) {
    if(event.target !== event.currentTarget){
      this.focused = this.appManager.setApplicationFocus(this.id, this.offsetX, this.offsetY);
    }
  }

  minimizeToDock() {

  }

  resetWindowSize() {
    const appWindow = this.appWindowRef.nativeElement;
    // Ensure dimensions stay within MAX_WIDTH / MAX_HEIGHT
    const newWidth = Math.min(appWindow.offsetWidth, WINDOW_WIDTH_MAX);
    const newHeight = Math.min(appWindow.offsetHeight, WINDOW_HEIGHT_MAX);
    // Prevent off-screen to the top/bottom

    appWindow.style.width = `${newWidth}px`;
    appWindow.style.height = `${newHeight}px`;

  }

  // Add this method to clean up event listeners
  ngOnDestroy() {
    const header = this.headerRef?.nativeElement;
    const resizer = this.resizeRef?.nativeElement;

    if (header) {
      header.removeEventListener('pointerdown', this.onPointerDown);
    }
    if (resizer) {
      resizer.removeEventListener('pointerdown', this.onResizeStart);
    }

    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointermove', this.onPointerMove);
  }

}
