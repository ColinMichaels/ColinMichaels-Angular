// app-window.component.ts
import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  AfterViewInit,
  ViewContainerRef,
  Type,
  DestroyRef
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CliGameComponent} from '../../apps/cli-game/cli-game.component';
import {WindowManagerService} from '../../services/window-manager.service';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCircle, faMinus, faTimes, faUpRightAndDownLeftFromCenter} from '@fortawesome/free-solid-svg-icons';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {isFormArray} from '@angular/forms';

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
    :host {
      display: block;
      position: relative;
      z-index: 10;
      transform: translate3d(40px, 40px, 0);
    }

    :host ::ng-deep div[draggable] {
      user-select: none;
      -webkit-user-drag: none;
      -webkit-app-region: drag;
    }

    .window-unfocused {
      @apply opacity-80 transition-opacity duration-500 ease-in-out;
    }

    .title-unfocused {
      @apply text-zinc-500;
    }
  `
})
export class AppWindowComponent implements AfterViewInit {
  /** HTML Template References */
  @ViewChild('terminal') terminalRef!: ElementRef<HTMLDivElement>;
  @ViewChild('header') headerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('resizeHandle') resizeRef!: ElementRef<HTMLDivElement>;
  @ViewChild('dock') dockRef!: ElementRef<HTMLDivElement>;
  @ViewChild('terminalContent', {read: ViewContainerRef}) containerRef!: ViewContainerRef;

  /** Inputs */
  @Input() id!: string;
  @Input() title = 'Terminal';
  @Input() defaultWidth = DEFAULT_WIDTH;
  @Input() defaultHeight = DEFAULT_HEIGHT;
  @Input() autoFit = false;
  @Input() embeddedComponent: Type<any> = CliGameComponent;

  /** Font Awesome Icons */
  faTimes = faTimes;
  faMinus = faMinus;
  faUpRightAndDownLeftFromCenter = faUpRightAndDownLeftFromCenter;
  faCircle = faCircle;

  /** State and Flags */
  isCollapsed = false;
  isVisible = true;
  isMinimized = false;
  isFocused = false;
  isDragging = false;
  showSizeIcons = false;

  /** Private Properties */
  private isResizing = false;
  private offsetX = DEFAULT_OFFSET;
  private offsetY = DEFAULT_OFFSET;
  private startWidth = 0;
  private startHeight = 0;


  constructor(
    private terminalManager: WindowManagerService,
    private destroyRef: DestroyRef,
  ) {
    this.subscribeToFocusEvents();
  }

  ngAfterViewInit(): void {
    this.initializeEventListeners();
    this.loadEmbeddedComponent();

  }

  /** Subscribe to terminal focus events */
  private subscribeToFocusEvents(): void {
    this.terminalManager
      .getFocus$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(focus => {
        this.isFocused = focus?.toLowerCase() === this.title.toLowerCase();
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
    this.offsetX = event.clientX - this.terminalRef.nativeElement.offsetLeft;
    this.offsetY = event.clientY - this.terminalRef.nativeElement.offsetTop;
    document.body.style.userSelect = 'none';
  };

  private onPointerUp = () => {
    this.isDragging = false;
    this.isResizing = false;
    document.body.style.userSelect = '';
  };

  private onPointerMove = (event: PointerEvent) => {
    const terminal = this.terminalRef.nativeElement;
    if (this.isDragging) {
      terminal.style.left = `${event.clientX - this.offsetX}px`;
      terminal.style.top = `${event.clientY - this.offsetY}px`;
    } else if (this.isResizing) {
      terminal.style.width = `${this.startWidth + (event.clientX - this.offsetX)}px`;
      terminal.style.height = `${this.startHeight + (event.clientY - this.offsetY)}px`;
    }
  };

  private onResizeStart = (event: PointerEvent) => {
    if (this.autoFit) return;
    this.isResizing = true;
    this.offsetX = event.clientX;
    this.offsetY = event.clientY;
    this.startWidth = this.terminalRef.nativeElement.offsetWidth;
    this.startHeight = this.terminalRef.nativeElement.offsetHeight;
    document.body.style.userSelect = 'none';
  };

  collapseWindow() {
    this.isCollapsed = !this.isCollapsed;
  }

  closeWindow() {
    this.terminalManager.closeTerminal(this.id);
    this.isVisible = false;
  }


  bringToFront() {
    console.warn('bringToFront', this.id);
    this.isFocused = this.terminalManager.setFocus(this.id, this.offsetX, this.offsetY);
  }

  protected readonly isFormArray = isFormArray;

  minimizeToDock() {

  }
}
