// terminal-window.component.ts
import {Component, ElementRef, ViewChild, Input, AfterViewInit, ViewContainerRef, Type} from '@angular/core';
import { CommonModule } from '@angular/common';
import {CliGameComponent} from '../../cli-game/cli-game.component';
import {TerminalWindowManagerService} from '../../services/terminal-window-manager.service';

@Component({
  selector: 'app-terminal-window',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terminal-window.component.html',
  styles: `
    /* terminal-window.component.scss */
  :host {
    display: block;
    position: relative;
    z-index: 10;
  }

  :host ::ng-deep div[draggable] {
    user-select: none;
    -webkit-user-drag: none;
    -webkit-app-region: drag;
  }

  .h-0 {
    height: 0 !important;
  }

  .h-\\[400px\\] {
    height: 400px !important;
  }`
})
export class TerminalWindowComponent implements AfterViewInit {
  @ViewChild('terminal') terminalRef!: ElementRef<HTMLDivElement>;
  @ViewChild('header') headerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('resizeHandle') resizeRef!: ElementRef<HTMLDivElement>;
  @ViewChild('dock') dockRef!: ElementRef<HTMLDivElement>;
  @ViewChild('terminalContent', { read: ViewContainerRef }) contentRef!: ViewContainerRef;

  @Input() id!: string;
  @Input() title: string = 'Terminal';

  @Input() embeddedComponent: Type<any> = CliGameComponent;
  isCollapsed = false;
  isVisible = true;
  isMinimized = false;

  private isDragging = false;
  private isResizing = false;
  private offsetX = 0;
  private offsetY = 0;
  private startWidth = 0;
  private startHeight = 0;

  constructor(private terminalManager: TerminalWindowManagerService ) {

  }

  ngAfterViewInit(): void {
    const terminal = this.terminalRef.nativeElement;
    const header = this.headerRef.nativeElement;
    const resizer = this.resizeRef.nativeElement;

    header.addEventListener('pointerdown', this.onPointerDown);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointermove', this.onPointerMove);

    resizer.addEventListener('pointerdown', this.onResizeStart);

    if (this.embeddedComponent) {
      this.contentRef.clear();
      this.contentRef.createComponent(this.embeddedComponent);
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
    this.isVisible = false;
  }

  minimizeToDock() {
    this.isMinimized = true;
    setTimeout(() => {
      const dock = this.dockRef?.nativeElement;
      dock?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }

  restoreFromDock() {
    this.isMinimized = false;
  }
}
