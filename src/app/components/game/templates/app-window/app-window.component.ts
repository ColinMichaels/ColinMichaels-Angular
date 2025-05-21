// app-window.component.ts
import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  AfterViewInit,
  ViewContainerRef,
  Type, Output, EventEmitter, computed, OnChanges
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CliGameComponent} from '../../apps/cli-game/cli-game.component';
import {
  ApplicationManagerService, WINDOW_HEIGHT_MAX, WINDOW_HEIGHT_MIN,
  WINDOW_WIDTH_MAX,
  WINDOW_WIDTH_MIN
} from '../../services/application-manager.service';
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
  styles: `
    /* app-window.component.scss */
    .window-unfocused {
      @apply opacity-80 transition-opacity duration-500 ease-in-out;
    }

    .title-unfocused {
      @apply text-zinc-500;
    }
  `
})
export class AppWindowComponent implements AfterViewInit, OnChanges {
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

  @Output() sizeChanged = new EventEmitter<
    {
      width: number;
      height: number,
      left: number,
      top: number
    }>();


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
  showSizeIcons = false;

  /** Private Properties */
  private isResizing = false;
  private offsetX = DEFAULT_OFFSET;
  private offsetY = DEFAULT_OFFSET;
  private startWidth = WINDOW_WIDTH_MIN;
  private startHeight = WINDOW_HEIGHT_MIN;

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
      this.containerRef.createComponent(this.embeddedComponent);
    }
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.target === this.resizeRef.nativeElement) return;
    this.isDragging = true;
    this.offsetX = event.clientX - this.appWindowRef.nativeElement.offsetLeft;
    this.offsetY = event.clientY - this.appWindowRef.nativeElement.offsetTop;
    document.body.style.userSelect = 'none';
  };

  private onPointerUp = () => {
    this.isDragging = false;
    this.isResizing = false;
    document.body.style.userSelect = '';
  };

  private onPointerMove = (event: PointerEvent) => {
    const appWindow = this.appWindowRef.nativeElement;

    const newLeft = event.clientX - this.offsetX;
    const newTop = event.clientY - this.offsetY;

    if (this.isDragging) {
      // Calculate viewport dimensions
      const { clampedLeft , clampedTop } = this.getMaxLeftTop(appWindow, newLeft, newTop);

      // Apply the clamped position
      appWindow.style.left = `${clampedLeft}px`;
      appWindow.style.top = `${clampedTop}px`;

    } else if (this.isResizing) {
      let newWidth = this.startWidth + (event.clientX - this.offsetX);
      let newHeight = this.startHeight + (event.clientY - this.offsetY);

      // Enforce min/max bounds
      newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
      newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));

      appWindow.style.width = `${newWidth}px`;
      appWindow.style.height = `${newHeight}px`;

      // Emit size changes
      this.sizeChanged.emit({
        width: newWidth,
        height: newHeight,
        top: newTop,
        left: newLeft,
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

  private onResizeStart = (event: PointerEvent) => {
    if (this.autoFit) return;
    this.isResizing = true;
    this.offsetX = event.clientX;
    this.offsetY = event.clientY;
    this.startWidth = this.appWindowRef.nativeElement.offsetWidth;
    this.startHeight = this.appWindowRef.nativeElement.offsetHeight;
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
}
