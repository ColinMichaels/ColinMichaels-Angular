import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  ErrorHandler,
  HostListener,
  ViewContainerRef,
  inject,
} from '@angular/core';

interface ScreenSaverActivator {
  activate(): void;
}

@Component({
  selector: 'app-screen-saver-launcher',
  standalone: true,
  template: '',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreenSaverLauncherComponent {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly errorHandler = inject(ErrorHandler);
  private screenSaverRef: ComponentRef<ScreenSaverActivator> | null = null;
  private loadPromise: Promise<ComponentRef<ScreenSaverActivator>> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.screenSaverRef?.destroy();
      this.screenSaverRef = null;
      this.loadPromise = null;
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeyboardShortcut(event: KeyboardEvent): void {
    if (this.screenSaverRef
      || event.defaultPrevented
      || event.repeat
      || event.metaKey
      || event.ctrlKey
      || event.altKey
      || event.key.toLowerCase() !== 's'
      || this.isTypingTarget(event.target)) {
      return;
    }

    event.preventDefault();
    void this.loadAndActivate();
  }

  private async loadAndActivate(): Promise<void> {
    try {
      const screenSaverRef = await (this.loadPromise ??= this.createScreenSaver());
      screenSaverRef.instance.activate();
      screenSaverRef.changeDetectorRef.detectChanges();
    } catch (error) {
      this.loadPromise = null;
      this.errorHandler.handleError(error);
    }
  }

  private async createScreenSaver(): Promise<ComponentRef<ScreenSaverActivator>> {
    const {ScreenSaverComponent} = await import('./screen-saver.component');
    const screenSaverRef = this.viewContainerRef.createComponent(ScreenSaverComponent);
    this.screenSaverRef = screenSaverRef;
    return screenSaverRef;
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return target.isContentEditable
      || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  }
}
