// app-window.component.ts
import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  AfterViewInit,
  ViewContainerRef,
  Type, computed, OnChanges, OnDestroy, ComponentRef, SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CliGameComponent} from '../../../components/game/apps/cli-game/cli-game.component';
import {
  ApplicationManagerService
} from '@core-os/app-registry/application-manager.service';
import {
  WINDOW_HEIGHT_MAX,
  WINDOW_HEIGHT_MIN,
  WINDOW_WIDTH_MAX,
  WINDOW_WIDTH_MIN
} from '@core-os/app-registry/application-manager.models';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCircle, faMinus, faTimes, faUpRightAndDownLeftFromCenter} from '@fortawesome/free-solid-svg-icons';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

// Define constants for common default values
const DEFAULT_OFFSET = 40;
const DEFAULT_WIDTH = 'w-[640px]';
const DEFAULT_HEIGHT = 'h-auto';

interface ParamsAwareComponent {
  params?: unknown;
}

const isParamsAwareComponent = (instance: unknown): instance is ParamsAwareComponent => (
  typeof instance === 'object' && instance !== null
);


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

    .app-window-header {
      @apply rounded-t-lg bg-black/30 backdrop-blur-md backdrop-saturate-150;
    }

    .app-window.resizing {
      transition: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .window-unfocused,
      .app-window {
        transition: none;
      }
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
  @Input() embeddedComponent: Type<unknown> = CliGameComponent;
  @Input() minWidth: number = WINDOW_WIDTH_MIN;
  @Input() maxWidth: number = WINDOW_WIDTH_MAX;
  @Input() minHeight: number = WINDOW_HEIGHT_MIN;
  @Input() maxHeight: number = WINDOW_HEIGHT_MAX;
  @Input() focused: boolean = false;
  @Input() minimized = false;
  @Input() params: unknown;

  private componentRef?: ComponentRef<unknown>;

  /** Font Awesome Icons */
  faTimes = faTimes;
  faMinus = faMinus;
  faUpRightAndDownLeftFromCenter = faUpRightAndDownLeftFromCenter;
  faCircle = faCircle;

  /** State and Flags */
  isCollapsed = false;
  isVisible = true;
  isMaximized = false;
  isDragging = false;
  private isResizing = false;
  private isAnimatingToDock = false;
  showSizeIcons = false;

  /** Private Properties */

  private offsetX = DEFAULT_OFFSET;
  private offsetY = DEFAULT_OFFSET;

  private startX = DEFAULT_OFFSET;
  private startY = DEFAULT_OFFSET;
  private initialWidth = WINDOW_WIDTH_MIN;
  private initialHeight = WINDOW_HEIGHT_MIN;
  private restoreBounds?: {left: string; top: string; width: string; height: string};
  private minimizeAnimation?: Animation;
  private restoreAnimation?: Animation;
  private restoreAnimationFrame?: number;
  private focusRestoreAnimationFrame?: number;
  private minimizeOperationId = 0;
  // Non-null only while this window owns the document selection lock.
  private bodyUserSelectBeforePointer: string | null = null;


  embeddedApp = computed(() => {
    return this.appManager.getAppByID(this.id);
  });

  get windowLabel(): string {
    return this.title.trim() || 'Application window';
  }

  constructor(
    private appManager: ApplicationManagerService,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {
    this.subscribeToFocusEvents();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['params'] && this.componentRef && isParamsAwareComponent(this.componentRef.instance)) {
      this.componentRef.instance.params = this.params;
    }
    if (changes['minimized'] && !changes['minimized'].firstChange
      && changes['minimized'].previousValue === true
      && changes['minimized'].currentValue === false) {
      this.restoreAnimationFrame = requestAnimationFrame(() => this.animateFromDock());
    } else if (changes['minimized']?.currentValue === true) {
      this.cancelRestoreAnimation();
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
          if (this.focused) {
            this.cancelPendingMinimize();
          }
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
      if (isParamsAwareComponent(this.componentRef.instance)) {
        this.componentRef.instance.params = this.params;
      }
    }
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.target === this.resizeRef.nativeElement) return;
    if ((event.target as HTMLElement).closest('button, input, select, textarea, a')) return;
    this.isDragging = true;
    this.offsetX = event.clientX - this.appWindowRef.nativeElement.offsetLeft;
    this.offsetY = event.clientY - this.appWindowRef.nativeElement.offsetTop;
    this.acquireSelectionLock();
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.isResizing) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.isDragging = false;
    this.isResizing = false;
    this.updateResizingClass();
    this.releaseSelectionLock();
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

    this.acquireSelectionLock();
  };

  private acquireSelectionLock(): void {
    if (this.bodyUserSelectBeforePointer === null) {
      this.bodyUserSelectBeforePointer = document.body.style.userSelect;
    }
    document.body.style.userSelect = 'none';
  }

  private releaseSelectionLock(): void {
    if (this.bodyUserSelectBeforePointer === null) {
      return;
    }
    document.body.style.userSelect = this.bodyUserSelectBeforePointer;
    this.bodyUserSelectBeforePointer = null;
  }

  collapseApp() {
    this.isCollapsed = !this.isCollapsed;
  }

  closeApp() {
    this.appManager.closeApplication(this.id);
    this.isVisible = false;
    this.scheduleFocusAfterExit(false);
  }

  bringToFront(event: MouseEvent) {
    if(event.target !== event.currentTarget){
      this.focused = this.appManager.setApplicationFocus(this.id, this.offsetX, this.offsetY);
      const focusTarget = event.target;
      if (this.focused && focusTarget instanceof HTMLElement && this.isFocusableControl(focusTarget)) {
        // Pointer focus happens after mousedown. Preserve the exact descendant across
        // the tracked window reorder triggered by the lifecycle focus update.
        this.scheduleDomFocusRestore(focusTarget);
      }
    }
  }

  focusFromKeyboard(event: FocusEvent): void {
    if (!this.focused) {
      this.focused = this.appManager.setApplicationFocus(this.id, this.offsetX, this.offsetY);
    }
    const focusTarget = event.target;
    if (this.focused && focusTarget instanceof HTMLElement) {
      this.scheduleDomFocusRestore(focusTarget);
    }
  }

  onHeaderDoubleClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    this.toggleMaximize();
  }

  minimizeToDock() {
    if (this.minimized || this.isAnimatingToDock) {
      return;
    }

    const appWindow = this.appWindowRef.nativeElement;
    const dockTarget = this.getDockTarget();
    if (this.prefersReducedMotion() || !dockTarget || typeof appWindow.animate !== 'function') {
      this.commitMinimizedState();
      this.scheduleFocusAfterExit(true);
      return;
    }

    const operationId = ++this.minimizeOperationId;
    this.cancelRestoreAnimation();
    this.isAnimatingToDock = true;
    const animation = appWindow.animate(this.getDockAnimationKeyframes(appWindow, dockTarget), {
      duration: 480,
      easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
      fill: 'forwards',
    });
    this.minimizeAnimation = animation;
    animation.addEventListener('finish', () => {
      if (operationId !== this.minimizeOperationId || !this.isAnimatingToDock || this.minimizeAnimation !== animation) {
        return;
      }
      this.minimizeAnimation = undefined;
      this.isAnimatingToDock = false;
      this.commitMinimizedState();
      this.scheduleFocusAfterExit(true);
      animation.cancel();
    }, {once: true});
    animation.addEventListener('cancel', () => {
      if (operationId !== this.minimizeOperationId || this.minimizeAnimation !== animation) {
        return;
      }
      this.minimizeAnimation = undefined;
      this.isAnimatingToDock = false;
    }, {once: true});
  }

  toggleMaximize() {
    if (this.autoFit) {
      return;
    }

    const appWindow = this.appWindowRef.nativeElement;
    if (this.isMaximized && this.restoreBounds) {
      appWindow.style.left = this.restoreBounds.left;
      appWindow.style.top = this.restoreBounds.top;
      appWindow.style.width = this.restoreBounds.width;
      appWindow.style.height = this.restoreBounds.height;
      this.isMaximized = false;
      return;
    }

    this.restoreBounds = {
      left: appWindow.style.left,
      top: appWindow.style.top,
      width: appWindow.style.width,
      height: appWindow.style.height,
    };

    const availableWidth = Math.max(this.minWidth, window.innerWidth - 24);
    const availableHeight = Math.max(this.minHeight, window.innerHeight - 96);
    const width = Math.min(this.maxWidth, availableWidth);
    const height = Math.min(this.maxHeight, availableHeight);
    appWindow.style.left = `${Math.max(8, (window.innerWidth - width) / 2)}px`;
    appWindow.style.top = '32px';
    appWindow.style.width = `${width}px`;
    appWindow.style.height = `${height}px`;
    this.isMaximized = true;
  }

  /** @deprecated Retained for compatibility with existing callers. */
  resetWindowSize() {
    this.toggleMaximize();
  }

  private animateFromDock(): void {
    const appWindow = this.appWindowRef?.nativeElement;
    const dockTarget = this.getDockTarget();
    if (!appWindow || !dockTarget || this.prefersReducedMotion() || typeof appWindow.animate !== 'function') {
      return;
    }

    this.cancelRestoreAnimation();
    const animation = appWindow.animate(
      [...this.getDockAnimationKeyframes(appWindow, dockTarget)].reverse(),
      {duration: 420, easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)'}
    );
    this.restoreAnimation = animation;
    animation.addEventListener('finish', () => {
      if (this.restoreAnimation === animation) {
        this.restoreAnimation = undefined;
      }
    }, {once: true});
    animation.addEventListener('cancel', () => {
      if (this.restoreAnimation === animation) {
        this.restoreAnimation = undefined;
      }
    }, {once: true});
  }

  private cancelPendingMinimize(): void {
    if (!this.isAnimatingToDock) {
      return;
    }

    this.minimizeOperationId++;
    this.isAnimatingToDock = false;
    const animation = this.minimizeAnimation;
    this.minimizeAnimation = undefined;
    animation?.cancel();
  }

  private cancelRestoreAnimation(): void {
    if (this.restoreAnimationFrame !== undefined) {
      cancelAnimationFrame(this.restoreAnimationFrame);
      this.restoreAnimationFrame = undefined;
    }
    const animation = this.restoreAnimation;
    this.restoreAnimation = undefined;
    animation?.cancel();
  }

  private scheduleFocusAfterExit(preferDock: boolean): void {
    requestAnimationFrame(() => {
      const focusedAppId = this.appManager.getFocusedAppId();
      let target: HTMLElement | undefined;

      if (focusedAppId && focusedAppId !== 'desktop' && focusedAppId !== this.id) {
        target = Array.from(document.querySelectorAll<HTMLElement>('[data-window-id]'))
          .find((element) => element.dataset['windowId'] === focusedAppId);
      }
      if (!target && preferDock) {
        target = this.getDockTarget();
      }
      target ??= document.querySelector<HTMLElement>('[role="application"][aria-label="Interactive desktop"]') ?? undefined;
      target?.focus();
    });
  }

  private scheduleDomFocusRestore(target: HTMLElement): void {
    this.cancelPendingDomFocusRestore();
    const expectedFocusId = this.id;
    this.focusRestoreAnimationFrame = requestAnimationFrame(() => {
      this.focusRestoreAnimationFrame = undefined;
      if (this.appManager.getFocusedAppId() !== expectedFocusId || !target.isConnected) {
        return;
      }
      if (document.activeElement !== target) {
        target.focus({preventScroll: true});
      }
    });
  }

  private isFocusableControl(target: HTMLElement): boolean {
    return target.matches('a[href], button, input, select, textarea, [contenteditable="true"], [tabindex]');
  }

  private cancelPendingDomFocusRestore(): void {
    if (this.focusRestoreAnimationFrame !== undefined) {
      cancelAnimationFrame(this.focusRestoreAnimationFrame);
      this.focusRestoreAnimationFrame = undefined;
    }
  }

  private commitMinimizedState(): void {
    this.appManager.minimizeApplication(this.id);
    this.minimized = true;
    this.changeDetectorRef.detectChanges();
  }

  private getDockTarget(): HTMLElement | undefined {
    const baseAppId = this.embeddedApp()?.parent?.id ?? this.id.replace(/-\d+$/, '');
    return Array.from(document.querySelectorAll<HTMLElement>('[data-dock-app-id]'))
      .find((element) => element.dataset['dockAppId'] === baseAppId);
  }

  private getDockAnimationKeyframes(appWindow: HTMLElement, dockTarget: HTMLElement): Keyframe[] {
    const source = appWindow.getBoundingClientRect();
    const target = dockTarget.getBoundingClientRect();
    const sourceCenterX = source.left + source.width / 2;
    const sourceBottom = source.top + source.height;
    const targetCenterX = target.left + target.width / 2;
    const targetCenterY = target.top + target.height / 2;
    const deltaX = targetCenterX - sourceCenterX;
    const deltaY = targetCenterY - sourceBottom;
    const scaleX = Math.max(0.04, target.width / Math.max(source.width, 1));
    const scaleY = Math.max(0.04, target.height / Math.max(source.height, 1));

    return [
      {
        transform: 'translate3d(0, 0, 0) scale(1)',
        transformOrigin: 'center bottom',
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        opacity: 1,
      },
      {
        offset: 0.58,
        transform: `translate3d(${deltaX * 0.48}px, ${deltaY * 0.52}px, 0) scale(0.72, 0.58)`,
        transformOrigin: 'center bottom',
        clipPath: 'polygon(7% 0, 93% 0, 100% 100%, 0 100%)',
        opacity: 0.92,
      },
      {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        transformOrigin: 'center bottom',
        clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)',
        opacity: 0.2,
      },
    ];
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  /** Remove global pointer listeners and release only this instance's selection lock. */
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
    this.cancelPendingDomFocusRestore();
    this.cancelRestoreAnimation();
    this.minimizeOperationId++;
    this.minimizeAnimation?.cancel();
    this.releaseSelectionLock();
  }

}
