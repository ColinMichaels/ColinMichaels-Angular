import {
  Directive,
  ElementRef,
  Input,
  Renderer2,
  AfterViewInit,
  HostListener,
} from '@angular/core';

@Directive({
  selector: '[appSticky]',
  standalone: false
})
export class StickyDirective implements AfterViewInit {
  @Input() stickyTop: string = '0px';
  @Input() zIndex: string = '10';
  @Input() stickyClass = 'sticky';

  private isStuck = false;

  constructor(
    private readonly el: ElementRef,
    private readonly renderer: Renderer2) {
  }

  ngAfterViewInit(): void {
    this.renderer.setStyle(this.el.nativeElement, 'top', this.stickyTop);
    this.renderer.setStyle(this.el.nativeElement, 'z-index', this.zIndex);
    this.renderer.setStyle(this.el.nativeElement, 'position', 'sticky');
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const rect = this.el.nativeElement.getBoundingClientRect();
    if (rect.top <= parseInt(this.stickyTop)) {
      if (!this.isStuck) {
        this.renderer.addClass(this.el.nativeElement, this.stickyClass);
        this.isStuck = true;
      } else {
        this.renderer.removeClass(this.el.nativeElement, this.stickyClass);
        this.isStuck = false;
      }
    }
  }
}
